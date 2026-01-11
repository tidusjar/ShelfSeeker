#!/usr/bin/env node

import { IrcClient } from './irc/client.js';
import { DccHandler, DccDownloadResult } from './irc/dccHandler.js';
import { SearchResultParser } from './parser/searchResultParser.js';
import { CliInterface } from './cli/interface.js';
import { SearchResult } from './types.js';

// Configuration
const IRC_CONFIG = {
  server: 'irc.irchighway.net',
  port: 6667,
  channel: '#ebooks'
};

const SEARCH_TIMEOUT = 30000; // 30 seconds
const DOWNLOAD_TIMEOUT = 300000; // 5 minutes - IRC transfers can be slow for large files

/**
 * Main Application
 */
class ShelfSeekerApp {
  private cli: CliInterface;
  private dccHandler: DccHandler;
  private ircClient: IrcClient;
  private currentSearchResults: SearchResult[] = [];
  private pendingTransfer: {
    type: 'search' | 'download';
    resolve: (result: DccDownloadResult | null) => void;
    timeout?: NodeJS.Timeout;
  } | null = null;

  constructor() {
    this.cli = new CliInterface();
    this.dccHandler = new DccHandler();
    this.ircClient = new IrcClient(IRC_CONFIG, this.dccHandler);

    this.setupIrcEventHandlers();
    this.setupGracefulShutdown();
  }

  /**
   * Set up IRC client event handlers
   */
  private setupIrcEventHandlers(): void {
    this.ircClient.on('connected', () => {
      // Connection registered, waiting for join
    });

    this.ircClient.on('joined', (channel: string) => {
      this.cli.showConnected(channel, this.ircClient.getNickname());
    });

    this.ircClient.on('error', (error: Error) => {
      this.cli.showError(error.message);
    });

    this.ircClient.on('reconnecting', (attempt: number) => {
      this.cli.showReconnecting(attempt);
    });

    this.ircClient.on('reconnect_failed', () => {
      this.cli.showError('Failed to reconnect after multiple attempts');
      process.exit(1);
    });

    this.ircClient.on('dcc_incoming', (filename: string) => {
      this.cli.showDccIncoming(filename);
    });

    this.ircClient.on('dcc_progress', (progress: { percentage: number; speed: number; bytesReceived: number; totalBytes: number }) => {
      this.cli.showDownloadProgress(progress.percentage, progress.speed);
    });

    this.ircClient.on('dcc_complete', (result: DccDownloadResult) => {
      if (this.pendingTransfer) {
        if (this.pendingTransfer.timeout) {
          clearTimeout(this.pendingTransfer.timeout);
        }
        this.pendingTransfer.resolve(result);
        this.pendingTransfer = null;
      }
    });

    this.ircClient.on('dcc_error', (error: Error) => {
      this.cli.showError(`File transfer failed: ${error.message}`);
      if (this.pendingTransfer) {
        if (this.pendingTransfer.timeout) {
          clearTimeout(this.pendingTransfer.timeout);
        }
        this.pendingTransfer.resolve(null);
        this.pendingTransfer = null;
      }
    });
  }

  /**
   * Set up graceful shutdown on Ctrl+C
   */
  private setupGracefulShutdown(): void {
    process.on('SIGINT', () => {
      this.cli.showGoodbye();
      this.ircClient.disconnect();
      process.exit(0);
    });
  }

  /**
   * Wait for a DCC transfer with timeout
   */
  private waitForTransfer(
    type: 'search' | 'download',
    timeout: number = SEARCH_TIMEOUT
  ): Promise<DccDownloadResult | null> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        if (this.pendingTransfer) {
          this.pendingTransfer.resolve(null);
          this.pendingTransfer = null;
        }
      }, timeout);

      this.pendingTransfer = {
        type,
        resolve,
        timeout: timeoutId
      };
    });
  }

  /**
   * Handle search operation
   */
  private async handleSearch(query: string): Promise<boolean> {
    this.cli.showSearching(query);

    // Send search command
    this.ircClient.search(query);

    // Wait for results with timeout
    let result = await this.waitForTransfer('search', SEARCH_TIMEOUT);

    // If no results, ask if user wants to wait longer
    if (!result) {
      const waitLonger = await this.cli.askWaitLonger();
      if (waitLonger) {
        result = await this.waitForTransfer('search', SEARCH_TIMEOUT);
      }
    }

    if (!result) {
      this.cli.showTimeout();
      return false;
    }

    // Extract and parse the text file
    try {
      this.cli.showParsingResults();

      let textFilePath: string | null = null;

      if (result.isZip && result.extractedFiles) {
        textFilePath = this.dccHandler.findTextFile(result.extractedFiles);
      } else if (result.filepath.toLowerCase().endsWith('.txt')) {
        textFilePath = result.filepath;
      }

      if (!textFilePath) {
        this.cli.showError('No text file found in search results');
        return false;
      }

      this.currentSearchResults = SearchResultParser.parse(textFilePath);
      this.cli.showResults(this.currentSearchResults);

      return this.currentSearchResults.length > 0;
    } catch (error) {
      this.cli.showError(`Failed to parse results: ${error}`);
      return false;
    }
  }

  /**
   * Handle download operation
   */
  private async handleDownload(result: SearchResult): Promise<void> {
    this.cli.showDownloading(result.filename);

    // Send download command
    this.ircClient.download(result.rawCommand);

    // Wait for download with timeout
    const downloadResult = await this.waitForTransfer('download', DOWNLOAD_TIMEOUT);

    if (!downloadResult) {
      this.cli.showTimeout();
      return;
    }

    this.cli.showDownloadComplete(downloadResult.filename, downloadResult.filepath);
  }

  /**
   * Main application loop
   */
  private async mainLoop(): Promise<void> {
    while (true) {
      // Prompt for search term
      const query = await this.cli.promptSearchTerm();

      if (!query) {
        // User wants to exit
        break;
      }

      // Perform search
      const hasResults = await this.handleSearch(query);

      if (!hasResults) {
        continue;
      }

      // Selection loop (allows sorting without re-searching)
      let currentResults = this.currentSearchResults;
      while (true) {
        // Prompt for selection or sort
        const selection = await this.cli.promptSelection(currentResults.length);

        if (selection === null) {
          // User cancelled
          return;
        }

        if (selection === 0) {
          // User wants to search again
          break;
        }

        if (selection === 'sort') {
          // User wants to sort results
          const sortBy = await this.cli.promptSortOption();
          if (sortBy) {
            currentResults = this.cli.sortAndShowResults(this.currentSearchResults, sortBy);
          }
          continue;
        }

        // Download selected book
        const selectedResult = currentResults[selection - 1];
        await this.handleDownload(selectedResult);
        break;
      }
    }
  }

  /**
   * Start the application
   */
  async start(): Promise<void> {
    this.cli.showWelcome();
    this.cli.showConnecting(IRC_CONFIG.server, IRC_CONFIG.channel);

    try {
      // Connect to IRC
      await this.ircClient.connect();

      // Run main loop
      await this.mainLoop();

      // Graceful exit
      this.cli.showGoodbye();
      this.ircClient.disconnect();
    } catch (error) {
      this.cli.showConnectionError((error as Error).message);
      process.exit(1);
    }
  }
}

// Start the application
const app = new ShelfSeekerApp();
app.start();
