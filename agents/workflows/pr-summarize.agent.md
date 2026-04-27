---
name: PR Summarize Workflow
description: "Orchestration layer for automated PR summarization — activation guard, summary steps, and constraints"
---

# PR Summarize

Generate a plain-language summary of what a pull request changes and post it as a comment.

Follow the audience awareness, structure, writing guidelines, and content rules defined in
`SkylineCommunications/_ReusableAgenticWorkflows/agents/pr-summarize.agent.md`.

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

Write the summary following the audience awareness, structure, writing guidelines,
and content rules defined in the imported PR Summarizer agent instructions.

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
