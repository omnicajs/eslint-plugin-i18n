# AGENTS.md

## Goals
- Avoid clarification loops by proposing a concrete interpretation when details
  are missing.
- Default to the language of the user's initial message unless they explicitly
  request a different language.
- Match the tone and formality of the user's initial message unless they
  explicitly ask for a change.
- Treat a language switch in the user's message as an explicit request to
  respond in that language.
- If a message is mixed-language, reply in the dominant language unless the
  user specifies otherwise.
- Run `npm run lint` before handoff or commit preparation when changes affect
  TypeScript/JavaScript source files.
- Run `npm test` when changed files can affect runtime behavior.
- Run `npm run test:coverage` when changed files can affect rule traversal,
  reporting, plugin config mapping, or validator loading behavior.
- Do not edit generated artifacts under `dist/` or reports under `coverage/`
  unless the task explicitly requires it.

## Reporting
- Keep handoff reports natural and outcome-focused: describe what was done.
- Do not proactively list skipped optional checks unless the user explicitly
  asks.
- Always mention blockers, failed required checks, or other omissions that can
  affect correctness, safety, or reproducibility.

## Purpose
This file defines practical instructions for working in the
`@omnicajs/eslint-plugin-i18n` repository, with focus on rule correctness,
plugin compatibility with upstream `@intlify/eslint-plugin-vue-i18n`, and
high-confidence automated checks.

## Repository Structure
- This project is a single-package TypeScript ESLint plugin.
- Main source directories:
  - `rules/**` - custom ESLint rule implementations;
  - `validators/**` - reusable text validators for locale message checks;
  - `tests/lib/**` - RuleTester-based behavior tests;
  - `tests/fixtures/**` - fixture files for validators and lint inputs.
- Main plugin entry point: `index.ts`.
- Build output directory: `dist/`.
- Coverage output directory: `coverage/`.

## Local Environment Prerequisites
- Install dependencies:
```bash
npm install
```
- Build package:
```bash
npm run build
```

## Running Checks

### Main Scripts
- Lint:
```bash
npm run lint
npm run lint:fix
```
- Unit tests:
```bash
npm test
```
- Coverage:
```bash
npm run test:coverage
```
- TypeScript build validation:
```bash
npm run build
```

### Suggested Validation Order For Code Changes
```bash
npm run lint
npm test
npm run test:coverage
npm run build
```

## Important Project Rules
- Commit messages follow Conventional Commits.
- Rule changes must include both valid and invalid scenarios in tests.
- Prefer behavior-oriented tests through ESLint RuleTester over brittle
  implementation-coupled checks.
- Keep functions coverage threshold strict (100% minimum).
- Keep statements and lines thresholds high and stable for transpiled output
  (99% minimum each).
- Keep branch coverage threshold as high as practical for this codebase's
  transpiled runtime target (89% minimum) unless explicitly changed by the
  user.
- Coverage thresholds source of truth: `vitest.config.ts`.

## Local Skills
- `skills/commit-workflow/SKILL.md` - rules for splitting changes into commits
  and writing changelog-friendly Conventional Commit messages.
- `skills/coverage-recovery/SKILL.md` - workflow for analyzing uncovered code
  paths and improving test coverage without adding artificial tests.
