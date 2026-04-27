---
name: PR Review
description: "Automated quality review on pull requests — activation guard, review steps, and constraints"
---

# PR Review

Perform an automated quality review on pull requests before human review.

## Activation Guard

Check the PR state from the event context.

**You MUST call `noop` and stop immediately if any of these conditions are true:**

* The PR is a draft: call `noop` with message "Skipping: PR is a draft."
* The PR has the `skip-review` label AND the PR author's association is `MEMBER`,
  `OWNER`, or `COLLABORATOR`: call `noop` with message "Skipping: skip-review label
  set by maintainer."

**Failure to call `noop` when no review action is taken will cause workflow failure.**

## Maintainer Advisory Mode

Check the PR author's association from the event context. If the author is
a `MEMBER`, `OWNER`, or `COLLABORATOR`, set the review mode to **advisory**.
In advisory mode:

* Never use `REQUEST_CHANGES`. Use `COMMENT` for all findings.
* Do not add the `needs-revision` label.
* Do not convert PRs to draft.
* Prefix the review summary with "Advisory review, this PR is from a
  maintainer. Findings are informational only."

For all other associations (`CONTRIBUTOR`, `FIRST_TIMER`,
`FIRST_TIME_CONTRIBUTOR`, `NONE`), use the standard review mode with full
enforcement.

## Reviewer Mindset

Approach every PR with a holistic perspective:

* Validate that the implementation matches the author's stated intent, requirements, and edge-case expectations.
* Seek more idiomatic, maintainable patterns; prefer clarity over cleverness unless performance demands otherwise.
* Consider whether existing helpers or patterns in the codebase already solve the problem.
* Evaluate cross-cutting concerns such as error handling, security, and configuration hygiene.

## Review Steps

Perform each of the following checks in order. Collect all findings before
submitting a single consolidated review.

### 1. Issue Alignment

Read the PR description and identify linked issues (look for "Fixes #",
"Closes #", "Resolves #", or references in the "Related Issue(s)" section).
For each linked issue:

* Read the issue title and description.
* Verify the PR changes actually address what the issue asks for.
* Note any scope creep (changes beyond the issue scope).
* Note any missing parts (issue requirements not covered by the PR).

If no issue is linked, flag this as a required fix.

### 2. PR Template Compliance

Read the PR template at `.github/PULL_REQUEST_TEMPLATE.md`. Compare the
PR description against the template and check:

* The Description section is filled in (not placeholder text).
* The Related Issue(s) section contains valid issue references.
* The Type of Change section has at least one checkbox checked.
* The checked checkboxes match the actual content of the PR.
* The Testing section describes how changes were tested.
* The Checklist section has required items checked.
* If AI Artifact checkboxes are checked, verify the AI Artifact
  Contributions checklist items are also checked.

Flag unchecked required items and incorrectly checked items.

### 3. Coding Standards Review

Read the `.github/instructions/` files that apply to the changed file types
using their `applyTo` glob patterns. For each changed file:

* Match applicable instruction files.
* Verify the code follows the conventions specified in those instructions.
* Check for naming, formatting, architecture, and pattern compliance.
* Focus on objective violations rather than style preferences.

Also read `.github/copilot-instructions.md` for repo-wide conventions.

### 4. Code Quality and Security

Review the actual diff for:

* Obvious bugs or logic errors.
* Security vulnerabilities (injection, secrets exposure, unsafe input handling).
* Missing error handling at system boundaries.
* Performance concerns (unnecessary loops, missing pagination, resource leaks).
* Breaking changes that are not flagged as such.
* Functional correctness: verify behavior against requirements, user stories, acceptance criteria, and regression expectations.
* Idiomatic implementation: prefer language-idiomatic constructs, expressive naming, and concise control flow.

### 5. Consolidate and Submit Review

Based on all findings, determine the review verdict. If the review mode is
**advisory** (maintainer PR), always use `COMMENT` regardless of findings.

**REQUEST_CHANGES** (non-maintainer PRs only) when any of these are true:

* No issue is linked.
* PR description is empty or uses only placeholder text.
* No Type of Change checkbox is checked.
* Checked checkboxes contradict the actual changes.
* Required checklist items are unchecked.
* Security vulnerabilities are found.
* Critical coding standard violations exist.
* The PR clearly does not address the linked issue.

**COMMENT** when:

* All required items are present but there are suggestions or minor issues.
* Some coding standard deviations exist but are non-critical.

For each finding, create an inline `create-pull-request-review-comment`
on the specific file and line where the issue occurs. For template and
process findings that are not tied to a specific line, include them in
the review body.

Then call `submit-pull-request-review` with:

* `event`: `REQUEST_CHANGES` or `COMMENT` as determined above.
* `body`: A structured summary including an overview of the review outcome
  and specific action items the author must address.

If the verdict is `REQUEST_CHANGES`, also add the label `needs-revision`
to the PR. Skip this in advisory mode.

If all checks pass with no issues, submit a `COMMENT` review with a brief
confirmation that the PR meets initial quality standards, and add the label
`review-passed`.

If the PR has five or more critical findings and the review mode is **not**
advisory, convert the PR to draft by calling `update-pull-request` with
`draft: true` in addition to submitting `REQUEST_CHANGES` and adding
`needs-revision`. Add a comment explaining that the PR was converted to
draft due to insufficient quality for review.

## Constraints

* Do not approve PRs. Only use `COMMENT` or `REQUEST_CHANGES`.
* Do not modify any files or push code.
* Do not close the PR.
* Be constructive and specific in feedback. Reference the exact instruction
  file and rule when citing coding standard violations.
* Keep inline comments focused: one issue per comment.
* If the PR is too large to review thoroughly (more than 50 changed files),
  post a comment suggesting the author split it into smaller PRs, submit
  `REQUEST_CHANGES`, and stop.

---

🤖 Crafted with precision by ✨Copilot following brilliant human instruction, then carefully refined by our team of discerning human reviewers.
