# ✨ Reusable Agentic Workflows

A collection of reusable [GitHub Agentic Workflows](https://github.github.io/gh-aw/) for Skyline Communications repositories.

## 📂 Available Workflows

### Integration Workflows

- [🔄 Sync Collaboration Tasks](docs/sync-collaboration-tasks.md) - Sync tasks from the Skyline Collaboration API to GitHub Issues daily

### Pull Request Workflows

- [🔍 Dependency PR Review](docs/dependency-pr-review.md) - Review and auto-approve Dependabot version bump PRs after safety validation
- [🔎 PR Review](docs/pr-review.md) - Automated quality review on pull requests before human review

### Issue Workflows

- [🏷️ Issue Triage](docs/issue-triage.md) - Classify new issues, detect duplicates, and assess implementation readiness
- [🤖 Issue Implementation](docs/issue-implement.md) - Analyze `agent-ready` issues and open pull requests with the implementation

### Documentation Workflows

- [📝 Documentation Update Check](docs/doc-update-check.md) - Detect stale documentation after code changes and create issues for updates

## 🔧 Installation

Each workflow can be installed into any repository using the `gh aw` CLI extension:

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