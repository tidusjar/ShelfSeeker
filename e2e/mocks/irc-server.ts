import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { getIrcResults } from './fixtures/irc-responses.js';

/**
 * Mock IRC Server
 * Simulates IRCHighway server and #ebooks channel bots
 * Implements minimal IRC protocol needed for ShelfSeeker
 */
export class MockIrcServer {
  private server: net.Server | null = null;
  private port: number = 0;
  private clients: net.Socket[] = [];
  private dccServers: net.Server[] = [];
  private tempDir: string;

  constructor(tempDir?: string) {
    // Use absolute path from project root
    const projectRoot = path.resolve(process.cwd(), '..');
    this.tempDir = tempDir || path.join(projectRoot, '.tmp', 'e2e-mock-irc');
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Start the mock IRC server
   */
  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleClient(socket);
      });

      this.server.listen(0, '127.0.0.1', () => {
        const address = this.server!.address() as net.AddressInfo;
        this.port = address.port;
        console.log(`[MockIRC] Server listening on port ${this.port}`);
        resolve(this.port);
      });

      this.server.on('error', reject);
    });
  }

  /**
   * Stop the mock IRC server
   */
  async stop(): Promise<void> {
    // Close all DCC servers
    for (const dccServer of this.dccServers) {
      dccServer.close();
    }
    this.dccServers = [];

    // Close all client connections
    for (const client of this.clients) {
      client.end();
    }
    this.clients = [];

    // Close main server
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('[MockIRC] Server stopped');
          resolve();
        });
      });
    }

    // Clean up temp directory
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Get the port the server is listening on
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Handle a new IRC client connection
   */
  private handleClient(socket: net.Socket): void {
    this.clients.push(socket);
    console.log('[MockIRC] Client connected');

    let buffer = '';
    let clientNick = '';

    socket.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        console.log('[MockIRC] <<', line);
        this.handleCommand(socket, line, clientNick, (nick) => { clientNick = nick; });
      }
    });

    socket.on('end', () => {
      console.log('[MockIRC] Client disconnected');
      this.clients = this.clients.filter(c => c !== socket);
    });

    socket.on('error', (err) => {
      console.error('[MockIRC] Socket error:', err.message);
    });
  }

  /**
   * Handle IRC protocol commands
   */
  private handleCommand(socket: net.Socket, line: string, currentNick: string, setNick: (nick: string) => void): void {
    const parts = line.split(' ');
    const command = parts[0].toUpperCase();

    switch (command) {
      case 'NICK': {
        const nick = parts[1];
        setNick(nick);
        this.send(socket, `:mockserver 001 ${nick} :Welcome to Mock IRC`);
        this.send(socket, `:mockserver 376 ${nick} :End of /MOTD command.`);
        break;
      }

      case 'USER': {
        // USER command, usually sent after NICK
        // No specific response needed
        break;
      }

      case 'JOIN': {
        const channel = parts[1];
        const nick = currentNick || 'user';
        this.send(socket, `:${nick}!user@host JOIN ${channel}`);
        this.send(socket, `:mockserver 332 ${nick} ${channel} :Welcome to ${channel}`);
        this.send(socket, `:mockserver 333 ${nick} ${channel} mockserver 1234567890`);
        this.send(socket, `:mockserver 353 ${nick} = ${channel} :${nick} @SearchBot @BookLib @Bsk`);
        this.send(socket, `:mockserver 366 ${nick} ${channel} :End of /NAMES list.`);
        break;
      }

      case 'PRIVMSG': {
        const target = parts[1];
        const message = parts.slice(2).join(' ').substring(1); // Remove leading ':'
        
        // Check if this is a search command
        if (message.includes('@search ')) {
          const query = message.replace('@search ', '').trim();
          console.log('[MockIRC] Search query:', query);
          this.handleSearch(socket, query);
        }
        // Check if this is a book download request (!BotName filename)
        else if (message.startsWith('!')) {
          const downloadMatch = message.match(/^!(\w+)\s+(.+)$/);
          if (downloadMatch) {
            const botName = downloadMatch[1];
            const filename = downloadMatch[2];
            console.log('[MockIRC] Book download request:', { botName, filename });
            this.handleBookDownload(socket, botName, filename);
          }
        }
        break;
      }

      case 'PING': {
        const server = parts[1];
        this.send(socket, `:mockserver PONG mockserver :${server}`);
        break;
      }

      case 'QUIT': {
        socket.end();
        break;
      }

      default:
        // Ignore unknown commands
        break;
    }
  }

  /**
   * Handle search command - initiate DCC SEND
   */
  private async handleSearch(socket: net.Socket, query: string): Promise<void> {
    const results = getIrcResults(query);
    
    if (results.length === 0) {
      console.log('[MockIRC] No results for query:', query);
      return;
    }

    // Create a search results file
    const filename = `search_${Date.now()}.txt`;
    const filepath = path.join(this.tempDir, filename);
    const content = results.join('\n');
    
    fs.writeFileSync(filepath, content, 'utf-8');
    const filesize = fs.statSync(filepath).size;

    // Initiate DCC SEND
    await this.sendDccFile(socket, filepath, filename, filesize);
  }

  /**
   * Handle book download request - initiate DCC SEND for the book file
   */
  private async handleBookDownload(socket: net.Socket, botName: string, filename: string): Promise<void> {
    console.log('[MockIRC] Sending book via DCC:', filename);
    
    // Create a mock book file (small epub-like content)
    const bookFilename = filename.replace(/\s+/g, '_'); // Replace spaces
    const filepath = path.join(this.tempDir, bookFilename);
    
    // Create a small mock EPUB file (just a ZIP file with minimal content)
    const content = Buffer.from('PK\x03\x04mock epub content for testing');
    fs.writeFileSync(filepath, content);
    const filesize = fs.statSync(filepath).size;

    // Send DCC SEND message from the bot
    await this.sendDccFile(socket, filepath, bookFilename, filesize, botName);
  }

  /**
   * Send a file via DCC SEND protocol
   */
  private async sendDccFile(clientSocket: net.Socket, filepath: string, filename: string, filesize: number, fromBot: string = 'search'): Promise<void> {
    return new Promise((resolve) => {
      // Create DCC server for file transfer
      const dccServer = net.createServer((dataSocket) => {
        console.log('[MockIRC] DCC data connection established');
        
        const fileStream = fs.createReadStream(filepath);
        
        fileStream.on('data', (chunk: Buffer) => {
          dataSocket.write(chunk);
        });

        fileStream.on('end', () => {
          console.log('[MockIRC] DCC file transfer complete');
          dataSocket.end();
          dccServer.close();
          
          // Remove from active servers
          this.dccServers = this.dccServers.filter(s => s !== dccServer);
          
          // Clean up temp file
          fs.unlinkSync(filepath);
          
          resolve();
        });

        fileStream.on('error', (err) => {
          console.error('[MockIRC] DCC file read error:', err.message);
          dataSocket.end();
          dccServer.close();
        });
      });

      dccServer.listen(0, '127.0.0.1', () => {
        const address = dccServer.address() as net.AddressInfo;
        const dccPort = address.port;
        
        // Convert IP to DCC format (32-bit integer)
        // 127.0.0.1 = 2130706433
        const ip = 2130706433;
        
        // Send CTCP DCC SEND message
        const dccMessage = `\x01DCC SEND ${filename} ${ip} ${dccPort} ${filesize}\x01`;
        this.send(clientSocket, `:${fromBot === 'search' ? 'SearchBot' : fromBot}!bot@mockserver PRIVMSG ${fromBot} :${dccMessage}`);
        
        console.log(`[MockIRC] DCC SEND initiated: ${filename} on port ${dccPort}`);
        
        this.dccServers.push(dccServer);
      });
    });
  }

  /**
   * Send a message to the client
   */
  private send(socket: net.Socket, message: string): void {
    console.log('[MockIRC] >>', message);
    socket.write(message + '\r\n');
  }
}
