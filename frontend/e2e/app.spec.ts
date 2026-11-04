import { expect, test, type Page } from '@playwright/test';

/** Errors we accept: external hosts are unreachable in CI (tiles, Nominatim, Open-Meteo…). */
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/i.test(m.text())) errors.push(m.text());
  });
  return errors;
}

test('home dashboard shows validated India coverage and switches theme', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /where do you want to/i })).toBeVisible();
  await expect(page.getByText('of 28 official')).toBeVisible();
  await expect(page.getByText('of 8 official')).toBeVisible();
  await expect(page.getByText('All 28 states & 8 UTs present')).toBeVisible();
  const html = page.locator('html');
  const before = await html.getAttribute('class');
  await page.getByRole('button', { name: /^Theme:/ }).first().click(); // system → light
  await page.getByRole('button', { name: /^Theme:/ }).first().click(); // light → dark
  await expect(html).toHaveClass(/dark/);
  expect(before).not.toBe(await html.getAttribute('class'));
  expect(errors).toEqual([]);
});

test('India explorer lists 36 regions and cascades state → district → town → map', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/india');
  await expect(page.getByRole('radio', { name: 'All 36' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'States 28' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'UTs 8' })).toBeVisible();
  await page.getByLabel('State / Union Territory').selectOption('TG');
  const district = page.getByLabel('District');
  await expect(district).toBeEnabled();
  const hyd = await district.locator('option', { hasText: /^Hyderabad/ }).getAttribute('value');
  await district.selectOption(hyd!);
  const town = page.getByLabel('City / town');
  await expect(town).toBeEnabled();
  await town.selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Show' }).click();
  await expect(page).toHaveURL(/\/map$/);
  await expect(page.getByRole('article', { name: /Details for/ })).toBeVisible();
  await expect(page.getByText('India dataset').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('state page: districts filter places and the relationship is enforced', async ({ page, request }) => {
  await page.goto('/india/LA');
  await expect(page.getByRole('heading', { name: 'Ladakh' })).toBeVisible();
  await page.getByRole('button', { name: /^Kargil\s*\d+$/ }).click();
  await expect(page.getByRole('heading', { name: 'Kargil district' })).toBeVisible();
  const r = await request.get('/api/v1/india/TG/places?district=LA-0');
  expect(r.status()).toBe(422);
});

test('map click → details → save → persists after reload', async ({ page }) => {
  await page.goto('/map');
  await page.locator('.leaflet-container').click({ position: { x: 500, y: 450 } });
  const card = page.getByRole('article', { name: /Details for/ });
  await expect(card).toBeVisible();
  await expect(card.getByText('Coordinates (WGS84)')).toBeVisible();
  await card.getByRole('button', { name: 'Save' }).click();
  const dialog = page.getByRole('dialog', { name: 'Save place' });
  await dialog.getByLabel('Name').fill('E2E test spot');
  await dialog.getByLabel('Tags').fill('test, e2e');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Saved' })).toBeVisible();
  await page.goto('/saved');
  await expect(page.getByRole('heading', { name: 'E2E test spot' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'E2E test spot' })).toBeVisible();
});

test('world search submits explicitly and renders geocoding results', async ({ page }) => {
  let calls = 0;
  // The public Nominatim service is unreachable from CI, so the API response is stubbed here;
  // the backend's real Nominatim integration is covered by pytest (respx).
  await page.route('**/api/v1/geocode/search**', async (route) => {
    calls++;
    await route.fulfill({ json: { query: 'Hampi', cached: false, fetched_at: new Date().toISOString(), provider: 'nominatim', attribution: '© OpenStreetMap contributors',
      results: [{ id: 'osm:N1', name: 'Hampi', display_name: 'Hampi, Vijayanagara, Karnataka, India', lat: 15.335, lon: 76.46, type: 'village', address: {}, source: 'nominatim' },
                { id: 'osm:N2', name: 'Hampi Bazaar', display_name: 'Hampi Bazaar, Karnataka, India', lat: 15.336, lon: 76.459, type: 'square', address: {}, source: 'nominatim' }] } });
  });
  await page.goto('/map');
  const box = page.getByRole('textbox', { name: 'Search places worldwide' });
  await box.fill('Hampi');
  await page.waitForTimeout(600);
  expect(calls).toBe(0); // typing alone never calls Nominatim
  await box.press('Enter');
  await expect(page.getByText('2 results for “Hampi”')).toBeVisible();
  expect(calls).toBe(1);
  await page.getByRole('button', { name: /Hampi Bazaar/ }).click();
  await expect(page.getByRole('heading', { name: 'Hampi Bazaar', level: 2 })).toBeVisible();
});

test('typed coordinates jump without geocoding', async ({ page }) => {
  await page.goto('/map');
  await page.getByRole('textbox', { name: 'Search places worldwide' }).fill('28.6139, 77.2090');
  await page.keyboard.press('Enter');
  await expect(page.getByText('28.61390, 77.20900')).toBeVisible();
});

test('current location: granted and denied', async ({ browser }) => {
  const ok = await browser.newContext({ geolocation: { latitude: 12.9716, longitude: 77.5946 }, permissions: ['geolocation'] });
  const p1 = await ok.newPage();
  await p1.goto('/map');
  await p1.getByRole('button', { name: 'Show my location' }).click();
  await expect(p1.getByRole('heading', { name: /Your location|Finding|Dropped/ })).toBeVisible();
  await expect(p1.getByText('12.97160, 77.59460')).toBeVisible();
  await ok.close();

  const denied = await browser.newContext({ permissions: [] });
  const p2 = await denied.newPage();
  await p2.goto('/map');
  await p2.getByRole('button', { name: /location/i }).first().click();
  await expect(p2.getByText('Location unavailable')).toBeVisible();
  await denied.close();
});

test('command palette gives instant local India suggestions', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  const input = page.getByRole('dialog', { name: 'Search and commands' }).getByRole('textbox');
  await input.fill('Panaji');
  await expect(page.getByRole('option', { name: /Panaji/ }).first()).toBeVisible();
});

test('PWA: manifest, service worker and offline India data', async ({ page, context }) => {
  await page.goto('/');
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.name).toContain('Locate U');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  await page.waitForFunction(async () => !!(await navigator.serviceWorker?.ready), null, { timeout: 15000 });
  await page.goto('/india');
  await expect(page.getByRole('heading', { name: 'Goa' })).toBeVisible();
  await page.reload(); // let the controlling service worker cache the API responses
  await expect(page.getByRole('heading', { name: 'Goa' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/You’re offline/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Goa' })).toBeVisible();
  await context.setOffline(false);
});

test('API errors and empty results are handled', async ({ page }) => {
  await page.route('**/api/v1/geocode/search**', (route) => route.fulfill({ status: 503, json: { error: { code: 'provider_unreachable', message: 'Could not reach Nominatim' } } }));
  await page.goto('/map');
  await page.getByRole('textbox', { name: 'Search places worldwide' }).fill('Somewhere');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Could not reach Nominatim')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await page.goto('/india');
  await page.getByRole('textbox', { name: 'Filter states' }).fill('zzzz');
  await expect(page.getByText('No states match')).toBeVisible();
  await page.goto('/does-not-exist');
  await expect(page.getByText('This page wandered off the map')).toBeVisible();
});
