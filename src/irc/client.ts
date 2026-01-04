import { EventEmitter } from 'events';
import IRC from 'irc-framework';
import { DccHandler, DccDownloadResult } from './dccHandler.js';
import { ConnectionStatus } from '../types.js';

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
  private retryDelay = 5000;

  constructor(config: IrcConfig, dccHandler: DccHandler) {
    super();
    this.config = {
      ...config,
      nick: config.nick || this.generateNickname()
    };
    this.dccHandler = dccHandler;
    this.client = new IRC.Client();

    this.setupEventHandlers();
  }

  /**
   * Generate a random nickname
   */
  private generateNickname(): string {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ircbooks_${random}`;
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

    this.client.on('join', (event) => {
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

    this.client.on('socket error', (err) => {
      this.status = 'error';
      this.emit('error', err);
    });

    // Handle DCC transfers
    this.client.on('dcc.send', async (event: any) => {
      try {
        this.emit('dcc_incoming', event.filename);

        // Determine if this is a search result (zip file) or ebook
        const isSearchResult = event.filename.toLowerCase().endsWith('.zip');

        const result = await this.dccHandler.handleTransfer(
          {
            filename: event.filename,
            size: event.size,
            nick: event.nick,
            port: event.port,
            ip: event.ip
          },
          event.readable,
          isSearchResult
        );

        this.emit('dcc_complete', result);
      } catch (error) {
        this.emit('dcc_error', error);
      }
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
      }, 30000);

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
        username: 'ircbooks',
        gecos: 'IRC Ebook Search Client'
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
}
