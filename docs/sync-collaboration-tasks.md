# 🔄 Sync Collaboration Tasks

> For an overview of all available workflows, see the [main README](../README.md).

**Automatically sync tasks from the Skyline Collaboration API to GitHub Issues**

The [Sync Collaboration Tasks workflow](../workflows/sync-collaboration-tasks.md?plain=1)
runs daily (and can be triggered manually) to fetch tasks from a configured Collaboration
project and create GitHub Issues for any tasks that don't already have a corresponding
issue. It labels issues using industry-standard GitHub labels (creating them automatically
if they don't exist), assigns them to the right team member, and posts a
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

The workflow uses industry-standard GitHub labels and **automatically creates them**
if they don't already exist in your repository. No manual label setup is required.

**Type labels** (mapped from Collaboration task type):

| Collaboration type | GitHub label    | Color     |
|--------------------|-----------------|-----------|
| Bug                | `bug`           | `#d73a4a` |
| Feature            | `enhancement`   | `#a2eeef` |
| Investigation      | `question`      | `#d876e3` |
| Other              | `type: <name>`  | `#e4e669` |

**Priority labels** (mapped from Collaboration task priority):

| Collaboration priority | GitHub label         | Color     |
|------------------------|----------------------|-----------|
| Critical               | `priority: critical` | `#b60205` |
| High                   | `priority: high`     | `#e99695` |
| Normal                 | `priority: medium`   | `#fbca04` |
| Low                    | `priority: low`      | `#0075ca` |

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

- Issues matching the `<!-- collaboration-task-id: ... -->` marker (searched via GitHub
  search to detect duplicates efficiently)
- The list of labels available in the repository (to check before creating missing ones)

## What it reads from the Collaboration API

- `GET /api/dcp/Tasks/ByProject?projects={COLLABORATION_PROJECT_ID}` — all tasks for
  the configured project, including task ID, title, description, type, priority, and
  assignee

## What it creates

- **GitHub Labels** — industry-standard type and priority labels are created automatically
  if they don't yet exist in the repository
- **GitHub Issues** — one per new Collaboration task (up to 50 per run), with:
  - Title from the task name
  - Body containing the task description, type, priority, assignee, and the hidden
    `<!-- collaboration-task-id: ... -->` duplicate-detection marker
  - Labels for task type (`bug`, `enhancement`, `question`, etc.) and priority
    (`priority: critical`, `priority: high`, etc.)
  - Assignee mapped from the Collaboration assignee field (when resolvable to a GitHub username)
- **Issue comments** — a clarifying-question comment on any newly created issue whose
  description is fewer than 50 characters or consists only of generic words

## What web searches it performs

This workflow does not perform any web searches. All data comes from the Collaboration
API and the GitHub API.

## Human in the Loop

- **Review created issues** — verify that the title, description, labels, and assignee
  are correct before beginning work
- **Answer clarifying questions** — when the workflow posts a clarifying-question
  comment, update the issue body or reply in the comment thread with the missing detail
- **Resolve assignee mapping** — if the workflow cannot map a Collaboration assignee to
  a GitHub username, the assignee name is included in the issue body; manually assign
  the issue to the correct team member
- **Large backlogs** — if more than 50 tasks are unsynced, the workflow will sync the
  first 50 and note the remainder in the run summary; subsequent runs will pick up the rest
