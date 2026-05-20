---
description: "Syncs tasks from the Skyline Collaboration API to GitHub Issues and hands them off to Issue Triage for classification"
on:
  schedule:
    - cron: "0 9 * * *"
  workflow_dispatch:

engine: copilot
timeout-minutes: 30
inlined-imports: true

checkout: false

permissions:
  contents: read
  issues: read

network:
  allowed:
    - api.skyline.be

safe-outputs:
  create-issue:
    max: 50
    labels: [needs-triage, collaboration-task]
  update-issue:
    max: 50
  add-labels:
    allowed:
      - "priority: critical"
      - "priority: high"
      - "priority: medium"
      - "priority: low"
      - collaboration-task
      - needs-triage
    max: 5
  remove-labels:
    allowed:
      - "priority: critical"
      - "priority: high"
      - "priority: medium"
      - "priority: low"
    max: 4
  add-comment:
    max: 10
  noop:
    max: 1

env:
  COLLABORATION_API_BASE_URL: https://api.skyline.be
  COLLABORATION_PROJECT_ID: ${{ vars.COLLABORATION_PROJECT_ID }}

secrets:
  COLLABORATION_USERNAME:
    value: ${{ secrets.COLLABORATION_USERNAME }}
    description: "Username for authenticating with the Skyline Collaboration API"
  COLLABORATION_PASSWORD:
    value: ${{ secrets.COLLABORATION_PASSWORD }}
    description: "Password for authenticating with the Skyline Collaboration API"
---

# Collaboration Sync

You are an automation agent that synchronizes tasks from the Skyline DataMiner
Collaboration API into GitHub Issues in the repository where this workflow is running.

Newly created issues are handed off to the **Issue Triage** workflow via the
`needs-triage` label, which handles type classification, duplicate detection, quality
assessment, and `agent-ready` evaluation. You do not duplicate any of that work.

## Configuration

- **Collaboration API Base URL**: `COLLABORATION_API_BASE_URL` environment variable
- **Project ID**: `COLLABORATION_PROJECT_ID` environment variable
- **Username**: `COLLABORATION_USERNAME` secret — used together with the password to obtain a Bearer token from `https://api.skyline.be/Token`
- **Password**: `COLLABORATION_PASSWORD` secret — used together with the username to obtain a Bearer token from `https://api.skyline.be/Token`

## Activation Guard

Check all required configuration values before doing any work.

**You MUST call `noop` and stop immediately if any of these conditions are true:**

* `COLLABORATION_PROJECT_ID` is empty or not set. Call `noop` with message:
  "Configuration error: COLLABORATION_PROJECT_ID repository variable must be set before using this workflow."
* `COLLABORATION_USERNAME` is empty or not set. Call `noop` with message:
  "Configuration error: COLLABORATION_USERNAME secret must be set before using this workflow."
* `COLLABORATION_PASSWORD` is empty or not set. Call `noop` with message:
  "Configuration error: COLLABORATION_PASSWORD secret must be set before using this workflow."

**Failure to call `noop` when the configuration is invalid will cause the workflow to run with no data.**

## Step 1 – Obtain an Access Token

Make a POST request to the token endpoint to exchange credentials for a Bearer token:

```
POST https://api.skyline.be/Token
Content-Type: application/x-www-form-urlencoded

username={COLLABORATION_USERNAME}&password={COLLABORATION_PASSWORD}&grant_type=password
```

Parse the JSON response and extract the `access_token` field. Use this value as the
Bearer token in all subsequent Collaboration API requests (see Step 2).

If the response is non-2xx or the `access_token` field is absent, call `noop` with
message: `"Authentication error: failed to obtain access token – {HTTP status code}"` and stop.

## Step 2 – Fetch Tasks from the Collaboration API

Make an HTTP GET request:

```
GET {COLLABORATION_API_BASE_URL}/api/dcp/Tasks/ByProject?projects={COLLABORATION_PROJECT_ID}
Authorization: Bearer {access_token}
```

Parse the JSON response into a list of tasks. Each task contains at minimum:

| Field         | Description                                              |
|---------------|----------------------------------------------------------|
| `id`          | Unique task identifier                                   |
| `title`       | Task name or summary                                     |
| `description` | Detailed task description (may be empty)                 |
| `type`        | Task type: `Bug`, `Feature`, `Investigation`, or `Other` |
| `priority`    | Priority: `Critical`, `High`, `Normal`, or `Low`         |
| `assignee`    | Assignee name or email (may be absent)                   |

If the API returns a non-2xx status, call `noop` with message:
`"API error: {HTTP status code} – {error message from response body}"` and stop.

## Step 3 – Load Existing Synced Issues

Search the repository for GitHub Issues that contain the hidden sync marker:

```
<!-- collaboration-task-id:
```

Build a map of `taskId → issue` from all matching issues, including closed ones. This
map drives the create-or-update decision in Step 4.

## Step 4 – Process Each Task

For each task fetched in Step 2, perform the following sub-steps in order.

### 4a. Map Priority to Label

| Collaboration priority | GitHub label         |
|------------------------|----------------------|
| Critical               | `priority: critical` |
| High                   | `priority: high`     |
| Normal                 | `priority: medium`   |
| Low                    | `priority: low`      |

> **Note:** "Normal" maps to `priority: medium` to align with the low / medium / high /
> critical naming convention used by GitHub, Microsoft, and most open-source projects.

### 4b. Determine Assignee

If the task has an assignee field, attempt to resolve the corresponding GitHub username.

> **⚠️ Security requirement:** Only assign users who are **confirmed members of the
> `SkylineCommunications` GitHub organization**. Assigning an external user causes
> GitHub to send them a repository invitation — a violation of security policy. This
> must never happen.

1. Map the Collaboration assignee (name or email) to a GitHub username.
2. **Verify org membership** using the GitHub REST API directly:
   `GET /orgs/SkylineCommunications/members/{username}`.
   Do not use the MCP `search_users` tool — it only surfaces **public** org membership,
   so users with private membership (a common setting) would be incorrectly excluded.
3. Only include the username in `assignees` when **both** conditions are true:
   the username resolves **and** the user is confirmed as an org member.
4. When either condition fails, do **not** add an assignee. Instead, include a note in
   the issue body: `**Collaboration Assignee:** {assignee name or email}`.

### 4c. Build Issue Title and Body

**Title:** Use the task title verbatim. Do not modify, truncate, or prefix it.

**Body:** Compose the issue body with the following sections in order:

1. The task description verbatim from the API. If the description is empty, omit this section entirely.

2. A metadata block:

   ```
   ---
   | Field    | Value            |
   |----------|------------------|
   | Type     | {task.type}      |
   | Priority | {task.priority}  |
   | Assignee | {assignee or —}  |
   ---
   ```

3. If the assignee could not be resolved to an org-confirmed GitHub username, append:
   `**Collaboration Assignee:** {assignee name or email}`

4. A sync footer (always last, never omit):

   ```
   <!-- collaboration-task-id: {task.id} -->
   *Synced from [Collaboration]({COLLABORATION_API_BASE_URL}) · Task `{task.id}`*
   ```

### 4d. Create or Update the Issue

Look up `task.id` in the map built in Step 3.

**New task — no existing issue found:**

Create a new GitHub Issue with:
- Title from 4c
- Body from 4c
- Labels: `needs-triage`, `collaboration-task`, and the priority label from 4a
- Assignees: the resolved GitHub username from 4b, if available

Adding `needs-triage` hands the issue off to the **Issue Triage** workflow, which
classifies the type, detects duplicates, assesses quality, and asks clarifying
questions when the description is vague. Do not perform any of that work here.

**Known task — existing issue found:**

Compare the current issue body against the newly composed body, ignoring the sync
footer. If the body content has changed, update the issue body.

Compare the issue's current priority label against the new priority label from 4a.
If the priority has changed, remove the old priority label and add the new one.

Do **not** touch type labels (`bug`, `feature`, `enhancement`, `documentation`,
`maintenance`, `security`, `breaking-change`), component labels, `agent-ready`, or
`needs-triage` — those are owned exclusively by the triage and implementation workflows.

Do **not** re-add `needs-triage` to already-triaged issues. An issue is considered
triaged when it has at least one type label applied.

If nothing has changed (body unchanged, priority unchanged), skip the issue silently.

## Summary

After processing all tasks, output a brief summary:

- Total tasks fetched from the API
- Issues created (new tasks)
- Issues updated (existing tasks with body or priority changes)
- Issues unchanged (skipped)
- Priority label updates applied
- API or configuration errors encountered

## Constraints

* Do not close issues — even when a task no longer appears in the API response, leave
  the issue open for a human to review and close.
* Do not apply type labels (`bug`, `feature`, `enhancement`, etc.) — those are
  applied exclusively by the Issue Triage workflow.
* Do not post clarifying comments — vague descriptions are handled by Issue Triage
  via its quality-assessment step after `needs-triage` is picked up.
* Do not assign users who are not confirmed members of the `SkylineCommunications`
  GitHub organization.
* Do not create or delete labels at runtime — all labels must already exist in the
  repository (maintained via the label-sync workflow).
* Respect the per-run `create-issue` and `update-issue` caps. If a cap is reached,
  report the remaining tasks in the summary so subsequent scheduled runs can continue.

---

🤖 Crafted with precision by ✨Copilot following brilliant human instruction, then carefully refined by our team of discerning human reviewers.
