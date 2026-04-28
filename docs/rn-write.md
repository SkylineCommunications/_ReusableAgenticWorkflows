# 📋 RN Write

> For an overview of all available workflows, see the [main README](../README.md).

**Automated release note entry written when a pull request is merged**

The [RN Write workflow](../workflows/rn-write.md?plain=1)
triggers when a pull request is closed. When the PR was merged it reads the
diff and any linked issues, then posts a single plain-language release note
entry as a comment — written for a changelog audience (product owners,
technical writers, end-users) rather than for PR reviewers.

## Installation

```bash
# Install the 'gh aw' extension
gh extension install github/gh-aw

# Add the workflow to your repository
gh aw add-wizard SkylineCommunications/_ReusableAgenticWorkflows/rn-write
```

This walks you through adding the workflow to your repository.

## Configuration

No secrets or variables are required.

### Permissions

| Permission      | Level   | Purpose                                           |
|-----------------|---------|---------------------------------------------------|
| `contents`      | `read`  | Check out nothing — permission required by engine |
| `issues`        | `read`  | Read linked issues for context                    |
| `pull-requests` | `write` | Read PR diff and metadata; post the RN comment    |

## What it does

### Activation

The workflow triggers when a pull request is **closed** (including from forks).

Bot PRs (`dependabot[bot]`, `github-actions[bot]`) are skipped automatically.

It calls `noop` and stops when:

- The PR was closed without merging

### Release note generation

The agent reads the PR title, description, diff, and any linked issues, then
produces a concise (100–250 word) release note entry that covers:

- **What** was delivered and **why**, using changelog-friendly language
  ("Users can now…", "Fixed an issue where…", "Added support for…")
- **User-visible or system-level impact**
- Any **breaking changes, migration steps, or new configuration** operators
  or integrators must act on
- Scope qualification when the change targets a specific product or component

The entry never refers to the PR itself — it is written to stand alone in a
versioned changelog. Single-topic changes are written as flowing prose;
multi-topic changes use a short bullet list.

### Output

The release note is posted as a single comment on the merged PR. A hidden HTML anchor is included so downstream workflows can locate the comment reliably via the GitHub API:

```markdown
<!-- rn-write:release-note -->
## 📋 Release Note

{release note text}

---
🤖 This release note was generated automatically.
```

## What it reads

- PR title, description, and diff
- Linked issues (via "Fixes #", "Closes #", "Resolves #" references)

## What it creates or updates

- **1 comment** on the PR with the plain-language release note entry

## Publishing to an external platform

The hidden `<!-- rn-write:release-note -->` anchor in the comment body lets a
second workflow push the generated entry to your release note platform on
demand. The recommended pattern:

1. `rn-write` runs on merge and posts the RN comment.
2. You review the comment on the closed PR.
3. You add a label (e.g. `publish-rn`) to the PR.
4. A publish workflow listens for `pull_request: types: [labeled]`, filters on
   `label.name == 'publish-rn'`, searches the PR's comments for one containing
   `<!-- rn-write:release-note -->`, extracts the body, and sends it to your
   platform.

This works on closed and merged PRs — GitHub fires `labeled` events regardless
of PR state.

## Human in the Loop

- **Accuracy** — the release note is AI-generated. Review the comment before
  adding the publish label. Edit the comment directly on GitHub if corrections
  are needed — the publish workflow reads whatever text is in the comment at
  the time the label is applied.
- **Unmerged closures** — the workflow fires on all `closed` events; it calls
  `noop` for PRs that were not merged, so no comment is posted in those cases.
