# 🏷️ Issue Triage

> For an overview of all available workflows, see the [main README](../README.md).

**Automatically classify new issues, detect duplicates, and assess implementation readiness**

The [Issue Triage workflow](../workflows/issue-triage.md?plain=1)
runs whenever a new issue is opened or an issue is labeled `needs-triage`. It
classifies the issue by type and component, searches for duplicates, evaluates
quality, and — when all criteria are met — marks the issue `agent-ready` so the
[Issue Implementation](issue-implement.md) workflow can act on it automatically.

> **Powered by [microsoft/hve-core](https://github.com/microsoft/hve-core)** —
> this workflow imports the battle-tested backlog triage, community interaction,
> and backlog planning instruction sets directly from Microsoft's open-source
> hve-core repository. You get the same rigorous issue classification standards
> that Microsoft uses in their own repositories, packaged as a drop-in workflow.

## Installation

```bash
# Install the 'gh aw' extension
gh extension install github/gh-aw

# Add the workflow to your repository
gh aw add-wizard SkylineCommunications/_ReusableAgenticWorkflows/issue-triage
```

This walks you through adding the workflow to your repository.

## Configuration

No secrets or variables are required.

### Permissions

| Permission | Level  | Purpose                                        |
|------------|--------|------------------------------------------------|
| `contents` | `read` | Read repo files when needed for context        |
| `issues`   | `read` | Search for duplicate and related issues        |

### Labels

The workflow manages the following labels. Ensure they exist in your repository
(maintained via a label-sync workflow if you use the hve-core label model):

**Type labels** (applied during triage):

| Label            | When applied                          |
|------------------|---------------------------------------|
| `feature`        | New functionality request             |
| `bug`            | Defect or broken behaviour            |
| `documentation`  | Docs gap or inaccuracy                |
| `maintenance`    | Dependency updates, refactoring       |
| `infrastructure` | CI/CD, tooling, build changes         |
| `enhancement`    | Improvement to existing functionality |
| `security`       | Security-related issue                |
| `breaking-change`| Issue that implies a breaking change  |

**Component labels** (applied during triage):

`agents`, `prompts`, `instructions`, `skills`

**Quality / workflow labels**:

| Label           | Purpose                                                |
|-----------------|--------------------------------------------------------|
| `good-first-issue` | Well-scoped issue suitable for a first contribution |
| `agent-ready`   | Issue is clear enough for automated implementation     |
| `needs-triage`  | Removed once triage is complete                        |

## What it does

### Activation

The workflow activates when:

- A new issue is **opened**, OR
- An issue is **labeled** `needs-triage`

AND the issue does not already have type labels applied.

It calls `noop` and stops when:

- The triggering label is not `needs-triage` (on a `labeled` event)
- The issue already has type labels and does not have `needs-triage`
- The issue is closed

### Triage procedure

1. Reads the issue title, body, labels, and template metadata.
2. Classifies the issue type using conventional commit patterns.
3. Classifies the component from bug-report dropdown fields or body content.
4. Searches for duplicate or related open issues.
5. Assesses issue quality: missing fields, vague descriptions, scope relevance.
6. Removes `needs-triage` and applies the determined type and component labels.
7. Evaluates whether the issue qualifies for `agent-ready` (conservative criteria).

### Output behaviour

| Situation                    | Action                                                                     |
|------------------------------|----------------------------------------------------------------------------|
| Well-formed issue            | Remove `needs-triage`, add type + component labels; add `agent-ready` if qualified |
| Issue needs more information | Remove `needs-triage`, add type if determinable, comment requesting details |
| Potential duplicate found    | Normal triage + comment noting the related issue(s)                        |
| Unclassifiable issue         | Remove `needs-triage`, comment asking for clarification                    |

## What it reads

- Issue title, body, labels, and template metadata
- Open issues (for duplicate detection)

## What it creates or updates

- Label changes on the triaged issue (up to 5 labels added, `needs-triage` removed)
- Up to 3 comments on the issue (duplicate notices, clarifying questions)
- Up to 5 sub-issues (for splitting oversized issues)

## Human in the Loop

- **Review label assignments** — verify the type and component labels are correct,
  especially for ambiguous issues.
- **Answer clarifying questions** — when the workflow requests more detail, update
  the issue body or reply in the comment thread, then re-apply `needs-triage`.
- **Duplicate links** — the workflow notes potential duplicates but does not close
  issues; a human must decide whether to close or keep them.
- **`agent-ready` qualification** — the workflow applies conservative criteria;
  manually add `agent-ready` to issues that qualify but were not automatically
  promoted.
