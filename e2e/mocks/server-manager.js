import { MockIrcServer } from './irc-server.js';
import { MockNewznabServer } from './newznab-server.js';
import { MockOpenLibraryServer } from './openlibrary-server.js';
/**
 * Test Server Manager
 * Coordinates lifecycle of all mock servers
 */
export class TestServerManager {
    ircServer;
    newznabServer;
    openLibraryServer;
    ircPort = 0;
    nzbPort = 0;
    openLibraryPort = 0;
    constructor() {
        this.ircServer = new MockIrcServer();
        this.newznabServer = new MockNewznabServer();
        this.openLibraryServer = new MockOpenLibraryServer(8080);
    }
    /**
     * Start all mock servers
     */
    async startAll() {
        console.log('[TestServerManager] Starting mock servers...');
        // Start servers in parallel
        const [ircPort, nzbPort, openLibraryPort] = await Promise.all([
            this.ircServer.start(),
            this.newznabServer.start(),
            this.openLibraryServer.start()
        ]);
        this.ircPort = ircPort;
        this.nzbPort = nzbPort;
        this.openLibraryPort = openLibraryPort;
        console.log('[TestServerManager] All servers started');
        console.log(`  - IRC: localhost:${ircPort}`);
        console.log(`  - NZB: http://localhost:${nzbPort}`);
        console.log(`  - OpenLibrary: http://localhost:${openLibraryPort}`);
        return { ircPort, nzbPort, openLibraryPort };
    }
    /**
     * Stop all mock servers
     */
    async stopAll() {
        console.log('[TestServerManager] Stopping mock servers...');
        await Promise.all([
            this.ircServer.stop(),
            this.newznabServer.stop(),
            this.openLibraryServer.stop()
        ]);
        console.log('[TestServerManager] All servers stopped');
    }
    /**
     * Get IRC server port
     */
    getIrcPort() {
        return this.ircPort;
    }
    /**
     * Get Newznab server port
     */
    getNzbPort() {
        return this.nzbPort;
    }
    /**
     * Get OpenLibrary server port
     */
    getOpenLibraryPort() {
        return this.openLibraryPort;
    }
    /**
     * Get configuration for connecting to mock servers
     */
    getConfig() {
        return {
            ircServer: 'localhost',
            ircPort: this.ircPort,
            nzbUrl: `http://localhost:${this.nzbPort}`,
            nzbApiKey: 'test-api-key',
            openLibraryUrl: `http://localhost:${this.openLibraryPort}`
        };
    }
}
/**
 * Global test server manager instance
 * Used across all tests
 */
let globalManager = null;
export function getGlobalManager() {
    if (!globalManager) {
        globalManager = new TestServerManager();
    }
    return globalManager;
}
export function resetGlobalManager() {
    globalManager = null;
}
