---
description: "Classifies new issues, applies labels, detects duplicates, and assesses implementation readiness"
on:
  issues:
    types: [opened, labeled]
    names: [needs-triage]

engine: copilot
inlined-imports: false

permissions:
  contents: read
  issues: read
---

# Issue Triage Agent

Please read SkylineCommunications/_ReusableAgenticWorkflows/workflows/issue-triage.md, and continue with this workflow.

*(This workflow inherits its core logic from the central `SkylineCommunications/_ReusableAgenticWorkflows` repository. Updating the central repository automatically updates this agent!)*