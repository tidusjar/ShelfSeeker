import { test, expect } from '@playwright/test';
import { HomePage, SearchResultsPage, DownloadPanel } from '../helpers/page-objects';
import { configureIrcForTest } from '../helpers/test-helpers';

test.describe('Download Flow', () => {
  test('should download book via IRC DCC', async ({ page }) => {
    const homePage = new HomePage(page);
    const resultsPage = new SearchResultsPage(page);
    const downloadPanel = new DownloadPanel(page);

    // Navigate and configure IRC
    await homePage.navigate();
    await configureIrcForTest(page);
    
    // Wait for connection and search
    await homePage.waitForConnected();
    await homePage.search('dune');
    await resultsPage.waitForResults();

    // Download first result
    await resultsPage.downloadResult(0);

    // Verify download panel appears
    await page.waitForTimeout(500);
    const isVisible = await downloadPanel.isVisible();
    expect(isVisible).toBe(true);

    // Wait for completion (DCC transfer)
    await downloadPanel.waitForComplete();

    // Panel should auto-dismiss after success
    await page.waitForTimeout(4000);
    const stillVisible = await downloadPanel.isVisible();
    expect(stillVisible).toBe(false);
  });

  test('should handle download initiation', async ({ page }) => {
    const homePage = new HomePage(page);
    const resultsPage = new SearchResultsPage(page);

    await homePage.navigate();
    
    // Configure IRC through Settings UI
    await configureIrcForTest(page);
    
    await homePage.waitForConnected();
    await homePage.search('test');
    await resultsPage.waitForResults();

    // Click download button - should trigger download
    await resultsPage.downloadResult(0);

    // Download panel should appear
    await expect(page.locator('[data-testid="download-panel"]'))
      .toBeVisible({ timeout: 2000 });
  });
});

