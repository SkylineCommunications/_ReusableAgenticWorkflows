# 🔄 Sync Collaboration Tasks

> For an overview of all available workflows, see the [main README](../README.md).

**Automatically sync tasks from the Skyline Collaboration API to GitHub Issues**

The [Sync Collaboration Tasks workflow](../workflows/sync-collaboration-tasks.md?plain=1)
runs every 5 minutes to fetch tasks from a configured Collaboration project and create
GitHub Issues for any tasks that don't already have a corresponding issue. It labels
issues by task type and priority, assigns them to the right team member, and posts a
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

### Required labels

The workflow maps task types and priorities to GitHub labels. Create the following
labels in your repository before running the workflow (any subset works — missing
labels are simply skipped):

**Type labels**: `type: Bug`, `type: Feature`, `type: Investigation`

**Priority labels**: `priority: Critical`, `priority: High`, `priority: Normal`, `priority: Low`

You can create all labels at once after installing the workflow:

```bash
gh aw maintenance create_labels
```

### Customization

To change the label naming scheme, assignee mapping logic, or clarifying-question
text, edit the workflow file at `.github/workflows/sync-collaboration-tasks.md` in
your repository and run:

```bash
gh aw compile
```

to regenerate the lock file.

## What it reads from GitHub

- All open and closed issues in the repository (to detect duplicates using the
  `<!-- collaboration-task-id: ... -->` marker in issue bodies)
- The list of labels available in the repository (to skip labels that don't exist)

## What it reads from the Collaboration API

- `GET /api/dcp/Tasks/ByProject?projects={COLLABORATION_PROJECT_ID}` — all tasks for
  the configured project, including task ID, title, description, type, priority, and
  assignee

## What it creates

- **GitHub Issues** — one per new Collaboration task, with:
  - Title from the task name
  - Body containing the task description, type, priority, assignee, and the hidden
    `<!-- collaboration-task-id: ... -->` duplicate-detection marker
  - Labels for task type (`type: Bug`, `type: Feature`, etc.) and priority
    (`priority: Critical`, `priority: High`, etc.)
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
- **Create missing labels** — if a required label doesn't exist in the repository, the
  workflow will note it in the issue body; create the label to enable automatic
  labelling on the next run
- **Resolve assignee mapping** — if the workflow cannot map a Collaboration assignee to
  a GitHub username, the assignee name is included in the issue body; manually assign
  the issue to the correct team member
