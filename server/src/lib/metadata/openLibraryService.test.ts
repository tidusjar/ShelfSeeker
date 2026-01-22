import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchByTitleAuthor, searchByISBN, getCoverUrl } from './openLibraryService.js';
import { BookMetadata } from '../types.js';

// Mock global fetch
global.fetch = vi.fn();

describe('OpenLibraryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchByTitleAuthor', () => {
    it('should return null when title is empty', async () => {
      const result = await searchByTitleAuthor('', 'Author');
      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should search with title and author', async () => {
      const mockResponse = {
        docs: [
          {
            title: 'The Great Book',
            publisher: ['Test Publisher'],
            first_publish_year: 2020,
            number_of_pages_median: 300,
            language: ['eng'],
            subject: ['Fiction', 'Fantasy'],
            isbn: ['9781234567890'],
            cover_i: 12345
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await searchByTitleAuthor('The Great Book', 'John Doe');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://openlibrary.org/search.json?title=The+Great+Book&author=John+Doe'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('ShelfSeeker')
          })
        })
      );

      expect(result).toEqual({
        publisher: 'Test Publisher',
        publishDate: '2020',
        pageCount: 300,
        language: 'eng',
        subjects: ['Fiction', 'Fantasy'],
        isbn13: '9781234567890',
        isbn: '9781234567890',
        coverUrlSmall: 'https://covers.openlibrary.org/b/id/12345-S.jpg',
        coverUrlMedium: 'https://covers.openlibrary.org/b/id/12345-M.jpg',
        coverUrlLarge: 'https://covers.openlibrary.org/b/id/12345-L.jpg',
        coverUrl: 'https://covers.openlibrary.org/b/id/12345-M.jpg'
      });
    });

    it('should search with title only when author is empty', async () => {
      const mockResponse = {
        docs: [
          {
            title: 'The Great Book',
            publisher: ['Test Publisher']
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await searchByTitleAuthor('The Great Book', '');

      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain('title=The+Great+Book');
      expect(callUrl).not.toContain('author=');

      expect(result).not.toBeNull();
    });

    it('should return null when API returns no results', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ docs: [] })
      } as Response);

      const result = await searchByTitleAuthor('Nonexistent Book', 'Unknown Author');
      expect(result).toBeNull();
    });

    it('should return null when API returns error status', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500
      } as Response);

      const result = await searchByTitleAuthor('Test', 'Test');
      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await searchByTitleAuthor('Test', 'Test');
      expect(result).toBeNull();
    });

    it('should parse ISBN-10 when no ISBN-13 available', async () => {
      const mockResponse = {
        docs: [
          {
            title: 'Book',
            isbn: ['1234567890'] // ISBN-10 format
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await searchByTitleAuthor('Book', 'Author');
      expect(result?.isbn).toBe('1234567890');
      expect(result?.isbn13).toBeUndefined();
    });

    it('should prefer ISBN-13 over ISBN-10', async () => {
      const mockResponse = {
        docs: [
          {
            title: 'Book',
            isbn: ['1234567890', '9781234567890', '9799876543210']
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await searchByTitleAuthor('Book', 'Author');
      expect(result?.isbn13).toBe('9781234567890');
      expect(result?.isbn).toBe('9781234567890');
    });

    it('should limit subjects to first 5', async () => {
      const mockResponse = {
        docs: [
          {
            title: 'Book',
            subject: ['Subject1', 'Subject2', 'Subject3', 'Subject4', 'Subject5', 'Subject6', 'Subject7']
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await searchByTitleAuthor('Book', 'Author');
      expect(result?.subjects).toHaveLength(5);
      expect(result?.subjects).toEqual(['Subject1', 'Subject2', 'Subject3', 'Subject4', 'Subject5']);
    });

    it('should handle missing optional fields', async () => {
      const mockResponse = {
        docs: [
          {
            title: 'Minimal Book'
            // No other fields
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await searchByTitleAuthor('Minimal Book', '');
      
      // Should return an object, but with no metadata fields
      expect(result).toEqual({});
    });

    it('should parse ratings if available', async () => {
      const mockResponse = {
        docs: [
          {
            title: 'Rated Book',
            ratings_average: 4.5,
            ratings_count: 1234
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await searchByTitleAuthor('Rated Book', 'Author');
      expect(result?.averageRating).toBe(4.5);
      expect(result?.ratingsCount).toBe(1234);
    });

    it('should use publish_year array if first_publish_year not available', async () => {
      const mockResponse = {
        docs: [
          {
            title: 'Book',
            publish_year: [1995, 2000, 2005]
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await searchByTitleAuthor('Book', 'Author');
      expect(result?.publishDate).toBe('1995');
    });

    it('should include Open Library key if available', async () => {
      const mockResponse = {
        docs: [
          {
            title: 'Book',
            key: '/works/OL123456W'
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await searchByTitleAuthor('Book', 'Author');
      expect(result?.openLibraryKey).toBe('/works/OL123456W');
    });
  });

  describe('searchByISBN', () => {
    it('should return null when ISBN is empty', async () => {
      const result = await searchByISBN('');
      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should search with ISBN', async () => {
      const mockResponse = {
        'ISBN:9781234567890': {
          publishers: [{ name: 'Test Publisher' }],
          publish_date: '2023',
          number_of_pages: 250,
          subjects: [
            { name: 'Fiction' },
            { name: 'Adventure' }
          ],
          identifiers: {
            isbn_13: ['9781234567890']
          },
          cover: {
            small: 'https://example.com/small.jpg',
            medium: 'https://example.com/medium.jpg',
            large: 'https://example.com/large.jpg'
          },
          key: '/books/OL123M'
        }
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await searchByISBN('9781234567890');

      expect(result).toEqual({
        publisher: 'Test Publisher',
        publishDate: '2023',
        pageCount: 250,
        subjects: ['Fiction', 'Adventure'],
        isbn13: '9781234567890',
        isbn: '9781234567890',
        coverUrlSmall: 'https://example.com/small.jpg',
        coverUrlMedium: 'https://example.com/medium.jpg',
        coverUrlLarge: 'https://example.com/large.jpg',
        coverUrl: 'https://example.com/medium.jpg',
        openLibraryKey: '/books/OL123M'
      });
    });

    it('should return null when ISBN not found', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({})
      } as Response);

      const result = await searchByISBN('0000000000');
      expect(result).toBeNull();
    });

    it('should handle API errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404
      } as Response);

      const result = await searchByISBN('9781234567890');
      expect(result).toBeNull();
    });

    it('should use ISBN-10 if ISBN-13 not available', async () => {
      const mockResponse = {
        'ISBN:1234567890': {
          identifiers: {
            isbn_10: ['1234567890']
          }
        }
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await searchByISBN('1234567890');
      expect(result?.isbn).toBe('1234567890');
      expect(result?.isbn13).toBeUndefined();
    });

    it('should limit subjects to 5', async () => {
      const mockResponse = {
        'ISBN:9781234567890': {
          subjects: [
            { name: 'S1' },
            { name: 'S2' },
            { name: 'S3' },
            { name: 'S4' },
            { name: 'S5' },
            { name: 'S6' }
          ]
        }
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await searchByISBN('9781234567890');
      expect(result?.subjects).toHaveLength(5);
    });
  });

  describe('getCoverUrl', () => {
    it('should generate ISBN cover URL', () => {
      const url = getCoverUrl('9781234567890', 'isbn', 'M');
      expect(url).toBe('https://covers.openlibrary.org/b/isbn/9781234567890-M.jpg');
    });

    it('should generate OLID cover URL', () => {
      const url = getCoverUrl('OL123456M', 'olid', 'L');
      expect(url).toBe('https://covers.openlibrary.org/b/olid/OL123456M-L.jpg');
    });

    it('should generate ID cover URL', () => {
      const url = getCoverUrl('12345', 'id', 'S');
      expect(url).toBe('https://covers.openlibrary.org/b/id/12345-S.jpg');
    });

    it('should default to medium size', () => {
      const url = getCoverUrl('9781234567890', 'isbn');
      expect(url).toBe('https://covers.openlibrary.org/b/isbn/9781234567890-M.jpg');
    });

    it('should handle all size options', () => {
      const urlS = getCoverUrl('123', 'id', 'S');
      const urlM = getCoverUrl('123', 'id', 'M');
      const urlL = getCoverUrl('123', 'id', 'L');
      
      expect(urlS).toContain('-S.jpg');
      expect(urlM).toContain('-M.jpg');
      expect(urlL).toContain('-L.jpg');
    });
  });
});
