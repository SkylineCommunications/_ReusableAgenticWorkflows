# 🏷️ Issue Triage

> For an overview of all available workflows, see the [main README](../README.md).

**Automatically label unlabeled open issues and notify their authors**

The [Issue Triage agent](../agents/issue-triage.agent.md)
scans all open issues that have no labels. For each unlabeled issue it analyzes
the title and body, applies a single classification label, and posts a comment
mentioning the issue author with a brief explanation of the reasoning.

## Installation

```bash
# Install the 'gh aw' extension
gh extension install github/gh-aw

# Add the workflow to your repository
gh aw add-wizard SkylineCommunications/_ReusableAgenticWorkflows/issue-triage
```

This walks you through adding the workflow to your repository.

## Configuration

### Secrets

No personal access token is required. The workflow uses the built-in GitHub
Actions token and requests organization-billed Copilot usage through
`copilot-requests: write` in the workflow permissions.

### Permissions

| Permission         | Level   | Purpose                            |
|--------------------|---------|------------------------------------|
| `contents`         | `read`  | Read repository contents           |
| `issues`           | `read`  | Read and manage issues             |
| `copilot-requests` | `write` | Bill Copilot CLI requests to the organization |

The `safe-outputs: add-labels` and `add-comment` declarations authorize the engine to label issues and post comments — no explicit write permission is required in the permissions block.

### Labels

The agent applies exactly one of the following labels per issue. Ensure they
exist in your repository before running the agent:

| Label             | When applied                                                                 |
|-------------------|------------------------------------------------------------------------------|
| `bug`             | Problem or error in the code that needs fixing                               |
| `feature`         | New feature request or enhancement to existing functionality                 |
| `enhancement`     | Improvement to existing features or code                                     |
| `documentation`   | Missing or unclear documentation                                             |
| `question`        | Issue is asking for clarification or information                              |
| `help-wanted`     | Good candidate for external contributions                                    |
| `good-first-issue`| Well-scoped issue suitable for newcomers                                     |
| `community`       | Community engagement (events, discussions) from non-contributor authors      |

## What it does

### Activation

The agent activates when an issue is **opened** or **reopened**. It can also be
triggered manually by adding an 👀 eyes reaction to any issue. Each time it runs,
it processes **all currently open issues that have no labels**.

It skips issues that:

- Already have any of the managed labels applied
- Have been assigned to any user (especially non-bot users)

### Triage procedure

1. Lists all open, unlabeled, unassigned issues in the repository.
2. For each issue, reads the title and body.
3. Selects the single best-fit label from the allowed set.
4. Adds the label to the issue.
5. Posts a comment mentioning the issue author with the reasoning and a
   confidence indicator (see [Comment format](#comment-format) below).

### Comment format

Each triaged issue receives a comment in this format:

```markdown
### 🏷️ Issue Triaged

Hi @{author}! I've categorized this issue as **{label_name}** based on the following analysis:

**Reasoning**: {brief_explanation_of_why_this_label}

<details>
<summary><b>View Triage Details</b></summary>

#### Analysis
- **Keywords detected**: {list_of_keywords_that_matched}
- **Issue type indicators**: {what_made_this_fit_the_category}
- **Confidence**: {High/Medium/Low}

#### Recommended Next Steps
- {context_specific_suggestion_1}
- {context_specific_suggestion_2}

</details>
```

### Batch comment optimization

When multiple issues are triaged in a single run:
1. Each issue receives its own label and comment individually.
2. Optionally, a discussion is created summarizing all triage actions for that run.

### Output behaviour

| Situation                       | Action                                          |
|---------------------------------|-------------------------------------------------|
| Unlabeled, unassigned issue     | Add label + post author comment with reasoning  |
| Issue already has a label       | Skip                                            |
| Issue is assigned to a user     | Skip                                            |

## What it reads

- Open issue list (title, body, labels, assignees)

## What it creates or updates

- One label added per triaged issue
- One comment posted per triaged issue

## Human in the Loop

- **Review label assignments** — verify the applied label is correct, especially
  for ambiguous issues. Adjust manually if needed.
- **Assigned issues** — the agent skips assigned issues; triage them manually
  or unassign before re-running if automatic labeling is still desired.
