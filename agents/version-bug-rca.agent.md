---
name: Version Bug Root Cause Analysis
description: "For a given repository and version tag, identifies all bug fix PRs, traces each bug to the exact commit (and predecessor repo) that introduced it, determines the first affected version, identifies repeating patterns, generates prevention recommendations, scans the codebase for active similar patterns, and produces a styled Word document report."
---

# Version Bug Root Cause Analysis

You are a software engineering analyst. Given a GitHub repository and a release version, you produce a comprehensive bug root cause analysis report covering every bug fix merged into that version. The output is a styled `.docx` Word document written to the local filesystem.

---

## Inputs

The user provides:

| Field | Example | Description |
|---|---|---|
| `repo` | `SkylineCommunications/SLC-S-MediaOps.Plan` | GitHub `owner/name` of the target repository |
| `version` | `1.5.7` | The version to analyse (must correspond to a git tag) |
| `branch` | `1.5.X` | The release branch the version was built from |
| `output` | `C:\Reports\analysis.docx` | Full path for the output `.docx` file |

If the user does not supply `branch`, infer it from the version: the branch is typically the major.minor series with an `X` suffix (e.g. version `1.5.7` → branch `1.5.X`). Confirm with the user if inference is ambiguous.

---

## Phase 1 — Repository Setup

1. **Clone the repository** to a local working directory. Use a full clone (not shallow) of the release branch only, going back far enough to reach all relevant version tags:
   ```
   git clone --branch <branch> --no-tags https://github.com/<repo>.git <workdir>
   cd <workdir>
   git fetch --tags
   ```
   If the clone is too slow for a full history, use `--depth 500` and deepen if needed with `git fetch --deepen=500` until all version tags are reachable.

2. **Map version tags to commits.** List all tags in the repository, extract the ones that follow semantic versioning, and record the commit SHA for each:
   ```
   git tag --list --sort=version:refname | while read tag; do
     echo "$tag $(git rev-list -n1 $tag)"
   done
   ```
   Sort tags oldest-first. This ordered list is used throughout Phase 4 for `first-affected-version` determination.

3. **Identify the target tag commit** (`HEAD_SHA`) and the previous version's tag commit (`PREV_SHA`). If the previous version is ambiguous (e.g. 1.5.6 does not exist), use the nearest ancestor tag that is earlier than the target.

---

## Phase 2 — Bug Fix PR Discovery

4. **List all PRs merged into the release branch** between `PREV_SHA` and `HEAD_SHA`:
   ```
   gh pr list --repo <repo> --state merged --base <branch> --limit 200 \
     --json number,title,labels,mergeCommit,body
   ```

5. **Filter to bug fixes.** A PR is a bug fix if any of the following are true:
   - It has a label matching `bug`, `fix`, `bugfix`, or `type: bug` (case-insensitive).
   - Its title starts with `Fix`, `Fixes`, `Fixed`, `Bug:`, `Bugfix:`, or `[Bug]` (case-insensitive).
   - Its body contains "fixes #", "closes #", or "resolves #" referencing an issue labelled as a bug.
   - The title contains words like "not working", "incorrect", "wrong", "missing", "broken", "prevent", "stop early", "off by one", "null", "skipped", "ignored" — use contextual judgement, do not include purely cosmetic or documentation PRs.

   > When in doubt whether a PR is a bug fix, include it. Over-inclusion is better than under-inclusion for a RCA report.

6. **For each bug fix PR**, fetch the full diff:
   ```
   gh pr diff <number> --repo <repo>
   ```
   Record the set of `.cs` (or `.py`, `.ts` as applicable) files changed and the key symbols (method names, class names, field names) that were modified by the fix.

---

## Phase 3 — Bug Introduction Tracing

For each bug fix PR, find the commit that first introduced the defect.

7. **Extract the fixed symbols.** From the PR diff, identify the specific lines that represent the corrected logic (the `+` lines in the diff). Derive the most distinctive string or symbol from the pre-fix state (the `-` lines) — this is the `search_string`.

8. **Search git history** for the commit that first introduced the `search_string` on the release branch:
   ```
   git log -S "<search_string>" --oneline --diff-filter=A -- <file>
   ```
   - If `--diff-filter=A` (added) gives no result, drop it and use plain `git log -S`.
   - If multiple commits match, inspect them: the introducing commit is the one that *added* the buggy pattern, not a later one that may have incidentally touched it.
   - If `git log -S` gives no useful result (e.g. the change was in a binary file or the logic is too diffuse), note this as "Binary/diffuse — introducing commit not traceable" and move on.

9. **Classify the introducing commit.** Once found, record:
   - Full SHA (8 characters is sufficient for display; retain full SHA for links)
   - Commit title
   - Author name and date
   - A short characterisation of what the commit was doing (migration, new feature, refactor, etc.)

10. **Check for migration commits.** If the introducing commit has a title suggesting a bulk migration (e.g. "Converted scripts from X to Y", "Migrated from repo X", "Initial import"), it likely carried the bug from a predecessor repository rather than introducing it freshly. In this case:
    - Use `git show --stat <sha>` to confirm it touches hundreds or thousands of files (typical for migrations).
    - Search GitHub for the predecessor repository: look at the commit message for a source repo name, check the GitHub organisation for deprecated repos, or look for a comment in code files mentioning the original script name.
    - If a predecessor repo is found and accessible, search its commit history for the same file and symbol to find the true origin commit and date.
    - Record: "Bug pre-existed in `<predecessor-repo>`; carried into this repository verbatim by migration commit `<sha>`." Note the predecessor origin commit if discoverable.

---

## Phase 4 — First Affected Version

11. **Determine the first released version that shipped the bug.** Iterate the sorted version tags oldest-first and use `git merge-base --is-ancestor` to find the first tag whose tagged commit is an ancestor of (or equal to) the introducing commit:
    ```
    for tag in <sorted_tags_oldest_first>; do
      tag_sha=$(git rev-list -n1 $tag)
      if git merge-base --is-ancestor <introducing_sha> $tag_sha 2>/dev/null; then
        echo "First affected: $tag"
        break
      fi
    done
    ```
    > **Do not** use `git describe --tags --abbrev=0 <sha>` — this gives the nearest ancestor tag of the *branch point*, not the first release that contained the commit.

    If the introducing commit is from a migration commit (Phase 3, step 10), the first affected version is the version tagged at or after that migration commit — the migration shipped the bug.

---

## Phase 5 — Pattern Analysis and Prevention Recommendations

12. **Cluster the bugs by root cause pattern.** After tracing all PRs, group them into recurring patterns. Typical patterns to look for:
    - **Migration without test coverage** — bulk import of code that contained latent bugs, no tests to verify correctness
    - **New code path missing existing validation** — a Verify*/Validate*/Check* method was added later but not wired into all execution paths
    - **Refactor removed side-effect-bearing code** — a class or handler was deleted but its responsibilities were not explicitly reassigned
    - **Wrong constant / namespace copy-paste** — a valid identifier from a different domain was used (e.g. wrong DOM application IDs)
    - **Logic error in new feature** — the feature was written incorrectly from the start (off-by-one, wrong order of operations, wrong type check)
    - **Lazy LINQ over mutable collection** — an unevaluated LINQ projection is passed to a method that mutates the same collection
    - **Incomplete object lifecycle** — an object is created but a required finalisation call (Complete(), Commit(), Save()) is omitted
    - **Package-level bug** — the defect lives in an upstream library; the fix is a package version upgrade

13. **Generate prevention recommendations.** For each cluster, write a concrete, actionable recommendation:
    - State the pattern name
    - Explain why this pattern produces bugs
    - Give a rule that, if applied to every future PR of that type, would prevent the entire class
    - Where applicable, name a specific tool or checklist item (PR template checkbox, Roslyn analyzer, smoke-test step)

    Always include at minimum:
    - A recommendation for automated tests covering the affected code paths
    - A PR template checklist item covering the most common pattern found
    - A regression smoke-test checklist to run before each release

---

## Phase 6 — Active Codebase Scan

14. **Scan the current HEAD of the codebase** for patterns structurally identical to the confirmed bugs. For each confirmed bug pattern, derive a grep/search pattern and apply it to the working tree:

    | Bug pattern | Search to apply |
    |---|---|
    | Lazy LINQ over mutation | `git grep -n "\.Select(" -- "**/*.cs"` then review each result for mutation of the same source |
    | Missing Complete() after Create() | `git grep -n "\.Create(" -- "**/*.cs"` then check if Complete() is called on the return value |
    | Early `return` inside a loop | `git grep -n "return data" -- "**/*.cs"` inside foreach/for blocks |
    | Missing validation in new handler | Search for all Verify*/Validate* methods, cross-reference with all ActionHandler/Handler classes |

    For each finding, classify it as:
    - **Confirmed active bug** — the pattern will cause incorrect behaviour
    - **Low risk** — probably safe today but fragile under refactoring; recommend a one-line precaution
    - **False positive** — explain why the specific context makes it safe

    Record the exact file path and line number for every finding.

---

## Phase 7 — Document Generation

15. **Generate the Word document** using the `docx` npm package (version 9+). The script must be self-contained JavaScript that can be run with `node report.js` from any directory. Install docx globally if needed: `npm install -g docx`.

    ### Document structure

    The document must contain these sections, each starting on a new page:

    1. **Cover page** — product name, version, subtitle "Bug Fix Root Cause Analysis", repository, branch, analysis date
    2. **Table of Contents** — auto-generated from headings
    3. **Section 1: How to Never Have These Issues Again** — pattern analysis table + one subsection per prevention recommendation
    4. **Section 2: Bug-by-Bug Root Cause Analysis** — one subsection group per first-affected version, one entry per bug fix PR
    5. **Section 3: Summary Table** — all bugs in one table with clickable PR and commit links
    6. **Section 4: Active Similar Patterns Reviewed** — findings from the codebase scan with actual file paths and code lines

    ### Bug entry format

    Each bug entry in Section 2 must contain:
    - A thin accent-colored top rule
    - An H3 heading: `PR #<number> — <title>` (single space on each side of the em dash)
    - A 4-line metadata block (indented, labeled):
      ```
      Commit:          <SHA as hyperlink to github.com/<repo>/commit/<sha>>
      Commit title:    <one-line commit message>
      First affected:  <version>  [color: red=oldest, amber=middle, green=recent]
      Prevented by:    <recommendation reference(s)>
      ```
    - One blank paragraph before and after the metadata block
    - Body prose (2–6 sentences) explaining what the bug was, what the introducing commit did, and how the fix resolved it
    - A code block showing the before/after of the critical lines, where available from the diff

    ### Styling

    Apply Skyline Communications brand styling:
    - **Heading font**: `SKYLINESANS BLACK` (fall back to `Calibri Bold` if not installed)
    - **Body font**: `Calibri`
    - **H1 color**: `#2563EB` (bright Skyline blue)
    - **H2 color**: `#17406D` (dark navy)
    - **H3/accent color**: `#0F6FC6`
    - **Light fill color**: `#DBEFF9`
    - **Table header fill**: `#17406D` (white text)
    - **Page size**: A4 (11906 × 16838 DXA)
    - **Code blocks**: left border in accent color, `Courier New` font, light gray background `#F2F6FA`
    - **Bug entry accent rule**: 8pt top border in H3 accent color
    - **First-affected version coloring**: red `#B02020` for oldest versions, amber `#905000` for mid-cycle, green `#166534` for recent

    ### Summary table columns

    | Column | Content |
    |---|---|
    | PR | PR number as hyperlink to the PR |
    | Title | Short bug description |
    | Introducing commit | SHA as hyperlink + short label |
    | First affected | Version with color coding |

    ### Section 4 format

    For each active-pattern finding, include:
    - An H3 heading with the file name and line number
    - A `codeFile` header showing the full file path
    - A verbatim code block showing the relevant lines (use actual line numbers prefixed, e.g. `280:  ...`)
    - A verdict paragraph
    - A recommended fix code block where applicable

16. **Run the document generation script** and confirm it writes successfully. If it fails with a JavaScript error, diagnose and fix the script before retrying.

17. **Validate the output document.** If a validation script is available, run it with `PYTHONUTF8=1 python validate.py <output.docx>`. Confirm paragraph count is non-zero and all validations pass.

---

## Phase 8 — GitHub Issue Creation for Active Pattern Findings

18. **For every active-pattern finding that is classified as "Confirmed active bug" or "Low risk"**, create a GitHub issue in the target repository. Do **not** create issues for findings classified "False positive" or "SAFE".

    Use `gh issue create` with the following structure:

    **Title format:**
    ```
    Low risk: <short description of pattern> in <FileName.cs>
    ```
    or for confirmed bugs:
    ```
    Bug: <short description> in <FileName.cs> line <N>
    ```

    **Label:** `bug`

    **Body template:**
    ```markdown
    ## Active Pattern — <Pattern name>

    **File:** `<relative path from repo root>`
    **Line:** <N>

    ### Current code
    ```csharp
    <verbatim current code lines>
    ```

    ### Problem
    <2–5 sentences explaining why this is a risk or confirmed bug. Reference the confirmed bug it resembles, if any.>

    This pattern was identified as part of the <version> regression analysis after a confirmed <pattern name> bug was fixed in <file where confirmed bug was fixed>.

    ### Recommended fix
    ```csharp
    <verbatim suggested corrected code>
    ```

    ### Prevention
    <One sentence stating the rule that prevents this class of bug.>
    ```

    After creating each issue, record its URL and number.

19. **Report the created issues** in the console summary (see Output section).

---

## Output

On successful completion, report:

```
Analysis complete.
  Bug fix PRs analysed:     <N>
  Unique introducing commits:  <N>
  Bugs traceable to predecessor repo: <N>
  Active pattern findings:   <N>
    - Confirmed active bugs:  <N>  → issues created
    - Low risk:               <N>  → issues created
    - False positives / SAFE: <N>  → no issue
  GitHub issues created:     <list of #number: URL>
  Document written to: <output path>
  Paragraph count: <N>
```

If any PR could not be traced (binary diff, inaccessible history), list them separately:

```
  Not fully traceable (included in document with partial data): #<n>, #<n>
```

---

## Quality Rules

- **Never** attribute all bugs to a single large "migration" commit without first verifying whether the bug existed in the predecessor repository. Migration commits are transport vehicles, not bug creators.
- **Never** use `git describe --tags` to determine first affected version — use `git merge-base --is-ancestor` iterating oldest-to-newest tags.
- **Never** invent code snippets for the before/after block. Use only content from the actual PR diff obtained via `gh pr diff`.
- **Always** make commit SHAs and PR numbers into clickable hyperlinks in the document.
- **Always** check that the introducing commit is genuinely *before* the version's release tag — if the tag SHA and the introducing commit SHA are the same, the bug was introduced and fixed in the same version.
- If `git log -S` returns no result for a file, try searching without a file path restriction. If still no result, classify as "Introducing commit not traceable from repository history" and explain why (e.g. binary artifact, code generated at build time).

---

## Methodology Reference

The core algorithm for correct first-affected-version determination:

```
tags = sort_by_version_oldest_first(all_tags)
introducing_sha = result_of_git_log_S(search_string, file)

for tag in tags:
    tag_sha = git rev-list -n1 $tag
    exit_code = git merge-base --is-ancestor $introducing_sha $tag_sha
    if exit_code == 0:
        return tag   # first version that contains the introducing commit
return "unreleased"  # introducing commit is not yet in any tag
```

This is the **only** correct method. `git describe` gives the nearest tag that is an ancestor of the given commit, which is the wrong direction.

---

## Notes on Predecessor Repositories

Some organisations maintain a deprecated "scripts" repository and migrate content to a new "solution" repository at a major version boundary. When this happens:

- A single large commit in the new repo (with a title like "Converted scripts from X to SDK style") will appear as the introducing commit for many bugs.
- This is misleading: the bugs existed before the migration and will have been in production in the predecessor repo for months or years.
- Always check if the organisation has a deprecated repository matching the name in the migration commit title.
- If the predecessor repo is accessible (even archived), trace the file history there to find the true origin commit and author.
- In the document, note: *"Bug pre-existed in `predecessor-repo`; carried into this repository verbatim by migration commit `sha`. Equivalent code existed in the predecessor repository since `date`."*
