---
description: "Reviews and auto-approves Dependabot version bump PRs after safety validation"
on:
  pull_request:
    types: [opened, synchronize]
    paths:
      - 'package.json'
      - 'package-lock.json'
      - '**/requirements.txt'
      - '**/pyproject.toml'
      - '.github/workflows/*.yml'
      - '.devcontainer/**'
  bots: ["dependabot[bot]"]

engine: copilot
inlined-imports: false

permissions:
  contents: read
  pull-requests: read
---

# Dependabot PR Review Agent

Please read SkylineCommunications/_ReusableAgenticWorkflows/agents/workflows/dependency-pr-review.agent.md, and continue with this workflow.

*(This workflow inherits its core logic from the central `SkylineCommunications/_ReusableAgenticWorkflows` repository. Updating the central repository automatically updates this agent!)*
