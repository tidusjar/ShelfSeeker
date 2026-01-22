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
    await homePage.waitForConnected();

    // Wait a bit for everything to stabilize
    await page.waitForTimeout(500);

    // Search and download
    await homePage.search('dune');
    await resultsPage.waitForResults();
    await resultsPage.downloadResult(0);

    // Verify download panel appears and completes
    await expect(page.locator('[data-testid="download-panel"]')).toBeVisible();
    await downloadPanel.waitForComplete();

    // Verify panel auto-dismisses after success (wait up to 5s)
    await expect(page.locator('[data-testid="download-panel"]')).toBeHidden({ timeout: 5000 });
  });

  test('should handle download initiation', async ({ page }) => {
    const homePage = new HomePage(page);
    const resultsPage = new SearchResultsPage(page);

    await homePage.navigate();
    await configureIrcForTest(page);
    await homePage.waitForConnected();
    
    await homePage.search('test');
    await resultsPage.waitForResults();

    // Click download button and verify panel appears
    await resultsPage.downloadResult(0);
    await expect(page.locator('[data-testid="download-panel"]')).toBeVisible({ timeout: 5000 });
  });
});

