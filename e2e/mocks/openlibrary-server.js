/**
 * Mock OpenLibrary Server
 * Intercepts requests to openlibrary.org and returns mock data
 */
import { createServer } from 'http';
import { URL } from 'url';
import { getOpenLibraryResponse, EMPTY_RESPONSE } from './fixtures/openlibrary-responses.js';
export class MockOpenLibraryServer {
    server = null;
    port;
    constructor(port = 8080) {
        this.port = port;
    }
    /**
     * Start the mock OpenLibrary server
     */
    async start() {
        return new Promise((resolve, reject) => {
            this.server = createServer((req, res) => this.handleRequest(req, res));
            this.server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.warn(`Port ${this.port} in use, trying ${this.port + 1}`);
                    this.port++;
                    this.server?.listen(this.port);
                }
                else {
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
    async stop() {
        return new Promise((resolve, reject) => {
            if (!this.server) {
                resolve();
                return;
            }
            this.server.close((err) => {
                if (err) {
                    reject(err);
                }
                else {
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
    getPort() {
        return this.port;
    }
    /**
     * Handle incoming HTTP requests
     */
    handleRequest(req, res) {
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
        }
        else if (url.pathname.startsWith('/b/id/')) {
            this.handleCoverImage(url, res);
        }
        else if (url.pathname === '/api/books') {
            this.handleBooksApi(url, res);
        }
        else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not Found' }));
        }
    }
    /**
     * Handle /search.json endpoint
     * Example: /search.json?title=Dune&author=Frank+Herbert&limit=1
     */
    handleSearch(url, res) {
        const title = url.searchParams.get('title') || url.searchParams.get('q') || '';
        const author = url.searchParams.get('author') || '';
        const limit = parseInt(url.searchParams.get('limit') || '10', 10);
        console.log(`[MockOpenLibrary] Search request - title: "${title}", author: "${author}", limit: ${limit}`);
        let response;
        if (title && author) {
            // Look up mock response by title and author
            const mockResponse = getOpenLibraryResponse(title, author);
            response = mockResponse || EMPTY_RESPONSE;
        }
        else if (title) {
            // Title-only search - try to find a match
            response = EMPTY_RESPONSE;
        }
        else {
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
    handleCoverImage(url, res) {
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
        const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
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
    handleBooksApi(url, res) {
        const bibkeys = url.searchParams.get('bibkeys') || '';
        console.log(`[MockOpenLibrary] Books API request - bibkeys: "${bibkeys}"`);
        // Return empty object for now - could be extended if needed
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({}));
    }
}
