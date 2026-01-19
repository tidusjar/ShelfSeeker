import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Home Page
 */
export class HomePage {
  constructor(private page: Page) {}

  /**
   * Navigate to home page
   */
  async navigate(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Perform a search
   */
  async search(query: string): Promise<void> {
    // Try to find either large or compact search input
    const largeInput = this.page.locator('[data-testid="search-input"]');
    const compactInput = this.page.locator('[data-testid="search-input-compact"]');
    
    // Use whichever is visible
    const largeVisible = await largeInput.isVisible().catch(() => false);
    const searchInput = largeVisible ? largeInput : compactInput;
    
    await searchInput.fill(query);
    
    // Press Enter to submit (no search button in this UI)
    await searchInput.press('Enter');
  }

  /**
   * Wait for connection status
   */
  async waitForConnected(timeout: number = 10000): Promise<void> {
    // Poll the API directly instead of waiting for UI to update
    // The backend connects instantly to mock IRC, but frontend polls every 5s
    const startTime = Date.now();
    const apiUrl = 'http://localhost:3001';
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await this.page.evaluate(async (url) => {
          const res = await fetch(`${url}/api/status`);
          return await res.json();
        }, apiUrl) as { success: boolean; data?: { connectionStatus: string } };
        
        if (response.success && response.data?.connectionStatus === 'connected') {
          return;
        }
      } catch (e) {
        // Ignore fetch errors, keep retrying
      }
      await this.page.waitForTimeout(100); // Poll every 100ms instead of 500ms
    }
    throw new Error(`IRC did not connect within ${timeout}ms`);
  }

  /**
   * Get connection status text
   */
  async getConnectionStatus(): Promise<string> {
    const statusElement = this.page.locator('[data-testid="footer-irc-status"]');
    if (await statusElement.isVisible()) {
      return (await statusElement.textContent()) || '';
    }
    return '';
  }

  /**
   * Open settings
   */
  async openSettings(): Promise<void> {
    const settingsButton = this.page.locator('button[aria-label*="Settings" i], button:has-text("Settings")').first();
    await settingsButton.click();
  }

  /**
   * Check if searching state is active
   */
  async isSearching(): Promise<boolean> {
    const loader = this.page.locator('text=/searching/i, [class*="spinner"], [class*="loading"]');
    return await loader.isVisible();
  }
}

/**
 * Page Object Model for Search Results Page
 */
export class SearchResultsPage {
  constructor(private page: Page) {}

  /**
   * Wait for results to load
   */
  async waitForResults(timeout: number = 10000): Promise<void> {
    // Wait for either results or "no results" message
    try {
      await this.page.waitForSelector('[data-testid="search-result-card"]', { timeout });
    } catch {
      // If no results cards, check for "no results" message
      await this.page.waitForSelector('text=/no results/i', { timeout: timeout / 2 });
    }
  }

  /**
   * Get number of results
   */
  async getResultCount(): Promise<number> {
    const results = this.page.locator('[data-testid="search-result-card"]');
    return await results.count();
  }

  /**
   * Get result at specific index
   */
  async getResult(index: number) {
    const card = this.page.locator('[data-testid="search-result-card"]').nth(index);
    
    return {
      title: (await card.locator('[data-testid="result-title"]').textContent()) || '',
      author: (await card.locator('[data-testid="result-author"]').textContent())?.replace('by ', '') || '',
      fileType: (await card.locator('[data-testid="result-filetype"]').textContent()) || '',
      size: (await card.locator('[data-testid="result-size"]').textContent()) || '',
      source: (await card.locator('[data-testid="result-source"]').textContent()) || ''
    };
  }

  /**
   * Download result at index
   */
  async downloadResult(index: number): Promise<void> {
    const card = this.page.locator('[data-testid="search-result-card"]').nth(index);
    const downloadButton = card.locator('[data-testid="result-download-button"]');
    await downloadButton.click();
  }

  /**
   * Check if "no results" message is shown
   */
  async hasNoResults(): Promise<boolean> {
    // Check for "Found 0 results" message using testid
    const resultsCount = this.page.locator('[data-testid="results-count"]');
    const text = await resultsCount.textContent();
    return text?.includes('Found 0 results') || false;
  }

  /**
   * Get results by source type
   */
  async getResultsBySource(source: 'irc' | 'nzb'): Promise<number> {
    const results = this.page.locator(`[data-source="${source}"]`);
    return await results.count();
  }

  /**
   * Helper to get text content safely
   */
  private async getTextContent(parent: Locator, selector: string): Promise<string> {
    const element = parent.locator(selector).first();
    if (await element.isVisible()) {
      return (await element.textContent()) || '';
    }
    return '';
  }
}

/**
 * Page Object Model for Settings Page
 */
export class SettingsPage {
  constructor(private page: Page) {}

  /**
   * Navigate to Settings page
   */
  async navigate(): Promise<void> {
    // First ensure we're on a page that has the settings button
    const currentUrl = this.page.url();
    if (!currentUrl || currentUrl === 'about:blank') {
      await this.page.goto('/');
      await this.page.waitForLoadState('networkidle');
    }
    
    // Click settings button using data-testid
    const settingsButton = this.page.locator('[data-testid="settings-button"]');
    await settingsButton.waitFor({ state: 'visible', timeout: 5000 });
    await settingsButton.click();
    
    // Wait for settings page to load - look for IRC nav button
    await this.page.waitForSelector('[data-testid="settings-nav-irc"]', { timeout: 10000 });
  }

  /**
   * Navigate to IRC settings tab
   */
  async goToIrcSettings(): Promise<void> {
    const ircTab = this.page.locator('[data-testid="settings-nav-irc"]');
    await ircTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Configure IRC settings through the UI
   */
  async configureIrc(config: {
    enabled?: boolean;
    server: string;
    port: number;
    channel: string;
    searchCommand: string;
  }): Promise<void> {
    // Navigate to IRC tab if not already there
    await this.goToIrcSettings();

    // Enable IRC if specified
    if (config.enabled !== undefined) {
      const enableToggle = this.page.locator('[data-testid="irc-enabled-toggle"]');
      const isChecked = await enableToggle.isChecked();
      if (isChecked !== config.enabled) {
        // Use force: true to click through any intercepting elements
        await enableToggle.click({ force: true });
      }
    }

    // Fill IRC server
    const serverInput = this.page.locator('[data-testid="irc-server-input"]');
    await serverInput.clear();
    await serverInput.fill(config.server);

    // Fill port
    const portInput = this.page.locator('[data-testid="irc-port-input"]');
    await portInput.clear();
    await portInput.fill(config.port.toString());

    // Fill channel
    const channelInput = this.page.locator('[data-testid="irc-channel-input"]');
    await channelInput.clear();
    await channelInput.fill(config.channel);

    // Fill search command
    const commandInput = this.page.locator('[data-testid="irc-command-input"]');
    await commandInput.clear();
    await commandInput.fill(config.searchCommand);

    // Click Save button
    const saveButton = this.page.locator('[data-testid="irc-save-button"]');
    await saveButton.click();

    // Wait for success feedback (or timeout gracefully)
    await this.page.waitForSelector('[data-testid="irc-save-message-success"]', { timeout: 3000 }).catch(() => {
      // Success message might not always appear, that's ok
    });
  }

  /**
   * Navigate to Newznab settings tab
   */
  async goToNewznabSettings(): Promise<void> {
    const newznabTab = this.page.locator('[data-testid="settings-nav-newznab"]');
    await newznabTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Add NZB provider through the UI
   */
  async addNzbProvider(config: {
    name: string;
    url: string;
    apiKey: string;
    categories?: string;
    priority?: number;
    apiLimit?: number;
  }): Promise<void> {
    await this.goToNewznabSettings();

    // Fill form fields
    await this.page.fill('input[name="name"]', config.name);
    await this.page.fill('input[name="url"]', config.url);
    await this.page.fill('input[name="apiKey"]', config.apiKey);

    if (config.categories) {
      await this.page.fill('input[name="categories"]', config.categories);
    }
    if (config.priority !== undefined) {
      await this.page.fill('input[name="priority"]', config.priority.toString());
    }
    if (config.apiLimit !== undefined) {
      await this.page.fill('input[name="apiLimit"]', config.apiLimit.toString());
    }

    // Submit and verify success
    await this.page.locator('button:has-text("Add Indexer")').click();
    await this.page.waitForSelector('[data-testid="nzb-feedback-success"]', { timeout: 5000 });
  }

  /**
   * Enable/disable a specific NZB provider by name
   */
  async toggleNzbProvider(providerName: string, enabled: boolean): Promise<void> {
    await this.goToNewznabSettings();

    // Find the provider row
    const providerRow = this.page.locator(`text="${providerName}"`).locator('..').locator('..');
    
    // Find the toggle within that row
    const toggle = providerRow.locator('input[type="checkbox"]').last();
    const isChecked = await toggle.isChecked();

    if (isChecked !== enabled) {
      await toggle.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Toggle IRC enable/disable (legacy method)
   */
  async toggleIrc(): Promise<void> {
    await this.goToIrcSettings();
    const toggle = this.page.locator('input[type="checkbox"]').first();
    await toggle.click();
  }

  /**
   * Go back from settings to home
   */
  async goBack(): Promise<void> {
    const backButton = this.page.locator('[data-testid="settings-back-button"]');
    await backButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Save settings (generic save button)
   */
  async saveSettings(): Promise<void> {
    const saveButton = this.page.locator('button:has-text("Save")').first();
    await saveButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for settings page to be ready
   */
  async waitForReady(): Promise<void> {
    await this.page.waitForSelector('text=/Settings/i, text=/IRC/i', { timeout: 5000 });
  }
}

/**
 * Page Object Model for Download Panel
 */
export class DownloadPanel {
  constructor(private page: Page) {}

  /**
   * Check if download panel is visible
   */
  async isVisible(): Promise<boolean> {
    const panel = this.page.locator('[data-testid="download-panel"]');
    return await panel.isVisible();
  }

  /**
   * Wait for download completion
   */
  async waitForComplete(timeout: number = 20000): Promise<void> {
    await this.page.waitForSelector('[data-testid="download-status"]:has-text("Complete")', { timeout });
  }

  /**
   * Wait for download error
   */
  async waitForError(timeout: number = 10000): Promise<void> {
    await this.page.waitForSelector('[data-testid="download-status"]:has-text("Failed")', { timeout });
  }

  /**
   * Get download status
   */
  async getStatus(): Promise<string> {
    const status = this.page.locator('[data-testid="download-status"]');
    return (await status.textContent()) || '';
  }
}
