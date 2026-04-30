---
description: |
  Automated release note writer that runs when a pull request is merged.
  Reads the PR diff and any linked issues, then posts a plain-language release
  note entry as a comment — written for a changelog audience rather than for
  PR reviewers. The comment includes a machine-readable anchor so a downstream
  publish workflow can push it to an external release note platform when a
  publish-rn label is applied.

on:
  pull_request_target:
    types: [closed, labeled]
  skip-bots: ["dependabot[bot]", "github-actions[bot]"]
  reaction: eyes

if: github.event.action != 'labeled' || github.event.label.name == 'rn-request'

permissions:
  contents: read
  issues: read
  pull-requests: write

network: defaults

safe-outputs:
  add-comment:
    max: 1
  add-labels:
    max: 1
  remove-labels:
    max: 1
  noop:
    max: 1

tools:
  web-fetch:
  github:
    toolsets: [pull_requests, issues]
    min-integrity: none # This workflow is allowed to examine and comment on any issues

timeout-minutes: 10
---

# Agentic Release Notes Writer

{{#import SkylineCommunications/_ReusableAgenticWorkflows/agents/rn-write.agent.md}}