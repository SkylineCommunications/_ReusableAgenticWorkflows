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

The release note is posted as a single comment on the merged PR. The `## 📋 Release Note` heading is what downstream workflows use to identify and extract the comment:

```markdown
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

The `## 📋 Release Note` heading is what the publish workflow uses to locate the release note comment on a PR. This also means anyone can manually write a `## 📋 Release Note` comment on any PR and use the same publish flow, even on repositories where the agentic workflow is not active.

### End-to-end flow

1. **PR is merged** — the `rn-write` workflow triggers, generates the release note, posts it as a comment, and applies the `rn-ready` label to the PR.
2. **Human reviews** — open the closed PR, read the generated comment. If corrections are needed, edit the comment directly on GitHub. The publish step reads whatever text is in the comment at the moment the label is applied.
3. **Human approves** — add the `rn-publish` label to the PR.
4. **Publish workflow runs** — a GitHub Action triggers on `pull_request: labeled` where `label.name == 'rn-publish'`. It searches the PR's comments for the most recent one containing `## 📋 Release Note`, extracts the body, and pushes it to the release note platform.
5. **Cleanup** — the publish workflow removes the `rn-ready` and `rn-publish` labels and applies `rn-completed` to the PR, marking it as done.

## Human in the Loop

- **Accuracy** — the release note is AI-generated. Always review the comment before applying `rn-publish`. Edit the comment directly on GitHub if corrections are needed.
- **Unmerged closures** — the workflow fires on all `closed` events; it calls `noop` for PRs that were not merged, so no comment or label is applied in those cases.
