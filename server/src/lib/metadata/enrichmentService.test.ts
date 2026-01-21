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
  generateCacheKey: (title: string, author: string, deep: boolean = false) => {
    const hash = `${title.toLowerCase().trim()}:${author.toLowerCase().trim()}`;
    return deep ? `deep:${hash}` : `shallow:${hash}`;
  }
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
      
      const enriched = await enrichSearchResult(result, false);
      
      expect(cache.get).toHaveBeenCalledWith('shallow:test book:test author');
      expect(enriched.metadata).toEqual(mockMetadata);
      expect(openLibraryService.searchByTitleAuthor).not.toHaveBeenCalled();
    });

    it('should fetch from API when not in cache', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(mockMetadata);
      
      const result = createMockSearchResult();
      const enriched = await enrichSearchResult(result);
      
      expect(cache.get).toHaveBeenCalled();
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenCalledWith('Test Book', 'Test Author', false);
      expect(cache.set).toHaveBeenCalledWith('shallow:test book:test author', mockMetadata);
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
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenNthCalledWith(1, 'Test Book', 'Unknown Author', false);
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenNthCalledWith(2, 'Test Book', '', false);
      expect(enriched.metadata).toEqual(mockMetadata);
    });

    it('should not try title-only search when author is empty', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(null);
      
      const result = createMockSearchResult({ author: '' });
      await enrichSearchResult(result);
      
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenCalledTimes(1);
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenCalledWith('Test Book', '', false);
    });

    it('should return original result when no metadata found', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(null);
      
      const result = createMockSearchResult({ author: '' });
      const enriched = await enrichSearchResult(result, false);
      
      expect(enriched).toEqual(result);
      expect(enriched.metadata).toBeUndefined();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockRejectedValue(new Error('API Error'));
      
      const result = createMockSearchResult();
      const enriched = await enrichSearchResult(result, false);
      
      expect(enriched).toEqual(result);
      expect(enriched.metadata).toBeUndefined();
    });

    it('should timeout after 10 seconds', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve(mockMetadata), 15000))
      );
      
      const result = createMockSearchResult();
      const enriched = await enrichSearchResult(result, false);
      
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
      
      const enriched = await enrichSearchResult(result, false);
      
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

  describe('enrichSearchResult with deepEnrich parameter', () => {
    it('should use shallow cache key when deepEnrich is false', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(mockMetadata);
      
      const result = createMockSearchResult();
      await enrichSearchResult(result, false);
      
      expect(cache.get).toHaveBeenCalledWith('shallow:test book:test author');
      expect(cache.set).toHaveBeenCalledWith('shallow:test book:test author', mockMetadata);
    });

    it('should use deep cache key when deepEnrich is true', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      const deepMetadata = { ...mockMetadata, descriptionSource: 'works' as const };
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(deepMetadata);
      
      const result = createMockSearchResult();
      await enrichSearchResult(result, true);
      
      expect(cache.get).toHaveBeenCalledWith('deep:test book:test author');
      expect(cache.set).toHaveBeenCalledWith('deep:test book:test author', deepMetadata);
    });

    it('should pass deep enrichment flag to searchByTitleAuthor', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(mockMetadata);
      
      const result = createMockSearchResult();
      await enrichSearchResult(result, true);
      
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenCalledWith('Test Book', 'Test Author', true);
    });

    it('should not pass deep flag when false', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(mockMetadata);
      
      const result = createMockSearchResult();
      await enrichSearchResult(result, false);
      
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenCalledWith('Test Book', 'Test Author', false);
    });

    it('should skip title-only fallback for deep enrichment', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(null);
      
      const result = createMockSearchResult();
      await enrichSearchResult(result, true);
      
      // Should only call once for deep enrichment (no fallback)
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenCalledTimes(1);
    });
  });

  describe('enrichSearchResults with hybrid enrichment', () => {
    it('should deep enrich first 7 results by default', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(mockMetadata);
      
      const results = Array(10).fill(null).map((_, i) => 
        createMockSearchResult({ title: `Book ${i}` })
      );
      
      await enrichSearchResults(results);
      
      // Check that first 7 calls have deep=true, rest have deep=false
      expect(openLibraryService.searchByTitleAuthor).toHaveBeenCalledTimes(10);
      
      // First 7 should have deepEnrich=true
      for (let i = 0; i < 7; i++) {
        expect(openLibraryService.searchByTitleAuthor).toHaveBeenNthCalledWith(
          i + 1,
          `Book ${i}`,
          'Test Author',
          true
        );
      }
      
      // Rest should have deepEnrich=false
      for (let i = 7; i < 10; i++) {
        expect(openLibraryService.searchByTitleAuthor).toHaveBeenNthCalledWith(
          i + 1,
          `Book ${i}`,
          'Test Author',
          false
        );
      }
    });

    it('should accept custom deepEnrichCount parameter', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(mockMetadata);
      
      const results = Array(10).fill(null).map((_, i) => 
        createMockSearchResult({ title: `Book ${i}` })
      );
      
      await enrichSearchResults(results, 3); // Only deep enrich first 3
      
      // First 3 should have deepEnrich=true
      for (let i = 0; i < 3; i++) {
        expect(openLibraryService.searchByTitleAuthor).toHaveBeenNthCalledWith(
          i + 1,
          `Book ${i}`,
          'Test Author',
          true
        );
      }
      
      // Rest should have deepEnrich=false
      for (let i = 3; i < 10; i++) {
        expect(openLibraryService.searchByTitleAuthor).toHaveBeenNthCalledWith(
          i + 1,
          `Book ${i}`,
          'Test Author',
          false
        );
      }
    });

    it('should deep enrich all results when deepEnrichCount exceeds array length', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(mockMetadata);
      
      const results = Array(5).fill(null).map((_, i) => 
        createMockSearchResult({ title: `Book ${i}` })
      );
      
      await enrichSearchResults(results, 100); // Deep enrich all
      
      // All should have deepEnrich=true
      for (let i = 0; i < 5; i++) {
        expect(openLibraryService.searchByTitleAuthor).toHaveBeenNthCalledWith(
          i + 1,
          `Book ${i}`,
          'Test Author',
          true
        );
      }
    });

    it('should disable deep enrichment when deepEnrichCount is 0', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(mockMetadata);
      
      const results = Array(5).fill(null).map((_, i) => 
        createMockSearchResult({ title: `Book ${i}` })
      );
      
      await enrichSearchResults(results, 0); // No deep enrichment
      
      // All should have deepEnrich=false
      for (let i = 0; i < 5; i++) {
        expect(openLibraryService.searchByTitleAuthor).toHaveBeenNthCalledWith(
          i + 1,
          `Book ${i}`,
          'Test Author',
          false
        );
      }
    });

    it('should use different cache keys for deep vs shallow enrichment', async () => {
      vi.mocked(cache.get).mockReturnValue(null);
      vi.mocked(openLibraryService.searchByTitleAuthor).mockResolvedValue(mockMetadata);
      
      const results = [
        createMockSearchResult({ title: 'Book 1' }), // Deep (index 0)
        createMockSearchResult({ title: 'Book 2' })  // Shallow (index 1)
      ];
      
      await enrichSearchResults(results, 1); // Only first one deep
      
      // Verify cache.set was called with different key formats
      expect(cache.set).toHaveBeenNthCalledWith(1, 'deep:book 1:test author', mockMetadata);
      expect(cache.set).toHaveBeenNthCalledWith(2, 'shallow:book 2:test author', mockMetadata);
    });

    it('should handle mix of cached and uncached results with hybrid enrichment', async () => {
      const shallowMetadata = { ...mockMetadata, isbn: 'shallow' };
      const deepMetadata = { ...mockMetadata, isbn: 'deep', descriptionSource: 'works' as const };
      
      vi.mocked(cache.get)
        .mockReturnValueOnce(deepMetadata) // First result cached with deep
        .mockReturnValueOnce(null) // Second result not cached
        .mockReturnValueOnce(null); // Third result not cached
      
      vi.mocked(openLibraryService.searchByTitleAuthor)
        .mockResolvedValueOnce(deepMetadata) // Second result fetched with deep
        .mockResolvedValueOnce(shallowMetadata); // Third result fetched with shallow
      
      const results = [
        createMockSearchResult({ title: 'Cached' }),
        createMockSearchResult({ title: 'Deep' }),
        createMockSearchResult({ title: 'Shallow' })
      ];
      
      const enriched = await enrichSearchResults(results, 2); // First 2 deep
      
      expect(enriched[0].metadata?.isbn).toBe('deep'); // From cache
      expect(enriched[1].metadata?.isbn).toBe('deep'); // From API with deep
      expect(enriched[2].metadata?.isbn).toBe('shallow'); // From API without deep
    });
  });
});
