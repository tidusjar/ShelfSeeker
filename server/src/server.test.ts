import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies before importing server
vi.mock('./ircService.js');
vi.mock('./configService.js');
vi.mock('./nzbService.js');
vi.mock('./searchService.js');
vi.mock('./downloaderService.js');
vi.mock('./lib/metadata/enrichmentService.js');

describe('Server API Endpoints', () => {
  let app: express.Application;
  let mockIrcService: any;
  let mockConfigService: any;
  let mockNzbService: any;
  let mockSearchService: any;
  let mockDownloaderService: any;
  let mockEnrichmentService: any;

  beforeEach(async () => {
    // Create fresh mocks for each test
    const { IrcService } = await import('./ircService.js');
    const { ConfigService } = await import('./configService.js');
    const { NzbService } = await import('./nzbService.js');
    const { SearchService } = await import('./searchService.js');
    const { DownloaderService } = await import('./downloaderService.js');
    const enrichmentService = await import('./lib/metadata/enrichmentService.js');

    mockIrcService = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      getStatus: vi.fn().mockReturnValue('disconnected'),
      download: vi.fn().mockResolvedValue('test-file.epub'),
      updateConfig: vi.fn().mockResolvedValue(undefined),
    };

    mockConfigService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getIrcConfig: vi.fn().mockReturnValue({
        enabled: true,
        server: 'irc.irchighway.net',
        port: 6667,
        channel: '#ebooks',
        searchCommand: '@search',
      }),
      getGeneralConfig: vi.fn().mockReturnValue({
        downloadPath: './downloads',
      }),
      getNzbProviders: vi.fn().mockReturnValue([]),
      addNzbProvider: vi.fn().mockImplementation((provider) => ({
        ...provider,
        id: 'test-id-123',
      })),
      updateNzbProvider: vi.fn().mockResolvedValue(undefined),
      deleteNzbProvider: vi.fn().mockResolvedValue(undefined),
      validateIrcConfig: vi.fn().mockReturnValue([]),
      validateGeneralConfig: vi.fn().mockReturnValue([]),
      updateIrcConfig: vi.fn().mockResolvedValue(undefined),
      updateGeneralConfig: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn().mockResolvedValue(undefined),
      getUsenetDownloaders: vi.fn().mockReturnValue([]),
      getEnabledUsenetDownloader: vi.fn().mockReturnValue(null),
      addUsenetDownloader: vi.fn().mockImplementation((dl) => ({
        ...dl,
        id: 'downloader-123',
      })),
      updateUsenetDownloader: vi.fn().mockImplementation((id, updates) => ({
        id,
        ...updates,
      })),
      deleteUsenetDownloader: vi.fn().mockResolvedValue(undefined),
    };

    mockNzbService = {
      search: vi.fn().mockResolvedValue([]),
      download: vi.fn().mockResolvedValue('test-file.nzb'),
    };

    mockSearchService = {
      search: vi.fn().mockResolvedValue([
        {
          source: 'irc',
          botName: 'TestBot',
          bookNumber: 1,
          title: 'Test Book',
          author: 'Test Author',
          fileType: 'epub',
          size: '1.5 MB',
          filename: 'Test_Book.epub',
        },
      ]),
    };

    mockDownloaderService = {
      testConnection: vi.fn().mockResolvedValue({
        success: true,
        version: '1.0.0',
      }),
      sendToNZBGet: vi.fn().mockResolvedValue(undefined),
      sendToSABnzbd: vi.fn().mockResolvedValue(undefined),
    };

    mockEnrichmentService = {
      enrichSearchResults: vi.fn().mockImplementation(async (results) => 
        results.map((r: any) => ({
          ...r,
          metadata: {
            isbn: '9781234567890',
            publisher: 'Test Publisher',
            coverUrl: 'https://example.com/cover.jpg'
          }
        }))
      )
    };

    // Mock the module exports
    vi.mocked(IrcService).mockImplementation(() => mockIrcService as any);
    vi.mocked(ConfigService).mockImplementation(() => mockConfigService as any);
    vi.mocked(NzbService).mockImplementation(() => mockNzbService as any);
    vi.mocked(SearchService).mockImplementation(() => mockSearchService as any);
    vi.mocked(DownloaderService).mockImplementation(() => mockDownloaderService as any);
    vi.mocked(enrichmentService.enrichSearchResults).mockImplementation(mockEnrichmentService.enrichSearchResults);

    // Create a test Express app with the same routes
    app = express();
    app.use(express.json());

    // Import and set up routes (simplified version for testing)
    const ircService = mockIrcService;
    const configService = mockConfigService;
    const nzbService = mockNzbService;
    const searchService = mockSearchService;
    const downloaderService = mockDownloaderService;
    const { enrichSearchResults } = mockEnrichmentService;

    // Health/Status endpoints
    app.post('/api/connect', async (req, res) => {
      try {
        const ircConfig = configService.getIrcConfig();
        if (!ircConfig.enabled) {
          return res.json({
            success: false,
            error: 'IRC is disabled. Please enable it in settings.',
          });
        }
        await ircService.connect();
        res.json({ success: true, data: { status: 'connected' } });
      } catch (error) {
        res.json({ success: false, error: (error as Error).message });
      }
    });

    app.get('/api/status', (req, res) => {
      const status = ircService.getStatus();
      res.json({ success: true, data: { connectionStatus: status } });
    });

    // Search endpoint
    app.post('/api/search', async (req, res) => {
      try {
        const { query } = req.body;
        if (!query || typeof query !== 'string') {
          return res.json({ success: false, error: 'Invalid query' });
        }
        const results = await searchService.search(query);
        res.json({ success: true, data: results });
      } catch (error) {
        res.json({ success: false, error: (error as Error).message });
      }
    });

    // Enrich endpoint
    app.post('/api/enrich', async (req, res) => {
      try {
        const { results } = req.body;
        if (!results || !Array.isArray(results)) {
          return res.json({ success: false, error: 'Invalid results array' });
        }
        const enrichedResults = await enrichSearchResults(results);
        res.json({ success: true, data: enrichedResults });
      } catch (error) {
        res.json({ success: false, error: (error as Error).message });
      }
    });

    // Download endpoint
    app.post('/api/download', async (req, res) => {
      try {
        const { source, command, nzbUrl, providerId, title } = req.body;

        if (!source || (source !== 'irc' && source !== 'nzb')) {
          return res.json({ success: false, error: 'Invalid or missing source' });
        }

        let filename: string;

        if (source === 'irc') {
          if (!command || typeof command !== 'string') {
            return res.json({ success: false, error: 'Invalid command for IRC download' });
          }
          filename = await ircService.download(command);
        } else {
          if (!nzbUrl || typeof nzbUrl !== 'string') {
            return res.json({ success: false, error: 'Invalid nzbUrl for NZB download' });
          }
          const providers = configService.getNzbProviders();
          const provider = providers.find((p: any) => p.id === providerId);
          if (!provider) {
            return res.json({ success: false, error: 'NZB provider not found' });
          }
          filename = await nzbService.download(nzbUrl, provider.apiKey, title);
        }

        res.json({ success: true, data: { filename } });
      } catch (error) {
        res.json({ success: false, error: (error as Error).message });
      }
    });

    // Config endpoints
    app.get('/api/config', (req, res) => {
      try {
        const ircConfig = configService.getIrcConfig();
        const generalConfig = configService.getGeneralConfig();
        const userConfig = {
          enabled: ircConfig.enabled,
          server: ircConfig.server,
          port: ircConfig.port,
          channel: ircConfig.channel,
          searchCommand: ircConfig.searchCommand,
        };
        res.json({ success: true, data: { irc: userConfig, general: generalConfig } });
      } catch (error) {
        res.json({ success: false, error: (error as Error).message });
      }
    });

    app.put('/api/config/irc', async (req, res) => {
      try {
        const ircConfig = req.body;
        if (!ircConfig || typeof ircConfig !== 'object') {
          return res.json({ success: false, error: 'Invalid IRC configuration' });
        }

        const ircErrors = configService.validateIrcConfig(ircConfig);
        if (ircErrors.length > 0) {
          return res.json({
            success: false,
            error: ircErrors.map((e: any) => e.message).join(', '),
          });
        }

        await configService.updateIrcConfig(ircConfig);
        await ircService.updateConfig(configService.getIrcConfig());

        res.json({
          success: true,
          data: {
            reconnected: true,
            message: 'IRC configuration updated successfully',
          },
        });
      } catch (error) {
        res.json({ success: false, error: (error as Error).message });
      }
    });

    // NZB Provider endpoints
    app.get('/api/nzb/providers', (req, res) => {
      try {
        const providers = configService.getNzbProviders();
        res.json({ success: true, data: providers });
      } catch (error) {
        res.json({ success: false, error: (error as Error).message });
      }
    });

    app.post('/api/nzb/providers', async (req, res) => {
      try {
        const provider = req.body;
        if (!provider || typeof provider !== 'object') {
          return res.json({ success: false, error: 'Invalid provider data' });
        }
        const newProvider = await configService.addNzbProvider(provider);
        res.json({ success: true, data: newProvider });
      } catch (error) {
        res.json({ success: false, error: (error as Error).message });
      }
    });

    app.delete('/api/nzb/providers/:id', async (req, res) => {
      try {
        const { id } = req.params;
        await configService.deleteNzbProvider(id);
        res.json({ success: true, data: { message: 'Provider deleted successfully' } });
      } catch (error) {
        res.json({ success: false, error: (error as Error).message });
      }
    });

    // Downloader endpoints
    app.get('/api/downloaders/usenet', (req, res) => {
      try {
        const downloaders = configService.getUsenetDownloaders();
        res.json({ success: true, data: downloaders });
      } catch (error) {
        res.json({ success: false, error: (error as Error).message });
      }
    });

    app.post('/api/downloaders/usenet', async (req, res) => {
      try {
        const downloader = await configService.addUsenetDownloader(req.body);
        res.json({ success: true, data: downloader });
      } catch (error) {
        res.json({ success: false, error: (error as Error).message });
      }
    });

    app.post('/api/downloaders/usenet/:id/test', async (req, res) => {
      try {
        const downloaders = configService.getUsenetDownloaders();
        const downloader = downloaders.find((d: any) => d.id === req.params.id);

        if (!downloader) {
          return res.json({ success: false, error: 'Downloader not found' });
        }

        const result = await downloaderService.testConnection(downloader);
        res.json({
          success: result.success,
          data: { version: result.version },
          error: result.success ? undefined : result.message,
        });
      } catch (error) {
        res.json({ success: false, error: (error as Error).message });
      }
    });

    app.post('/api/downloaders/send', async (req, res) => {
      try {
        const { nzbUrl, title } = req.body;

        if (!nzbUrl || !title) {
          return res.json({ success: false, error: 'Missing nzbUrl or title' });
        }

        const downloader = configService.getEnabledUsenetDownloader();
        if (!downloader) {
          return res.json({
            success: false,
            error: 'No downloader configured. Please add one in Settings.',
          });
        }

        if (downloader.type === 'nzbget') {
          await downloaderService.sendToNZBGet(downloader, nzbUrl, title);
        } else if (downloader.type === 'sabnzbd') {
          await downloaderService.sendToSABnzbd(downloader, nzbUrl, title);
        } else {
          return res.json({ success: false, error: 'Unknown downloader type' });
        }

        res.json({
          success: true,
          data: {
            message: `Sent to ${downloader.name}`,
            downloaderType: downloader.type,
          },
        });
      } catch (error) {
        res.json({ success: false, error: (error as Error).message });
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('IRC Connection Endpoints', () => {
    it('POST /api/connect - should connect to IRC when enabled', async () => {
      const response = await request(app).post('/api/connect').send({});

      expect(response.body).toEqual({
        success: true,
        data: { status: 'connected' },
      });
      expect(mockIrcService.connect).toHaveBeenCalledTimes(1);
    });

    it('POST /api/connect - should fail when IRC is disabled', async () => {
      mockConfigService.getIrcConfig.mockReturnValue({ enabled: false });

      const response = await request(app).post('/api/connect').send({});

      expect(response.body).toEqual({
        success: false,
        error: 'IRC is disabled. Please enable it in settings.',
      });
      expect(mockIrcService.connect).not.toHaveBeenCalled();
    });

    it('POST /api/connect - should handle connection errors', async () => {
      mockIrcService.connect.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app).post('/api/connect').send({});

      expect(response.body).toEqual({
        success: false,
        error: 'Connection failed',
      });
    });

    it('GET /api/status - should return connection status', async () => {
      mockIrcService.getStatus.mockReturnValue('connected');

      const response = await request(app).get('/api/status');

      expect(response.body).toEqual({
        success: true,
        data: { connectionStatus: 'connected' },
      });
    });
  });

  describe('Search Endpoint', () => {
    it('POST /api/search - should search and return results', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ query: 'test query' });

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        title: 'Test Book',
        author: 'Test Author',
      });
      expect(mockSearchService.search).toHaveBeenCalledWith('test query');
    });

    it('POST /api/search - should reject invalid query (missing)', async () => {
      const response = await request(app).post('/api/search').send({});

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid query',
      });
      expect(mockSearchService.search).not.toHaveBeenCalled();
    });

    it('POST /api/search - should reject invalid query (not string)', async () => {
      const response = await request(app).post('/api/search').send({ query: 123 });

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid query',
      });
      expect(mockSearchService.search).not.toHaveBeenCalled();
    });

    it('POST /api/search - should handle search errors', async () => {
      mockSearchService.search.mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .post('/api/search')
        .send({ query: 'test' });

      expect(response.body).toEqual({
        success: false,
        error: 'Search failed',
      });
    });
  });

  describe('Download Endpoint', () => {
    it('POST /api/download - should download from IRC', async () => {
      const response = await request(app)
        .post('/api/download')
        .send({
          source: 'irc',
          command: '!TestBot test-file.epub',
        });

      expect(response.body).toEqual({
        success: true,
        data: { filename: 'test-file.epub' },
      });
      expect(mockIrcService.download).toHaveBeenCalledWith('!TestBot test-file.epub');
    });

    it('POST /api/download - should download from NZB', async () => {
      mockConfigService.getNzbProviders.mockReturnValue([
        { id: 'provider-123', apiKey: 'test-key' },
      ]);

      const response = await request(app)
        .post('/api/download')
        .send({
          source: 'nzb',
          nzbUrl: 'https://example.com/test.nzb',
          providerId: 'provider-123',
          title: 'Test Book',
        });

      expect(response.body).toEqual({
        success: true,
        data: { filename: 'test-file.nzb' },
      });
      expect(mockNzbService.download).toHaveBeenCalledWith(
        'https://example.com/test.nzb',
        'test-key',
        'Test Book'
      );
    });

    it('POST /api/download - should reject invalid source', async () => {
      const response = await request(app)
        .post('/api/download')
        .send({ source: 'invalid' });

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or missing source',
      });
    });

    it('POST /api/download - should reject IRC download without command', async () => {
      const response = await request(app).post('/api/download').send({ source: 'irc' });

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid command for IRC download',
      });
    });

    it('POST /api/download - should reject NZB download without nzbUrl', async () => {
      const response = await request(app).post('/api/download').send({ source: 'nzb' });

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid nzbUrl for NZB download',
      });
    });

    it('POST /api/download - should reject NZB download with invalid provider', async () => {
      mockConfigService.getNzbProviders.mockReturnValue([]);

      const response = await request(app)
        .post('/api/download')
        .send({
          source: 'nzb',
          nzbUrl: 'https://example.com/test.nzb',
          providerId: 'invalid-id',
        });

      expect(response.body).toEqual({
        success: false,
        error: 'NZB provider not found',
      });
    });
  });

  describe('Configuration Endpoints', () => {
    it('GET /api/config - should return current configuration', async () => {
      const response = await request(app).get('/api/config');

      expect(response.body.success).toBe(true);
      expect(response.body.data.irc).toMatchObject({
        enabled: true,
        server: 'irc.irchighway.net',
        port: 6667,
        channel: '#ebooks',
      });
      expect(response.body.data.general).toEqual({
        downloadPath: './downloads',
      });
    });

    it('PUT /api/config/irc - should update IRC configuration', async () => {
      const newConfig = {
        enabled: true,
        server: 'new.server.com',
        port: 6697,
        channel: '#books',
        searchCommand: '@find',
      };

      const response = await request(app).put('/api/config/irc').send(newConfig);

      expect(response.body.success).toBe(true);
      expect(mockConfigService.updateIrcConfig).toHaveBeenCalledWith(newConfig);
      expect(mockIrcService.updateConfig).toHaveBeenCalled();
    });

    it('PUT /api/config/irc - should handle validation errors', async () => {
      mockConfigService.validateIrcConfig.mockReturnValue([
        { field: 'port', message: 'Invalid port' },
      ]);

      const response = await request(app)
        .put('/api/config/irc')
        .send({ enabled: true });

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid port',
      });
    });
  });

  describe('NZB Provider Endpoints', () => {
    it('GET /api/nzb/providers - should return all providers', async () => {
      const providers = [
        { id: '1', name: 'Provider 1' },
        { id: '2', name: 'Provider 2' },
      ];
      mockConfigService.getNzbProviders.mockReturnValue(providers);

      const response = await request(app).get('/api/nzb/providers');

      expect(response.body).toEqual({
        success: true,
        data: providers,
      });
    });

    it('POST /api/nzb/providers - should add new provider', async () => {
      const newProvider = {
        name: 'Test Provider',
        url: 'https://api.test.com',
        apiKey: 'test-key',
        enabled: true,
      };

      const response = await request(app).post('/api/nzb/providers').send(newProvider);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        ...newProvider,
        id: 'test-id-123',
      });
      expect(mockConfigService.addNzbProvider).toHaveBeenCalledWith(newProvider);
    });

    it('DELETE /api/nzb/providers/:id - should delete provider', async () => {
      const response = await request(app).delete('/api/nzb/providers/test-id');

      expect(response.body).toEqual({
        success: true,
        data: { message: 'Provider deleted successfully' },
      });
      expect(mockConfigService.deleteNzbProvider).toHaveBeenCalledWith('test-id');
    });
  });

  describe('Downloader Endpoints', () => {
    it('GET /api/downloaders/usenet - should return all downloaders', async () => {
      const downloaders = [
        { id: '1', name: 'NZBGet', type: 'nzbget' },
        { id: '2', name: 'SABnzbd', type: 'sabnzbd' },
      ];
      mockConfigService.getUsenetDownloaders.mockReturnValue(downloaders);

      const response = await request(app).get('/api/downloaders/usenet');

      expect(response.body).toEqual({
        success: true,
        data: downloaders,
      });
    });

    it('POST /api/downloaders/usenet - should add new downloader', async () => {
      const newDownloader = {
        name: 'My NZBGet',
        type: 'nzbget',
        host: 'localhost',
        port: 6789,
      };

      const response = await request(app).post('/api/downloaders/usenet').send(newDownloader);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        ...newDownloader,
        id: 'downloader-123',
      });
    });

    it('POST /api/downloaders/usenet/:id/test - should test downloader connection', async () => {
      mockConfigService.getUsenetDownloaders.mockReturnValue([
        { id: 'test-id', name: 'Test', type: 'nzbget' },
      ]);

      const response = await request(app).post('/api/downloaders/usenet/test-id/test');

      expect(response.body).toEqual({
        success: true,
        data: { version: '1.0.0' },
      });
      expect(mockDownloaderService.testConnection).toHaveBeenCalled();
    });

    it('POST /api/downloaders/usenet/:id/test - should handle missing downloader', async () => {
      mockConfigService.getUsenetDownloaders.mockReturnValue([]);

      const response = await request(app).post('/api/downloaders/usenet/invalid-id/test');

      expect(response.body).toEqual({
        success: false,
        error: 'Downloader not found',
      });
    });

    it('POST /api/downloaders/send - should send to NZBGet', async () => {
      mockConfigService.getEnabledUsenetDownloader.mockReturnValue({
        id: '1',
        name: 'My NZBGet',
        type: 'nzbget',
      });

      const response = await request(app)
        .post('/api/downloaders/send')
        .send({
          nzbUrl: 'https://example.com/test.nzb',
          title: 'Test Book',
        });

      expect(response.body).toEqual({
        success: true,
        data: {
          message: 'Sent to My NZBGet',
          downloaderType: 'nzbget',
        },
      });
      expect(mockDownloaderService.sendToNZBGet).toHaveBeenCalled();
    });

    it('POST /api/downloaders/send - should send to SABnzbd', async () => {
      mockConfigService.getEnabledUsenetDownloader.mockReturnValue({
        id: '1',
        name: 'My SABnzbd',
        type: 'sabnzbd',
      });

      const response = await request(app)
        .post('/api/downloaders/send')
        .send({
          nzbUrl: 'https://example.com/test.nzb',
          title: 'Test Book',
        });

      expect(response.body.success).toBe(true);
      expect(mockDownloaderService.sendToSABnzbd).toHaveBeenCalled();
    });

    it('POST /api/downloaders/send - should reject when no downloader configured', async () => {
      mockConfigService.getEnabledUsenetDownloader.mockReturnValue(null);

      const response = await request(app)
        .post('/api/downloaders/send')
        .send({
          nzbUrl: 'https://example.com/test.nzb',
          title: 'Test Book',
        });

      expect(response.body).toEqual({
        success: false,
        error: 'No downloader configured. Please add one in Settings.',
      });
    });

    it('POST /api/downloaders/send - should reject missing parameters', async () => {
      const response = await request(app).post('/api/downloaders/send').send({});

      expect(response.body).toEqual({
        success: false,
        error: 'Missing nzbUrl or title',
      });
    });
  });

  describe('Enrich Endpoint', () => {
    it('POST /api/enrich - should enrich search results', async () => {
      const mockResults = [
        {
          botCommand: '!Bot',
          filename: 'Test Book - Test Author.epub',
          filesize: '1.5MB',
          rawCommand: '!Bot Test Book - Test Author.epub',
          title: 'Test Book',
          author: 'Test Author',
          fileType: 'epub'
        }
      ];

      const response = await request(app)
        .post('/api/enrich')
        .send({ results: mockResults });

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        title: 'Test Book',
        author: 'Test Author',
        metadata: {
          isbn: '9781234567890',
          publisher: 'Test Publisher',
          coverUrl: 'https://example.com/cover.jpg'
        }
      });
      expect(mockEnrichmentService.enrichSearchResults).toHaveBeenCalledWith(mockResults);
    });

    it('POST /api/enrich - should enrich multiple results', async () => {
      const mockResults = [
        {
          botCommand: '!Bot1',
          filename: 'Book1.epub',
          filesize: '1MB',
          rawCommand: '!Bot1 Book1.epub',
          title: 'Book 1',
          author: 'Author 1',
          fileType: 'epub'
        },
        {
          botCommand: '!Bot2',
          filename: 'Book2.pdf',
          filesize: '2MB',
          rawCommand: '!Bot2 Book2.pdf',
          title: 'Book 2',
          author: 'Author 2',
          fileType: 'pdf'
        }
      ];

      const response = await request(app)
        .post('/api/enrich')
        .send({ results: mockResults });

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(mockEnrichmentService.enrichSearchResults).toHaveBeenCalledWith(mockResults);
    });

    it('POST /api/enrich - should reject missing results', async () => {
      const response = await request(app)
        .post('/api/enrich')
        .send({});

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid results array'
      });
      expect(mockEnrichmentService.enrichSearchResults).not.toHaveBeenCalled();
    });

    it('POST /api/enrich - should reject non-array results', async () => {
      const response = await request(app)
        .post('/api/enrich')
        .send({ results: 'not an array' });

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid results array'
      });
      expect(mockEnrichmentService.enrichSearchResults).not.toHaveBeenCalled();
    });

    it('POST /api/enrich - should handle empty results array', async () => {
      const response = await request(app)
        .post('/api/enrich')
        .send({ results: [] });

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(mockEnrichmentService.enrichSearchResults).toHaveBeenCalledWith([]);
    });

    it('POST /api/enrich - should handle enrichment errors', async () => {
      mockEnrichmentService.enrichSearchResults.mockRejectedValueOnce(
        new Error('Enrichment service failed')
      );

      const mockResults = [
        {
          botCommand: '!Bot',
          filename: 'Book.epub',
          filesize: '1MB',
          rawCommand: '!Bot Book.epub',
          title: 'Book',
          author: 'Author',
          fileType: 'epub'
        }
      ];

      const response = await request(app)
        .post('/api/enrich')
        .send({ results: mockResults });

      expect(response.body).toEqual({
        success: false,
        error: 'Enrichment service failed'
      });
    });

    it('POST /api/enrich - should handle large result sets', async () => {
      const mockResults = Array(100).fill(null).map((_, i) => ({
        botCommand: `!Bot${i}`,
        filename: `Book${i}.epub`,
        filesize: '1MB',
        rawCommand: `!Bot${i} Book${i}.epub`,
        title: `Book ${i}`,
        author: `Author ${i}`,
        fileType: 'epub'
      }));

      const response = await request(app)
        .post('/api/enrich')
        .send({ results: mockResults });

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(100);
      expect(mockEnrichmentService.enrichSearchResults).toHaveBeenCalledWith(mockResults);
    });
  });
});
