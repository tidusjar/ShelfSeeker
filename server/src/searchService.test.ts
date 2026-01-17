import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchService } from './searchService.js';
import { IrcService } from './ircService.js';
import { NzbService } from './nzbService.js';
import { ConfigService } from './configService.js';

// Mock the services
vi.mock('./ircService.js');
vi.mock('./nzbService.js');
vi.mock('./configService.js');

describe('SearchService', () => {
  let searchService: SearchService;
  let mockIrcService: any;
  let mockNzbService: any;
  let mockConfigService: any;

  const createMockIrcResult = (overrides = {}) => ({
    source: 'irc',
    botName: 'TestBot',
    bookNumber: 1,
    title: 'IRC Book',
    author: 'IRC Author',
    fileType: 'epub',
    size: '1.5 MB',
    filename: 'irc-book.epub',
    ...overrides
  });

  const createMockNzbResult = (overrides = {}) => ({
    source: 'nzb',
    sourceProvider: 'TestProvider',
    providerId: 'provider-1',
    botName: 'TestProvider',
    bookNumber: 0,
    title: 'NZB Book',
    author: 'NZB Author',
    fileType: 'pdf',
    size: '2.0 MB',
    filename: 'nzb-book.pdf',
    nzbUrl: 'https://example.com/nzb/1',
    guid: 'guid123',
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockIrcService = {
      search: vi.fn().mockResolvedValue([createMockIrcResult()]),
      getStatus: vi.fn().mockReturnValue('connected')
    };

    mockNzbService = {
      search: vi.fn().mockResolvedValue([createMockNzbResult()])
    };

    mockConfigService = {
      getIrcConfig: vi.fn().mockReturnValue({
        enabled: true,
        server: 'irc.test.com',
        port: 6667,
        channel: '#ebooks'
      }),
      getNzbProviders: vi.fn().mockReturnValue([
        {
          id: 'provider-1',
          name: 'Test Provider',
          enabled: true,
          url: 'https://api.test.com',
          apiKey: 'test-key'
        }
      ]),
      incrementNzbUsage: vi.fn().mockResolvedValue(undefined)
    };

    vi.mocked(IrcService).mockImplementation(() => mockIrcService);
    vi.mocked(NzbService).mockImplementation(() => mockNzbService);
    vi.mocked(ConfigService).mockImplementation(() => mockConfigService);

    searchService = new SearchService(
      mockIrcService,
      mockNzbService,
      mockConfigService
    );
  });

  describe('search', () => {
    it('should search both IRC and NZB when both are enabled', async () => {
      const results = await searchService.search('test query');

      expect(mockIrcService.search).toHaveBeenCalledWith('test query');
      expect(mockNzbService.search).toHaveBeenCalledWith('test query', [
        expect.objectContaining({ id: 'provider-1' })
      ]);
      expect(results).toHaveLength(2);
    });

    it('should renumber results sequentially starting from 1', async () => {
      mockIrcService.search.mockResolvedValue([
        createMockIrcResult({ bookNumber: 99 }),
        createMockIrcResult({ bookNumber: 100 })
      ]);

      mockNzbService.search.mockResolvedValue([
        createMockNzbResult({ bookNumber: 0 }),
        createMockNzbResult({ bookNumber: 0 })
      ]);

      const results = await searchService.search('test');

      expect(results).toHaveLength(4);
      expect(results[0].bookNumber).toBe(1);
      expect(results[1].bookNumber).toBe(2);
      expect(results[2].bookNumber).toBe(3);
      expect(results[3].bookNumber).toBe(4);
    });

    it('should search only IRC when IRC is enabled and NZB is disabled', async () => {
      mockConfigService.getNzbProviders.mockReturnValue([]);

      const results = await searchService.search('test query');

      expect(mockIrcService.search).toHaveBeenCalled();
      expect(mockNzbService.search).not.toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('irc');
    });

    it('should search only NZB when IRC is disabled', async () => {
      mockConfigService.getIrcConfig.mockReturnValue({ enabled: false });

      const results = await searchService.search('test query');

      expect(mockIrcService.search).not.toHaveBeenCalled();
      expect(mockNzbService.search).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('nzb');
    });

    it('should search only NZB when IRC is not connected', async () => {
      mockIrcService.getStatus.mockReturnValue('disconnected');

      const results = await searchService.search('test query');

      expect(mockIrcService.search).not.toHaveBeenCalled();
      expect(mockNzbService.search).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('nzb');
    });

    it('should throw error when no search sources are available', async () => {
      mockConfigService.getIrcConfig.mockReturnValue({ enabled: false });
      mockConfigService.getNzbProviders.mockReturnValue([]);

      await expect(searchService.search('test')).rejects.toThrow(
        'No search sources available. Please enable IRC or add NZB providers.'
      );
    });

    it('should throw error when IRC disabled and NZB providers are disabled', async () => {
      mockConfigService.getIrcConfig.mockReturnValue({ enabled: false });
      mockConfigService.getNzbProviders.mockReturnValue([
        { id: 'p1', name: 'Provider 1', enabled: false }
      ]);

      await expect(searchService.search('test')).rejects.toThrow(
        'No search sources available'
      );
    });

    it('should handle IRC search failure gracefully and return NZB results', async () => {
      mockIrcService.search.mockRejectedValue(new Error('IRC search failed'));

      const results = await searchService.search('test');

      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('nzb');
    });

    it('should handle NZB search failure gracefully and return IRC results', async () => {
      mockNzbService.search.mockRejectedValue(new Error('NZB search failed'));

      const results = await searchService.search('test');

      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('irc');
    });

    it('should return empty array when both searches fail', async () => {
      mockIrcService.search.mockRejectedValue(new Error('IRC failed'));
      mockNzbService.search.mockRejectedValue(new Error('NZB failed'));

      const results = await searchService.search('test');

      expect(results).toEqual([]);
    });

    it('should combine results from multiple NZB providers', async () => {
      mockConfigService.getNzbProviders.mockReturnValue([
        { id: 'p1', name: 'Provider 1', enabled: true },
        { id: 'p2', name: 'Provider 2', enabled: true }
      ]);

      mockNzbService.search.mockResolvedValue([
        createMockNzbResult({ providerId: 'p1' }),
        createMockNzbResult({ providerId: 'p2' })
      ]);

      const results = await searchService.search('test');

      expect(mockNzbService.search).toHaveBeenCalledWith('test', [
        expect.objectContaining({ id: 'p1' }),
        expect.objectContaining({ id: 'p2' })
      ]);
    });

    it('should increment NZB usage counters for all providers', async () => {
      const providers = [
        { id: 'p1', name: 'Provider 1', enabled: true },
        { id: 'p2', name: 'Provider 2', enabled: true }
      ];
      mockConfigService.getNzbProviders.mockReturnValue(providers);

      await searchService.search('test');

      expect(mockConfigService.incrementNzbUsage).toHaveBeenCalledWith('p1');
      expect(mockConfigService.incrementNzbUsage).toHaveBeenCalledWith('p2');
    });

    it('should continue search even if usage increment fails', async () => {
      mockConfigService.incrementNzbUsage.mockRejectedValue(
        new Error('Failed to increment')
      );

      const results = await searchService.search('test');

      expect(results).toHaveLength(2); // Still returns results
    });

    it('should handle empty results from IRC', async () => {
      mockIrcService.search.mockResolvedValue([]);

      const results = await searchService.search('test');

      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('nzb');
    });

    it('should handle empty results from NZB', async () => {
      mockNzbService.search.mockResolvedValue([]);

      const results = await searchService.search('test');

      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('irc');
    });

    it('should filter out disabled NZB providers', async () => {
      mockConfigService.getNzbProviders.mockReturnValue([
        { id: 'p1', name: 'Provider 1', enabled: true },
        { id: 'p2', name: 'Provider 2', enabled: false },
        { id: 'p3', name: 'Provider 3', enabled: true }
      ]);

      await searchService.search('test');

      expect(mockNzbService.search).toHaveBeenCalledWith('test', [
        expect.objectContaining({ id: 'p1', enabled: true }),
        expect.objectContaining({ id: 'p3', enabled: true })
      ]);
    });

    it('should execute IRC and NZB searches in parallel', async () => {
      let ircStarted = false;
      let nzbStarted = false;
      let ircFinished = false;
      let nzbFinished = false;

      mockIrcService.search.mockImplementation(async () => {
        ircStarted = true;
        await new Promise(resolve => setTimeout(resolve, 10));
        ircFinished = true;
        return [createMockIrcResult()];
      });

      mockNzbService.search.mockImplementation(async () => {
        nzbStarted = true;
        // Verify IRC hasn't finished yet (parallel execution)
        expect(ircFinished).toBe(false);
        await new Promise(resolve => setTimeout(resolve, 10));
        nzbFinished = true;
        return [createMockNzbResult()];
      });

      const results = await searchService.search('test');

      expect(ircStarted).toBe(true);
      expect(nzbStarted).toBe(true);
      expect(ircFinished).toBe(true);
      expect(nzbFinished).toBe(true);
      expect(results).toHaveLength(2);
    });

    it('should preserve result properties when renumbering', async () => {
      mockIrcService.search.mockResolvedValue([
        createMockIrcResult({
          title: 'Test Book',
          author: 'Test Author',
          fileType: 'epub',
          size: '3.5 MB'
        })
      ]);

      const results = await searchService.search('test');

      expect(results[0]).toMatchObject({
        bookNumber: 1,
        title: 'Test Book',
        author: 'Test Author',
        fileType: 'epub',
        size: '3.5 MB'
      });
    });

    it('should handle large result sets', async () => {
      const ircResults = Array(50).fill(null).map((_, i) =>
        createMockIrcResult({ title: `IRC Book ${i}` })
      );
      const nzbResults = Array(50).fill(null).map((_, i) =>
        createMockNzbResult({ title: `NZB Book ${i}` })
      );

      mockIrcService.search.mockResolvedValue(ircResults);
      mockNzbService.search.mockResolvedValue(nzbResults);

      const results = await searchService.search('test');

      expect(results).toHaveLength(100);
      expect(results[0].bookNumber).toBe(1);
      expect(results[99].bookNumber).toBe(100);
    });
  });
});
