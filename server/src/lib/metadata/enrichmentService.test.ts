import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrichSearchResult, enrichSearchResults, getCacheStats, clearCache } from './enrichmentService.js';
import { SearchResult, BookMetadata } from '../types.js';
import * as openLibraryService from './openLibraryService.js';
import cache, { generateCacheKey } from './metadataCache.js';

// Mock the dependencies
vi.mock('./openLibraryService.js');
vi.mock('./metadataCache.js', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    getStats: vi.fn(),
    cleanup: vi.fn()
  },
  generateCacheKey: (title: string, author: string) => `${title.toLowerCase().trim()}|${author.toLowerCase().trim()}`
}));

describe('EnrichmentService', () => {
  const createMockSearchResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
    botCommand: '!Bot',
    filename: 'Test Book - Test Author.epub',
    filesize: '1.5MB',
    rawCommand: '!Bot Test Book - Test Author.epub',
    title: 'Test Book',
    author: 'Test Author',
    fileType: 'epub',
    ...overrides
  });

  const mockMetadata: BookMetadata = {
    isbn: '9781234567890',
    publisher: 'Test Publisher',
    publishDate: '2023',
    pageCount: 300,
    coverUrl: 'https://example.com/cover.jpg',
    description: 'A test book description'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset cache mock
    vi.mocked(cache.get).mockReturnValue(null);
    vi.mocked(cache.set).mockImplementation(() => {});
    vi.mocked(cache.clear).mockImplementation(() => {});
    vi.mocked(cache.getStats).mockReturnValue({ size: 0, maxSize: 10000, ttl: 86400000 });
  });

  describe('enrichSearchResult', () => {
    it('should return original result when title is missing', async () => {
      const result = createMockSearchResult({ title: '' });
      
      const enriched = await enrichSearchResult(result);
      
      expect(enriched).toEqual(result);
      expect(openLibraryService.searchByTitleAuthor).not.toHaveBeenCalled();
    });

    it('should return cached metadata when available', async () => {
      vi.mocked(cache.get).mockReturnValue(mockMetadata);
      const result = createMockSearchResult();
      
      const enriched = await enrichSearchResult(result);
      
      expect(cache.get).toHaveBeenCalledWith('test book|test author');
      expect(enriched.metadata).toEqual(mockMetadata);
      expect(openLibraryService.searchByTitleAuthor).not.toHaveBeenCalled();
    });

    it('should fetch from API when not in cache', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(mockMetadata);
      
      const result = createMockSearchResult();
      const enriched = await enrichSearchResult(result);
      
      expect(cache.get).toHaveBeenCalled();
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenCalledWith('Test Book', 'Test Author');
      expect(cache.set).toHaveBeenCalledWith('test book|test author', mockMetadata);
      expect(enriched.metadata).toEqual(mockMetadata);
    });

    it('should try title-only search when title+author fails', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor)
        .mockResolvedValueOnce(null) // First call with author fails
        .mockResolvedValueOnce(mockMetadata); // Second call without author succeeds
      
      const result = createMockSearchResult({ author: 'Unknown Author' });
      const enriched = await enrichSearchResult(result);
      
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenCalledTimes(2);
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenNthCalledWith(1, 'Test Book', 'Unknown Author');
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenNthCalledWith(2, 'Test Book', '');
      expect(enriched.metadata).toEqual(mockMetadata);
    });

    it('should not try title-only search when author is empty', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(null);
      
      const result = createMockSearchResult({ author: '' });
      await enrichSearchResult(result);
      
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenCalledTimes(1);
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenCalledWith('Test Book', '');
    });

    it('should return original result when no metadata found', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(null);
      
      const result = createMockSearchResult({ author: '' });
      const enriched = await enrichSearchResult(result);
      
      expect(enriched).toEqual(result);
      expect(enriched.metadata).toBeUndefined();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockRejectedValue(new Error('API Error'));
      
      const result = createMockSearchResult();
      const enriched = await enrichSearchResult(result);
      
      expect(enriched).toEqual(result);
      expect(enriched.metadata).toBeUndefined();
    });

    it('should timeout after 10 seconds', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve(mockMetadata), 15000))
      );
      
      const result = createMockSearchResult();
      const enriched = await enrichSearchResult(result);
      
      // Should return original result due to timeout
      expect(enriched).toEqual(result);
      expect(enriched.metadata).toBeUndefined();
    }, 12000); // Test timeout slightly longer than enrichment timeout

    it('should preserve all original result fields', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(mockMetadata);
      
      const result = createMockSearchResult({
        botCommand: '!CustomBot',
        filename: 'custom-file.pdf',
        filesize: '5MB',
        fileType: 'pdf'
      });
      
      const enriched = await enrichSearchResult(result);
      
      expect(enriched.botCommand).toBe('!CustomBot');
      expect(enriched.filename).toBe('custom-file.pdf');
      expect(enriched.filesize).toBe('5MB');
      expect(enriched.fileType).toBe('pdf');
      expect(enriched.metadata).toEqual(mockMetadata);
    });
  });

  describe('enrichSearchResults', () => {
    it('should return empty array for empty input', async () => {
      const results = await enrichSearchResults([]);
      expect(results).toEqual([]);
    });

    it('should enrich multiple results in parallel', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(mockMetadata);
      
      const results = [
        createMockSearchResult({ title: 'Book 1' }),
        createMockSearchResult({ title: 'Book 2' }),
        createMockSearchResult({ title: 'Book 3' })
      ];
      
      const enriched = await enrichSearchResults(results);
      
      expect(enriched).toHaveLength(3);
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenCalledTimes(3);
      enriched.forEach(result => {
        expect(result.metadata).toEqual(mockMetadata);
      });
    });

    it('should handle partial failures gracefully', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor)
        .mockResolvedValueOnce(mockMetadata)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockMetadata);
      
      const results = [
        createMockSearchResult({ title: 'Book 1' }),
        createMockSearchResult({ title: 'Book 2' }),
        createMockSearchResult({ title: 'Book 3' })
      ];
      
      const enriched = await enrichSearchResults(results);
      
      expect(enriched).toHaveLength(3);
      expect(enriched[0].metadata).toEqual(mockMetadata);
      expect(enriched[1].metadata).toBeUndefined(); // Failed enrichment
      expect(enriched[2].metadata).toEqual(mockMetadata);
    });

    it('should return original results when all enrichments fail', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockRejectedValue(new Error('API Error'));
      
      const results = [
        createMockSearchResult({ title: 'Book 1' }),
        createMockSearchResult({ title: 'Book 2' })
      ];
      
      const enriched = await enrichSearchResults(results);
      
      expect(enriched).toHaveLength(2);
      expect(enriched[0].metadata).toBeUndefined();
      expect(enriched[1].metadata).toBeUndefined();
    });

    it('should use cache for some results and API for others', async () => {
      const cachedMetadata = { ...mockMetadata, isbn: 'cached-isbn' };
      const apiMetadata = { ...mockMetadata, isbn: 'api-isbn' };
      
      vi.mocked(cache.get)
        .mockReturnValueOnce(cachedMetadata) // First result cached
        .mockReturnValueOnce(null); // Second result not cached
      
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(apiMetadata);
      
      const results = [
        createMockSearchResult({ title: 'Cached Book' }),
        createMockSearchResult({ title: 'New Book' })
      ];
      
      const enriched = await enrichSearchResults(results);
      
      expect(enriched[0].metadata?.isbn).toBe('cached-isbn');
      expect(enriched[1].metadata?.isbn).toBe('api-isbn');
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenCalledTimes(1);
    });

    it('should handle large result sets', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(mockMetadata);
      
      const results = Array(50).fill(null).map((_, i) => 
        createMockSearchResult({ title: `Book ${i}` })
      );
      
      const enriched = await enrichSearchResults(results);
      
      expect(enriched).toHaveLength(50);
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenCalledTimes(50);
    });

    it('should preserve original order of results', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockImplementation(async (title) => ({
        ...mockMetadata,
        description: title
      }));
      
      const results = [
        createMockSearchResult({ title: 'First Book' }),
        createMockSearchResult({ title: 'Second Book' }),
        createMockSearchResult({ title: 'Third Book' })
      ];
      
      const enriched = await enrichSearchResults(results);
      
      expect(enriched[0].metadata?.description).toBe('First Book');
      expect(enriched[1].metadata?.description).toBe('Second Book');
      expect(enriched[2].metadata?.description).toBe('Third Book');
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const mockStats = { size: 42, maxSize: 10000, ttl: 86400000 };
      vi.mocked(cache.getStats).mockReturnValue(mockStats);
      
      const stats = getCacheStats();
      
      expect(stats).toEqual(mockStats);
      expect(cache.getStats).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      clearCache();
      expect(cache.clear).toHaveBeenCalled();
    });
  });
});
