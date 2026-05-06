# ✨ Reusable Agentic Workflows

> [!WARNING]
> **Experimental Repository** — This repository is currently used for experimenting with agentic workflows and is not yet ready for production use. If you need to use these workflows in your project, please contact the **Solutions Hub** before proceeding.

A collection of reusable [GitHub Agentic Workflows](https://github.github.io/gh-aw/) for Skyline Communications repositories.

## 📂 Available Workflows

### Issue Workflows

- [🏷️ Issue Triage](docs/issue-triage.md) - Classify new and reopened issues by applying a single label and notifying the author
- [🔄 Collaboration Sync](docs/collaboration-sync.md) - Sync tasks from the Skyline Collaboration API to GitHub Issues

### Release Note Workflows

- [📋 RN Write](docs/rn-write.md) - Write a plain-language release note entry when a pull request is merged

### Documentation Workflows

- [📝 Documentation Update Check](docs/doc-update-check.md) - Detect stale documentation after code changes and create issues for updates
- [📋 Catalog Documentation Check](docs/catalog-doc-check.md) - Validate a Catalog item's README against documentation standards and open issues for any gaps

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
  'catalog-doc-check',
  'collaboration-sync',
  'doc-update-check',
  'issue-triage',
  'rn-write'
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
  'catalog-doc-check',
  'collaboration-sync',
  'doc-update-check',
  'issue-triage',
  'rn-write'
) | ForEach-Object {
  gh aw remove "$_"
}

# Re-add all workflows with the latest version
@(
  'catalog-doc-check',
  'collaboration-sync',
  'doc-update-check',
  'issue-triage',
  'rn-write'
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
