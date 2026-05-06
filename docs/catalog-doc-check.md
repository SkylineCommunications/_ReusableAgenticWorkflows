# 📋 Catalog Documentation Check

> For an overview of all available workflows, see the [main README](../README.md).

**Manually validates the CatalogInformation README against Catalog item documentation standards**

The [Catalog Documentation Check workflow](../workflows/catalog-doc-check.md?plain=1)
is run on demand on a repository. It reads `CatalogInformation/README.md` and
validates it against the documentation best practices for Catalog items published
on dataminer.services. When violations are found, it opens a single issue in the
repository summarising all findings. When the documentation meets all standards,
it reports compliance and takes no further action.

## Installation

```bash
# Install the 'gh aw' extension
gh extension install github/gh-aw

# Add the workflow to your repository
gh aw add-wizard SkylineCommunications/_ReusableAgenticWorkflows/catalog-doc-check
```

This walks you through adding the workflow to your repository.

## Configuration

### Secrets

| Secret                 | Purpose                                              |
|------------------------|------------------------------------------------------|
| `COPILOT_GITHUB_TOKEN` | Required by the `gh aw` engine to run the Copilot-powered agent. The installer creates or reuses this automatically. |

### Permissions

| Permission  | Level      | Purpose                                                       |
|-------------|------------|---------------------------------------------------------------|
| `read-all`  | (all read) | Read repository contents and issues                           |

The `safe-outputs: create-issue` declaration authorizes the engine to open issues in a controlled way — no explicit write permission is required in the permissions block.

## What it does

### Activation

The workflow runs **manually** via `workflow_dispatch` — it is not triggered by pull requests or other events. Run it at any time to validate the current state of the Catalog documentation in a repository.

### Validation procedure

The agent reads `CatalogInformation/README.md` and runs 8 checks in order:

1. **README existence** — verifies `CatalogInformation/README.md` exists
2. **About section** — present, value-focused, no generic DataMiner capabilities
3. **Key Features section** — present, at most 5 features, benefit-oriented language
4. **Use Cases section** — if included, uses specific non-hypothetical real-world examples
5. **Prerequisites section** — if included, lists DataMiner version in both Feature Release and Main Release tracks
6. **Technical Reference section** — if detailed docs exist externally, links rather than duplicates
7. **Visuals** — relevant, high quality, max 3, GIFs at most 10 seconds, no sensitive data
8. **Contact/support references** — no support contacts or email addresses in the documentation body

### Severity levels

| Level | Meaning |
|-------|---------|
| `[ERROR]` | Must be fixed — blocks Catalog publication |
| `[WARNING]` | Should be addressed — degrades documentation quality |
| `[INFO]` | Informational — no enforcement |

### Output

| Situation | Action |
|-----------|--------|
| Findings exist, no open issue yet | Opens a new issue titled `[Catalog Doc] CatalogInformation/README.md — documentation validation findings` |
| Findings exist, open issue already present | Updates the existing issue body with the latest results |
| Fixes can be determined automatically | Creates a pull request with the proposed changes to `CatalogInformation/README.md` |
| All checks pass, open issue exists | Closes the issue with state `completed` |
| All checks pass, no open issue | No action taken — reports compliance |

## What it reads

- `CatalogInformation/README.md`

## What it creates or updates

- **1 issue** when violations are found — updated in place on subsequent runs, closed automatically when all checks pass
- **1 pull request** (optional) when the agent can determine concrete fixes for reported violations

## Human in the Loop

- **Re-run to refresh** — run the workflow again after addressing findings to update the issue and confirm compliance. Apply the `catalog-doc-check` label to the open issue to trigger a re-run from the issue itself.
- **Review the PR** — if a pull request was created with proposed fixes, review and merge it, then re-run the workflow to confirm the issue is resolved.
- **N/A checks** — some sections (Use Cases, Prerequisites, Technical Reference, Visuals) are optional. The agent marks them N/A when not present and the item does not require them.
- **False positives** — if the agent flags something incorrectly, edit the issue body to note the exception before closing it.
