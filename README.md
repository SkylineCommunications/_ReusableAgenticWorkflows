# ✨ Reusable Agentic Workflows

A collection of reusable [GitHub Agentic Workflows](https://github.github.io/gh-aw/) for Skyline Communications repositories.

## 📂 Available Workflows

### Integration Workflows

- [🔄 Collaboration Sync](docs/collaboration-sync.md) - Sync tasks from the Skyline Collaboration API to GitHub Issues daily

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

### Install all workflows at once (still testing, please do one by one for now)

```powershell
# Install once
gh extension install github/gh-aw

# Create a clean feature branch first
git switch -c chore/add-agentic-workflows

# Add all workflows non-interactively
@(
  'collaboration-sync',
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

# Push and open PR
git push -u origin HEAD
gh pr create --fill
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

```bash
gh extension upgrade github/gh-aw  # Update the CLI extension
gh aw upgrade                       # Upgrade to the latest gh-aw engine version
gh aw update                        # Update added workflows
```

## 📖 Learn More

- [GitHub Agentic Workflows documentation](https://github.github.io/gh-aw/)
