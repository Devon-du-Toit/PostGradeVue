import { expect, test } from '@playwright/test'

for (const style of ['campus', 'editorial', 'console']) {
  test(`${style}: preview navigation, search and verification`, async ({ page }) => {
    await page.goto(`/ui-proposal?style=${style}`)
    await expect(page.locator('.ui-draft')).toHaveAttribute('data-concept', style)
    await expect(page.getByRole('heading', { name: 'More clarity. Less paperwork.' })).toBeVisible()
    await page.screenshot({ path: `proposal-previews/${style}-desktop.png`, fullPage: true })
    await page.getByRole('button', { name: 'View all' }).click()
    await page.getByRole('searchbox', { name: 'Search courses' }).fill('CMPG313')
    await expect(page.locator('.course-card')).toHaveCount(1)
    await expect(page.getByRole('heading', { name: 'Advanced Databases' })).toBeVisible()
    await page.getByRole('searchbox').fill('no-such-course')
    await expect(page.getByRole('heading', { name: 'No courses found' })).toBeVisible()
    await page.getByRole('button', { name: 'Clear search' }).click()
    await expect(page.locator('.course-card')).toHaveCount(3)
    await page
      .getByRole('navigation', { name: 'Preview navigation' })
      .getByRole('button', { name: 'Verification' })
      .click()
    await page.getByRole('button', { name: 'Review match' }).first().click()
    await expect(page.getByRole('region', { name: 'Selected sample match' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirm sample match' }).click()
    await expect(page.locator('.queue-total')).toHaveText('2 pending')
    await expect(page.getByRole('status')).toContainText('does not update student records')
    await page.getByRole('button', { name: 'Sign-in preview' }).click()
    await page.getByRole('button', { name: 'Create an account', exact: true }).click()
    await page.getByRole('button', { name: 'Show password rules' }).click()
    await expect(page.locator('#draft-password-rules')).toContainText('special character')
    await page.screenshot({ path: `proposal-previews/${style}-signup.png`, fullPage: true })
    await page.getByRole('button', { name: 'Overview', exact: true }).click()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: `proposal-previews/${style}-mobile.png`, fullPage: true })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.getByRole('button', { name: 'Courses', exact: true }).click()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.getByRole('button', { name: 'Verification' }).click()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })
}

test('style switch preserves current screen and selected style in URL', async ({ page }) => {
  await page.goto('/ui-proposal')
  await page.getByRole('button', { name: 'View all' }).click()
  await page.getByRole('button', { name: /02.*Editorial/ }).click()
  await expect(page).toHaveURL(/style=editorial/)
  await expect(page.getByRole('heading', { name: 'Courses', exact: true })).toBeVisible()
})
