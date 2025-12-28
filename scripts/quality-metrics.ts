#!/usr/bin/env npx ts-node

/**
 * Quality Metrics Dashboard
 *
 * Aggregates all quality metrics into a single report:
 * - Test coverage (Vitest)
 * - Type coverage (TypeScript)
 * - Bundle size analysis
 * - Test pass rates
 * - Lint errors
 *
 * Usage: npx ts-node scripts/quality-metrics.ts
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

interface QualityReport {
  timestamp: string
  metrics: {
    coverage: CoverageMetrics | null
    typeCoverage: TypeCoverageMetrics | null
    tests: TestMetrics | null
    lint: LintMetrics | null
    buildSize: BuildSizeMetrics | null
  }
  score: number
  grade: string
}

interface CoverageMetrics {
  statements: number
  branches: number
  functions: number
  lines: number
}

interface TypeCoverageMetrics {
  percentage: number
  coveredCount: number
  totalCount: number
}

interface TestMetrics {
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number
}

interface LintMetrics {
  errors: number
  warnings: number
  fixable: number
}

interface BuildSizeMetrics {
  totalSize: number
  jsSize: number
  cssSize: number
}

const WEIGHTS = {
  coverage: 0.25,
  typeCoverage: 0.15,
  tests: 0.30,
  lint: 0.15,
  buildSize: 0.15,
}

function runCommand(cmd: string, silent = true): string {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
      cwd: process.cwd(),
    })
  } catch (error) {
    if (error instanceof Error && 'stdout' in error) {
      return (error as Error & { stdout: string }).stdout || ''
    }
    return ''
  }
}

function getCoverageMetrics(): CoverageMetrics | null {
  const summaryPath = path.join(process.cwd(), 'coverage', 'coverage-summary.json')

  if (!fs.existsSync(summaryPath)) {
    console.log('  Running coverage...')
    runCommand('npm run test:coverage 2>/dev/null')
  }

  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'))
    const total = summary.total
    return {
      statements: total.statements.pct,
      branches: total.branches.pct,
      functions: total.functions.pct,
      lines: total.lines.pct,
    }
  }

  return null
}

function getTypeCoverageMetrics(): TypeCoverageMetrics | null {
  console.log('  Analyzing type coverage...')
  const output = runCommand('npx type-coverage --detail 2>/dev/null || echo "0"')

  const match = output.match(/(\d+\.?\d*)%/)
  if (match) {
    const countMatch = output.match(/(\d+)\s*\/\s*(\d+)/)
    return {
      percentage: parseFloat(match[1]),
      coveredCount: countMatch ? parseInt(countMatch[1]) : 0,
      totalCount: countMatch ? parseInt(countMatch[2]) : 0,
    }
  }

  return null
}

function getTestMetrics(): TestMetrics | null {
  console.log('  Running tests...')
  const resultsPath = path.join(process.cwd(), 'test-results', 'vitest-results.json')

  // Run tests
  runCommand('npm run test:run 2>/dev/null')

  if (fs.existsSync(resultsPath)) {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'))

    let passed = 0, failed = 0, skipped = 0, duration = 0

    if (results.testResults) {
      results.testResults.forEach((file: { assertionResults: Array<{ status: string }>, perfStats?: { runtime: number } }) => {
        file.assertionResults?.forEach((test: { status: string }) => {
          if (test.status === 'passed') passed++
          else if (test.status === 'failed') failed++
          else skipped++
        })
        duration += file.perfStats?.runtime || 0
      })
    }

    return {
      total: passed + failed + skipped,
      passed,
      failed,
      skipped,
      duration,
    }
  }

  return null
}

function getLintMetrics(): LintMetrics | null {
  console.log('  Running linter...')
  const output = runCommand('npm run lint -- --format json 2>/dev/null || echo "[]"')

  try {
    const results = JSON.parse(output)
    let errors = 0, warnings = 0, fixable = 0

    results.forEach((file: { errorCount: number; warningCount: number; fixableErrorCount: number; fixableWarningCount: number }) => {
      errors += file.errorCount || 0
      warnings += file.warningCount || 0
      fixable += (file.fixableErrorCount || 0) + (file.fixableWarningCount || 0)
    })

    return { errors, warnings, fixable }
  } catch {
    return { errors: 0, warnings: 0, fixable: 0 }
  }
}

function getBuildSizeMetrics(): BuildSizeMetrics | null {
  const nextDir = path.join(process.cwd(), '.next')

  if (!fs.existsSync(nextDir)) {
    console.log('  Building for size analysis...')
    runCommand('npm run build 2>/dev/null')
  }

  if (fs.existsSync(nextDir)) {
    const staticDir = path.join(nextDir, 'static')
    let jsSize = 0, cssSize = 0

    function walkDir(dir: string) {
      if (!fs.existsSync(dir)) return

      fs.readdirSync(dir).forEach((file: string) => {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)

        if (stat.isDirectory()) {
          walkDir(filePath)
        } else if (file.endsWith('.js')) {
          jsSize += stat.size
        } else if (file.endsWith('.css')) {
          cssSize += stat.size
        }
      })
    }

    walkDir(staticDir)

    return {
      totalSize: jsSize + cssSize,
      jsSize,
      cssSize,
    }
  }

  return null
}

function calculateScore(report: QualityReport): number {
  let score = 0
  let appliedWeight = 0

  const { metrics } = report

  // Coverage score (0-100)
  if (metrics.coverage) {
    const avgCoverage = (
      metrics.coverage.statements +
      metrics.coverage.branches +
      metrics.coverage.functions +
      metrics.coverage.lines
    ) / 4
    score += avgCoverage * WEIGHTS.coverage
    appliedWeight += WEIGHTS.coverage
  }

  // Type coverage score
  if (metrics.typeCoverage) {
    score += metrics.typeCoverage.percentage * WEIGHTS.typeCoverage
    appliedWeight += WEIGHTS.typeCoverage
  }

  // Test score
  if (metrics.tests && metrics.tests.total > 0) {
    const passRate = (metrics.tests.passed / metrics.tests.total) * 100
    score += passRate * WEIGHTS.tests
    appliedWeight += WEIGHTS.tests
  }

  // Lint score (100 - errors, min 0)
  if (metrics.lint) {
    const lintScore = Math.max(0, 100 - metrics.lint.errors * 5 - metrics.lint.warnings)
    score += lintScore * WEIGHTS.lint
    appliedWeight += WEIGHTS.lint
  }

  // Build size score (smaller is better, target < 2MB for full Next.js apps)
  if (metrics.buildSize) {
    const sizeMB = metrics.buildSize.totalSize / (1024 * 1024)
    // Score 100 for < 1MB, 80 for < 2MB, decreases after that
    let sizeScore: number
    if (sizeMB < 1) {
      sizeScore = 100
    } else if (sizeMB < 2) {
      sizeScore = 100 - (sizeMB - 1) * 20 // 80-100 for 1-2MB
    } else if (sizeMB < 5) {
      sizeScore = 80 - (sizeMB - 2) * 15 // 35-80 for 2-5MB
    } else {
      sizeScore = Math.max(0, 35 - (sizeMB - 5) * 7)
    }
    score += sizeScore * WEIGHTS.buildSize
    appliedWeight += WEIGHTS.buildSize
  }

  // Normalize to applied weights
  return appliedWeight > 0 ? Math.round(score / appliedWeight) : 0
}

function getGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function main() {
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║       Quality Metrics Dashboard          ║')
  console.log('╚══════════════════════════════════════════╝\n')

  const report: QualityReport = {
    timestamp: new Date().toISOString(),
    metrics: {
      coverage: null,
      typeCoverage: null,
      tests: null,
      lint: null,
      buildSize: null,
    },
    score: 0,
    grade: 'F',
  }

  console.log('Collecting metrics...\n')

  // Collect all metrics
  report.metrics.coverage = getCoverageMetrics()
  report.metrics.typeCoverage = getTypeCoverageMetrics()
  report.metrics.tests = getTestMetrics()
  report.metrics.lint = getLintMetrics()
  report.metrics.buildSize = getBuildSizeMetrics()

  // Calculate score
  report.score = calculateScore(report)
  report.grade = getGrade(report.score)

  // Print report
  console.log('\n┌──────────────────────────────────────────┐')
  console.log('│              QUALITY REPORT              │')
  console.log('├──────────────────────────────────────────┤')

  if (report.metrics.coverage) {
    console.log('│ CODE COVERAGE                            │')
    console.log(`│   Statements: ${report.metrics.coverage.statements.toFixed(1)}%`.padEnd(43) + '│')
    console.log(`│   Branches:   ${report.metrics.coverage.branches.toFixed(1)}%`.padEnd(43) + '│')
    console.log(`│   Functions:  ${report.metrics.coverage.functions.toFixed(1)}%`.padEnd(43) + '│')
    console.log(`│   Lines:      ${report.metrics.coverage.lines.toFixed(1)}%`.padEnd(43) + '│')
    console.log('├──────────────────────────────────────────┤')
  }

  if (report.metrics.typeCoverage) {
    console.log('│ TYPE COVERAGE                            │')
    console.log(`│   Coverage:   ${report.metrics.typeCoverage.percentage.toFixed(1)}%`.padEnd(43) + '│')
    console.log('├──────────────────────────────────────────┤')
  }

  if (report.metrics.tests) {
    const passRate = report.metrics.tests.total > 0
      ? ((report.metrics.tests.passed / report.metrics.tests.total) * 100).toFixed(1)
      : '0'
    console.log('│ TESTS                                    │')
    console.log(`│   Total:      ${report.metrics.tests.total}`.padEnd(43) + '│')
    console.log(`│   Passed:     ${report.metrics.tests.passed}`.padEnd(43) + '│')
    console.log(`│   Failed:     ${report.metrics.tests.failed}`.padEnd(43) + '│')
    console.log(`│   Pass Rate:  ${passRate}%`.padEnd(43) + '│')
    console.log('├──────────────────────────────────────────┤')
  }

  if (report.metrics.lint) {
    console.log('│ LINT                                     │')
    console.log(`│   Errors:     ${report.metrics.lint.errors}`.padEnd(43) + '│')
    console.log(`│   Warnings:   ${report.metrics.lint.warnings}`.padEnd(43) + '│')
    console.log('├──────────────────────────────────────────┤')
  }

  if (report.metrics.buildSize) {
    console.log('│ BUILD SIZE                               │')
    console.log(`│   Total:      ${formatBytes(report.metrics.buildSize.totalSize)}`.padEnd(43) + '│')
    console.log(`│   JavaScript: ${formatBytes(report.metrics.buildSize.jsSize)}`.padEnd(43) + '│')
    console.log(`│   CSS:        ${formatBytes(report.metrics.buildSize.cssSize)}`.padEnd(43) + '│')
    console.log('├──────────────────────────────────────────┤')
  }

  console.log('│                                          │')
  console.log(`│   OVERALL SCORE: ${report.score}/100 (Grade: ${report.grade})`.padEnd(42) + '│')
  console.log('│                                          │')
  console.log('└──────────────────────────────────────────┘')

  // Save report to JSON
  const reportsDir = path.join(process.cwd(), 'quality-reports')
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }

  const reportFile = path.join(reportsDir, `report-${Date.now()}.json`)
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2))
  console.log(`\nReport saved to: ${reportFile}`)

  // Also save latest
  fs.writeFileSync(path.join(reportsDir, 'latest.json'), JSON.stringify(report, null, 2))

  // Exit with error if score is too low
  if (report.score < 50) {
    console.log('\n⚠️  Quality score below threshold (50)')
    process.exit(1)
  }

  console.log('\n✅ Quality check passed!')
}

main().catch(console.error)
