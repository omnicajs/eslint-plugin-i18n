---
name: commit-workflow
description: Use this skill when creating git commits in this repository. It standardizes commit splitting, Conventional Commit type/scope selection, English commit message text, and commit formatting constraints.
---

# Commit Workflow

## When To Use
Use this skill when the user asks to:
- create one or more commits;
- split changes into separate commits;
- choose commit messages/scopes/types;
- validate commit formatting before committing.

## Source Of Truth
- `AGENTS.md`
- `package.json`

## Required Rules
- Commit format: Conventional Commits.
- Message language: English by default.
- Subject style: describe completed historical change, not intention.
- Start commit subject description with an uppercase letter.
- Keep commit subject description concise.
- Put long details into commit body; lists in body are allowed for enumerations.
- Use past/perfective wording; prefer passive voice when it reads naturally.
Examples: `Added ...`, `Removed ...`, `Refactored ...`, `Fixed ...`.
- Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`,
  `refactor`, `revert`, `style`, `test`.
- Scope is optional, but when used it should reflect touched area.
Recommended scopes by paths:
  - `rules` for `rules/**`,
  - `plugin` for `index.ts`,
  - `tests` for `tests/**`,
  - `build` for toolchain/config updates,
  - `deps` for dependency updates.
- Avoid synthetic scopes unrelated to changed files.
- Do not mix unrelated changes in one commit.
- Always commit lockfile-only refreshes in a dedicated commit.
- For `package-lock.json`-only commit, use exact header:
  `chore: Updated package-lock.json`.
- Do not amend/rewrite history unless explicitly requested.

## Workflow
1. Inspect pending changes:
```bash
git status --short
git diff
```
2. Group files by logical intent.
If `package-lock.json` changed as a standalone maintenance update, split it into
its own commit and keep other files out of that commit.
3. Choose commit type and optional scope from touched area.
4. Compose English commit header:
```text
<type>(<scope>): <Short description>
```
If scope is not needed:
```text
<type>: <Short description>
```
Style rule for `<Short description>`:
start with an uppercase letter and use completed historical phrasing in
past/perfective form.
5. Stage only target files:
```bash
git add <files>
```
6. Create commit (non-interactive):
```bash
git commit -m "<type>(<scope>): <Description>"
```
7. Verify result:
```bash
git show --name-status --oneline -n 1
```
