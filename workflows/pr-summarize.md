---
description: "Automated plain-language summary of pull request changes"
on:
  pull_request:
    types: [opened, ready_for_review, synchronize]
    forks: ["*"]
  skip-bots: ["dependabot[bot]", "github-actions[bot]"]
  reaction: eyes

engine: copilot
timeout-minutes: 10
inlined-imports: true

permissions:
  contents: read
  issues: read
  pull-requests: read

safe-outputs:
  add-comment:
    max: 1
    target: "triggering"
  noop:
    max: 1
---

# PR Summarize

Generate a plain-language summary of what a pull request changes and post it as a comment.

## Activation Guard

Check the PR state from the event context.

**You MUST call `noop` and stop immediately if any of these conditions are true:**

* The PR is a draft: call `noop` with message "Skipping: PR is a draft."

**Failure to call `noop` when no summary action is taken will cause workflow failure.**

## Summary Steps

### 1. Read the PR

Read the PR title, description, and diff from the event context. Also read the
description of any linked issues (look for "Fixes #", "Closes #", "Resolves #",
or references in the "Related Issue(s)" section) to understand the intent behind
the change.

### 2. Write the Summary

Write a clear, plain-language summary aimed at anyone who may read or be affected
by this PR — including non-developers such as product owners, technical writers,
and testers. The summary must:

* Open with one or two sentences describing **what** the PR does and **why**.
* Explain the **user-visible or system-level impact** of the change.
* Call out any **important technical details** that reviewers or testers should
  know (e.g. new configuration, changed behaviour, migration steps).
* If the change is scoped to a specific product, version, or component, say so
  explicitly at the start (e.g. "This applies only to …").
* When there are multiple distinct changes, use a short bullet list.
* Avoid bullet lists for single-topic summaries — flowing prose reads better.
* Do **not** reproduce the raw diff, list file names, or use developer jargon
  without explanation.
* Keep the summary concise: aim for 100–250 words. Longer is only acceptable
  when the PR is genuinely complex and the extra detail adds value.

Write in the third person (e.g. "This PR adds …" or "Users can now …").

### 3. Post the Summary

Post the summary as a comment using `add-comment`. Wrap the body with a short
header and a footer so readers know the comment is automated:

```
## 📋 PR Summary

{summary text}

---
🤖 *This summary was generated automatically.*
```

Do not submit a pull-request review. Do not add labels. Do not modify any files.

---

🤖 Crafted with precision by ✨Copilot following brilliant human instruction, then carefully refined by our team of discerning human reviewers.
