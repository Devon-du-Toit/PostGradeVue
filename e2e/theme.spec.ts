import { test, expect } from '@playwright/test'

test('light theme keeps navigation, forms, tables and statuses readable', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'theme-test-token')
    if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'light')
  })
  const course = { id: 1, code: 'TEST101', name: 'Theme test course', year: 2026, semester: 1 }
  const assessment = {
    id: 1,
    course: 1,
    name: 'Theme test assessment',
    date: '2026-10-06',
  }
  const statuses = [
    'uploaded',
    'processing',
    'matched',
    'needs_verification',
    'recognition_failed',
    'verified',
  ]
  const submissions = statuses.map((status, index) => ({
    id: index + 1,
    assessment: 1,
    enrollment: null,
    status,
    original_filename: `${status}.pdf`,
    file: '',
    created_at: '',
    updated_at: '',
  }))
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    let data: unknown = []
    if (path.endsWith('/auth/me/'))
      data = { id: 1, email: 'theme@example.com', first_name: 'Theme' }
    else if (path.endsWith('/dashboard/stats/'))
      data = { active_courses: 1, pending_verifications: 2 }
    else if (path.endsWith('/courses/1/')) data = course
    else if (path.endsWith('/courses/')) data = [course]
    else if (path.endsWith('/assessments/1/')) data = assessment
    else if (path.endsWith('/assessments/')) data = [assessment]
    else if (path.includes('/submissions/')) data = submissions
    await route.fulfill({ json: data })
  })

  // Measure rendered CSS, including translucent backgrounds composited over
  // ancestor surfaces. Use the darker endpoint of the light body gradient.
  const checkContrast = async () => {
    // Theme and hover transitions interpolate colors. Measure their settled
    // state, including inherited colors on asynchronously mounted panels.
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.playState !== 'running'),
    )
    const failures = await page.evaluate(() => {
      const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).map(Number)
      const luminance = (value: number[]) =>
        value
          .slice(0, 3)
          .map((c) => {
            const n = c / 255
            return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
          })
          .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0)
      const failures: string[] = []
      for (const element of document.querySelectorAll<HTMLElement>(
        'a, button, input, select, p, span, label, th, td, strong, small, h1, h2, h3',
      )) {
        if (!element.getClientRects().length || element.matches(':disabled')) continue
        if (
          !element.matches('input, select') &&
          !Array.from(element.childNodes).some(
            (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
          )
        )
          continue
        const ancestors: HTMLElement[] = []
        for (let current: HTMLElement | null = element; current; current = current.parentElement)
          ancestors.unshift(current)
        let background = [226, 232, 240]
        for (const ancestor of ancestors) {
          const color = rgb(getComputedStyle(ancestor).backgroundColor)
          const alpha = color[3] ?? 1
          background = background.map((c, i) => c * (1 - alpha) + color[i]! * alpha)
        }
        const style = getComputedStyle(element)
        const foreground = luminance(rgb(style.color))
        const surface = luminance(background)
        const ratio =
          (Math.max(foreground, surface) + 0.05) / (Math.min(foreground, surface) + 0.05)
        const large =
          parseFloat(style.fontSize) >= 24 ||
          (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700)
        if (ratio < (large ? 3 : 4.5))
          failures.push(
            `${element.tagName}.${element.className}: ${element.textContent?.trim().slice(0, 50)} (${ratio.toFixed(2)}:1)`,
          )
      }
      return failures
    })
    expect(failures).toEqual([])
  }

  for (const path of [
    '/dashboard',
    '/courses',
    '/courses/1',
    '/assessments/1',
    '/verification-queue',
  ]) {
    await page.goto(path)
    await expect(page.locator('body')).toHaveClass('light-theme')
    await expect(page.locator('.loading-text')).toHaveCount(0)
    await checkContrast()
    const input = page.locator('.glass-input').first()
    if (await input.count()) {
      await input.focus()
      await checkContrast()
    }
    await page.locator('.app-nav a').first().hover()
    await checkContrast()
    const primary = page.locator('.btn-primary').first()
    if (await primary.count()) {
      await primary.hover()
      await checkContrast()
    }
    await page.screenshot({
      path: test.info().outputPath(`${path.replaceAll('/', '-')}-light.png`),
      fullPage: true,
    })
  }
  await page.route('**/api/courses/?*', (route) => route.fulfill({ status: 500, json: {} }))
  await page.goto('/courses')
  await expect(page.getByRole('alert').first()).toBeVisible()
  await checkContrast()
  await page.getByRole('button', { name: 'Dark Mode' }).click()
  await expect(page.locator('body')).not.toHaveClass('light-theme')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Light Mode' })).toBeVisible()
  await page.getByRole('button', { name: 'Light Mode' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Dark Mode' })).toBeVisible()
})
