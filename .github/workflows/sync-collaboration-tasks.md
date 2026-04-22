---
name: Sync Collaboration Tasks to GitHub Issues
description: >
  Reusable agentic workflow that syncs tasks from the Skyline Collaboration API
  to GitHub Issues. Designed to be called via workflow_call from other repositories,
  which can schedule it (e.g., every 5 minutes) using a cron trigger. Creates new
  issues for tasks that don't yet have a corresponding issue; existing issues are
  not modified. Applies labels by type and priority, assigns team members, and asks
  clarifying questions on vague descriptions.
source: SkylineCommunications/_ReusableAgenticWorkflows/.github/workflows/sync-collaboration-tasks.md@main
on:
  workflow_call:
    inputs:
      collaboration_project_id:
        description: >
          Collaboration Project ID. If omitted, falls back to the
          COLLABORATION_PROJECT_ID repository variable of the calling repo.
        required: false
        type: string
    secrets:
      COLLABORATION_API_TOKEN:
        description: "Bearer token for authenticating with the Skyline Collaboration API."
        required: true
  workflow_dispatch:
    inputs:
      collaboration_project_id:
        description: "Collaboration Project ID (falls back to COLLABORATION_PROJECT_ID repo variable)"
        required: false
        type: string
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
  COLLABORATION_PROJECT_ID: ${{ inputs.collaboration_project_id || vars.COLLABORATION_PROJECT_ID }}
secrets:
  COLLABORATION_API_TOKEN:
    value: ${{ secrets.COLLABORATION_API_TOKEN }}
    description: "Bearer token for authenticating with the Skyline Collaboration API"
---

# Sync Collaboration Tasks to GitHub Issues

You are an automation agent that synchronizes tasks from the Skyline DataMiner
Collaboration API into GitHub Issues in the repository where this workflow is running.

## Configuration

- **Collaboration API Base URL**: `https://skyline-api.dataminer.services`
- **Project ID**: available in the `COLLABORATION_PROJECT_ID` environment variable
- **API Token**: available in the `COLLABORATION_API_TOKEN` environment variable — use it as a Bearer token in all Collaboration API requests

## Steps to Follow

### 1. Validate configuration

Check that `COLLABORATION_PROJECT_ID` is not empty. If it is empty, stop and output a
clear error message explaining that the `COLLABORATION_PROJECT_ID` repository variable
(or workflow input) must be set.

### 2. Fetch tasks from the Collaboration API

Make an HTTP GET request:

```
GET https://skyline-api.dataminer.services/api/dcp/Tasks/ByProject?projects=<COLLABORATION_PROJECT_ID>
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

Use the GitHub tools to list all issues in this repository (open and closed).
You will use these to detect duplicates.

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

Map the task's **type** to a GitHub label:

| Collaboration type | GitHub label  |
|--------------------|---------------|
| Bug                | `type: Bug`   |
| Feature            | `type: Feature` |
| Investigation      | `type: Investigation` |
| Any other value    | `type: <TypeName>` (preserve original casing) |

Map the task's **priority** to a GitHub label:

| Collaboration priority | GitHub label         |
|------------------------|----------------------|
| Critical               | `priority: Critical` |
| High                   | `priority: High`     |
| Normal                 | `priority: Normal`   |
| Low                    | `priority: Low`      |
| Unknown / empty        | `priority: Normal`   |

Only include labels that actually exist in this repository. If a label does not exist,
skip it (do not fail) and mention the missing label in the issue body.

#### 4c. Determine assignee

If the task has an assignee field, try to identify the corresponding GitHub username.
- If you can determine the GitHub username, include it in the `assignees` list.
- If you cannot confidently map the assignee to a GitHub username, add a note in the
  issue body: `**Assignee (Collaboration):** <assignee name or email>`.

#### 4d. Build the issue body

Use this template for the issue body:

```
<task description>

---
**Type:** <task type>
**Priority:** <task priority>
**Collaboration Assignee:** <assignee name or email, or "Unassigned">

*Synced automatically from the Skyline Collaboration API.*

<!-- collaboration-task-id: TASK_ID -->
```

The `<!-- collaboration-task-id: TASK_ID -->` HTML comment is **mandatory** — it is the
duplicate-detection marker used on every subsequent run.

#### 4e. Create the GitHub Issue

Create a new issue with:
- **title**: the task's name/title
- **body**: the body from step 4d
- **labels**: the mapped labels (type + priority) that exist in the repo
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
