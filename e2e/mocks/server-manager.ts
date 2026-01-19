import { MockIrcServer } from './irc-server.js';
import { MockNewznabServer } from './newznab-server.js';

/**
 * Test Server Manager
 * Coordinates lifecycle of all mock servers
 */
export class TestServerManager {
  private ircServer: MockIrcServer;
  private newznabServer: MockNewznabServer;
  private ircPort: number = 0;
  private nzbPort: number = 0;

  constructor() {
    this.ircServer = new MockIrcServer();
    this.newznabServer = new MockNewznabServer();
  }

  /**
   * Start all mock servers
   */
  async startAll(): Promise<{ ircPort: number; nzbPort: number }> {
    console.log('[TestServerManager] Starting mock servers...');
    
    // Start servers in parallel
    const [ircPort, nzbPort] = await Promise.all([
      this.ircServer.start(),
      this.newznabServer.start()
    ]);

    this.ircPort = ircPort;
    this.nzbPort = nzbPort;

    console.log('[TestServerManager] All servers started');
    console.log(`  - IRC: localhost:${ircPort}`);
    console.log(`  - NZB: http://localhost:${nzbPort}`);

    return { ircPort, nzbPort };
  }

  /**
   * Stop all mock servers
   */
  async stopAll(): Promise<void> {
    console.log('[TestServerManager] Stopping mock servers...');
    
    await Promise.all([
      this.ircServer.stop(),
      this.newznabServer.stop()
    ]);

    console.log('[TestServerManager] All servers stopped');
  }

  /**
   * Get IRC server port
   */
  getIrcPort(): number {
    return this.ircPort;
  }

  /**
   * Get Newznab server port
   */
  getNzbPort(): number {
    return this.nzbPort;
  }

  /**
   * Get configuration for connecting to mock servers
   */
  getConfig() {
    return {
      ircServer: 'localhost',
      ircPort: this.ircPort,
      nzbUrl: `http://localhost:${this.nzbPort}`,
      nzbApiKey: 'test-api-key'
    };
  }
}

/**
 * Global test server manager instance
 * Used across all tests
 */
let globalManager: TestServerManager | null = null;

export function getGlobalManager(): TestServerManager {
  if (!globalManager) {
    globalManager = new TestServerManager();
  }
  return globalManager;
}

export function resetGlobalManager(): void {
  globalManager = null;
}
