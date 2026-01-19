import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have search functionality visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /Search/i);
  });

  test('mock servers should be running', async ({ page }) => {
    // Verify mock IRC port is set
    expect(process.env.MOCK_IRC_PORT).toBeDefined();
    expect(parseInt(process.env.MOCK_IRC_PORT || '0')).toBeGreaterThan(0);
    
    // Verify mock NZB port is set
    expect(process.env.MOCK_NZB_PORT).toBeDefined();
    expect(parseInt(process.env.MOCK_NZB_PORT || '0')).toBeGreaterThan(0);
    
    console.log(`Mock IRC running on port: ${process.env.MOCK_IRC_PORT}`);
    console.log(`Mock NZB running on port: ${process.env.MOCK_NZB_PORT}`);
  });
});
