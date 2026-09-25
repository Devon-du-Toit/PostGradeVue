 import { test, expect } from '@playwright/test'

test('lecturer can create a course', async ({ page }) => {
  // Log in
  await page.goto('/login')

  await page.getByLabel('Email address').fill('e2e.lecturer@example.com')
  await page.getByLabel('Password').fill('TestPass123!')

  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  // Open courses
  await page.goto('/courses')

  // Create a synthetic course
  await page.getByLabel('Code').fill('E2E101')
  await page.getByLabel('Name').fill('E2E Test Course')
  await page.getByLabel('Year').fill('2026')
  await page.getByLabel('Semester').selectOption('1')

  await page.getByRole('button', { name: 'Create course' }).click()

  // Confirm the course appears
  await expect(page.getByText('E2E101')).toBeVisible()
  await expect(page.getByText('E2E Test Course')).toBeVisible()
})