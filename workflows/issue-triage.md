---
timeout-minutes: 5
strict: true
on:
  schedule: "daily around 14:00 on weekdays"  # ~2 PM UTC, weekdays only
  workflow_dispatch:
permissions:
  issues: read
tools:
  mount-as-clis: true
  github:
    min-integrity: approved
    toolsets: [issues, labels]
safe-outputs:
  add-labels:
    allowed: [bug, feature, enhancement, documentation, question, help-wanted, good-first-issue]
  add-comment: {}
imports:
  - SkylineCommunications/_ReusableAgenticWorkflows/agents/issue-triage.agent.md
  - github/gh-aw/.github/workflows/shared/github-guard-policy.md
  - github/gh-aw/.github/workflows/shared/reporting.md
inlined-imports: false
features:
  mcp-cli: true
---

# Issue Triage Agent


{{#import github/gh-aw/.github/workflows/shared/noop-reminder.md}}