---
description: "Analyzes agent-ready issues and opens pull requests with the implementation"
on:
  issues:
    types: [labeled]
    names: [agent-ready]

engine: copilot
inlined-imports: false

permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
---

# Issue Implementation Agent

Please read SkylineCommunications/_ReusableAgenticWorkflows/agents/issue-implement.agent.md, and continue with this workflow.

*(This workflow inherits its core logic from the central `SkylineCommunications/_ReusableAgenticWorkflows` repository. Updating the central repository automatically updates this agent!)*
