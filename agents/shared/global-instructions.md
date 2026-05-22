# Global Instructions

## Scope

These instructions apply to **all solution agents** across every repository. Every agent must follow these standards unless a more specific procedure explicitly overrides a rule for a particular context.

---

## Severity Levels

**All instructions across all procedure files** use the following severity indicators:

- **[ERROR]** — Blocks the pipeline; must be fixed before proceeding
- **[WARNING]** — Should be addressed but does not block the pipeline
- **[INFO]** — Informational guideline; no enforcement

**Default behavior**: When no severity tag is present, treat the instruction as **[WARNING]**.

See [`severity-enforcement.md`](severity-enforcement.md) for detailed implementation guidelines and CI/CD integration examples.

---

## Validation Output Format

This section defines the standard output format for **all policy validations** across every policy file in this repository. Every policy file contains a numbered **Validation Process** section; the output below is how those results must always be presented.

### Structure

For each policy file applied during a validation, output a block with:
1. A section header identifying the policy by its folder and file name
2. A results table with one row per numbered check from that policy's Validation Process section
3. A result line summarising the outcome for that policy

When multiple policy files are applied in a single validation run, output one block per policy in the order they were applied, followed by a single overall summary line.

### Table format

```
### {folder} / {filename}

| #  | Check                   | Status                      | Notes                                   |
|----|-------------------------|-----------------------------|-----------------------------------------|
| 1  | [check name]            | ✅ Compliant                |                                         |
| 2  | [check name]            | ❌ Non-compliant [ERROR]    | [reason]                                |
| 3  | [check name]            | ⚠️ Non-compliant [WARNING] | [reason]                                |
| 4  | [check name]            | N/A                         | [why it does not apply]                 |

**Result: ❌ 1 error · 1 warning · 1 N/A**
```

### Status values

| Status | Meaning |
|--------|---------|
| ✅ Compliant | The check passes with no issues |
| ❌ Non-compliant [ERROR] | An ERROR-level rule is violated — blocks the pipeline |
| ⚠️ Non-compliant [WARNING] | A WARNING-level rule is violated — should be addressed |
| N/A | The check does not apply to this repository |

### Rules

- The `#` column must use the same numbering as the **Validation Process** section of the policy file being applied.
- The **Notes** column MUST be left empty for `✅ Compliant` rows. Only fill it in for non-compliant or N/A rows.
- The **Result** line counts only errors and warnings that are non-compliant; N/A items are listed separately.
- `[INFO]`-level findings may be appended below the table as a plain bullet list under an **Improvement suggestions** heading — they do not appear as rows in the table.

---

## Operating Mode

All agents operate in one of two modes. **`report-only` is the default** unless the invoker explicitly requests `assist` mode.

| Mode | What the agent does |
|------|---------------------|
| **`report-only`** *(default)* | Validates, writes the landscape report, updates the matrix â€” no changes made in the solution repository |
| **`assist`** | Everything in `report-only`, plus creates or updates issues and pull requests in the solution repository |

### Standard output steps

Every agent MUST follow this sequence at the end of every run. The pre-run discovery step and Steps 1 and 2 are always executed. Step 3 is conditional on mode.

**Pre-run — Discover existing issues and PRs** *(always — both modes)*

Before writing any output, search the solution repository for open issues and pull requests already linked to this check:

1. Search open issues by the title keyword defined in this agent's Step 3 section (e.g. [Catalog Doc]):
   `
   GET /repos/<OWNER>/<REPO>/issues?state=open
   `
   Filter by title prefix. Record the URL of the first matching open issue as existingIssueUrl.

2. Search open pull requests by the same title keyword:
   `
   GET /repos/<OWNER>/<REPO>/pulls?state=open
   `
   Filter by title prefix. Record the URL of the first matching open PR as existingPrUrl.

3. Include any found URLs in the landscape report (under a **Linked issue / PR** heading) and carry them into Step 2 — they must be written to matrix-data.json regardless of operating mode.

> This ensures the matrix always reflects the live state of the solution repository, not only what the current agent run created.

**Step 1 â€” Write landscape report** *(always â€” both modes)*

Commit the full validation report as Markdown to the solution landscape repository:
- Repository: `leanderdruwel-skyline/solution-landscape`
- Path: `solutions/<REPO_NAME>/<report-file>` â€” each agent defines its own `<report-file>` name
- Use `PUT /repos/leanderdruwel-skyline/solution-landscape/contents/solutions/<REPO_NAME>/<report-file>`
- Fetch the file first to get its current SHA (required for in-place updates; omit SHA only for brand-new files)
- The file must include: solution name, repository link, check date (`YYYY-MM-DD`), agent name, and the full findings table

**Step 2 â€” Update matrix-data.json** *(always â€” both modes)*

1. Fetch `leanderdruwel-skyline/solution-landscape/matrix-data.json` and note its SHA
2. Find the solution entry where `id == <REPO_NAME>`; if absent, add: `{"id": "<REPO_NAME>", "name": "<name>", "repo": "SkylineCommunications/<REPO_NAME>", "checks": {}}`
3. Set `solutions[i].checks["<check-id>"]` â€” each agent defines its own `<check-id>`:
   - `status`: `"fail"` if any `[ERROR]` findings Â· `"partial"` if only `[WARNING]` findings Â· `"pass"` if all checks pass
   - `note`: one-line summary of the key finding, or `"All checks passed"`
   - `issueUrl`: issue URL if one was created (assist mode); omit otherwise
   - `reportUrl`: `"https://github.com/leanderdruwel-skyline/solution-landscape/blob/main/solutions/<REPO_NAME>/<report-file>"`
   - `updatedAt`: today's date as `"YYYY-MM-DD"`
4. Commit the updated JSON back using its SHA

**Step 3 â€” Issue and PR actions** *(assist mode only â€” skip entirely in report-only mode)*

Each agent defines its own issue title, labels, and PR behaviour in its individual file.
