import { getGlobalManager } from '../mocks/server-manager.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup - runs once before all tests
 */
export default async function globalSetup() {
  console.log('\n=== E2E Test Global Setup ===\n');

  const manager = getGlobalManager();
  
  try {
    // Start mock servers
    const { ircPort, nzbPort } = await manager.startAll();

    // Store ports in environment for tests and server to use
    process.env.MOCK_IRC_PORT = String(ircPort);
    process.env.MOCK_NZB_PORT = String(nzbPort);
    process.env.TEST_MODE = 'true';

    // Configure server to use mock IRC
    process.env.IRC_HOST = 'localhost';
    process.env.IRC_PORT = String(ircPort);
    
    console.log('\n✓ Mock servers started successfully');
    console.log(`  IRC Port: ${ircPort}`);
    console.log(`  NZB Port: ${nzbPort}`);

    // Create a MINIMAL config file for the server to use during tests
    // Tests will configure IRC and NZB providers through the UI
    const serverConfigPath = path.join(process.cwd(), '..', 'server', 'config.test.json');
    const testConfig = {
      version: '1.0',
      general: {
        downloadPath: path.join(process.cwd(), '..', 'server', 'downloads')
      },
      sources: {
        irc: {
          enabled: false, // Disabled by default - tests will enable through UI
          server: '',
          port: 6667,
          channel: '',
          searchCommand: '',
          connectionTimeout: 30000,
          searchTimeout: 30000,
          downloadTimeout: 300000
        },
        torrent: {
          enabled: false,
          indexers: []
        },
        nzb: {
          enabled: false, // Disabled by default - tests will enable through UI
          indexers: [] // Empty by default - tests will add providers through UI
        }
      },
      downloaders: {
        usenet: [],
        torrent: []
      },
      ui: {
        theme: 'dark',
        maxResults: 100
      }
    };

    fs.writeFileSync(serverConfigPath, JSON.stringify(testConfig, null, 2));
    
    // Set environment variable so server uses test config
    process.env.CONFIG_PATH = serverConfigPath;
    
    console.log('✓ Minimal test configuration written (sources disabled by default)');
    console.log('  Tests will configure IRC and NZB through Settings UI\n');

  } catch (error) {
    console.error('✗ Failed to start mock servers:', error);
    throw error;
  }
}
