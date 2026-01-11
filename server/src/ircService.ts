import { IrcClient } from '../../src/irc/client.js';
import { DccHandler, DccDownloadResult } from '../../src/irc/dccHandler.js';
import { SearchResultParser } from '../../src/parser/searchResultParser.js';
import type { SearchResult as CliSearchResult } from '../../src/types.js';
import type { IrcConfig } from './configService.js';
import path from 'path';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

// Web API SearchResult format (different from CLI)
export interface SearchResult {
  source: 'irc' | 'nzb';
  sourceProvider: string;
  botName: string;
  bookNumber: number;
  title: string;
  author: string;
  fileType: string;
  size: string;
  command?: string;          // IRC only
  filename: string;
  nzbUrl?: string;           // NZB only
  guid?: string;             // NZB only
}

export class IrcService {
  private ircClient: IrcClient;
  private dccHandler: DccHandler;
  private status: ConnectionStatus = 'disconnected';
  private config: IrcConfig;
  private downloadDir: string;
  private tempDir: string;
  private pendingTransfer: {
    type: 'search' | 'download';
    resolve: (result: DccDownloadResult | null) => void;
    timeout?: NodeJS.Timeout;
  } | null = null;

  constructor(config: IrcConfig) {
    this.config = config;
    // Allow download and temp paths to be configured via environment variables
    this.downloadDir = process.env.DOWNLOAD_PATH || './downloads';
    this.tempDir = process.env.TEMP_PATH || './.tmp';
    this.dccHandler = new DccHandler(this.downloadDir, this.tempDir);
    this.ircClient = new IrcClient(
      {
        server: config.server,
        port: config.port,
        channel: config.channel
      },
      this.dccHandler
    );
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.ircClient.on('connected', () => {
      console.log('✓ IRC registered');
    });

    this.ircClient.on('joined', (channel: string) => {
      console.log(`✓ Joined ${channel}`);
      this.status = 'connected';
    });

    this.ircClient.on('error', (error: Error) => {
      console.error('✗ IRC error:', error.message);
      this.status = 'disconnected';
    });

    this.ircClient.on('disconnected', () => {
      console.log('✗ Disconnected from IRC');
      this.status = 'disconnected';
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
      console.error('✗ DCC error:', error.message);
      if (this.pendingTransfer) {
        if (this.pendingTransfer.timeout) {
          clearTimeout(this.pendingTransfer.timeout);
        }
        this.pendingTransfer.resolve(null);
        this.pendingTransfer = null;
      }
    });
  }

  private waitForTransfer(
    type: 'search' | 'download',
    timeout: number
  ): Promise<DccDownloadResult | null> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        if (this.pendingTransfer) {
          console.log(`✗ ${type} timeout`);
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

  getStatus(): ConnectionStatus {
    return this.status;
  }

  async connect(): Promise<void> {
    if (this.status === 'connected') {
      return;
    }

    this.status = 'connecting';
    console.log(`→ Connecting to ${this.config.server}...`);

    await this.ircClient.connect();
  }

  async search(query: string): Promise<SearchResult[]> {
    if (this.status !== 'connected') {
      throw new Error('Not connected to IRC');
    }

    console.log(`→ Searching for: "${query}"`);

    // Send search command
    this.ircClient.search(query);

    // Wait for DCC transfer of search results
    const result = await this.waitForTransfer('search', this.config.searchTimeout);

    if (!result) {
      throw new Error('Search timeout - no results received');
    }

    // Find and parse the text file
    let textFilePath: string | null = null;

    if (result.isZip && result.extractedFiles) {
      textFilePath = this.dccHandler.findTextFile(result.extractedFiles);
    } else if (result.filepath.toLowerCase().endsWith('.txt')) {
      textFilePath = result.filepath;
    }

    if (!textFilePath) {
      throw new Error('No text file found in search results');
    }

    console.log(`→ Parsing results from ${path.basename(textFilePath)}...`);
    const cliResults: CliSearchResult[] = SearchResultParser.parse(textFilePath);

    // Convert CLI format to Web API format
    const webResults: SearchResult[] = cliResults.map((r, index) => ({
      source: 'irc' as const,
      sourceProvider: r.botCommand.replace('!', ''),
      botName: r.botCommand.replace('!', ''),
      bookNumber: index + 1,
      title: r.title,
      author: r.author,
      fileType: r.fileType,
      size: r.filesize,
      command: r.rawCommand,
      filename: r.filename
    }));

    console.log(`✓ Found ${webResults.length} results`);
    return webResults;
  }

  async download(command: string): Promise<string> {
    if (this.status !== 'connected') {
      throw new Error('Not connected to IRC');
    }

    console.log(`→ Download: ${command}`);

    // Send download command
    this.ircClient.download(command);

    // Wait for DCC transfer
    const result = await this.waitForTransfer('download', this.config.downloadTimeout);

    if (!result) {
      throw new Error('Download timeout');
    }

    console.log(`✓ Downloaded: ${result.filename}`);
    return result.filename;
  }

  disconnect(): void {
    this.ircClient.disconnect();
    this.status = 'disconnected';
  }

  async updateConfig(newConfig: IrcConfig): Promise<void> {
    // Disconnect from current server
    this.disconnect();

    // Update config
    this.config = newConfig;

    // Recreate DCC handler (in case paths changed via env vars)
    this.dccHandler = new DccHandler(this.downloadDir, this.tempDir);

    // Create new IRC client with updated config
    this.ircClient = new IrcClient(
      {
        server: newConfig.server,
        port: newConfig.port,
        channel: newConfig.channel
      },
      this.dccHandler
    );

    // Re-setup event handlers for the new client
    this.setupEventHandlers();

    // Reconnect with new settings
    await this.connect();
  }

  getConfig(): IrcConfig {
    return { ...this.config };
  }
}
