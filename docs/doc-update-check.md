# 📝 Documentation Update Check

> For an overview of all available workflows, see the [main README](../README.md).

**Automatically detect stale documentation after code changes and open focused issues for updates**

The [Documentation Update Check workflow](../workflows/doc-update-check.md?plain=1)
runs on every push to `main` that touches code files. It compares the changed code
against its mapped documentation, and when documentation is found to be stale it
opens a GitHub Issue so the gap is tracked and can be resolved — either manually or
by the [Issue Implementation](issue-implement.md) workflow.

> **Originally from [microsoft/hve-core](https://github.com/microsoft/hve-core)** —
> this workflow originates from Microsoft's open-source hve-core repository, which
> provides battle-tested agentic workflow patterns used across Microsoft's own projects.
> Adopting it means you get the same documentation health monitoring that Microsoft
> ships and maintains — automatically detecting stale docs and filing well-formed
> issues — with no extra effort on your part.

## Installation

```bash
# Install the 'gh aw' extension
gh extension install github/gh-aw

# Add the workflow to your repository
gh aw add-wizard SkylineCommunications/_ReusableAgenticWorkflows/doc-update-check
```

This walks you through adding the workflow to your repository.

## Configuration

No secrets or variables are required.

### Permissions

| Permission | Level  | Purpose                               |
|------------|--------|---------------------------------------|
| `contents` | `read` | Read changed files and documentation  |
| `issues`   | `read` | Search for existing open issues       |

### Labels

The workflow creates issues with the labels `documentation` and `needs-triage`.
Ensure these labels exist in your repository (they are created by a label-sync
workflow if you use the hve-core label model).

The `agent-ready` label is also applied to created issues so the
[Issue Implementation](issue-implement.md) workflow can pick them up automatically.

## What it does

### Activation

The workflow activates on pushes to `main` that modify files under:

```
scripts/**
.github/agents/**
.github/instructions/**
.github/skills/**
.github/prompts/**
extension/**
collections/**
.devcontainer/**
.github/workflows/**   (excluding lock files)
```

Bot pushes from `dependabot[bot]` and `github-actions[bot]` are skipped automatically.

It calls `noop` and stops when:

- All changed files are documentation files under `docs/`
- Every changed code file already has its mapped documentation updated in the same push

### Procedure

1. Reads the list of files changed in the push.
2. Filters out documentation-only changes.
3. For each changed code file, identifies the corresponding documentation using the
   mapping defined in the imported agent instructions.
4. Reads the referenced documentation and compares it against the current implementation.
5. Searches for existing open issues covering the same documentation gap to avoid duplicates.
6. Creates a new issue for each stale documentation file not already tracked.

## What it reads

- Files changed in the triggering push (from the event context)
- Documentation files mapped to the changed code files
- Open issues (to detect duplicates before creating new ones)

## What it creates

- Up to **3 GitHub Issues per push**, each:
  - Prefixed with `docs:` in the title
  - Using the bug-report issue template structure
  - Labelled `documentation`, `needs-triage`, and `agent-ready`

## Human in the Loop

- **Review created issues** — verify the stale documentation description is accurate
  before acting on it.
- **Cap reached** — if more than 3 documentation gaps are detected in a single push,
  only 3 issues are created; re-run or manually create issues for the rest.
- **False positives** — close issues where the documentation is intentionally brief
  or the code change is purely cosmetic.
