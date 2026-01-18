import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that we can see the main content
    const body = await page.locator('body');
    expect(await body.isVisible()).toBe(true);
  });

  test('should have search functionality visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should have a search input
    const searchInput = page.locator('[data-testid="search-input"]');
    expect(await searchInput.isVisible()).toBe(true);
    
    // Should show search placeholder text
    const placeholder = await searchInput.getAttribute('placeholder');
    expect(placeholder).toContain('Search');
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
