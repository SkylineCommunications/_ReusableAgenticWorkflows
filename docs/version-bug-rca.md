# 🔍 Version Bug Root Cause Analysis

> For an overview of all available workflows, see the [main README](../README.md).

**Trace every bug fix in a release back to the commit that introduced it, determine the first affected version, identify recurring patterns, and produce a styled Word document report — including GitHub issues for any active similar patterns still in the codebase.**

The [version-bug-rca agent](../agents/version-bug-rca.agent.md) is a **manually invoked CLI agent** (not a GitHub Actions workflow). You run it against a specific repository and version tag; it analyses all bug fix PRs merged into that release, performs root cause tracing, and writes a `.docx` report to your local filesystem.

## What it does

### Input

| Parameter | Example | Description |
|---|---|---|
| `repo` | `SkylineCommunications/SLC-S-MediaOps.Plan` | GitHub `owner/name` of the target repository |
| `version` | `1.5.7` | The release version to analyse (must correspond to a git tag) |
| `branch` | `1.5.X` | The release branch the version was built from |
| `output` | `C:\Reports\analysis.docx` | Full path for the output `.docx` file |

### Phases

| Phase | What happens |
|---|---|
| **1 — Setup** | Clones the repo, fetches all version tags, maps tags to commit SHAs |
| **2 — Discovery** | Lists all merged PRs between the previous and target version; filters to bug fixes by label, title prefix, and body keywords |
| **3 — Bug tracing** | For each bug fix PR, uses `git log -S` to find the exact commit that introduced the defect. Detects bulk migration commits and traces bugs to predecessor repositories when applicable |
| **4 — First affected version** | Uses `git merge-base --is-ancestor` (iterating oldest tag first) to determine the earliest released version that shipped each bug |
| **5 — Pattern analysis** | Groups bugs by root cause pattern; generates concrete prevention recommendations per cluster |
| **6 — Active codebase scan** | Searches the current HEAD for structurally identical patterns; classifies each finding as Confirmed, Low risk, or Safe |
| **7 — Document generation** | Writes a styled `.docx` report with Skyline brand fonts and colors (falls back to Calibri if brand fonts are unavailable) |
| **8 — Issue creation** | Previews proposed GitHub issues for Confirmed and Low-risk findings, prompts for confirmation, then creates them |

### Output

- A **`.docx` report** containing:
  - Cover page and table of contents
  - Prevention recommendations (one per root cause pattern)
  - Bug-by-bug analysis with hyperlinked commits, 4-line metadata blocks, and before/after code snippets
  - Summary table with clickable PR and commit links
  - Active similar patterns with exact file paths and line numbers
- **GitHub issues** for any Confirmed or Low-risk active pattern findings (after user confirmation)
- A **console summary** with counts and issue URLs

## Prerequisites

### 1. Install the `gh aw` extension

```bash
gh extension install github/gh-aw
```

### 2. Install Node.js and the `docx` package

The document generation step requires Node.js (v18+) and the `docx` npm package:

```bash
npm install -g docx
```

### 3. Authenticate `gh` CLI

The agent uses `gh` for all GitHub API calls. Ensure you are authenticated:

```bash
gh auth status
```

If not authenticated:

```bash
gh auth login
```

Your token must have at minimum: `repo` (read), `issues` (write for issue creation).

## Running the agent

```bash
gh copilot suggest "Run the version-bug-rca agent on SkylineCommunications/SLC-S-MediaOps.Plan version 1.5.7 branch 1.5.X output C:\Reports\MediaOps-1.5.7-BugAnalysis.docx"
```

Or in a Copilot CLI session, provide the agent file directly:

```bash
gh copilot --agent agents/version-bug-rca.agent.md \
  "Analyse SkylineCommunications/SLC-S-MediaOps.Plan version 1.5.7 on branch 1.5.X. Write report to C:\Reports\MediaOps-1.5.7-BugAnalysis.docx"
```

## Issue creation confirmation

When the codebase scan finds active patterns (Confirmed or Low risk), the agent prints a preview table before creating any issues:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Proposed GitHub issues  (repo: owner/repo)                                 │
├──────┬────────────────────────────────────────────────┬─────────────────────┤
│  #   │  Title                                         │  Severity           │
├──────┼────────────────────────────────────────────────┼─────────────────────┤
│   1  │  Low risk: lazy LINQ .Select() passed to ...   │  LOW RISK           │
└──────┴────────────────────────────────────────────────┴─────────────────────┘

Create these 1 issue(s) in owner/repo? [y/N]
```

Type `y` or `yes` to create them. Any other input skips issue creation. In non-interactive environments (CI, piped input) issues are created automatically.

## Configuration reference

### Permissions required

| Scope | Level | Purpose |
|---|---|---|
| `repo` | read | Clone repository, read PR diffs, read commit history |
| `issues` | write | Create GitHub issues for active pattern findings |

### Outputs

| Artifact | Description |
|---|---|
| `<output>.docx` | Full root cause analysis report |
| GitHub issues | One issue per Confirmed/Low-risk active pattern finding |

## Methodology notes

### Why `git merge-base --is-ancestor` and not `git describe`

`git describe --tags <sha>` returns the *nearest ancestor tag of the given commit's branch point* — which is the wrong direction. To find the **first released version that contains a bug**, you must iterate version tags oldest-first and find the first tag whose commit is a descendant of the introducing commit. The agent uses:

```
for tag in sorted_tags_oldest_first:
    if git merge-base --is-ancestor <introducing_sha> <tag_sha>:
        return tag  # first release that shipped the bug
```

### Migration commit handling

When many bugs appear to originate from a single large "migration" commit (hundreds or thousands of files changed), this is expected behaviour — the commit is a bulk import from a predecessor repository. The agent:

1. Detects this via `git show --stat` (large file count) and commit title keywords
2. Searches the GitHub organisation for a deprecated predecessor repository
3. Traces the true origin commit in that predecessor repo
4. Labels the bug as: *"Pre-existed in `predecessor-repo`; carried into this repository verbatim by migration commit `sha`"*

This prevents the misleading conclusion that a single commit introduced all bugs.

## What it reads

- Git tag history and commit SHAs
- PR metadata (title, labels, body, merge commit)
- PR diffs (via `gh pr diff`)
- File contents at specific commits (for before/after code snippets)
- Predecessor repository commit history (when migration commits are detected)

## What it creates or updates

- A `.docx` file on the local filesystem
- GitHub issues on the target repository (with user confirmation)
