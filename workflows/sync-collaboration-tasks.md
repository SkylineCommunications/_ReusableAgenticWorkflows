---
name: Sync Collaboration Tasks to GitHub Issues
description: |
  Syncs tasks from the Skyline Collaboration API to GitHub Issues.
  Runs daily to fetch all tasks for a configured project and creates
  or updates GitHub issues for tasks based on semantic relevance.
  Applies canonical type and priority labels existant on repo,
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

Check that `COLLABORATION_API_TOKEN` is not empty. If it is empty, stop and output a
clear error message explaining that the `COLLABORATION_API_TOKEN` repository variable
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



#### 4f. Ask clarifying questions on vague tasks

After creating or substantially updating the issue, check whether the task description
is unclear:
- The description (excluding the sync footer) is fewer than 50 characters, **or**
- The description consists only of generic words such as: fix, investigate, test, todo,
  tbd, n/a, unknown, check, review, update, change

If either condition is true, post a comment on the issue:

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
- Number of issues created
- Number of issues updated
- Number of tasks skipped (not relevant / insufficient confidence)
- Number of cross-links added
- Number of clarification comments posted
- Missing-label warnings (if any)
