import { IrcClient } from './lib/irc/client.js';
import { DccHandler, DccDownloadResult } from './lib/irc/dccHandler.js';
import { SearchResultParser } from './lib/parser/searchResultParser.js';
import type { SearchResult as CliSearchResult } from './lib/types.js';
import type { IrcConfig } from './configService.js';
import { enrichSearchResults } from './lib/metadata/enrichmentService.js';
import path from 'path';
import { logger } from './lib/logger.js';
import { TIMEOUTS } from './constants.js';
import { randomUUID } from 'crypto';

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
  metadata?: import('./lib/types.js').BookMetadata;  // Optional enriched metadata
}

export class IrcService {
  private ircClient: IrcClient;
  private dccHandler: DccHandler;
  private status: ConnectionStatus = 'disconnected';
  private config: IrcConfig;
  private downloadDir: string;
  private tempDir: string;
  private configService?: any;
  private requestQueue: Map<string, {
    type: 'search' | 'download';
    resolve: (result: DccDownloadResult | null) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
    timestamp: number;
  }> = new Map();
  private isProcessing: boolean = false;

  constructor(config: IrcConfig, downloadDir?: string, configService?: any) {
    this.config = config;
    this.configService = configService;
    // Allow download and temp paths to be configured via environment variables
    this.downloadDir = downloadDir || process.env.DOWNLOAD_PATH || './downloads';
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
    
    // Auto-connect only if enabled
    if (config.enabled) {
      this.connect().catch((error) => {
        logger.error('Failed to auto-connect to IRC', { error: error.message });
      });
    } else {
      logger.info('IRC is disabled, skipping auto-connect');
    }
  }

  private setupEventHandlers(): void {
    this.ircClient.on('connected', () => {
      logger.info('IRC registered');
    });

    this.ircClient.on('joined', (channel: string) => {
      logger.info(`Joined ${channel}`);
      this.status = 'connected';
    });

    this.ircClient.on('error', (error: Error) => {
      logger.error('IRC error', { error: error.message });
      this.status = 'disconnected';
    });

    this.ircClient.on('disconnected', () => {
      logger.info('Disconnected from IRC');
      this.status = 'disconnected';
    });

    this.ircClient.on('dcc_complete', (result: DccDownloadResult) => {
      // Find oldest request in queue using timestamp
      let oldestRequest: string | null = null;
      let oldestTimestamp = Infinity;
      
      Array.from(this.requestQueue.entries()).forEach(([requestId, request]) => {
        if (request.timestamp < oldestTimestamp) {
          oldestTimestamp = request.timestamp;
          oldestRequest = requestId;
        }
      });

      if (oldestRequest) {
        const request = this.requestQueue.get(oldestRequest)!;
        clearTimeout(request.timeout);
        request.resolve(result);
        this.requestQueue.delete(oldestRequest);
        logger.info(`DCC transfer complete: ${result.filename}`, { requestId: oldestRequest });
      }
    });

    this.ircClient.on('dcc_error', (error: Error) => {
      logger.error('DCC error', { error: error.message });
      
      // Find oldest request in queue using timestamp
      let oldestRequest: string | null = null;
      let oldestTimestamp = Infinity;
      
      Array.from(this.requestQueue.entries()).forEach(([requestId, request]) => {
        if (request.timestamp < oldestTimestamp) {
          oldestTimestamp = request.timestamp;
          oldestRequest = requestId;
        }
      });

      if (oldestRequest) {
        const request = this.requestQueue.get(oldestRequest)!;
        clearTimeout(request.timeout);
        request.resolve(null);
        this.requestQueue.delete(oldestRequest);
      }
    });
  }

  private async queueRequest(
    type: 'search' | 'download',
    timeout: number
  ): Promise<DccDownloadResult | null> {
    // Wait if another request is being processed
    while (this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = true;
    const requestId = randomUUID();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const request = this.requestQueue.get(requestId);
        if (request) {
          logger.info(`${type} timeout`, { requestId });
          this.requestQueue.delete(requestId);
          resolve(null);
        }
      }, timeout);

      this.requestQueue.set(requestId, {
        type,
        resolve: (result) => {
          this.isProcessing = false;
          resolve(result);
        },
        reject,
        timeout: timeoutId,
        timestamp: Date.now()
      });
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
    logger.info(`Connecting to ${this.config.server}...`);

    await this.ircClient.connect();
  }

  async search(query: string, enrich: boolean = false): Promise<SearchResult[]> {
    if (this.status !== 'connected') {
      throw new Error('Not connected to IRC');
    }

    logger.info(`Search: ${query}`);

    // Send search command to IRC
    this.ircClient.search(query);

    // Wait for DCC transfer of search results
    const result = await this.queueRequest('search', TIMEOUTS.IRC_SEARCH);

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

    logger.info(`Parsing search results from ${textFilePath}`);
    const cliResults: CliSearchResult[] = SearchResultParser.parse(textFilePath);

    // Conditionally enrich results with metadata from Open Library
    const resultsToMap = enrich ? await enrichSearchResults(cliResults) : cliResults;

    // Convert CLI format to Web API format
    const webResults: SearchResult[] = resultsToMap.map((r, index) => ({
      source: 'irc' as const,
      sourceProvider: r.botCommand.replace('!', ''),
      botName: r.botCommand.replace('!', ''),
      bookNumber: index + 1,
      title: r.title,
      author: r.author,
      fileType: r.fileType,
      size: r.filesize,
      command: r.rawCommand,
      filename: r.filename,
      metadata: r.metadata  // Pass through enriched metadata (if enriched)
    }));

    logger.info(`Found ${webResults.length} results`);
    return webResults;
  }

  async download(command: string): Promise<string> {
    if (this.status !== 'connected') {
      throw new Error('Not connected to IRC');
    }

    logger.info(`Download: ${command}`);

    // Get current download path from config if available
    let downloadPath = this.downloadDir;
    if (this.configService && typeof this.configService.getGeneralConfig === 'function') {
      const generalConfig = this.configService.getGeneralConfig();
      downloadPath = generalConfig.downloadPath || this.downloadDir;
    }

    // Update existing DCC handler with current download path
    this.dccHandler = new DccHandler(downloadPath, this.tempDir);
    this.ircClient.updateDccHandler(this.dccHandler);

    // Send download command
    this.ircClient.download(command);

    // Wait for DCC transfer
    const result = await this.queueRequest('download', TIMEOUTS.IRC_DOWNLOAD);

    if (!result) {
      throw new Error('Download timeout');
    }

    logger.info(`Downloaded: ${result.filename}`);
    return result.filename;
  }

  disconnect(): void {
    this.ircClient.disconnect();
    this.status = 'disconnected';
  }

  async updateConfig(newConfig: IrcConfig): Promise<void> {
    // Remove all listeners from old client to prevent memory leaks
    this.ircClient.removeAllListeners();
    
    // Disconnect from current server
    this.disconnect();

    // Clear and reject all pending requests in queue
    Array.from(this.requestQueue.entries()).forEach(([requestId, request]) => {
      clearTimeout(request.timeout);
      request.reject(new Error('IRC configuration updated, request cancelled'));
      logger.info(`Cancelled pending request during config update`, { requestId, type: request.type });
    });
    this.requestQueue.clear();
    this.isProcessing = false;

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

    // Only reconnect if enabled
    if (newConfig.enabled) {
      await this.connect();
    } else {
      logger.info('IRC is disabled, not reconnecting');
    }
  }

  getConfig(): IrcConfig {
    return { ...this.config };
  }
}
