# 📋 PR Summarize

> For an overview of all available workflows, see the [main README](../README.md).

**Automated plain-language summary of pull request changes**

The [PR Summarize workflow](../workflows/pr-summarize.md?plain=1)
runs on every non-draft pull request — including those from forks. It reads
the PR diff and any linked issues, then posts a single plain-language comment
explaining what the PR changes and why, in terms accessible to anyone on the
team — developers, testers, product owners, and technical writers alike.

## Installation

```bash
# Install the 'gh aw' extension
gh extension install github/gh-aw

# Add the workflow to your repository
gh aw add-wizard SkylineCommunications/_ReusableAgenticWorkflows/pr-summarize
```

This walks you through adding the workflow to your repository.

## Configuration

No secrets or variables are required.

### Permissions

| Permission      | Level  | Purpose                                          |
|-----------------|--------|--------------------------------------------------|
| `contents`      | `read` | Check out nothing — permission required by engine |
| `issues`        | `read` | Read linked issues for context                   |
| `pull-requests` | `read` | Read PR diff, description, and metadata          |

## What it does

### Activation

The workflow triggers on pull requests that are:

- **Opened**, **ready for review**, or **synchronised** (new commits pushed)
- From any fork (`forks: ["*"]`)

Bot PRs (`dependabot[bot]`, `github-actions[bot]`) are skipped automatically.

It calls `noop` and stops when:

- The PR is a draft

### Summary generation

The agent reads the PR title, description, diff, and any linked issues, then
produces a concise (100–250 word) plain-English summary that covers:

- **What** changed and **why**
- **User-visible or system-level impact**
- Any **important technical details** for reviewers or testers (new config,
  changed behaviour, migration steps)
- Scope qualification when the change targets a specific product or component

Single-topic changes are written as flowing prose; multi-topic changes use a
short bullet list.

### Output

The summary is posted as a single comment on the PR:

```
## 📋 PR Summary

{summary text}

---
🤖 This summary was generated automatically.
```

## What it reads

- PR title, description, and diff
- Linked issues (via "Fixes #", "Closes #", "Resolves #" references)

## What it creates or updates

- **1 comment** on the PR with the plain-language summary

## Human in the Loop

- **Accuracy** — the summary is AI-generated. If it misses something important
  or gets something wrong, edit or reply to the comment to clarify.
- **Re-runs** — pushing new commits triggers a fresh summary comment. Old
  summary comments are not deleted automatically.
