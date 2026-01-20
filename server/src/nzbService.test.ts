import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NzbService } from './nzbService.js';
import { NzbProvider } from './types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock modules
vi.mock('fs/promises');
vi.mock('fs', () => ({
  existsSync: vi.fn()
}));

// Mock global fetch
global.fetch = vi.fn();

describe('NzbService', () => {
  let nzbService: NzbService;
  let mockConfigService: any;

  const createMockProvider = (overrides: Partial<NzbProvider> = {}): NzbProvider => ({
    id: 'test-provider-1',
    name: 'Test Provider',
    url: 'https://api.test.com',
    apiKey: 'test-api-key-123',
    enabled: true,
    categories: [7000, 8010], // Books and Audiobooks
    priority: 1,
    ...overrides
  });

  const createMockXmlResponse = (items: any[] = []): string => {
    const itemsXml = items.map(item => `
      <item>
        <title>${item.title}</title>
        <link>${item.link}</link>
        <guid>${item.guid}</guid>
        <pubDate>${item.pubDate || 'Mon, 01 Jan 2024 00:00:00 +0000'}</pubDate>
        ${item.attrs ? item.attrs.map((attr: any) => 
          `<newznab:attr name="${attr.name}" value="${attr.value}"/>`
        ).join('') : ''}
      </item>
    `).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:newznab="http://www.newznab.com/DTD/2010/feeds/attributes/">
        <channel>
          <title>Test Provider</title>
          ${itemsXml}
        </channel>
      </rss>`;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      getGeneralConfig: vi.fn().mockReturnValue({
        downloadPath: '/test/downloads'
      })
    };

    nzbService = new NzbService(mockConfigService);

    // Mock fetch by default
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue(createMockXmlResponse())
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('search', () => {
    it('should return empty array when no providers are enabled', async () => {
      const providers = [
        createMockProvider({ enabled: false }),
        createMockProvider({ id: 'provider-2', enabled: false })
      ];

      const results = await nzbService.search('test query', providers);

      expect(results).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should search enabled providers and return results', async () => {
      const mockXml = createMockXmlResponse([
        {
          title: 'Author.Name-Book.Title-EPUB-2024',
          link: 'https://api.test.com/download/123',
          guid: 'abc123',
          attrs: [{ name: 'size', value: '1048576' }] // 1 MB
        }
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(mockXml)
      } as any);

      const providers = [createMockProvider()];
      const results = await nzbService.search('test query', providers);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        source: 'nzb',
        sourceProvider: 'Test Provider',
        providerId: 'test-provider-1',
        title: 'Book Title',
        author: 'Author Name',
        fileType: 'epub',
        size: '1.00 MB',
        nzbUrl: 'https://api.test.com/download/123'
      });
    });

    it('should search multiple providers in parallel', async () => {
      const mockXml1 = createMockXmlResponse([
        {
          title: 'Book.One-EPUB',
          link: 'https://provider1.com/nzb/1',
          guid: 'guid1',
          attrs: [{ name: 'size', value: '2097152' }]
        }
      ]);

      const mockXml2 = createMockXmlResponse([
        {
          title: 'Book.Two-PDF',
          link: 'https://provider2.com/nzb/2',
          guid: 'guid2',
          attrs: [{ name: 'size', value: '3145728' }]
        }
      ]);

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue(mockXml1)
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue(mockXml2)
        } as any);

      const providers = [
        createMockProvider({ id: 'p1', name: 'Provider 1' }),
        createMockProvider({ id: 'p2', name: 'Provider 2' })
      ];

      const results = await nzbService.search('test', providers);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Book One');
      expect(results[1].title).toBe('Book Two');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should build correct search URL with parameters', async () => {
      const provider = createMockProvider({
        url: 'https://api.example.com',
        apiKey: 'secret-key',
        categories: [7000, 8010]
      });

      await nzbService.search('sci-fi books', [provider]);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.example.com/api'),
        expect.any(Object)
      );

      const callUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
      const url = new URL(callUrl);

      expect(url.searchParams.get('apikey')).toBe('secret-key');
      expect(url.searchParams.get('t')).toBe('search');
      expect(url.searchParams.get('q')).toBe('sci-fi books');
      expect(url.searchParams.get('cat')).toBe('7000,8010');
      expect(url.searchParams.get('extended')).toBe('1');
      expect(url.searchParams.get('limit')).toBe('100');
    });

    it('should handle provider failure gracefully and continue with other providers', async () => {
      const mockXml = createMockXmlResponse([
        {
          title: 'Working.Provider-EPUB',
          link: 'https://provider2.com/nzb/1',
          guid: 'guid1',
          attrs: [{ name: 'size', value: '1048576' }]
        }
      ]);

      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue(mockXml)
        } as any);

      const providers = [
        createMockProvider({ id: 'p1', name: 'Broken Provider' }),
        createMockProvider({ id: 'p2', name: 'Working Provider' })
      ];

      const results = await nzbService.search('test', providers);

      expect(results).toHaveLength(1);
      expect(results[0].sourceProvider).toBe('Working Provider');
    });

    it('should handle HTTP error responses', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      } as any);

      const providers = [createMockProvider()];
      const results = await nzbService.search('test', providers);

      expect(results).toEqual([]);
    });

    it('should handle timeout errors', async () => {
      vi.mocked(global.fetch).mockImplementation(() => 
        new Promise((_, reject) => {
          const error = new Error('Timeout');
          error.name = 'AbortError';
          setTimeout(() => reject(error), 100);
        })
      );

      const providers = [createMockProvider()];
      const results = await nzbService.search('test', providers);

      expect(results).toEqual([]);
    });

    it('should handle malformed XML response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('invalid xml <><><')
      } as any);

      const providers = [createMockProvider()];
      const results = await nzbService.search('test', providers);

      expect(results).toEqual([]);
    });

    it('should handle empty XML response', async () => {
      const emptyXml = `<?xml version="1.0"?><rss><channel></channel></rss>`;
      
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(emptyXml)
      } as any);

      const providers = [createMockProvider()];
      const results = await nzbService.search('test', providers);

      expect(results).toEqual([]);
    });

    it('should filter out items without title or link', async () => {
      const mockXml = createMockXmlResponse([
        {
          title: 'Valid.Book-EPUB',
          link: 'https://example.com/1',
          guid: 'guid1',
          attrs: [{ name: 'size', value: '1048576' }]
        },
        {
          title: '', // Invalid - no title
          link: 'https://example.com/2',
          guid: 'guid2'
        },
        {
          title: 'No.Link.Book-EPUB',
          link: '', // Invalid - no link
          guid: 'guid3'
        }
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(mockXml)
      } as any);

      const providers = [createMockProvider()];
      const results = await nzbService.search('test', providers);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Valid Book');
    });

    it('should extract size from newznab attributes', async () => {
      const mockXml = createMockXmlResponse([
        {
          title: 'Large.Book-EPUB',
          link: 'https://example.com/1',
          guid: 'guid1',
          attrs: [
            { name: 'category', value: '7000' },
            { name: 'size', value: '52428800' } // 50 MB
          ]
        }
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(mockXml)
      } as any);

      const providers = [createMockProvider()];
      const results = await nzbService.search('test', providers);

      expect(results[0].size).toBe('50.00 MB');
    });

    it('should handle missing size attribute', async () => {
      const mockXml = createMockXmlResponse([
        {
          title: 'Unknown.Size-EPUB',
          link: 'https://example.com/1',
          guid: 'guid1',
          attrs: [] // No size attribute
        }
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(mockXml)
      } as any);

      const providers = [createMockProvider()];
      const results = await nzbService.search('test', providers);

      expect(results[0].size).toBe('Unknown');
    });

    it('should parse various ebook formats correctly', async () => {
      const mockXml = createMockXmlResponse([
        {
          title: 'Book.One-EPUB-2024',
          link: 'https://example.com/1',
          guid: 'guid1'
        },
        {
          title: 'Book.Two-MOBI-2024',
          link: 'https://example.com/2',
          guid: 'guid2'
        },
        {
          title: 'Book.Three-PDF-2024',
          link: 'https://example.com/3',
          guid: 'guid3'
        },
        {
          title: 'Book.Four-AZW3-2024',
          link: 'https://example.com/4',
          guid: 'guid4'
        }
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(mockXml)
      } as any);

      const providers = [createMockProvider()];
      const results = await nzbService.search('test', providers);

      expect(results).toHaveLength(4);
      expect(results[0].fileType).toBe('epub');
      expect(results[1].fileType).toBe('mobi');
      expect(results[2].fileType).toBe('pdf');
      expect(results[3].fileType).toBe('azw3');
    });

    it('should use fallback for unknown file type', async () => {
      const mockXml = createMockXmlResponse([
        {
          title: 'Book.Without.Extension',
          link: 'https://example.com/1',
          guid: 'guid1'
        }
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(mockXml)
      } as any);

      const providers = [createMockProvider()];
      const results = await nzbService.search('test', providers);

      expect(results[0].fileType).toBe('Unknown');
    });
  });

  describe('download', () => {
    beforeEach(async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      
      const fsModule = await import('fs');
      vi.mocked(fsModule.existsSync).mockReturnValue(false);
    });

    it('should download NZB file and save to configured directory', async () => {
      const mockNzbContent = '<?xml version="1.0"?><nzb>test content</nzb>';
      
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(mockNzbContent)
      } as any);

      const filename = await nzbService.download(
        'https://example.com/nzb/123',
        'test-api-key',
        'Test Book'
      );

      expect(filename).toBe('Test Book.nzb');
      expect(fs.mkdir).toHaveBeenCalledWith('/test/downloads', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join('/test/downloads', 'Test Book.nzb'),
        mockNzbContent,
        'utf-8'
      );
    });

    it('should add .nzb extension if missing', async () => {
      const mockNzbContent = '<nzb>content</nzb>';
      
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(mockNzbContent)
      } as any);

      const filename = await nzbService.download(
        'https://example.com/nzb/123',
        'test-api-key',
        'Test Book'
      );

      expect(filename).toBe('Test Book.nzb');
    });

    it('should not duplicate .nzb extension', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('<nzb>content</nzb>')
      } as any);

      const filename = await nzbService.download(
        'https://example.com/nzb/123',
        'test-api-key',
        'Test Book.nzb'
      );

      expect(filename).toBe('Test Book.nzb');
    });

    it('should sanitize filename to remove problematic characters', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('<nzb>content</nzb>')
      } as any);

      const filename = await nzbService.download(
        'https://example.com/nzb/123',
        'test-api-key',
        'Test/Book:With<Bad>Chars|?.nzb'
      );

      expect(filename).toBe('Test_Book_With_Bad_Chars__.nzb');
    });

    it('should handle filename collisions by adding counter', async () => {
      const fsModule = await import('fs');
      vi.mocked(fsModule.existsSync)
        .mockReturnValueOnce(true)   // First attempt exists
        .mockReturnValueOnce(true)   // Second attempt (_1) exists
        .mockReturnValueOnce(false); // Third attempt (_1_2) is free

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('<nzb>content</nzb>')
      } as any);

      const filename = await nzbService.download(
        'https://example.com/nzb/123',
        'test-api-key',
        'Test Book.nzb'
      );

      // The actual implementation keeps appending counters
      expect(filename).toBe('Test Book_1_2.nzb');
    });

    it('should use URL filename as fallback when no filename provided', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('<nzb>content</nzb>')
      } as any);

      const filename = await nzbService.download(
        'https://example.com/nzb/some-book-title.nzb',
        'test-api-key'
      );

      expect(filename).toBe('some-book-title.nzb');
    });

    it('should handle HTTP error during download', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any);

      await expect(
        nzbService.download('https://example.com/nzb/123', 'test-api-key')
      ).rejects.toThrow('Failed to download NZB: HTTP 404: Not Found');
    });

    it('should handle network errors during download', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network failed'));

      await expect(
        nzbService.download('https://example.com/nzb/123', 'test-api-key')
      ).rejects.toThrow('Failed to download NZB: Network failed');
    });

    it('should use default download path when configService not provided', async () => {
      const nzbServiceNoConfig = new NzbService();
      
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('<nzb>content</nzb>')
      } as any);

      await nzbServiceNoConfig.download(
        'https://example.com/nzb/123',
        'test-api-key',
        'Test Book'
      );

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('downloads'),
        { recursive: true }
      );
    });

    it('should include User-Agent header in download request', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('<nzb>content</nzb>')
      } as any);

      await nzbService.download(
        'https://example.com/nzb/123',
        'test-api-key',
        'Test Book'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/nzb/123',
        expect.objectContaining({
          headers: { 'User-Agent': 'shelfseeker/1.0' }
        })
      );
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly for different units', async () => {
      // We need to test this indirectly through search results
      const testCases = [
        { bytes: 0, expected: 'Unknown' },
        { bytes: 512, expected: '512.00 B' },
        { bytes: 1024, expected: '1.00 KB' },
        { bytes: 1536, expected: '1.50 KB' },
        { bytes: 1048576, expected: '1.00 MB' },
        { bytes: 1572864, expected: '1.50 MB' },
        { bytes: 1073741824, expected: '1.00 GB' },
      ];

      for (const { bytes, expected } of testCases) {
        const mockXml = createMockXmlResponse([
          {
            title: 'Test.Book-EPUB',
            link: 'https://example.com/1',
            guid: 'guid1',
            attrs: [{ name: 'size', value: bytes.toString() }]
          }
        ]);

        vi.mocked(global.fetch).mockResolvedValue({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue(mockXml)
        } as any);

        const providers = [createMockProvider()];
        const results = await nzbService.search('test', providers);

        expect(results[0].size).toBe(expected);
      }
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata from scene release format', async () => {
      const mockXml = createMockXmlResponse([
        {
          title: 'Brandon.Sanderson-The.Way.of.Kings-RETAIL-EPUB-2024',
          link: 'https://example.com/1',
          guid: 'guid1'
        }
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(mockXml)
      } as any);

      const providers = [createMockProvider()];
      const results = await nzbService.search('test', providers);

      expect(results[0]).toMatchObject({
        title: 'The Way of Kings',
        author: 'Brandon Sanderson',
        fileType: 'epub'
      });
    });

    it('should handle titles without author', async () => {
      const mockXml = createMockXmlResponse([
        {
          title: 'Unknown.Book.Title-EPUB',
          link: 'https://example.com/1',
          guid: 'guid1'
        }
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(mockXml)
      } as any);

      const providers = [createMockProvider()];
      const results = await nzbService.search('test', providers);

      expect(results[0].author).toBe('Unknown');
    });
  });
});
