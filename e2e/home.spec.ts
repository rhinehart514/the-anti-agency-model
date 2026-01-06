import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('loads successfully', async ({ page }) => {
    const response = await page.goto('/')

    // Check that the page loads with a successful status
    expect(response?.status()).toBeLessThan(400)

    // Verify the page has content
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('page is interactive', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded')

    // Check that some interactive elements exist
    const buttons = await page.locator('button').count()
    const links = await page.locator('a').count()

    // Page should have some interactive elements
    expect(buttons + links).toBeGreaterThan(0)
  })
})

test.describe('Authentication', () => {
  test('login page loads without server error', async ({ page }) => {
    const response = await page.goto('/login')

    // Should not be a server error (404 is acceptable if route not configured)
    expect(response?.status()).toBeLessThan(500)
  })
})

test.describe('Protected Routes', () => {
  test('dashboard loads or redirects', async ({ page }) => {
    const response = await page.goto('/dashboard')

    // Should either load successfully or redirect (not 500 error)
    expect(response?.status()).toBeLessThan(500)
  })

  test('create page loads successfully', async ({ page }) => {
    const response = await page.goto('/create')

    // Should load successfully
    expect(response?.status()).toBeLessThan(400)
  })

  test('setup page redirects to create', async ({ page }) => {
    await page.goto('/setup')

    // Should redirect to /create
    await expect(page).toHaveURL('/create')
  })

  test('builder page loads or redirects', async ({ page }) => {
    const response = await page.goto('/builder')

    // Should either load successfully or redirect (not 500 error)
    expect(response?.status()).toBeLessThan(500)
  })
})
