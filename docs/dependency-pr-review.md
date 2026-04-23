# 🔍 Dependency PR Review

> For an overview of all available workflows, see the [main README](../README.md).

**Automatically review and approve Dependabot version bump pull requests after safety validation**

The [Dependency PR Review workflow](../workflows/dependency-pr-review.md?plain=1)
triggers on every pull request that touches dependency files. When the PR author is
`dependabot[bot]`, it inspects the version bumps, verifies license compatibility and
SHA pinning, and either approves the PR or leaves a comment explaining what requires
human attention.

> **Built on [microsoft/hve-core](https://github.com/microsoft/hve-core) standards** —
> the safety checks and coding conventions applied by this workflow follow the
> hve-core instruction set, the same guidelines Microsoft uses to keep their own
> repositories secure and consistent.

## Installation

```bash
# Install the 'gh aw' extension
gh extension install github/gh-aw

# Add the workflow to your repository
gh aw add-wizard SkylineCommunications/_ReusableAgenticWorkflows/dependency-pr-review
```

This walks you through adding the workflow to your repository.

## Configuration

No secrets or variables are required. The workflow reads the PR diff and Dependabot's
own release notes directly from the GitHub API.

### Permissions

| Permission      | Level  | Purpose                           |
|-----------------|--------|-----------------------------------|
| `contents`      | `read` | Check out dependency files        |
| `pull-requests` | `read` | Read PR diff and metadata         |

## What it does

### Activation

The workflow only acts on PRs where:

- The author is `dependabot[bot]`
- The PR is not a draft
- At least one dependency file is modified in the diff

If none of these conditions are met, it calls `noop` and stops without leaving any trace.

### Safety checks

For each changed dependency the workflow verifies:

- **License compatibility** — the new version's license must remain compatible with MIT.
- **SHA pinning** — GitHub Actions references must use commit SHA pins with a version comment.
- **No new dependencies** — Dependabot bumps existing dependencies only; new entries are flagged.
- **No known vulnerabilities** — cross-checks Dependabot's own vulnerability assessment.
- **Environment sync** — `.devcontainer/` and `copilot-setup-steps.yml` must remain consistent when both are touched.

### Verdicts

| Verdict            | When                                                                                  |
|--------------------|---------------------------------------------------------------------------------------|
| **Approve**        | Patch or minor bump, no license issues, SHA pinning satisfied, no env-sync violations |
| **Comment**        | Major bump, license change (permissive), changelog mentions breaking changes, env-sync needs verification |
| **Request changes**| License incompatible with MIT, missing SHA pinning, clear env-sync violation          |

## What it reads

- PR title, description, and diff
- Dependabot's changelog links and release notes from the PR body

## What it creates or updates

- A single pull-request review (`APPROVE`, `COMMENT`, or `REQUEST_CHANGES`) with a
  summary of each dependency bump and any findings
- Up to 5 inline review comments for line-level findings

## Human in the Loop

- **Major version bumps** — always require human review; the workflow leaves a comment
  summarising what changed but does not approve.
- **License changes** — even permissive license changes require human confirmation.
- **Environment sync issues** — verify that `.devcontainer/` and `copilot-setup-steps.yml`
  are kept in sync whenever both are affected.
