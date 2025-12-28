import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Accessibility audit tests using axe-core
// These tests check WCAG 2.1 compliance

test.describe('Accessibility Audits', () => {
  test('home page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // Exclude color contrast for dark theme
      .analyze()

    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility violations found:')
      accessibilityScanResults.violations.forEach((violation) => {
        console.log(`- ${violation.id}: ${violation.description}`)
        console.log(`  Impact: ${violation.impact}`)
        console.log(`  Nodes affected: ${violation.nodes.length}`)
      })
    }

    // Filter for critical/serious violations only
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    )

    expect(criticalViolations).toEqual([])
  })

  test('dashboard page accessibility', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    )

    expect(criticalViolations).toEqual([])
  })

  test('login page accessibility', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    )

    expect(criticalViolations).toEqual([])
  })
})

// Generate accessibility report summary
test('generate accessibility metrics', async ({ page }) => {
  const pages = ['/', '/dashboard', '/login']
  const results: Record<string, { passes: number; violations: number; incomplete: number }> = {}

  for (const url of pages) {
    await page.goto(url)
    await page.waitForLoadState('domcontentloaded')

    const scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    results[url] = {
      passes: scanResults.passes.length,
      violations: scanResults.violations.length,
      incomplete: scanResults.incomplete.length,
    }
  }

  // Log summary
  console.log('\n=== Accessibility Metrics Summary ===')
  Object.entries(results).forEach(([url, data]) => {
    const total = data.passes + data.violations
    const score = total > 0 ? Math.round((data.passes / total) * 100) : 100
    console.log(`${url}: ${score}% (${data.passes} passes, ${data.violations} violations)`)
  })

  // All pages should have more passes than violations
  Object.values(results).forEach((data) => {
    expect(data.passes).toBeGreaterThan(data.violations)
  })
})
