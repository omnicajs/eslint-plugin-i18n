---
name: coverage-recovery
description: Use this skill when coverage is below target or when uncovered code in rules/ and index.ts must be analyzed and resolved with minimal artificial tests.
---

# Coverage Recovery

## When To Use
Use this skill when the user asks to:
- increase test coverage;
- analyze uncovered lines/branches;
- enforce strict thresholds;
- explain why specific uncovered paths remain.

## Source Of Truth
- `AGENTS.md`
- `package.json`
- `tests/lib/**`
- coverage reports under `coverage/**`

## Principles
- Coverage is a quality signal, not a vanity metric.
- Start from real public API behavior of the ESLint plugin.
- Prefer fixing architecture/redundancy over adding synthetic tests for dead
  code.
- Defensive branches should be tested with controlled failure scenarios.
- Keep statements/lines/functions thresholds strict (100%).
- Keep branch threshold as high as practical (currently 89%) unless explicitly
  changed by the user.
- Do not loop endlessly on non-resolvable cases: escalate with concrete options.

## Workflow
1. Collect facts.
```bash
npm run test:coverage
```
2. Read uncovered details, not only percentages. Use:
- `coverage/coverage-final.json`
- HTML reports under `coverage/**`.
3. Classify uncovered paths:
- `real usage gap` (missed product scenario),
- `defensive path` (degraded input/runtime failure),
- `dead/redundant path` (likely removable),
- `architecture smell` (hard-to-test design).
4. Resolve in this order:
- add/adjust tests for real public API scenarios,
- add controlled break/failure tests for defensive branches,
- simplify/remove dead branches,
- propose architecture refactor for smell cases.
5. Re-run checks.
```bash
npm run lint
npm run test:coverage
```

## Controlled Failure Patterns
- Validator module does not export a function.
- Validator module path cannot be resolved.
- Validator throws while evaluating text.
- Mixed locale input where validators are configured only for part of locales.
- Unexpected message node types that should be rejected.
- JSON/YAML parser mode mismatches and ignored file extensions.

## Stop Condition (No Cognitive Loop)
If progress stalls after reasonable attempts:
1. Stop brute-force test additions.
2. Report exact uncovered locations and why they are hard/non-natural.
3. Offer user options:
- keep defensive branch as-is and accept uncovered path,
- refactor architecture to make behavior testable,
- remove redundant branch if behavior is impossible by construction.

The final decision on controversial refactors belongs to the user.
