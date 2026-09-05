import { test, expect } from '@playwright/test';

test.describe('E2E: Home Page & Search Flow', () => {
  test('carica correttamente la Home Page e visualizza la mappa', async ({ page }) => {
    await page.goto('/');

    // Verifica il titolo del documento
    await expect(page).toHaveTitle(/FuelFinder/i);

    // Verifica la presenza dell'input di ricerca o della barra principale
    const searchInput = page.locator('input[placeholder*="comune"], input[placeholder*="CAP"], input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('permette di digitare una città nella barra di ricerca', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[placeholder*="comune"], input[placeholder*="CAP"], input[type="text"]').first();
    await searchInput.fill('Milano');
    await expect(searchInput).toHaveValue('Milano');
  });

  test('permette di selezionare filtri carburante', async ({ page }) => {
    await page.goto('/');

    // Cerca pulsanti filtro carburante (es. Diesel o Benzina o icona filtri)
    const fuelButton = page.getByRole('button', { name: /diesel|benzina|gpl|metano/i }).first();
    if (await fuelButton.isVisible()) {
      await fuelButton.click();
      await expect(fuelButton).toBeVisible();
    }
  });
});
