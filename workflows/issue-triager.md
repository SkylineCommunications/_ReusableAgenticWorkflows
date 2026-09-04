---
description: |
  Intelligent issue triage assistant that processes new and reopened issues.
  Analyzes issue content, selects appropriate labels, detects spam, gathers context
  from similar issues, and provides analysis notes including debugging strategies,
  reproduction steps, and resource links. Helps maintainers quickly understand and
  prioritize incoming issues.

on:
  issues:
    types: [opened, reopened]
  reaction: eyes

permissions:
  contents: read
  issues: read
  copilot-requests: write

network: defaults

safe-outputs:
  add-labels:
    max: 5
  add-comment:

tools:
  web-fetch:
  github:
    toolsets: [issues]
    min-integrity: none # This workflow is allowed to examine and comment on any issues

timeout-minutes: 10
---

# Issue Triage

{{#runtime-import SkylineCommunications/_ReusableAgenticWorkflows/agents/issue-triage.agent.md}}