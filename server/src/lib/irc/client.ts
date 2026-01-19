import { EventEmitter } from 'events';
// @ts-expect-error - irc-framework has no type definitions
import IRC from 'irc-framework';
import { DccHandler, DccDownloadResult } from './dccHandler.js';
import { DccReceiver } from './dccReceiver.js';
import { ConnectionStatus } from '../types.js';
import { TIMEOUTS } from '../../constants.js';

export interface IrcConfig {
  server: string;
  port: number;
  channel: string;
  nick?: string;
}

/**
 * IRC Client Manager
 * Handles connection to IRC server, channel management, and message sending
 */
export class IrcClient extends EventEmitter {
  private client: IRC.Client;
  private dccHandler: DccHandler;
  private config: IrcConfig;
  private status: ConnectionStatus = 'disconnected';
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = TIMEOUTS.IRC_RETRY_DELAY;
  
  // Progress tracking
  private progressInterval?: NodeJS.Timeout;
  private lastProgressTime?: number;
  private lastProgressBytes: number = 0;

  constructor(config: IrcConfig, dccHandler: DccHandler) {
    super();
    this.config = {
      ...config,
      nick: config.nick || this.generateNickname()
    };
    this.dccHandler = dccHandler;
    
    // Configure client with HexChat-like VERSION for IRCHighway compatibility
    this.client = new IRC.Client({
      version: 'HexChat 2.16.1 / Linux 6.0'
    });

    this.setupEventHandlers();
  }

  /**
   * Generate a random nickname
   */
  private generateNickname(): string {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `shelfseeker_${random}`;
  }

  /**
   * Set up IRC client event handlers
   */
  private setupEventHandlers(): void {
    this.client.on('registered', () => {
      this.status = 'connected';
      this.retryCount = 0;
      this.emit('connected');

      // Join the channel
      this.client.join(this.config.channel);
    });

    this.client.on('join', (event: any) => {
      if (event.nick === this.client.user.nick) {
        this.status = 'joined';
        this.emit('joined', this.config.channel);
      }
    });

    this.client.on('close', () => {
      this.status = 'disconnected';
      this.emit('disconnected');
    });

    this.client.on('socket close', () => {
      if (this.status !== 'disconnected') {
        this.emit('connection_lost');
        this.handleReconnect();
      }
    });

    this.client.on('socket error', (err: any) => {
      this.status = 'error';
      this.emit('error', err);
    });

    // Handle CTCP DCC requests
    this.client.on('ctcp request', async (event: any) => {
      // Handle DCC SEND transfers
      if (event.type === 'DCC') {
        const dccInfo = DccReceiver.parseDccSend(event.message);
        
        if (!dccInfo) {
          return;
        }

        this.emit('dcc_incoming', dccInfo.filename);

        try {
          // Determine output directory
          const isSearchResult = dccInfo.filename.toLowerCase().endsWith('.zip');
          const outputPath = isSearchResult ? './.tmp' : './downloads';

          // Setup progress tracking for book downloads (not search results)
          let onProgress: ((bytesReceived: number, totalBytes: number) => void) | undefined;
          
          if (!isSearchResult) {
            // Initialize progress tracking
            this.lastProgressTime = Date.now();
            this.lastProgressBytes = 0;
            
            // Set up periodic progress updates (every 1 second)
            this.progressInterval = setInterval(() => {
              // Progress will be emitted by the callback
            }, 1000);
            
            onProgress = (bytesReceived: number, totalBytes: number) => {
              const now = Date.now();
              
              // Calculate speed (bytes per second)
              const timeDelta = (now - (this.lastProgressTime || now)) / 1000;
              const bytesDelta = bytesReceived - this.lastProgressBytes;
              const speed = timeDelta > 0 ? bytesDelta / timeDelta : 0;
              
              // Calculate percentage
              const percentage = totalBytes > 0 ? Math.round((bytesReceived / totalBytes) * 100) : 0;
              
              // Emit progress event
              this.emit('dcc_progress', { 
                percentage, 
                speed, 
                bytesReceived, 
                totalBytes 
              });
              
              // Update tracking
              this.lastProgressTime = now;
              this.lastProgressBytes = bytesReceived;
            };
          }

          // Download the file
          const result = await DccReceiver.downloadFile(
            dccInfo.filename,
            dccInfo.ip,
            dccInfo.port,
            dccInfo.filesize,
            outputPath,
            onProgress
          );
          
          // Clear progress interval
          if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = undefined;
          }

          // Process if it's a search result
          const dccResult: DccDownloadResult = {
            filename: result.filename,
            filepath: result.filepath,
            isZip: isSearchResult,
            extractedFiles: undefined
          };

          // If it's a zip file, extract it
          if (isSearchResult) {
            const extractedFiles = await this.dccHandler.extractZip(result.filepath, outputPath);
            dccResult.extractedFiles = extractedFiles;
          }

          this.emit('dcc_complete', dccResult);
        } catch (error) {
          // Clear progress interval on error
          if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = undefined;
          }
          this.emit('dcc_error', error);
        }
      }
    });

    // CTCP responses (no action needed, just prevent errors)
    this.client.on('ctcp response', (event: any) => {
      // Silent
    });

    // NOTICE messages (no action needed)
    this.client.on('notice', (event: any) => {
      // Silent
    });

    // PRIVMSG messages (no action needed)
    this.client.on('privmsg', (event: any) => {
      // Silent
    });
  }

  /**
   * Handle reconnection attempts
   */
  private async handleReconnect(): Promise<void> {
    if (this.retryCount >= this.maxRetries) {
      this.emit('reconnect_failed');
      return;
    }

    this.retryCount++;
    this.emit('reconnecting', this.retryCount);

    await new Promise(resolve => setTimeout(resolve, this.retryDelay));

    try {
      await this.connect();
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Connect to the IRC server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.status = 'connecting';

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, TIMEOUTS.IRC_CONNECTION);

      const onJoined = () => {
        clearTimeout(timeout);
        this.removeListener('error', onError);
        resolve();
      };

      const onError = (err: Error) => {
        clearTimeout(timeout);
        this.removeListener('joined', onJoined);
        reject(err);
      };

      this.once('joined', onJoined);
      this.once('error', onError);

      this.client.connect({
        host: this.config.server,
        port: this.config.port,
        nick: this.config.nick!,
        username: 'shelfseeker',
        gecos: 'ShelfSeeker IRC Client'
      });
    });
  }

  /**
   * Send a message to the channel
   */
  sendMessage(message: string): void {
    if (this.status !== 'joined') {
      throw new Error('Not connected to channel');
    }
    this.client.say(this.config.channel, message);
    this.emit('message_sent', message);
  }

  /**
   * Search for an ebook
   */
  search(query: string): void {
    this.sendMessage(`@search ${query}`);
  }

  /**
   * Request an ebook download
   */
  download(command: string): void {
    this.sendMessage(command);
  }

  /**
   * Disconnect from IRC
   */
  disconnect(): void {
    this.status = 'disconnected';
    this.client.quit('Goodbye');
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get current nickname
   */
  getNickname(): string {
    return this.config.nick!;
  }

  /**
   * Update the DCC handler (useful when download path changes)
   */
  updateDccHandler(dccHandler: DccHandler): void {
    this.dccHandler = dccHandler;
  }
}
