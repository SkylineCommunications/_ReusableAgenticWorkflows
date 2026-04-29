---
description: |
  Manually validates the CatalogInformation README of a Catalog item against
  documentation best practices for items published on dataminer.services.
  Checks for required sections (About, Key Features), content quality, visuals,
  and forbidden content (support contacts). Opens a single issue summarising
  all findings when violations are found, or reports compliance when the
  documentation meets all standards.

on:
  workflow_dispatch:

permissions:
  contents: read
  issues: write

network: defaults

safe-outputs:
  create-issue:
    max: 1
  noop:
    max: 1

tools:
  github:
    toolsets: [contents, issues]
    min-integrity: none

timeout-minutes: 10
---

# Catalog Documentation Checker

{{#import SkylineCommunications/_ReusableAgenticWorkflows/agents/catalog-doc-check.agent.md}}