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
