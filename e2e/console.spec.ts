import { test, expect } from '@playwright/test'

test('Console live dashboard uses API data and accessible mobile navigation in both themes', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('accessToken', 'console-test-token'))
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    let data: unknown = []
    if (path.endsWith('/auth/me/'))
      data = { id: 1, email: 'console@example.invalid', first_name: 'Sam' }
    else if (path.endsWith('/dashboard/stats/'))
      data = { active_courses: 4, pending_verifications: 7 }
    else if (path.endsWith('/courses/'))
      data = [{ id: 1, code: 'CMPG313', name: 'Advanced Databases', year: 2026, semester: 2 }]
    await route.fulfill({ json: data })
  })
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Assessment workspace' })).toBeVisible()
  await expect(page.locator('.summary-card strong')).toHaveText(['4', '7'])
  await expect(page.locator('.dashboard-course')).toContainText('Advanced Databases')
  await expect(page.getByText('PostGrade · Thoughtfully organised.')).toHaveCount(0)
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') await page.getByRole('button', { name: 'Light Mode' }).click()
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.playState !== 'running'),
    )
    await page.screenshot({ path: `proposal-previews/console-live-${theme}.png`, fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({
      path: `proposal-previews/console-live-${theme}-mobile.png`,
      fullPage: true,
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Toggle navigation' }).click()
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Toggle navigation' })).toBeFocused()
    await page.getByRole('button', { name: 'Toggle navigation' }).click()
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Courses', exact: true })
      .click()
    await expect(page).toHaveURL(/courses/)
    await expect(page.getByRole('spinbutton', { name: 'Year', exact: true })).toHaveCount(1)
    await expect(page.getByRole('combobox', { name: 'Semester', exact: true })).toHaveCount(1)
    await expect(page.getByLabel('Filter by year', { exact: true })).toHaveCount(1)
    await expect(page.getByLabel('Filter by semester', { exact: true })).toHaveCount(1)
    await expect(page.locator('.app-sidebar')).not.toHaveClass(/is-open/)
    await page.goto('/dashboard')
    await page.setViewportSize({ width: 1280, height: 720 })
  }
})
