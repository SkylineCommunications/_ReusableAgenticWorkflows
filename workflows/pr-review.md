---
description: "Automated quality review on pull requests"
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
  actions: read
---

# PR Review Agent

Please read SkylineCommunications/_ReusableAgenticWorkflows/agents/hve-core/pr-review.agent.md, and continue with this workflow.

*(This workflow inherits its core logic from the central `SkylineCommunications/_ReusableAgenticWorkflows` repository. Updating the central repository automatically updates this agent!)*
