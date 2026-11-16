/**
 * A customer gets a quote from start to finish, then reopens it later.
 * Runs against the production build + Firestore emulator (see playwright.config.ts).
 */
import { test, expect, type Page } from '@playwright/test';

const EMAIL = `e2e-${Date.now()}@example.com`;

async function next(page: Page) {
  await page.getByText('Continue', { exact: true }).last().click();
}

test('get a quote, then reopen it with its number and email', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.getByText('Enter your current postcode')).toBeVisible();

  // 1. Where (the default suburb is fine)
  await expect(page.locator('#step1-input')).not.toHaveValue('');
  await next(page);

  // 2. What do you need
  await expect(page.getByRole('heading', { name: 'What do you need?' })).toBeVisible();
  await next(page);

  // 3. Loading options
  await expect(page.getByText('Where would you like to load your container?')).toBeVisible();
  await next(page);

  // 4. Which size: nothing is pre-selected, so the customer must pick a container
  await expect(page.getByText('Which size do you need?')).toBeVisible();
  await expect(page.getByText('Choose at least one container to continue')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue', exact: true }).last()).toBeDisabled();
  await page.getByRole('button', { name: 'Increase Large Portabox quantity' }).click();
  await next(page);

  // 5. Duration & Billing: upfront billing is locked for a short stay
  await expect(page.getByText('Duration & Billing').first()).toBeVisible();
  await page.getByText('3 Months', { exact: true }).click();
  await expect(page.getByText('Available for 6+ months storage')).toBeVisible();
  await next(page);

  // 6. Supplies, 7. Protection
  await expect(page.getByText('Heavy-Duty Container Padlocks')).toBeVisible();
  await next(page);
  await expect(page.getByText('Container & Contents Protection')).toBeVisible();
  await next(page);

  // 8. Send quote: needs an email or mobile
  await expect(page.getByText('Where do we send your quote?')).toBeVisible();
  await next(page);
  await expect(page.getByText('Please enter an email address or mobile phone').first()).toBeVisible();

  await page.getByPlaceholder('you@example.com.au').fill(EMAIL);
  const submitted = page.waitForResponse(
    (r) => r.url().endsWith('/api/public/quotes') && r.request().method() === 'POST',
  );
  await next(page);

  // 9. The quote, with a server-issued number, recorded on the server
  const response = await submitted;
  expect(response.status()).toBe(200);
  await expect(page.getByText("Here's your instant quote")).toBeVisible();
  await expect(page.getByText(EMAIL).first()).toBeVisible();
  const quoteNumber = (await page.getByText(/^Q-9\d{5,8}$/).first().innerText()).trim();
  expect(quoteNumber).toMatch(/^Q-9\d{5,8}$/);

  // Later, in a different browser: reopen it with the number + email
  const other = await browser.newContext();
  const later = await other.newPage();
  await later.goto('/');
  await later.getByText('Open your saved quote').click();
  const dialog = later.getByRole('dialog');
  await dialog.getByPlaceholder('Q-100123').fill(quoteNumber);
  await dialog.getByPlaceholder('you@example.com or 04XX XXX XXX').fill(EMAIL);
  await dialog.getByRole('button', { name: 'Open quote' }).click();
  await expect(later.getByText(quoteNumber).first()).toBeVisible();
  await expect(later.getByText(EMAIL).first()).toBeVisible();
  await other.close();
});

test("a quote can't be reopened with the wrong email", async ({ page }) => {
  await page.goto('/');
  await page.getByText('Open your saved quote').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Q-100123').fill('Q-900001');
  await dialog.getByPlaceholder('you@example.com or 04XX XXX XXX').fill('someone-else@example.com');
  const lookup = page.waitForResponse((r) => r.url().endsWith('/api/public/quotes/open'));
  await dialog.getByRole('button', { name: 'Open quote' }).click();
  // Same answer whether the number or the contact is wrong, so numbers can't be probed.
  expect((await lookup).status()).toBe(404);
  await expect(dialog.getByText("We couldn't find a quote with those details")).toBeVisible();
  await expect(page.getByText("Here's your instant quote")).toHaveCount(0);
});

test('health check and security headers', async ({ request }) => {
  const health = await request.get('/health');
  expect(health.ok()).toBe(true);
  expect(await health.json()).toMatchObject({ ok: true, env: 'staging' });

  const home = await request.get('/');
  const h = home.headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['content-security-policy']).toContain("frame-ancestors 'self'");
  expect(h['content-security-policy-report-only']).toContain("default-src 'self'");
  expect(h['x-powered-by']).toBeUndefined();
});
