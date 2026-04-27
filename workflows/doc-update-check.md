---
description: "Detects stale documentation after code changes and creates issues for updates"
on:
  push:
    branches: [main]
    paths:
      - 'scripts/**'
      - '.github/agents/**'
      - '.github/instructions/**'
      - '.github/skills/**'
      - '.github/prompts/**'
      - 'extension/**'
      - 'collections/**'
      - '.devcontainer/**'
      - '.github/workflows/**'
      - '!.github/workflows/*.lock.yml'

engine: copilot
inlined-imports: false

permissions:
  contents: read
  issues: read
---

# Documentation Update Check Agent

Please read SkylineCommunications/_ReusableAgenticWorkflows/agents/workflows/doc-update-check.agent.md, and continue with this workflow.

*(This workflow inherits its core logic from the central `SkylineCommunications/_ReusableAgenticWorkflows` repository. Updating the central repository automatically updates this agent!)*
