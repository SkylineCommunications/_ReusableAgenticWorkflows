# 🔄 Sync Collaboration Tasks

> For an overview of all available workflows, see the [main README](../README.md).

**Automatically sync tasks from the Skyline Collaboration API to GitHub Issues**

The [Sync Collaboration Tasks workflow](../workflows/sync-collaboration-tasks.md?plain=1)
runs daily (and can be triggered manually) to fetch tasks from a configured Collaboration
project and then intelligently create or update GitHub Issues based on semantic
relevance. It labels issues using canonical labels declared in `.github/labels.yml`,
assigns them to the right team member, and posts a
clarifying comment when a task description is too short or vague.

## Installation

```bash
# Install the 'gh aw' extension
gh extension install github/gh-aw

# Add the workflow to your repository
gh aw add-wizard SkylineCommunications/_ReusableAgenticWorkflows/sync-collaboration-tasks
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

### Labels

Labels follow the hve-core declarative model:
- Declare labels in `.github/labels.yml` with `name`, `color` (bare hex, no `#`), and `description`
- Sync labels via `.github/workflows/label-sync.yml`
- The task-sync workflow does **not** create labels at runtime

Type and priority labels expected by this workflow:

**Type labels** (mapped from Collaboration task type):

| Collaboration type | GitHub label  |
|--------------------|---------------|
| Bug                | `bug`         |
| Feature            | `enhancement` |
| Investigation      | `question`    |
| Other              | `type: other` |

**Priority labels** (mapped from Collaboration task priority):

| Collaboration priority | GitHub label         |
|------------------------|----------------------|
| Critical               | `priority: critical` |
| High                   | `priority: high`     |
| Normal                 | `priority: medium`   |
| Low                    | `priority: low`      |

> **Note:** "Normal" is intentionally mapped to `priority: medium` to align with the
> industry-standard low / medium / high / critical naming used by GitHub, Microsoft,
> and other open-source projects.

### Customization

To change the label naming scheme, assignee mapping logic, or clarifying-question
text, edit the workflow file at `.github/workflows/sync-collaboration-tasks.md` in
your repository and run:

```bash
gh aw compile
```

to regenerate the lock file.

## What it reads from GitHub

- Candidate issues based on marker, labels, and textual relevance to perform semantic
  deduplication
- The list of labels available in the repository (to detect label-sync drift)
- `SkylineCommunications` organization membership, to verify that a resolved GitHub
  username is an org member before assigning them to an issue (users outside the org
  are never assigned — doing so would send a repository invitation, violating security policy)

## What it reads from the Collaboration API

- `GET /api/dcp/Tasks/ByProject?projects={COLLABORATION_PROJECT_ID}` — all tasks for
  the configured project, including task ID, title, description, type, priority, and
  assignee

## What it creates or updates

- **GitHub Issues** — created or updated from Collaboration tasks, with:
  - Title from the task name
  - Body containing the task description, type, priority, assignee, and the hidden
    `<!-- collaboration-task-id: ... -->` marker plus a semantic sync signature marker
  - Labels for task type (`bug`, `enhancement`, `question`, etc.) and priority
    (`priority: critical`, `priority: high`, etc.)
  - Assignee mapped from the Collaboration assignee field (when resolvable to a GitHub username)
- **Issue comments** — clarifying-question comments on vague tasks and cross-link comments
  when related tasks are split into separate issues

## What web searches it performs

This workflow does not perform any web searches. All data comes from the Collaboration
API and the GitHub API.

## Human in the Loop

- **Review created issues** — verify that the title, description, labels, and assignee
  are correct before beginning work
- **Answer clarifying questions** — when the workflow posts a clarifying-question
  comment, update the issue body or reply in the comment thread with the missing detail
- **Resolve assignee mapping** — if the workflow cannot map a Collaboration assignee to
  a GitHub username, or the user is not a member of the `SkylineCommunications` org,
  the assignee name is included in the issue body; manually assign the issue to the
  correct team member
- **Large backlogs** — if per-run create/update caps are reached, the workflow reports
  the remainder in the run summary and later runs continue from there
- **Label drift** — if expected labels are missing in the repo, run the label-sync
  workflow and re-run task sync
