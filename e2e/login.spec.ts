import { test, expect } from '@playwright/test'

test('lecturer can log in', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('Email address').fill('e2e.lecturer@example.com')
  await page.getByLabel('Password').fill('TestPass123!')

  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  // Basic accessibility checks
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
})