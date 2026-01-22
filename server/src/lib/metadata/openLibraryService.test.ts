import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchByTitleAuthor, searchByISBN, getCoverUrl, fetchWorkDetails } from './openLibraryService.js';
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
        firstPublishYear: 2020,
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

  describe('fetchWorkDetails', () => {
    it('should return null when workKey is empty', async () => {
      const result = await fetchWorkDetails('');
      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch work details with clean work key', async () => {
      const mockWorkResponse = {
        description: 'A fascinating book about testing',
        series: ['Test Series', 'Book 1'],
        excerpts: [
          { excerpt: 'This is an excerpt', comment: 'From chapter 1' }
        ],
        links: [
          { url: 'https://example.com', title: 'Author Website' }
        ],
        subject_people: ['Character 1', 'Character 2'],
        subject_places: ['New York', 'London'],
        subject_times: ['1920s', '1930s']
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockWorkResponse
      } as Response);

      const result = await fetchWorkDetails('OL123456W');
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/works/OL123456W.json'),
        expect.any(Object)
      );
      
      expect(result).toEqual({
        description: 'A fascinating book about testing',
        descriptionSource: 'works',
        series: ['Test Series', 'Book 1'],
        excerpts: [{ excerpt: 'This is an excerpt', comment: 'From chapter 1' }],
        links: [{ url: 'https://example.com', title: 'Author Website' }],
        subjectPeople: ['Character 1', 'Character 2'],
        subjectPlaces: ['New York', 'London'],
        subjectTimes: ['1920s', '1930s']
      });
    });

    it('should handle work key with /works/ prefix', async () => {
      const mockWorkResponse = {
        description: 'Test description'
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockWorkResponse
      } as Response);

      await fetchWorkDetails('/works/OL123456W');
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/works/OL123456W.json'),
        expect.any(Object)
      );
    });

    it('should parse description from object format', async () => {
      const mockWorkResponse = {
        description: {
          value: 'Description from object',
          type: '/type/text'
        }
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockWorkResponse
      } as Response);

      const result = await fetchWorkDetails('OL123456W');
      expect(result?.description).toBe('Description from object');
      expect(result?.descriptionSource).toBe('works');
    });

    it('should parse description from string format', async () => {
      const mockWorkResponse = {
        description: 'Simple string description'
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockWorkResponse
      } as Response);

      const result = await fetchWorkDetails('OL123456W');
      expect(result?.description).toBe('Simple string description');
      expect(result?.descriptionSource).toBe('works');
    });

    it('should handle single series as string', async () => {
      const mockWorkResponse = {
        series: 'Harry Potter'
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockWorkResponse
      } as Response);

      const result = await fetchWorkDetails('OL123456W');
      expect(result?.series).toEqual(['Harry Potter']);
    });

    it('should handle series as array', async () => {
      const mockWorkResponse = {
        series: ['Series Name', 'Book 2', 'Part 3']
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockWorkResponse
      } as Response);

      const result = await fetchWorkDetails('OL123456W');
      expect(result?.series).toEqual(['Series Name', 'Book 2', 'Part 3']);
    });

    it('should limit excerpts to 3', async () => {
      const mockWorkResponse = {
        excerpts: [
          { excerpt: 'Excerpt 1' },
          { excerpt: 'Excerpt 2' },
          { excerpt: 'Excerpt 3' },
          { excerpt: 'Excerpt 4' },
          { excerpt: 'Excerpt 5' }
        ]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockWorkResponse
      } as Response);

      const result = await fetchWorkDetails('OL123456W');
      expect(result?.excerpts).toHaveLength(3);
    });

    it('should limit links to 5', async () => {
      const mockWorkResponse = {
        links: Array.from({ length: 10 }, (_, i) => ({
          url: `https://example.com/${i}`,
          title: `Link ${i}`
        }))
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockWorkResponse
      } as Response);

      const result = await fetchWorkDetails('OL123456W');
      expect(result?.links).toHaveLength(5);
    });

    it('should limit subject_people to 10', async () => {
      const mockWorkResponse = {
        subject_people: Array.from({ length: 20 }, (_, i) => `Person ${i}`)
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockWorkResponse
      } as Response);

      const result = await fetchWorkDetails('OL123456W');
      expect(result?.subjectPeople).toHaveLength(10);
    });

    it('should limit subject_places to 5', async () => {
      const mockWorkResponse = {
        subject_places: Array.from({ length: 10 }, (_, i) => `Place ${i}`)
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockWorkResponse
      } as Response);

      const result = await fetchWorkDetails('OL123456W');
      expect(result?.subjectPlaces).toHaveLength(5);
    });

    it('should limit subject_times to 3', async () => {
      const mockWorkResponse = {
        subject_times: ['1900s', '1910s', '1920s', '1930s', '1940s']
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockWorkResponse
      } as Response);

      const result = await fetchWorkDetails('OL123456W');
      expect(result?.subjectTimes).toHaveLength(3);
    });

    it('should return null on API error', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404
      } as Response);

      const result = await fetchWorkDetails('OL123456W');
      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await fetchWorkDetails('OL123456W');
      expect(result).toBeNull();
    });

    it('should return empty object when no relevant fields present', async () => {
      const mockWorkResponse = {
        title: 'Book Title',
        author: 'Author Name'
        // No description, series, excerpts, etc.
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockWorkResponse
      } as Response);

      const result = await fetchWorkDetails('OL123456W');
      expect(result).toEqual({});
    });
  });

  describe('searchByTitleAuthor with includeWorkDetails', () => {
    it('should fetch work details when includeWorkDetails is true', async () => {
      const mockSearchResponse = {
        docs: [
          {
            title: 'Test Book',
            key: '/works/OL123456W'
          }
        ]
      };

      const mockWorkResponse = {
        description: 'Full description from Works API',
        series: ['Test Series']
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockWorkResponse
        } as Response);

      const result = await searchByTitleAuthor('Test Book', 'Author', true);
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result?.openLibraryKey).toBe('/works/OL123456W');
      expect(result?.description).toBe('Full description from Works API');
      expect(result?.descriptionSource).toBe('works');
      expect(result?.series).toEqual(['Test Series']);
    });

    it('should not fetch work details when includeWorkDetails is false', async () => {
      const mockSearchResponse = {
        docs: [
          {
            title: 'Test Book',
            key: '/works/OL123456W'
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse
      } as Response);

      const result = await searchByTitleAuthor('Test Book', 'Author', false);
      
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result?.openLibraryKey).toBe('/works/OL123456W');
      expect(result?.description).toBeUndefined();
      expect(result?.series).toBeUndefined();
    });

    it('should handle work details fetch failure gracefully', async () => {
      const mockSearchResponse = {
        docs: [
          {
            title: 'Test Book',
            key: '/works/OL123456W'
          }
        ]
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        } as Response);

      const result = await searchByTitleAuthor('Test Book', 'Author', true);
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result?.openLibraryKey).toBe('/works/OL123456W');
      // Should still return search result even if works fetch failed
      expect(result).not.toBeNull();
    });

    it('should skip work details if no openLibraryKey', async () => {
      const mockSearchResponse = {
        docs: [
          {
            title: 'Test Book'
            // No key field
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse
      } as Response);

      const result = await searchByTitleAuthor('Test Book', 'Author', true);
      
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual({});
    });
  });
});
