# ✨ Reusable Agentic Workflows

> [!WARNING]
> **Experimental Repository** — This repository is currently used for experimenting with agentic workflows and is not yet ready for production use. If you need to use these workflows in your project, please contact the **Solutions Hub** before proceeding.

A collection of reusable [GitHub Agentic Workflows](https://github.github.io/gh-aw/) for Skyline Communications repositories.

## 📂 Available Workflows

### Pull Request Workflows

- [🔍 Dependency PR Review](docs/dependency-pr-review.md) - Review and auto-approve Dependabot version bump PRs after safety validation
- [🔎 PR Review](docs/pr-review.md) - Automated quality review on pull requests before human review
- [📋 PR Summarize](docs/pr-summarize.md) - Automated plain-language summary of pull request changes

### Issue Workflows

- [🏷️ Issue Triage](docs/issue-triage.md) - Classify new issues, detect duplicates, and assess implementation readiness
- [🤖 Issue Implementation](docs/issue-implement.md) - Analyze `agent-ready` issues and open pull requests with the implementation

### Documentation Workflows

- [📝 Documentation Update Check](docs/doc-update-check.md) - Detect stale documentation after code changes and create issues for updates

## 🔧 Installation

There are two ways to use these workflows in your repository: using "stubs" (recommended for zero maintenance) or fully downloading them.

### Option 1: Zero-Maintenance Stubs (Recommended)

Instead of copying the full workflows to your repository, you can create a lightweight "stub" workflow that automatically imports the latest logic from this central repository. This means **you never have to update them manually** when the core agents change!

1. Copy the stub files from the [`stubs/`](stubs/) directory of this repo.
2. Place them in your repository under `.github/workflows/`.
3. Commit the `.md` stubs.

*(Example target path: `.github/workflows/issue-triage.md`)*

*Currently available stubs:*
- `issue-triage.md`

### Option 2: Full Installation (via CLI)

If you prefer to have the independent workflows baked locally into your repository:

#### Install all workflows at once (still testing, please do one by one for now)

```powershell
# Install once
gh extension install github/gh-aw

# Note: Create a clean feature branch first, e.g.: git switch -c chore/add-agentic-workflows

# Add all workflows non-interactively
@(
  'dependency-pr-review',
  'doc-update-check',
  'issue-implement',
  'issue-triage',
  'pr-review',
  'pr-summarize'
) | ForEach-Object {
  gh aw add "SkylineCommunications/_ReusableAgenticWorkflows/$_" --engine copilot
}

# After all workflows are added, prompt once for any missing secrets
gh aw secrets bootstrap

# Review what changed
git status

# Commit once
git add .github .gitattributes
git commit -m "Add reusable agentic workflows"

# Note: Push and open a PR, e.g.: git push -u origin HEAD && gh pr create --fill
```

### Install a single workflow

```bash
# Install the extension (once)
gh extension install github/gh-aw

# Add a workflow to your repository
gh aw add-wizard SkylineCommunications/_ReusableAgenticWorkflows/<workflow-name>
```

## 🔄 Updating Workflows

Keep your agentic workflows up to date:

```powershell
gh extension upgrade github/gh-aw  # Update the CLI extension
gh aw upgrade                       # Upgrade to the latest gh-aw engine version

# Note: Create a clean feature branch first, e.g.: git switch -c chore/update-agentic-workflows

# Remove all existing workflows
@(
  'dependency-pr-review',
  'doc-update-check',
  'issue-implement',
  'issue-triage',
  'pr-review',
  'pr-summarize'
) | ForEach-Object {
  gh aw remove "$_"
}

# Re-add all workflows with the latest version
@(
  'dependency-pr-review',
  'doc-update-check',
  'issue-implement',
  'issue-triage',
  'pr-review',
  'pr-summarize'
) | ForEach-Object {
  gh aw add "SkylineCommunications/_ReusableAgenticWorkflows/$_" --engine copilot
}

# After all workflows are added, prompt once for any missing secrets
gh aw secrets bootstrap

# Review what changed
git status

# Commit once
git add .github .gitattributes
git commit -m "Update reusable agentic workflows"

# Note: Push and open a PR, e.g.: git push -u origin HEAD && gh pr create --fill
```

## 📖 Learn More

- [GitHub Agentic Workflows documentation](https://github.github.io/gh-aw/)
