import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { 
    timeout: 5000 
  },
  fullyParallel: false, // Sequential to avoid port conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to prevent port conflicts
  reporter: process.env.CI 
    ? [
        ['html'],
        ['list'],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['github']
      ]
    : [
        ['html'],
        ['list']
      ],
  
  globalSetup: path.join(__dirname, 'helpers', 'global-setup.ts'),
  globalTeardown: path.join(__dirname, 'helpers', 'global-teardown.ts'),
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  webServer: [
    {
      command: 'cd ../web && npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    },
    {
      command: 'cd ../server && npm run dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CONFIG_PATH: path.join(__dirname, '..', 'server', 'config.test.json'),
        // Fixed port for mock OpenLibrary server (matches MockOpenLibraryServer default)
        OPENLIBRARY_BASE_URL: 'http://localhost:8080',
        OPENLIBRARY_COVERS_URL: 'http://localhost:8080'
      }
    }
  ]
});
