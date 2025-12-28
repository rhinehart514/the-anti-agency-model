import { test, expect } from '@playwright/test'

test.describe('API Health', () => {
  test('sites API is accessible', async ({ page }) => {
    const response = await page.goto('/api/sites')

    // Should return either success or auth error (401), not server error
    expect(response?.status()).toBeLessThan(500)
  })
})

test.describe('Site Pages', () => {
  test('published site page structure exists', async ({ page }) => {
    // Try to access a non-existent site - should get 404, not 500
    const response = await page.goto('/sites/test-site')

    // Either shows 404 or redirects - not a server error
    expect(response?.status()).toBeLessThan(500)
  })
})
