# 🤖 Issue Implementation

> For an overview of all available workflows, see the [main README](../README.md).

**Automatically analyze `agent-ready` issues and open pull requests with the implementation**

The [Issue Implementation workflow](../workflows/issue-implement.md?plain=1)
triggers when an issue is labeled `agent-ready`. It reads the issue, researches the
codebase, plans the minimal set of changes needed, implements them, and opens a pull
request — all without any manual intervention. When the issue is ambiguous or too
large, it posts a clarifying comment instead of guessing.

## Installation

```bash
# Install the 'gh aw' extension
gh extension install github/gh-aw

# Add the workflow to your repository
gh aw add-wizard SkylineCommunications/_ReusableAgenticWorkflows/issue-implement
```

This walks you through adding the workflow to your repository.

## Configuration

No secrets or variables are required beyond the standard GitHub token provided by
the Actions runner.

### Permissions

| Permission      | Level  | Purpose                                       |
|-----------------|--------|-----------------------------------------------|
| `contents`      | `read` | Check out the codebase for research           |
| `issues`        | `read` | Read the issue title, body, and metadata      |
| `pull-requests` | `read` | Check for existing PRs referencing the issue  |
| `actions`       | `read` | Read workflow files for context               |

### Who can trigger it

Only users with **admin**, **maintainer**, or **write** permission on the repository
can trigger the workflow (by applying the `agent-ready` label). Bot accounts
(`dependabot[bot]`, `github-actions[bot]`) are excluded.

## What it does

### Activation

The workflow only acts when the **triggering label is `agent-ready`**. Any other
label event causes an immediate `noop`.

### Workflow steps

1. **Read the issue** — extracts the title, description, and acceptance criteria.
2. **Research the codebase** — searches relevant files, existing patterns, and
   coding conventions in `.github/instructions/`.
3. **Plan the changes** — outlines a minimal-scope implementation; only what the
   issue asks for.
4. **Implement** — makes the changes, mirroring existing architecture and naming.
5. **Verify** — checks that the changes follow repo conventions and satisfy the
   issue's acceptance criteria.
6. **Open a PR** — creates a pull request referencing the issue. The PR title starts
   with the issue number (e.g., `#42 Fix foo bar`).

If the issue is ambiguous or too large, the agent posts a clarifying comment and
does **not** open a PR.

## What it reads

- Issue title, body, and labels
- Files in the sparse-checkout paths (`.github/workflows/`, `.github/instructions/`,
  `scripts/`, `collections/`, `package.json`, `justfile`)

## What it creates or updates

- Up to **1 pull request** implementing the issue changes
- Up to **5 comments** on the triggering issue (e.g., clarifying questions or status
  updates)

## Human in the Loop

- **Review the PR** — the agent implements what the issue describes; a human reviewer
  must verify correctness, test coverage, and edge cases before merging.
- **Ambiguous issues** — if the agent posts a clarifying comment, answer it and
  re-apply `agent-ready` once the issue description is updated.
- **Large issues** — break oversized issues into smaller, focused ones before
  applying `agent-ready`.
- **Scope creep** — the agent is constrained to the issue scope; if you want
  additional changes, open a separate issue.
