---
name: Sync Collaboration Tasks to GitHub Issues
description: |
  Syncs tasks from the Skyline Collaboration API to GitHub Issues.
  Runs daily to fetch all tasks for a configured project and creates
  new GitHub issues for tasks that don't yet have a corresponding issue.
  Applies type and priority labels (creating them if they don't exist),
  assigns team members based on task assignees,
  and posts clarifying questions on vague or short descriptions.
source: SkylineCommunications/_ReusableAgenticWorkflows/workflows/sync-collaboration-tasks.md@main
on:
  schedule:
    - cron: "0 9 * * *"
  workflow_dispatch:

permissions:
  issues: read
  contents: read
  pull-requests: read

tools:
  github:
    toolsets: [default]
  web-fetch: {}

network:
  allowed:
    - skyline-api.dataminer.services

safe-outputs:
  create-issue:
    max: 50
  add-comment:
    max: 100
  update-issue:
    max: 50

env:
  COLLABORATION_API_BASE_URL: https://skyline-api.dataminer.services
  COLLABORATION_PROJECT_ID: ${{ vars.COLLABORATION_PROJECT_ID }}

secrets:
  COLLABORATION_API_TOKEN:
    value: ${{ secrets.COLLABORATION_API_TOKEN }}
    description: "Bearer token for authenticating with the Skyline Collaboration API"
---

# Sync Collaboration Tasks to GitHub Issues

You are an automation agent that synchronizes tasks from the Skyline DataMiner
Collaboration API into GitHub Issues in the repository where this workflow is running.

## Configuration

- **Collaboration API Base URL**: available in the `COLLABORATION_API_BASE_URL` environment variable
- **Project ID**: available in the `COLLABORATION_PROJECT_ID` environment variable
- **API Token**: available in the `COLLABORATION_API_TOKEN` environment variable — use it as a Bearer token in all Collaboration API requests

## Steps to Follow

### 1. Validate configuration

Check that `COLLABORATION_PROJECT_ID` is not empty. If it is empty, stop and output a
clear error message explaining that the `COLLABORATION_PROJECT_ID` repository variable
must be set before using this workflow.

### 2. Fetch tasks from the Collaboration API

Make an HTTP GET request using the `COLLABORATION_API_BASE_URL` environment variable:

```
GET $COLLABORATION_API_BASE_URL/api/dcp/Tasks/ByProject?projects=<COLLABORATION_PROJECT_ID>
Authorization: Bearer <COLLABORATION_API_TOKEN>
```

Parse the JSON response into a list of tasks. Each task has at minimum:
- A unique task ID
- A title/name
- A description
- A type (e.g., Bug, Feature, Investigation)
- A priority (e.g., Critical, High, Normal, Low)
- An assignee (name, email, or username — may be absent)

If the API returns an error, stop and report the HTTP status code and error message.

### 3. Retrieve existing GitHub Issues

Use the GitHub search tools to find issues in this repository whose body contains the
`<!-- collaboration-task-id:` marker. Build an index of task IDs from matching issues
to detect duplicates efficiently (avoid listing all open and closed issues, which is
slow and may hit API rate limits).

### 4. Process each task

For every task returned by the Collaboration API:

#### 4a. Duplicate check

Search the existing issues for a body that contains the marker:

```
<!-- collaboration-task-id: TASK_ID -->
```

where `TASK_ID` is the task's unique identifier. If a matching issue already exists,
skip this task entirely — do **not** create a duplicate.

#### 4b. Determine labels

Map the task's **type** to an industry-standard GitHub label:

| Collaboration type | GitHub label    | Color     | Description                          |
|--------------------|-----------------|-----------|--------------------------------------|
| Bug                | `bug`           | `#d73a4a` | Something isn't working              |
| Feature            | `enhancement`   | `#a2eeef` | New feature or request               |
| Investigation      | `question`      | `#d876e3` | Further information is requested     |
| Any other value    | `type: <TypeName>` | `#e4e669` | (preserve original casing)        |

Map the task's **priority** to a GitHub label:

| Collaboration priority | GitHub label         | Color     |
|------------------------|----------------------|-----------|
| Critical               | `priority: critical` | `#b60205` |
| High                   | `priority: high`     | `#e99695` |
| Normal                 | `priority: medium`   | `#fbca04` |
| Low                    | `priority: low`      | `#0075ca` |
| Unknown / empty        | `priority: medium`   | `#fbca04` |

> **Note:** "Normal" is intentionally mapped to `priority: medium` to align with the
> industry-standard low / medium / high / critical naming used by GitHub, Microsoft,
> and other open-source projects.

For each label: first check whether it already exists in the repository. If it does
not exist, **create it** using the color and description from the tables above before
applying it to the issue. Do not skip labels — always ensure they exist before use.

#### 4c. Determine assignee

If the task has an assignee field, try to identify the corresponding GitHub username.

> **⚠️ Security requirement:** Only assign users who are **confirmed members of the
> `SkylineCommunications` GitHub organization**. Assigning a user who is not an org
> member causes GitHub to send them a repository invitation, which would grant an
> outsider access to the repository — a violation of security policy. This must never
> happen.

Follow these steps:
1. Map the Collaboration assignee (name or email) to a GitHub username.
2. **Verify org membership**: use the GitHub API to confirm the resolved username is a
   member of the `SkylineCommunications` organization
   (`GET /orgs/SkylineCommunications/members/<username>`).
   This REST call is used instead of the MCP `search_users` tool because the MCP
   user-search only surfaces **public** org membership; users who have their membership
   set to private — a common situation — would be incorrectly excluded.
3. Only if **both** steps succeed (username resolved **and** confirmed org member),
   include the username in the `assignees` list.
4. In all other cases — username cannot be resolved, or user is not an org member —
   do **not** add them to `assignees`. Instead, add a note in the issue body:
   `**Collaboration Assignee:** <assignee name or email>`.

#### 4d. Build the issue body

Use this template for the issue body:

```
<task description>

---
**Type:** <task type>
**Priority:** <task priority>
**Collaboration Assignee:** <assignee name or email, or "Unassigned">
**Missing Labels:** <comma-separated list of labels that could not be created, or omit this line if all labels were applied>

*Synced automatically from the Skyline Collaboration API.*

<!-- collaboration-task-id: TASK_ID -->
```

The `<!-- collaboration-task-id: TASK_ID -->` HTML comment is **mandatory** — it is the
duplicate-detection marker used on every subsequent run.

#### 4e. Create the GitHub Issue

> **Note:** This workflow is capped at creating **50 issues per run**. If there are
> more than 50 new tasks to sync, stop processing once the cap is reached and include
> a clear message in the run summary explaining that not all tasks were synced; the
> remaining tasks will be picked up on the next scheduled run.

Create a new issue with:
- **title**: the task's name/title
- **body**: the body from step 4d
- **labels**: the mapped labels (type + priority) — all labels must be ensured to exist before applying (see step 4b)
- **assignees**: the resolved GitHub username(s), if any

#### 4f. Ask clarifying questions on vague tasks

After creating the issue, check whether the task description is unclear:
- The description (excluding the sync footer) is fewer than 50 characters, **or**
- The description consists only of generic words such as: fix, investigate, test, todo,
  tbd, n/a, unknown, check, review, update, change

If either condition is true, post a comment on the newly created issue:

```
Hi! 👋 This task was imported from the Collaboration API but the description seems a
bit brief. To help the team work on this effectively, could you please clarify:

1. **Expected outcome**: What should the result look like when this is done?
2. **Current situation**: What is the current state or problem?
3. **Steps to reproduce** (if applicable): How can we reproduce or verify the issue?
4. **Acceptance criteria**: How will we know this task is complete?

Thank you! 🙏
```

## Summary

After processing all tasks, output a brief summary:
- Number of tasks fetched
- Number of new issues created
- Number of duplicate tasks skipped
- Number of clarification comments posted
