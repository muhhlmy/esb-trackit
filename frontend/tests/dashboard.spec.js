import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should display dashboard after login', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://127.0.0.1:5173/login');

    // Wait for the email input to be visible
    const emailInput = page.locator('input#email');
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    // Fill in login credentials
    await emailInput.fill('superadmin@admin.com');
    await page.locator('input#password').fill('Password123!');

    // Click login button
    await page.click('button:has-text("Masuk")');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Wait for the dashboard to load (loading state gone)
    await page.waitForSelector('[data-testid="page-ready"]', { timeout: 10000 });

    // Check that the total assets card is visible
    const totalAssetsCard = page.locator('.dash-stat-card:has-text("Total Aset")');
    await expect(totalAssetsCard).toBeVisible();

    // Optionally, check that the total assets number is present
    const totalAssetsNumber = totalAssetsCard.locator('.stat-number');
    await expect(totalAssetsNumber).toHaveCount(1);
    const totalAssetsText = await totalAssetsNumber.textContent();
    expect(/^\d+$/.test(totalAssetsText.trim())).toBe(true);
  });
});