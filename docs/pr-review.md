# 🔎 PR Review

> For an overview of all available workflows, see the [main README](../README.md).

**Automated quality review on pull requests before human review**

The [PR Review workflow](../workflows/pr-review.md?plain=1)
runs on every non-draft pull request — including those from forks. It checks issue
alignment, PR template compliance, coding standards, and code quality/security, then
submits a consolidated review. For PRs from maintainers the review is advisory only;
for external contributors it can request changes or convert a severely deficient PR
to draft.

> **Powered by [microsoft/hve-core](https://github.com/microsoft/hve-core)** —
> the review agent is built on Microsoft's hve-core PR review agent, which encodes
> the code review standards and best practices used across Microsoft's own open-source
> repositories. Your contributors get the same quality bar as Microsoft projects,
> automatically.

## Installation

```bash
# Install the 'gh aw' extension
gh extension install github/gh-aw

# Add the workflow to your repository
gh aw add-wizard SkylineCommunications/_ReusableAgenticWorkflows/pr-review
```

This walks you through adding the workflow to your repository.

## Configuration

No secrets or variables are required.

### Permissions

| Permission      | Level  | Purpose                                          |
|-----------------|--------|--------------------------------------------------|
| `contents`      | `read` | Check out the codebase and instruction files     |
| `issues`        | `read` | Read linked issues for alignment checks          |
| `pull-requests` | `read` | Read PR diff, description, and metadata          |
| `actions`       | `read` | Read workflow files for context                  |

### Labels

The workflow manages two labels. Ensure they exist in your repository:

| Label            | Applied when                                      |
|------------------|---------------------------------------------------|
| `needs-revision` | Review verdict is `REQUEST_CHANGES`               |
| `review-passed`  | All checks pass with no issues                    |

## What it does

### Activation

The workflow triggers on pull requests that are:

- **Opened**, **ready for review**, or **synchronised** (new commits pushed)
- From any fork (`forks: ["*"]`)

Bot PRs (`dependabot[bot]`, `github-actions[bot]`) are skipped.

It calls `noop` and stops when:

- The PR is a draft
- The PR has the `skip-review` label **and** the author is a `MEMBER`, `OWNER`,
  or `COLLABORATOR`

### Maintainer advisory mode

When the PR author is a `MEMBER`, `OWNER`, or `COLLABORATOR`, the review switches
to **advisory mode**:

- All findings use `COMMENT` (never `REQUEST_CHANGES`)
- The `needs-revision` label is not applied
- The PR is never converted to draft
- The review summary is prefixed with "Advisory review, this PR is from a maintainer.
  Findings are informational only."

### Review steps

| Step | Check |
|------|-------|
| 1 | **Issue Alignment** — verifies the PR changes address what the linked issue asks for; flags scope creep and missing parts |
| 2 | **PR Template Compliance** — checks all required sections are filled in and checked checkboxes match the actual changes |
| 3 | **Coding Standards** — reads `.github/instructions/` files matching the changed file types and verifies compliance |
| 4 | **Code Quality & Security** — looks for bugs, security vulnerabilities, missing error handling, and performance concerns |

All findings are collected before a single consolidated review is submitted.

### Verdicts

| Verdict             | When (non-maintainer PRs)                                                                     |
|---------------------|-----------------------------------------------------------------------------------------------|
| `APPROVE`           | Never — the workflow does not approve PRs                                                     |
| `COMMENT`           | All required items present but suggestions exist; or minor coding standard deviations         |
| `REQUEST_CHANGES`   | Missing issue link, empty PR description, security vulnerability, critical standards violation |
| Convert to draft    | 5+ critical findings (security, empty description, no linked issue, fundamental misalignment) |

## What it reads

- PR title, description, diff, and labels
- Linked issues (via "Fixes #", "Closes #", "Resolves #" references)
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/instructions/` files applicable to the changed file types
- `.github/copilot-instructions.md`

## What it creates or updates

- Up to **20 inline review comments** on specific lines
- **1 pull-request review** (`COMMENT` or `REQUEST_CHANGES`)
- Up to **3 general comments** on the PR
- **1 label** (`needs-revision` or `review-passed`)
- Optionally converts the PR to draft when critically deficient

## Human in the Loop

- **Final approval** — the workflow never approves; a human reviewer must approve
  and merge.
- **Advisory findings** — for maintainer PRs, review findings are informational; use
  your judgment on whether to act on them.
- **False positives** — close or dismiss findings that are not applicable to your
  specific context.
- **PRs too large to review** — if the PR has more than 50 changed files, the
  workflow requests changes and suggests splitting; the author should split the PR
  before requesting re-review.
