---
description: "Automated release note entry written when a pull request is merged"
on:
  pull_request:
    types: [closed]
    forks: ["*"]
  bots:
    - "Copilot"
  skip-bots: ["dependabot[bot]", "github-actions[bot]"]
  reaction: eyes

engine: copilot
timeout-minutes: 10
inlined-imports: true

imports:
  - SkylineCommunications/_ReusableAgenticWorkflows/agents/rn-write.agent.md

permissions:
  contents: read
  issues: read
  pull-requests: write

safe-outputs:
  add-comment:
    max: 1
    target: "triggering"
  noop:
    max: 1
---

# RN Write

{{#import SkylineCommunications/_ReusableAgenticWorkflows/agents/rn-write.agent.md}}