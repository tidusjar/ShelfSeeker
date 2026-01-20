import { Page } from '@playwright/test';
import { SettingsPage } from './page-objects.js';

/**
 * Helper utilities for E2E tests
 */

/**
 * Wait for a condition with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is not set`);
    }
    return defaultValue;
  }
  return value;
}

/**
 * Wait for element to be visible and return it
 */
export async function waitForVisible(page: Page, selector: string, timeout: number = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
  return page.locator(selector);
}

/**
 * Type text with a slight delay between characters (more realistic)
 */
export async function typeSlowly(page: Page, selector: string, text: string, delay: number = 50) {
  await page.fill(selector, ''); // Clear first
  for (const char of text) {
    await page.type(selector, char, { delay });
  }
}

/**
 * Get mock server configuration from environment
 */
export function getMockConfig() {
  return {
    ircPort: parseInt(getEnv('MOCK_IRC_PORT', '0')),
    nzbPort: parseInt(getEnv('MOCK_NZB_PORT', '0'))
  };
}

/**
 * Configure IRC for tests through the Settings UI
 */
export async function configureIrcForTest(page: Page): Promise<void> {
  const settingsPage = new SettingsPage(page);
  const mockConfig = getMockConfig();

  await settingsPage.navigate();
  await settingsPage.configureIrc({
    enabled: true,
    server: 'localhost',
    port: mockConfig.ircPort,
    channel: '#ebooks',
    searchCommand: '@search'
  });
  await settingsPage.goBack();
}

/**
 * Configure NZB provider for tests through the Settings UI
 */
export async function configureNzbForTest(page: Page): Promise<void> {
  const settingsPage = new SettingsPage(page);
  const mockConfig = getMockConfig();

  await settingsPage.navigate();
  await settingsPage.addNzbProvider({
    name: 'Test NZB Provider',
    url: `http://localhost:${mockConfig.nzbPort}`,
    apiKey: 'test-api-key',
    categories: '7000,8010'
  });
  await settingsPage.goBack();
}

/**
 * Configure both IRC and NZB for tests
 */
export async function configureAllSourcesForTest(page: Page): Promise<void> {
  const settingsPage = new SettingsPage(page);
  const mockConfig = getMockConfig();

  await settingsPage.navigate();

  // Configure IRC
  await settingsPage.configureIrc({
    enabled: true,
    server: 'localhost',
    port: mockConfig.ircPort,
    channel: '#ebooks',
    searchCommand: '@search'
  });

  // Configure NZB
  await settingsPage.addNzbProvider({
    name: 'Test NZB Provider',
    url: `http://localhost:${mockConfig.nzbPort}`,
    apiKey: 'test-api-key',
    categories: '7000,8010'
  });

  await settingsPage.goBack();
}
