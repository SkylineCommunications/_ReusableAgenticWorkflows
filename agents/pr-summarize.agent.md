---
name: PR Summarizer
description: "Generates a plain-language summary of pull request changes and posts it as a comment"
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

Write every summary with a mixed audience in mind:

* **Non-technical readers** (product owners, technical writers, QA leads): need to understand *what* changed and *why it matters* without reading the code.
* **Technical reviewers** (developers, architects): benefit from knowing *which components* changed and any important *implementation details* or *behavioral differences*.

A well-formed summary follows this order:

1. **Opening sentence or two**: State *what* the PR does and *why* in plain language. Prefer "Users can now…" or "This change enables…" when possible, but "This PR…" is acceptable.
2. **Impact statement**: Describe the user-visible or system-level effect. What will be different after this merges?
3. **Technical context** (when applicable): Call out new configuration, changed behavior, migration steps, or breaking changes that reviewers or testers must know.
4. **Scope qualifier** (when applicable): If the change targets a specific product, version, component, or environment, state this clearly (e.g., "This applies only to…").
5. **Bullet list** (multi-topic PRs only): When the PR contains multiple distinct, independently meaningful changes, use a short bullet list. For single-topic PRs, use flowing prose.

Writing guidelines:

* Write in the third person (e.g., "This PR adds…", "Users can now…", "The agent now…").
* Aim for **100–250 words**. Exceed this only when the PR is genuinely complex and the extra detail adds value.
* Avoid reproducing the raw diff, listing file names, or using unexplained developer jargon.
* Prefer active constructions and concrete language over passive and vague phrasing.
* Do not evaluate quality, suggest improvements, or comment on code style — describe only what the change does.

| Include | Avoid |
|---|---|
| What changed and why | Raw diff output or file listings |
| User-visible or system-level impact | Unexplained jargon or internal identifiers |
| Breaking changes or migration steps | Subjective quality judgments |
| Component or version scope when applicable | Speculation about intent not supported by the PR |
| Key technical details reviewers must know | Restating the PR title verbatim as the entire summary |

When a PR references linked issues, read the issue title and description to understand the original intent. Align the summary with the issue's stated goal. Note when the PR partially addresses an issue or exceeds its original scope.

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
