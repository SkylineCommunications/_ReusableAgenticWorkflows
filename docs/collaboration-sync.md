# 🔄 Collaboration Sync

> For an overview of all available workflows, see the [main README](../README.md).

**Automatically sync tasks from the Skyline Collaboration API to GitHub Issues — and hand them off to Issue Triage for classification**

The [Collaboration Sync workflow](../workflows/collaboration-sync.md?plain=1)
runs daily (and can be triggered manually) to fetch all tasks from a configured
Collaboration project and create or update GitHub Issues. Each newly created issue is
immediately handed off to the [Issue Triage](issue-triage.md) workflow via the
`needs-triage` label, which classifies the type, detects duplicates, evaluates quality,
and marks qualifying issues `agent-ready`. The two workflows own distinct
responsibilities and never duplicate each other's work.

## Installation

```bash
# Install the 'gh aw' extension
gh extension install github/gh-aw

# Add the workflow to your repository
gh aw add-wizard SkylineCommunications/_ReusableAgenticWorkflows/collaboration-sync
```

This walks you through adding the workflow to your repository.

## Configuration

### Required secrets

| Secret | Description |
|--------|-------------|
| `COLLABORATION_API_TOKEN` | Bearer token for authenticating with `https://skyline-api.dataminer.services` |

### Required variables

| Variable | Description |
|----------|-------------|
| `COLLABORATION_PROJECT_ID` | The Collaboration project ID to sync tasks from |

Set these in your repository under **Settings → Secrets and variables → Actions**.

### Permissions

| Permission | Level  | Purpose                                     |
|------------|--------|---------------------------------------------|
| `contents` | `read` | Read repository context                     |
| `issues`   | `read` | Search for existing synced issues           |

### Labels

The workflow applies and manages the following labels. Ensure they exist in your
repository (maintained via a label-sync workflow if you use the hve-core label model):

| Label                | Applied when                                                          |
|----------------------|-----------------------------------------------------------------------|
| `needs-triage`       | Every newly created issue — triggers the Issue Triage workflow        |
| `collaboration-task` | Every issue created or confirmed by this workflow                     |
| `priority: critical` | Task priority is Critical                                             |
| `priority: high`     | Task priority is High                                                 |
| `priority: medium`   | Task priority is Normal                                               |
| `priority: low`      | Task priority is Low                                                  |

> **Note:** "Normal" priority maps to `priority: medium` to align with the
> low / medium / high / critical convention used by GitHub, Microsoft, and most
> open-source projects.

## Workflow integration

This workflow is designed to work alongside the **Issue Triage** workflow. Each owns a
distinct responsibility so they never duplicate each other's work:

| Concern                                              | Owner                       |
|------------------------------------------------------|-----------------------------|
| Create a GitHub Issue from a Collaboration task      | **Collaboration Sync** |
| Update issue body when task description changes      | **Collaboration Sync** |
| Update priority label when task priority changes     | **Collaboration Sync** |
| Classify issue type (`bug`, `feature`, etc.)         | **Issue Triage**            |
| Detect duplicate issues                              | **Issue Triage**            |
| Assess description quality / ask clarifying questions | **Issue Triage**           |
| Evaluate `agent-ready` eligibility                   | **Issue Triage**            |

The handoff mechanism is the `needs-triage` label: this workflow applies it when
creating a new issue, which automatically triggers the Issue Triage workflow. For
already-triaged issues (updates), only the body and priority label are modified — all
classification labels are left intact.

## What it does

### Activation

The workflow runs:

- **Daily at 09:00 UTC** (scheduled)
- **On demand** via `workflow_dispatch`

It calls `noop` and stops when:

- `COLLABORATION_PROJECT_ID` is not set
- `COLLABORATION_API_TOKEN` is not set
- The Collaboration API returns a non-2xx response

### Procedure

1. **Validate configuration** — verifies both required config values are present.
2. **Fetch tasks** — calls `GET /api/dcp/Tasks/ByProject?projects={id}` with the
   configured Bearer token.
3. **Load existing synced issues** — scans the repository for issues containing the
   hidden `<!-- collaboration-task-id: ... -->` marker to build a task-ID → issue map.
4. **Process each task**:
   - Maps the Collaboration priority to a GitHub `priority:` label.
   - Resolves the assignee to a GitHub username and verifies org membership
     (see [Assignee security](#assignee-security) below).
   - Composes the issue title and body (description, metadata table, sync footer).
   - **New task**: creates a GitHub Issue with `needs-triage`, `collaboration-task`, and
     the priority label. The Issue Triage workflow takes it from there.
   - **Known task**: updates the issue body if the task description changed, and updates
     the priority label if the priority changed. All other labels are untouched.
5. **Output summary** — reports counts of tasks fetched, issues created, updated,
   unchanged, and any errors.

### Output behaviour

| Situation               | Action                                                                        |
|-------------------------|-------------------------------------------------------------------------------|
| New Collaboration task  | Create issue with `needs-triage` + `collaboration-task` + priority label      |
| Task description changed | Update issue body                                                            |
| Task priority changed   | Remove old priority label, add new priority label                             |
| Task unchanged          | Skip silently                                                                 |
| Config missing          | `noop` with descriptive error message                                         |
| API error               | `noop` with HTTP status and error message                                     |

### Assignee security

Before assigning any GitHub user to an issue, the workflow verifies that the user is a
**confirmed member of the `SkylineCommunications` GitHub organization** via the GitHub
REST API (`GET /orgs/SkylineCommunications/members/{username}`). Users who cannot be
resolved to a GitHub username, or who are not confirmed org members, are never assigned
— doing so would send them a repository invitation and grant an outside party
repository access.

When assignment is not possible, the original Collaboration assignee name or email is
included in the issue body as a plain-text note so a human can assign manually.

## What it reads

- **Collaboration API** — `GET /api/dcp/Tasks/ByProject?projects={id}`: task list with
  ID, title, description, type, priority, and assignee
- **GitHub Issues** — existing issues with the `<!-- collaboration-task-id: ... -->`
  marker (for create-or-update decisions)
- **GitHub organization members** — `GET /orgs/SkylineCommunications/members/{username}`
  (for assignee security verification)

## What it creates or updates

- **GitHub Issues** — created or updated from Collaboration tasks, each containing:
  - Task title as the issue title
  - Task description, a metadata table (type, priority, assignee), and the hidden
    `<!-- collaboration-task-id: ... -->` sync marker in the body
  - `needs-triage` + `collaboration-task` + priority label on creation
  - Updated body and/or priority label on subsequent syncs
  - Assignee mapped from the Collaboration field when resolvable and org-verified
- **Label changes** — priority label removed/added when a task's priority changes

## What it does NOT do

- Does not classify issue type — that is done by Issue Triage.
- Does not post clarifying questions — that is done by Issue Triage.
- Does not evaluate `agent-ready` — that is done by Issue Triage.
- Does not close issues — even when a task no longer appears in the API response.
- Does not create or delete labels at runtime.

## Human in the Loop

- **Review created issues** — verify that the title, description, labels, and assignee
  are correct before beginning work. The Issue Triage workflow will have already
  classified the type and flagged any quality concerns.
- **Resolve assignee mapping** — when the workflow cannot resolve a Collaboration
  assignee to a verified org member, the name or email appears in the issue body.
  Manually assign the issue to the correct team member.
- **Answer clarifying questions** — when the Issue Triage workflow posts a clarifying
  comment on a synced issue, update the issue body or reply in the thread, then
  re-apply `needs-triage` to trigger a re-triage.
- **Closed tasks** — when a Collaboration task is completed, the corresponding GitHub
  Issue remains open until a human closes it after verifying the work is done.
- **Cap reached** — if the per-run create or update cap is reached, the run summary
  lists the remaining tasks. Subsequent scheduled runs will continue the sync.
- **Label drift** — if expected labels (`priority: critical`, `priority: high`, etc.)
  are missing from the repository, run the label-sync workflow and re-trigger this
  workflow.
