---
description: |
  Validates the CatalogInformation README of a Catalog item against documentation
  best practices for items published on dataminer.services. Checks for required
  sections (About, Key Features), content quality, visuals, and forbidden content
  (support contacts). Opens an issue with findings, updates it on re-runs, closes
  it when all checks pass, and optionally creates a PR with proposed fixes.

on:
  workflow_dispatch:
  issues:
    types: [labeled]

permissions:
  contents: read
  issues: read
  copilot-requests: write

network: defaults

checkout:
  sparse-checkout: |
    CatalogInformation/

safe-outputs:
  create-issue:
    max: 1
  update-issue:
    target: "*"
    body:
    max: 1
  close-issue:
    target: "*"
    max: 1
  create-pull-request:
    title-prefix: "[catalog-doc] "
    labels: [documentation]
    max: 1
  noop:
    max: 1

tools:
  web-fetch:
  github:
    toolsets: [issues]
    min-integrity: none # This workflow is allowed to read content and open issues

timeout-minutes: 10
---

# Catalog Documentation Checker

{{#runtime-import SkylineCommunications/_ReusableAgenticWorkflows/agents/shared/global-instructions.md}}

{{#runtime-import SkylineCommunications/_ReusableAgenticWorkflows/skills/catalog-documentation-standards.md}}

{{#runtime-import SkylineCommunications/_ReusableAgenticWorkflows/agents/catalog-doc-check.agent.md}}