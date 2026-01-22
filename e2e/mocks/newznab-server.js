import express from 'express';
import { getNzbResults, generateNewznabXml, generateNzbFile } from './fixtures/newznab-results.js';
/**
 * Mock Newznab Server
 * Simulates a Newznab API provider (like NZBGeek, NZBPlanet)
 */
export class MockNewznabServer {
    app;
    server = null;
    port = 0;
    validApiKey = 'test-api-key';
    constructor() {
        this.app = express();
        this.setupRoutes();
    }
    /**
     * Start the mock Newznab server
     */
    async start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(0, '127.0.0.1', () => {
                const address = this.server.address();
                this.port = address.port;
                console.log(`[MockNewznab] Server listening on port ${this.port}`);
                resolve(this.port);
            });
            this.server.on('error', reject);
        });
    }
    /**
     * Stop the mock Newznab server
     */
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    console.log('[MockNewznab] Server stopped');
                    resolve();
                });
            });
        }
    }
    /**
     * Get the port the server is listening on
     */
    getPort() {
        return this.port;
    }
    /**
     * Setup Express routes
     */
    setupRoutes() {
        // CORS for local development
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            next();
        });
        // Main API endpoint
        this.app.get('/api', (req, res) => {
            const { t, q, apikey } = req.query;
            console.log(`[MockNewznab] Request: t=${t}, q=${q}, apikey=${apikey ? '***' : 'missing'}`);
            // Validate API key
            if (!apikey || apikey !== this.validApiKey) {
                return res.status(403).send('Invalid API key');
            }
            // Handle different request types
            switch (t) {
                case 'search':
                    this.handleSearch(req, res);
                    break;
                case 'get':
                    this.handleGet(req, res);
                    break;
                default:
                    res.status(400).send('Invalid request type');
            }
        });
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });
    }
    /**
     * Handle search requests
     */
    handleSearch(req, res) {
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            res.status(400).send('Missing query parameter');
            return;
        }
        const results = getNzbResults(q);
        console.log(`[MockNewznab] Search "${q}": ${results.length} results`);
        const xml = generateNewznabXml(results, this.port);
        res.type('application/xml');
        res.send(xml);
    }
    /**
     * Handle NZB file download requests
     */
    handleGet(req, res) {
        const { id } = req.query;
        if (!id || typeof id !== 'string') {
            res.status(400).send('Missing id parameter');
            return;
        }
        console.log(`[MockNewznab] Download NZB: ${id}`);
        // Generate mock NZB file
        const nzbContent = generateNzbFile(id, `book-${id}.nzb`);
        res.type('application/x-nzb');
        res.setHeader('Content-Disposition', `attachment; filename="${id}.nzb"`);
        res.send(nzbContent);
    }
}
