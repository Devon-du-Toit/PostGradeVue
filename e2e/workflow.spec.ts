/// <reference types="node" />
import { test, expect } from '@playwright/test'
import path from 'path'

test('lecturer can set up course and assessment', async ({ page }) => {
  // Login
  await page.goto('/login')

  await page.getByLabel('Email address').fill('e2e.lecturer@example.com')
  await page.getByLabel('Password').fill('TestPass123!')

  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  // Open courses
  await page.goto('/courses')

  // Open the synthetic course
  await page.getByText('E2E101').click()

  // Import synthetic student class list
  const csvPath = path.join(process.cwd(), 'e2e', 'students.csv')
  await page.locator('input[type="file"]').setInputFiles(csvPath)

  await page.getByRole('button', { name: 'Import CSV' }).click()

  // Create an assessment
  await page.getByPlaceholder('Test 1').fill('E2E Assessment')
  await page.getByRole('button', { name: 'Create assessment' }).click()

  // Confirm and open the assessment
  const assessmentLink = page.getByRole('link', { name: /E2E Assessment/ }).last()
  await expect(assessmentLink).toBeVisible()
  await assessmentLink.click()

  // Upload synthetic submission
  const submissionPath = path.join(process.cwd(), 'e2e', 'submission.png')
  await page.locator('input[type="file"]').setInputFiles(submissionPath)

  await page.getByRole('button', { name: 'Upload submission' }).click()

// Review the recognition result
   const studentSelect = page.locator('.verification-controls select')
    await expect(studentSelect).toBeVisible({ timeout: 60000 })

    await studentSelect.selectOption('1')

    const confirmButton = page
    .getByRole('button', { name: /Confirm match|Verify/ })

    await confirmButton.click()

    // Mark the verified submission
    const markInput = page.getByPlaceholder('Mark')
    await expect(markInput).toBeVisible()

    await markInput.fill('75')
    await page.getByRole('button', { name: 'Save mark' }).click()

    // Confirm marking completed
    await expect(page.getByText('Marked', { exact: true })).toBeVisible()
})