 /// <reference types="node" />
 import { test, expect } from '@playwright/test'
 import path from 'path'
test('upload failure displays an error message', async ({ page }) => {
  // Log in
  await page.goto('/login')
  await page.getByLabel('Email address').fill('e2e.lecturer@example.com')
  await page.getByLabel('Password').fill('TestPass123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 })

    // Create the synthetic course needed by test
  await page.goto('/courses')

  await page.getByLabel('Code').fill('E2E103')
  await page.getByLabel('Name').fill('E2E Test Course')
  await page.getByLabel('Year').fill('2026')
  await page.getByLabel('Semester').selectOption('1')

  await page.getByRole('button', { name: 'Create course' }).click()

// Wait for the created course to appear before opening it
  const courseCode = page.getByText('E2E103')
  await expect(courseCode).toBeVisible()
  await courseCode.click()

  // Create the assessment needed by test
  await page.getByPlaceholder('Test 1').fill('E2E Assessment')
  await page.getByRole('button', { name: 'Create assessment' }).click()

  // Open the assessment
  const assessmentLink = page.getByRole('link', { name: /E2E Assessment/ }).last()
  await expect(assessmentLink).toBeVisible()
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
  await page.getByRole('button', { name: 'Upload queue' }).click()

  await expect(page.getByText('Upload failed. Click to retry.')).toBeVisible()
})
test('login validation displays an error for invalid credentials', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('Email address').fill('invalid@example.com')
  await page.getByLabel('Password').fill('wrong-password')

  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(
    page.getByText('Could not sign in. Check your email and password and try again.'),
  ).toBeVisible({ timeout: 15000 })
})

// Covers missing-session access. Token expiry/refresh is not simulated by this test.
test('protected page redirects to login when session is missing', async ({ page }) => {
  await page.goto('/login')

  await page.evaluate(() => localStorage.clear())

  await page.goto('/courses')

  await expect(page).toHaveURL(/\/login$/)
})