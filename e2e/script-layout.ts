import type { Page } from '@playwright/test'

export const chooseSingleScriptLayout = async (page: Page) => {
  // Capability fields arrive with the assessment, after client-side navigation.
  await page.getByRole('heading', { name: 'Submissions', exact: true }).waitFor()
  const layout = page.getByLabel('First upload layout')
  if (await layout.isVisible()) await layout.selectOption('single')
}
