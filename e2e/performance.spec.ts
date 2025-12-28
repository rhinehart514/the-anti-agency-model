import { test, expect } from '@playwright/test'

// Performance benchmark tests
// Measures response times and Core Web Vitals

interface PerformanceMetrics {
  url: string
  responseTime: number
  ttfb: number // Time to First Byte
  domContentLoaded: number
  loadComplete: number
  resourceCount: number
  transferSize: number
}

const PERFORMANCE_THRESHOLDS = {
  responseTime: 5000, // 5s max (dev mode is slower)
  ttfb: 2000, // 2s max TTFB
  domContentLoaded: 5000, // 5s max DOMContentLoaded (dev mode)
  loadComplete: 10000, // 10s max full load
}

test.describe('Performance Benchmarks', () => {
  test('home page loads within performance budget', async ({ page }) => {
    const startTime = Date.now()

    const response = await page.goto('/', { waitUntil: 'load' })
    const loadTime = Date.now() - startTime

    // Get performance timing
    const timing = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        ttfb: perf.responseStart - perf.requestStart,
        domContentLoaded: perf.domContentLoadedEventEnd - perf.startTime,
        loadComplete: perf.loadEventEnd - perf.startTime,
      }
    })

    console.log(`\n=== Home Page Performance ===`)
    console.log(`Response Time: ${loadTime}ms`)
    console.log(`TTFB: ${Math.round(timing.ttfb)}ms`)
    console.log(`DOM Content Loaded: ${Math.round(timing.domContentLoaded)}ms`)
    console.log(`Load Complete: ${Math.round(timing.loadComplete)}ms`)

    expect(response?.status()).toBeLessThan(400)
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.responseTime)
  })

  test('dashboard page performance', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    console.log(`Dashboard load time: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.domContentLoaded)
  })

  test('API response times', async ({ page, request }) => {
    const apiEndpoints = [
      '/api/sites',
    ]

    console.log('\n=== API Response Times ===')

    for (const endpoint of apiEndpoints) {
      const startTime = Date.now()
      const response = await request.get(`http://localhost:3000${endpoint}`)
      const responseTime = Date.now() - startTime

      console.log(`${endpoint}: ${responseTime}ms (status: ${response.status()})`)

      // API should respond quickly (under 2s in dev) or return auth error
      expect(responseTime).toBeLessThan(2000)
      expect(response.status()).toBeLessThan(500)
    }
  })

  test('resource loading efficiency', async ({ page }) => {
    await page.goto('/')

    const resourceMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

      let totalSize = 0
      let totalDuration = 0
      const byType: Record<string, { count: number; size: number }> = {}

      resources.forEach((r) => {
        totalSize += r.transferSize || 0
        totalDuration += r.duration

        const type = r.initiatorType
        if (!byType[type]) {
          byType[type] = { count: 0, size: 0 }
        }
        byType[type].count++
        byType[type].size += r.transferSize || 0
      })

      return {
        resourceCount: resources.length,
        totalSize,
        totalDuration,
        byType,
      }
    })

    console.log('\n=== Resource Metrics ===')
    console.log(`Total Resources: ${resourceMetrics.resourceCount}`)
    console.log(`Total Transfer Size: ${(resourceMetrics.totalSize / 1024).toFixed(2)} KB`)
    console.log(`Total Load Duration: ${resourceMetrics.totalDuration.toFixed(0)}ms`)
    console.log('\nBy Type:')
    Object.entries(resourceMetrics.byType).forEach(([type, data]) => {
      console.log(`  ${type}: ${data.count} files, ${(data.size / 1024).toFixed(2)} KB`)
    })

    // Reasonable limits
    expect(resourceMetrics.resourceCount).toBeLessThan(100)
    expect(resourceMetrics.totalSize).toBeLessThan(5 * 1024 * 1024) // 5MB max
  })
})

test.describe('Core Web Vitals', () => {
  test('measure CLS (Cumulative Layout Shift)', async ({ page }) => {
    await page.goto('/')

    // Wait for page to stabilize
    await page.waitForTimeout(2000)

    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
              clsValue += (entry as PerformanceEntry & { value?: number }).value || 0
            }
          }
        })

        observer.observe({ type: 'layout-shift', buffered: true })

        // Give it a moment to collect shifts
        setTimeout(() => {
          observer.disconnect()
          resolve(clsValue)
        }, 1000)
      })
    })

    console.log(`CLS: ${cls.toFixed(4)}`)
    expect(cls).toBeLessThan(0.25) // Good CLS is < 0.1, needs improvement < 0.25
  })

  test('measure LCP (Largest Contentful Paint)', async ({ page }) => {
    await page.goto('/')

    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let lcpValue = 0
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          lcpValue = lastEntry.startTime
        })

        observer.observe({ type: 'largest-contentful-paint', buffered: true })

        setTimeout(() => {
          observer.disconnect()
          resolve(lcpValue)
        }, 3000)
      })
    })

    console.log(`LCP: ${lcp.toFixed(0)}ms`)
    expect(lcp).toBeLessThan(4000) // Good LCP is < 2.5s, needs improvement < 4s
  })
})
