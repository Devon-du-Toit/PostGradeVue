import { expect, test } from '@playwright/test'

test('signup stays available when the backend is unreachable', async ({ page }) => {
  await page.route('**/api/auth/registration-policy/', (route) => route.abort('connectionrefused'))
  await page.route('**/api/auth/login/', (route) => route.abort('connectionrefused'))
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in to PostGrade' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled()
  await expect(page.getByRole('link', { name: 'Sign up', exact: true })).toBeVisible()

  await page.getByLabel('Email address').fill('offline@example.invalid')
  await page.getByLabel('Password', { exact: true }).fill('SyntheticPassword123!')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Could not reach PostGrade. Check your connection and try again.',
  )

  await page.goto('/signup')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeEnabled()
})
