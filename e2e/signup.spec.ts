import { test, expect } from '@playwright/test'

test('landing opens sign-in directly and a new lecturer can sign up and log in', async ({
  page,
}) => {
  const email = `signup-${Date.now()}@example.invalid`
  const password = 'SyntheticAccount!4827'
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in to PostGrade' })).toBeVisible()
  await page.getByRole('link', { name: 'Sign up', exact: true }).click()
  await expect(page).toHaveURL(/\/signup$/)
  await page.getByLabel('First name').fill('Synthetic')
  await page.getByLabel('Last name').fill('Lecturer')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill('mismatch')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('alert')).toHaveText('Passwords do not match.')
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/login\?registered=1$/)
  await expect(page.getByRole('status')).toContainText('Your account has been created.')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole('button', { name: 'Log out' }).click()

  await page.goto('/signup')
  await page.getByLabel('First name').fill('Synthetic')
  await page.getByLabel('Last name').fill('Lecturer')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('alert')).toContainText(/email.*already exists/i)
  await expect(page).toHaveURL(/\/signup$/)
  await page.screenshot({ path: test.info().outputPath('signup-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('signup-mobile.png'), fullPage: true })
})
