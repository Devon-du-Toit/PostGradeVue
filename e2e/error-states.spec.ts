 /// <reference types="node" />
 import { test, expect } from '@playwright/test'
 import path from 'path'
test('upload failure displays an error message', async ({ page }) => {
  // Log in
  await page.goto('/login')
  await page.getByLabel('Email address').fill('e2e.lecturer@example.com')
  await page.getByLabel('Password').fill('TestPass123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  // Open the existing synthetic course and assessment
  await page.goto('/courses')
  await page.getByText('E2E101').click()

  const assessmentLink = page.getByRole('link', { name: /E2E Assessment/ }).last()
  await assessmentLink.click()

  // Simulate an upload failure
  await page.route('**/submissions/', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Test upload failure' }),
      })
    } else {
      await route.continue()
    }
  })

  const submissionPath = path.join(process.cwd(), 'e2e', 'submission.png')
  await page.locator('input[type="file"]').setInputFiles(submissionPath)
  await page.getByRole('button', { name: 'Upload submission' }).click()

  await expect(page.getByText('Could not upload submission.')).toBeVisible()
})
test('login validation displays an error for invalid credentials', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('Email address').fill('invalid@example.com')
  await page.getByLabel('Password').fill('wrong-password')

  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(
    page.getByText('Could not sign in. Check your email and password and try again.'),
  ).toBeVisible()
})

test('protected page redirects to login when session is missing', async ({ page }) => {
  await page.goto('/login')

  await page.evaluate(() => localStorage.clear())

  await page.goto('/courses')

  await expect(page).toHaveURL(/\/login$/)
})