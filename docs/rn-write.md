# 📋 RN Write

> For an overview of all available workflows, see the [main README](../README.md).

**Automated release note entry written when a pull request is merged**

The [RN Write workflow](../workflows/rn-write.md?plain=1)
triggers when a pull request is closed. When the PR was merged it reads the
diff and any linked issues, then posts one or more plain-language release note
comments — written for a changelog audience (product owners, technical writers,
end-users) rather than for PR reviewers. A separate comment is posted for each
separate feature, fix, or behavior the PR delivers — grouping happens downstream in the release note document.

## Installation

```bash
# Install the 'gh aw' extension
gh extension install github/gh-aw

# Add the workflow to your repository
gh aw add-wizard SkylineCommunications/_ReusableAgenticWorkflows/rn-write
```

This walks you through adding the workflow to your repository.

## Configuration

### Required Labels

The workflow adds and removes labels on PRs. These labels must exist in the repository before the workflow runs:

```bash
gh label create rn-proposal --color 0075ca --description "Release note draft ready for review"
gh label create rn-request  --color e4e669 --description "Request (re)generation of a release note"
```

### Secrets

| Secret                 | Purpose                                              |
|------------------------|------------------------------------------------------|
| `COPILOT_GITHUB_TOKEN` | Required by the `gh aw` engine to run the Copilot-powered agent. The installer creates or reuses this automatically. |

### Permissions

| Permission      | Level   | Purpose                                           |
|-----------------|---------|---------------------------------------------------|
| `contents`      | `read`  | Check out nothing — permission required by engine |
| `issues`        | `read`  | Read linked issues for context                    |
| `pull-requests` | `read`  | Read PR diff and metadata                         |

The `safe-outputs: add-comment`, `add-labels`, and `remove-labels` declarations authorize the engine to post comments and manage labels — no explicit write permission is required in the permissions block.

## What it does

### Activation

The workflow triggers when:

- A pull request is **closed** (the agent skips unmerged closures — see below)
- The `rn-request` label is **added** to any merged PR (useful for backfilling release notes on already-closed PRs)

Bot PRs (`dependabot[bot]`, `github-actions[bot]`) are skipped automatically.

It calls `noop` and stops when:

- The PR was closed without merging
- A label other than `rn-request` was added

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

For a single-topic PR, one comment is posted. When the PR delivers multiple separate features, fixes, or behaviors — even small ones — the agent posts one comment per change (up to five). Grouping happens downstream in the release note document. The publish workflow identifies all matching comments and processes them individually.

Each comment uses this structure:

```markdown
## 📋 Release Note

**Title:** {changelog title}
**Type:** {type}
**Breaking Change:** {true or false}

{release note text}
```

After publishing, the publish workflow edits each comment in-place to append the published URL and an invisible idempotency marker (`<!-- rn-published: {id} -->`). Re-triggering `rn-publish` updates the existing entries rather than creating duplicates.

## What it reads

- PR title, description, and diff
- Linked issues (via "Fixes #", "Closes #", "Resolves #" references)

## What it creates or updates

- **1–5 comments** on the PR (one per distinct release note entry)
- Adds the `rn-proposal` label to signal the drafts are ready for review
- Removes the `rn-request` label

## Publishing to an external platform

The `## 📋 Release Note` heading is what the publish workflow uses to locate the release note comment on a PR. This also means anyone can manually write a `## 📋 Release Note` comment on any PR and use the same publish flow, even on repositories where the agentic workflow is not active.

### End-to-end flow

1. **PR is merged** — the `rn-write` workflow triggers, generates the release note, posts it as a comment, applies the `rn-proposal` label, and removes the `rn-request` label.
2. **Human reviews** — open the closed PR, read the generated comment. If corrections are needed, edit the comment directly on GitHub. The publish step reads whatever text is in the comment at the moment the label is applied.
3. **Human approves** — add the `rn-publish` label to the PR.
4. **Publish workflow runs** — a GitHub Action triggers on `pull_request: labeled` where `label.name == 'rn-publish'`. It finds **all** PR comments containing `## 📋 Release Note` and processes each one: validates the metadata, pushes to the release note platform, and edits the comment in-place to append the published URL and an idempotency marker. Re-triggering `rn-publish` updates existing entries rather than creating duplicates.
5. **Cleanup** — the publish workflow removes the `rn-proposal` and `rn-publish` labels and applies `rn-published` to the PR, marking it as done.

## Human in the Loop

- **Accuracy** — the release note is AI-generated. Always review the comment before applying `rn-publish`. Edit the comment directly on GitHub if corrections are needed.
- **Unmerged closures** — the workflow fires on all `closed` events; the agent checks the `merged` state first and calls `noop` immediately if the PR was not merged, so no comment or label is applied in those cases.
