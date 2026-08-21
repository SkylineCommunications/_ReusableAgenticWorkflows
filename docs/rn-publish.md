# 📤 RN Publish

> For an overview of all available workflows, see the [main README](../README.md).

**Publishes a reviewed release note comment to the Skyline Collaboration platform**

The [RN Publish workflow](../workflows/rn-publish.yml) triggers when the `rn-publish` label is added to a pull request. It finds all `## 📋 Release Note` comments on the PR, converts the Markdown body to HTML, and posts each one to the Skyline Collaboration API (`api.skyline.be/api/ReleaseNotes`). Re-triggering the label updates existing entries rather than creating duplicates.

## Installation

### 1. Copy the workflow file

Copy [`workflows/rn-publish.yml`](../workflows/rn-publish.yml) into the `.github/workflows/` folder of the target repository.

### 2. Add the required secrets

Go to **Repository → Settings → Secrets and variables → Actions → Repository secrets** and add:

| Secret | Value |
|--------|-------|
| `COLLABORATION_USERNAME` | Your Skyline Collaboration platform username |
| `COLLABORATION_PASSWORD` | Your Skyline Collaboration platform password |

### 3. Create the `rn-publish` label

```bash
gh label create rn-publish --color 0075ca --description "Publish the release note to the collaboration platform"
```

Or via **GitHub → Repository → Issues → Labels → New label**.

### 4. (Optional but recommended) Set the `SOLUTION_NAME` variable

If this repository belongs to a named Solution (e.g. InfraOps), set a repository variable so the published entry is correctly categorised on the platform.

Go to **Repository → Settings → Secrets and variables → Actions → Repository variables** and add:

| Variable | Value |
|----------|-------|
| `SOLUTION_NAME` | The exact solution name as it appears in the collaboration platform (e.g. `InfraOps`) |

When `SOLUTION_NAME` is set, the workflow automatically populates `Application: "Solutions"` and `Functionality: [<SOLUTION_NAME>]` in the API payload. When absent, those fields are omitted and the entry is published without a solution category.

## How it works

### Activation

Add the `rn-publish` label to a pull request that has one or more `## 📋 Release Note` comments (produced by the [RN Write](rn-write.md) workflow or written manually). The label triggers the workflow; the label is removed again when publishing completes.

### Processing

For each `## 📋 Release Note` comment found on the PR:

1. **Validates** the required fields (`**Type:**`, `**Breaking Change:**`).
2. **Extracts** the description body (everything after the metadata header) and **converts it from Markdown to HTML** via `pandoc` so the collaboration platform's rich-text editor renders it correctly — paragraphs, bullet lists, `inline code`, **bold**, and *italic* are all preserved.
3. **Looks up `SolutionVersion`** — fetches the latest non-draft GitHub release whose `target_commitish` matches the PR's base branch and uses its tag name. Silently omitted when no matching release exists.
4. **Derives `Scope`** from the `Type` field automatically (see table below).
5. **Calls the API** — POST for a new entry, PATCH if the comment already contains an `<!-- rn-published: {id} -->` marker (idempotent re-publish).
6. **Edits the comment** to append a ✅ line with the published URL and the invisible `<!-- rn-published: {id} -->` marker.

After all entries are processed, the `rn-proposal` and `rn-publish` labels are removed and the `rn-published` label is applied to the PR.

### API fields

| Field | Source | Notes |
|-------|--------|-------|
| `Title` | `**Title:**` in the comment | Falls back to the PR title for comments that predate the Title field |
| `Description` | Comment body (below the metadata header) | Converted from GFM Markdown to HTML via `pandoc -f gfm -t html --wrap=none` |
| `Type` | `**Type:**` in the comment | Must be one of `New Feature/Enhancement`, `Bug Fix`, or `Release Notes` |
| `BreakingChange` | `**Breaking Change:**` in the comment | Must be `true` or `false` |
| `Scope` | Derived from `Type` — see table below | Always included |
| `Application` | Hardcoded `"Solutions"` | Only included when `SOLUTION_NAME` is set |
| `Functionality` | `[<SOLUTION_NAME>]` | Only included when `SOLUTION_NAME` is set |
| `SolutionVersion` | Tag name of the latest non-draft GitHub release for the PR's base branch | Omitted when no matching release exists |
| `InternalComments` | PR URL (`https://github.com/<repo>/pull/<number>`) | Always included |

### Scope mapping

The `Scope` field is derived automatically — no manual input needed:

| Type | Scope |
|------|-------|
| `Bug Fix` | `Regression only` |
| `New Feature/Enhancement` | `Functional` |
| `Release Notes` | `Functional` |

The logic here is that a bug fix restores previous behavior (regression scope), while a new feature or enhancement adds or changes functional behavior.

### Idempotency

Each published comment is edited to include an invisible HTML marker:

```
<!-- rn-published: 12345 -->
```

If the `rn-publish` label is added again later, the workflow detects this marker, looks up the existing entry by ID, and issues a PATCH request to update it — no duplicate entries are created.

## What it reads

- All PR comments matching `## 📋 Release Note`
- The PR's base branch (for `SolutionVersion` lookup)
- GitHub releases for the repository (for `SolutionVersion`)

## What it creates or updates

- **Entries on the Skyline Collaboration platform** — one per matching comment
- **Edits each comment** to append the published URL and idempotency marker
- **Removes** the `rn-proposal` and `rn-publish` labels
- **Applies** the `rn-published` label to the PR

## Manual release notes

The `## 📋 Release Note` heading is all the publish workflow looks for. This means anyone can manually write a release note comment on any PR using the structure below — the agentic `rn-write` workflow does not have to be active in the repository:

```markdown
## 📋 Release Note

**Title:** A short changelog title
**Type:** New Feature/Enhancement
**Breaking Change:** false

The description of the change, written in plain Markdown. Use paragraphs,
bullet lists, `inline code`, **bold**, and *italic* freely — they will be
converted to HTML before being sent to the platform.
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `❌ Missing required secrets` | `COLLABORATION_USERNAME` or `COLLABORATION_PASSWORD` not set | Add them as repository secrets |
| `❌ No release note draft found` | No `## 📋 Release Note` comment on the PR | Run the `rn-write` workflow or add a comment manually |
| `❌ could not find **Type:**` | Comment is missing the `**Type:**` field | Edit the comment to add a valid Type |
| `❌ invalid Type` | Type is not one of the accepted values | Must be `New Feature/Enhancement`, `Bug Fix`, or `Release Notes` |
| `❌ Skyline API update failed` | Authentication or API error | Check secrets; inspect the HTTP status and message in the error comment |
| Description renders as one block on the platform | Old version of the workflow without pandoc | Update to the latest `rn-publish.yml` |
