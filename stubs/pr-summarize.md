---
description: "Automated plain-language summary of pull request changes"
on:
  pull_request:
    types: [opened, ready_for_review, synchronize]
    forks: ["*"]

engine: copilot
inlined-imports: false

permissions:
  contents: read
  issues: read
  pull-requests: read
---

# PR Summarize Agent

Please read SkylineCommunications/_ReusableAgenticWorkflows/workflows/pr-summarize.md, and continue with this workflow.

*(This workflow inherits its core logic from the central `SkylineCommunications/_ReusableAgenticWorkflows` repository. Updating the central repository automatically updates this agent!)*
