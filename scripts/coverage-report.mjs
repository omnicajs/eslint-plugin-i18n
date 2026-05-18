#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const metrics = ['statements', 'branches', 'functions', 'lines']
const metricLabels = {
  statements: 'Statements',
  branches: 'Branches',
  functions: 'Functions',
  lines: 'Lines',
}

function parseArgs(argv) {
  const args = {
    current: 'coverage/coverage-summary.json',
    baseline: '',
    title: 'Coverage',
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--current') {
      args.current = argv[i + 1]
      i += 1
    } else if (arg === '--baseline') {
      args.baseline = argv[i + 1]
      i += 1
    } else if (arg === '--title') {
      args.title = argv[i + 1]
      i += 1
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function readCoverageSummary(filePath, required) {
  if (!filePath || !fs.existsSync(filePath)) {
    if (required) {
      throw new Error(`Coverage summary is missing: ${filePath}`)
    }
    return null
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function pct(summary, metric) {
  return summary.total[metric].pct
}

function formatPct(value) {
  return `${value.toFixed(2)}%`
}

function formatDelta(value) {
  if (value == null) {
    return 'n/a'
  }
  if (value > 0) {
    return `up ${value.toFixed(2)} pp`
  }
  if (value < 0) {
    return `down ${Math.abs(value).toFixed(2)} pp`
  }
  return 'no change'
}

function rowForMetric(current, baseline, metric) {
  const currentPct = pct(current, metric)
  const baselinePct = baseline == null ? null : pct(baseline, metric)
  const delta = baselinePct == null ? null : currentPct - baselinePct

  return [
    metricLabels[metric],
    formatPct(currentPct),
    baselinePct == null ? 'n/a' : formatPct(baselinePct),
    formatDelta(delta),
  ]
}

function markdownTable(rows) {
  const lines = [
    '| Metric | Current | Baseline | Change |',
    '| --- | ---: | ---: | ---: |',
  ]

  for (const row of rows) {
    lines.push(`| ${row.join(' | ')} |`)
  }

  return lines.join('\n')
}

function fileRows(current, baseline) {
  return Object
    .keys(current)
    .filter(filePath => filePath !== 'total')
    .sort()
    .map(filePath => {
      const baselineFile = baseline?.[filePath]
      const currentLines = current[filePath].lines.pct
      const baselineLines = baselineFile?.lines.pct
      const delta = baselineLines == null ? null : currentLines - baselineLines

      return [
        path.relative(process.cwd(), filePath) || filePath,
        formatPct(currentLines),
        baselineLines == null ? 'n/a' : formatPct(baselineLines),
        formatDelta(delta),
      ]
    })
}

function appendStepSummary(markdown) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY
  if (!summaryPath) {
    return
  }

  fs.appendFileSync(summaryPath, `${markdown}\n\n`)
}

const args = parseArgs(process.argv.slice(2))
const current = readCoverageSummary(args.current, true)
const baseline = readCoverageSummary(args.baseline, false)
const totalRows = metrics.map(metric => rowForMetric(current, baseline, metric))
const perFileRows = fileRows(current, baseline)
const baselineNote = baseline == null
  ? `Baseline was not found at \`${args.baseline || '<not configured>'}\`; showing current coverage only.`
  : `Baseline: \`${path.relative(process.cwd(), args.baseline)}\`.`

const markdown = [
  `## ${args.title}`,
  '',
  baselineNote,
  '',
  markdownTable(totalRows),
  '',
  '<details>',
  '<summary>Coverage by file</summary>',
  '',
  '| File | Current Lines | Baseline Lines | Change |',
  '| --- | ---: | ---: | ---: |',
  ...perFileRows.map(row => `| ${row.join(' | ')} |`),
  '',
  '</details>',
].join('\n')

console.log(markdown)
appendStepSummary(markdown)
