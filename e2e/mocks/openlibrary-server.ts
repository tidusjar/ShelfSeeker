/**
 * Mock OpenLibrary Server
 * Intercepts requests to openlibrary.org and returns mock data
 */
import { IncomingMessage, ServerResponse, createServer, Server } from 'http';
import { URL } from 'url';
import {
  getOpenLibraryResponse,
  getOpenLibraryCoverUrl,
  EMPTY_RESPONSE,
  type OpenLibrarySearchResponse
} from './fixtures/openlibrary-responses.js';

export class MockOpenLibraryServer {
  private server: Server | null = null;
  private port: number;

  constructor(port: number = 8080) {
    this.port = port;
  }

  /**
   * Start the mock OpenLibrary server
   */
  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`Port ${this.port} in use, trying ${this.port + 1}`);
          this.port++;
          this.server?.listen(this.port);
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, () => {
        console.log(`[MockOpenLibrary] Started on port ${this.port}`);
        resolve(this.port);
      });
    });
  }

  /**
   * Stop the mock server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('[MockOpenLibrary] Stopped');
          this.server = null;
          resolve();
        }
      });
    });
  }

  /**
   * Get the current port
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Handle incoming HTTP requests
   */
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url || '/', `http://localhost:${this.port}`);
    
    // Enable CORS for all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Route to appropriate handler
    if (url.pathname === '/search.json') {
      this.handleSearch(url, res);
    } else if (url.pathname.startsWith('/b/id/')) {
      this.handleCoverImage(url, res);
    } else if (url.pathname === '/api/books') {
      this.handleBooksApi(url, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  }

  /**
   * Handle /search.json endpoint
   * Example: /search.json?title=Dune&author=Frank+Herbert&limit=1
   */
  private handleSearch(url: URL, res: ServerResponse): void {
    const title = url.searchParams.get('title') || url.searchParams.get('q') || '';
    const author = url.searchParams.get('author') || '';
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    console.log(`[MockOpenLibrary] Search request - title: "${title}", author: "${author}", limit: ${limit}`);

    let response: OpenLibrarySearchResponse;

    if (title && author) {
      // Look up mock response by title and author
      const mockResponse = getOpenLibraryResponse(title, author);
      response = mockResponse || EMPTY_RESPONSE;
    } else if (title) {
      // Title-only search - try to find a match
      response = EMPTY_RESPONSE;
    } else {
      // No search params
      response = EMPTY_RESPONSE;
    }

    // Apply limit to docs
    if (response.docs.length > limit) {
      response = {
        ...response,
        docs: response.docs.slice(0, limit)
      };
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  /**
   * Handle /b/id/{id}-{size}.jpg endpoint for cover images
   * Example: /b/id/8593661-M.jpg
   */
  private handleCoverImage(url: URL, res: ServerResponse): void {
    // Extract cover ID and size from path
    const match = url.pathname.match(/\/b\/id\/(\d+)-([SML])\.jpg/);
    
    if (!match) {
      res.writeHead(404);
      res.end();
      return;
    }

    const [, coverId, size] = match;
    console.log(`[MockOpenLibrary] Cover image request - id: ${coverId}, size: ${size}`);

    // Return a 1x1 transparent PNG as a mock image
    // In a real scenario, you'd return actual image data
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': transparentPng.length
    });
    res.end(transparentPng);
  }

  /**
   * Handle /api/books endpoint (ISBN lookup)
   * Example: /api/books?bibkeys=ISBN:9780441172719&format=json&jscmd=data
   */
  private handleBooksApi(url: URL, res: ServerResponse): void {
    const bibkeys = url.searchParams.get('bibkeys') || '';
    console.log(`[MockOpenLibrary] Books API request - bibkeys: "${bibkeys}"`);

    // Return empty object for now - could be extended if needed
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({}));
  }
}
