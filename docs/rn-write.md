# 📋 RN Write

> For an overview of all available workflows, see the [main README](../README.md).

**Automated release note entry written when a pull request is merged**

The [RN Write workflow](../workflows/rn-write.md?plain=1)
triggers when a pull request is merged. It reads the diff and any linked issues,
then posts one or more plain-language release note comments — written for a
changelog audience (product owners, technical writers, end-users) rather than
for PR reviewers. A separate comment is posted for each distinct feature, fix,
or behavior the PR delivers — grouping happens downstream in the release note document.

## Installation

### 1. Install the `gh aw` extension

```bash
gh extension install github/gh-aw
```

### 2. Copy the workflow file

Copy [`workflows/rn-write.md`](../workflows/rn-write.md) into the `.github/workflows/` folder of the target repository. This is the only file that needs to be present in the repository — the agent instructions are loaded at runtime from this central `_ReusableAgenticWorkflows` repository (see [How the agent is loaded](#how-the-agent-is-loaded)).

### 3. Compile the workflow

Run the following command from inside the target repository:

```bash
gh aw compile .github/workflows/rn-write.md
```

This generates the final `.github/workflows/rn-write.yml` GitHub Actions file that GitHub actually executes. Re-run this command whenever `rn-write.md` is updated.

### 4. Enable organization-billed Copilot requests

No personal access token is required. In the organization’s Copilot settings,
enable **Allow use of Copilot CLI billed to the organization**. This is enabled
by default when the existing **Copilot CLI** policy is enabled.

The workflow requests this billing mode with `copilot-requests: write` and uses
the built-in GitHub Actions token. Make sure the latest `gh-aw` extension is
installed and recompile the workflow after updates:

```bash
gh extension upgrade aw
gh aw compile .github/workflows/rn-write.md
```

### 5. Create the `rn-request` label

The `rn-proposal` label is created automatically by the workflow the first time it runs. The `rn-request` label must be created manually in the repository:

```bash
gh label create rn-request --color e4e669 --description "Request (re)generation of a release note"
```

Or via **GitHub → Repository → Issues → Labels → New label**.

## How the agent is loaded

The workflow file (`rn-write.md`) does not embed the agent instructions directly. Instead, it imports them at runtime via:

```
{{#runtime-import https://raw.githubusercontent.com/SkylineCommunications/_ReusableAgenticWorkflows/main/agents/rn-write.agent.md}}
```

This means any update to [`agents/rn-write.agent.md`](../agents/rn-write.agent.md) in this central repository is automatically picked up by **all** repositories running the workflow — no redeployment or recompilation required. Changes to agent behavior (writing style, output format, activation logic) can be rolled out org-wide by updating a single file.

## Configuration reference

### Required labels

| Label         | Created by    | Purpose                                              |
|---------------|---------------|------------------------------------------------------|
| `rn-proposal` | Workflow (auto) | Signals that draft release note comments are posted and ready for human review |
| `rn-request`  | Manual (once) | Triggers (re)generation of a release note on an already-merged PR |

### Permissions

| Permission      | Level   | Purpose                                           |
|-----------------|---------|---------------------------------------------------|
| `contents`      | `read`  | Required by the engine (no checkout performed)    |
| `issues`        | `read`  | Read linked issues for context                    |
| `pull-requests` | `read`  | Read PR diff and metadata                         |
| `copilot-requests` | `write` | Bill Copilot CLI requests to the organization     |

The `safe-outputs` declarations (`add-comment`, `add-labels`, `remove-labels`) authorize the engine to post comments and manage labels — no explicit write permission is needed in the permissions block.

## What it does

### Activation

The workflow can be triggered in two ways:

**1. A pull request is merged**
The workflow fires on the `closed` event. The agent checks whether the PR was actually merged (`merged == true`) and proceeds only if it was. Closing a PR without merging produces no output.

**2. Adding the `rn-request` label to an already-merged PR**
Adding `rn-request` to a PR that has already been merged and closed triggers the workflow and (re)generates the release note. This is useful for backfilling release notes or forcing a regeneration when the original output needs replacing.

> ⚠️ **Adding `rn-request` to an open PR does not trigger the workflow.** The activation guard requires `merged == true` — a PR that is still open does not satisfy this condition and the workflow will call `noop` immediately without generating anything.

Bot PRs (`dependabot[bot]`, `github-actions[bot]`) are skipped automatically.

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
