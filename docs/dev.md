# Development

Internal development notes for `@omnicajs/eslint-plugin-i18n`.

## Requirements

Node version: `>=20.19.0`

Install dependencies:

```bash
npm install
```

## Commands

Build package:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

Run tests:

```bash
npm test
```

Run coverage:

```bash
npm run test:coverage
```

Generate a Markdown coverage summary from the latest coverage output:

```bash
npm run coverage:report
```

## Validation Order

Use this order before handoff or release preparation:

```bash
npm run lint
npm test
npm run test:coverage
npm run build
```

## Coverage Thresholds

Coverage thresholds are enforced in `vitest.config.ts`.

Minimum values:

- `statements`: 99
- `lines`: 99
- `functions`: 100
- `branches`: 89
