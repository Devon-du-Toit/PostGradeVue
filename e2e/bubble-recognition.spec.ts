import { test, expect } from '@playwright/test'
import path from 'node:path'
import { chooseSingleScriptLayout } from './script-layout'

test('selected bubbles decode fills rather than conflicting written digits', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('e2e.lecturer@example.com')
  await page.getByLabel('Password').fill('TestPass123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  const token = await page.evaluate(() => localStorage.getItem('accessToken'))
  const capabilities = await page.request.get(
    'http://127.0.0.1:8000/api/submissions/recognition-methods/',
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  test.skip(
    capabilities.status() === 404,
    'Requires the backend bubble recognition release; the UI disables bubbles until then.',
  )
  expect(capabilities.ok()).toBeTruthy()

  await page.goto('/courses')
  const code = `BUB${Date.now()}`
  const filename = `${code}-bubbles.png`
  await page.getByLabel('Code', { exact: true }).fill(code)
  await page.getByLabel('Name', { exact: true }).fill('Synthetic bubbles')
  await page.getByRole('spinbutton', { name: 'Year', exact: true }).fill('2026')
  await page.getByRole('combobox', { name: 'Semester', exact: true }).selectOption('1')
  await page.getByRole('button', { name: 'Create course' }).click()
  await page.getByText(code, { exact: true }).click()
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(process.cwd(), 'e2e', 'students.csv'))
  await page.getByRole('button', { name: 'Import CSV' }).click()
  await page.getByPlaceholder('Test 1').fill('Bubble recognition')
  await page.getByRole('button', { name: 'Create assessment' }).click()
  await page.getByRole('link', { name: /Bubble recognition/ }).click()
  await page.getByLabel('Student number format').selectOption('bubble')
  await chooseSingleScriptLayout(page)

  // Synthetic eight-column form with deliberately wrong writing-box digits.
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1000
    canvas.height = 1200
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 1000, 1200)
    ctx.fillStyle = 'black'
    for (const [x, y] of [
      [500, 150],
      [819, 150],
      [819, 669],
      [500, 669],
    ])
      ctx.fillRect(x! - 6, y! - 6, 13, 13)
    ctx.font = '16px sans-serif'
    for (let column = 0; column < 8; column++) {
      const x = 500 + Math.round((0.103 + column * 0.1134) * 319)
      ctx.fillStyle = 'black'
      ctx.fillText('9', x - 5, 215)
      for (let digit = 0; digit < 10; digit++) {
        const y = 150 + Math.round((0.237 + digit * 0.077) * 519)
        ctx.beginPath()
        ctx.arc(x, y, 13, 0, 2 * Math.PI)
        ctx.strokeStyle = '#646464'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = '#828282'
        ctx.fillText(String(digit), x - 5, y + 5)
        if (digit === column + 1) {
          ctx.beginPath()
          ctx.arc(x, y, 10, 0, 2 * Math.PI)
          ctx.fillStyle = 'black'
          ctx.fill()
        }
      }
    }
    return canvas.toDataURL('image/png').split(',')[1]!
  })
  await page.locator('input[type="file"]').setInputFiles({
    name: filename,
    mimeType: 'image/png',
    buffer: Buffer.from(data, 'base64'),
  })
  await page.getByRole('button', { name: 'Upload queue' }).click()
  await expect(page.getByText('Matched', { exact: true })).toBeVisible({ timeout: 30000 })
  const assessment = new URL(page.url()).pathname.split('/').pop()
  const response = await page.request.get(
    `http://127.0.0.1:8000/api/submissions/?assessment=${assessment}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const result = await response.json()
  const submission = result.results[0]
  expect(submission.recognition_method).toBe('bubble')
  expect(submission.recognition.raw_candidate).toBe('12345678')
  expect(submission.recognition.raw_text).toBe('')
  expect(submission.recognition.column_scores).toHaveLength(8)
  await page.goto('/verification-queue')
  const row = page.locator('tr').filter({ hasText: filename })
  await row.getByRole('button', { name: 'Review', exact: true }).click()
  await page.getByText('Bubble column readings', { exact: true }).click()
  await expect(page.locator('.bubble-columns tbody tr')).toHaveCount(8)
  await expect(page.locator('.review-panel [data-test="student-select"]')).toHaveValue(
    String(submission.enrollment),
  )
  await expect(page.getByAltText('Student-number area of the script')).toBeVisible()
  await expect(page.getByAltText('Student-number area of the script')).toHaveJSProperty(
    'naturalWidth',
    320,
  )
  await page.screenshot({ path: test.info().outputPath('bubble-review.png') })
})
