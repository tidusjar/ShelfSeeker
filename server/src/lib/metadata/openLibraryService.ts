import { BookMetadata } from '../types.js';

/**
 * Open Library API Service
 * 
 * Provides functionality to search for book metadata using the Open Library API.
 * Documentation: https://openlibrary.org/developers/api
 */

const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';
const OPEN_LIBRARY_BOOKS_URL = 'https://openlibrary.org/api/books';
const OPEN_LIBRARY_COVERS_URL = 'https://covers.openlibrary.org/b';

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Start with 1 second

/**
 * Search for a book by title and author
 */
export async function searchByTitleAuthor(
  title: string,
  author: string
): Promise<BookMetadata | null> {
  if (!title) {
    return null;
  }

  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('title', title);
    if (author) {
      params.append('author', author);
    }
    params.append('limit', '1'); // We only need the first result

    const url = `${OPEN_LIBRARY_SEARCH_URL}?${params.toString()}`;
    console.log(url);
    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      console.warn(`Open Library API returned ${response.status} for query: ${title}`);
      return null;
    }

    const data = await response.json() as any;
    
    if (!data.docs || data.docs.length === 0) {
      return null;
    }

    const book = data.docs[0];
    return parseSearchResult(book);
  } catch (error) {
    console.error('Error fetching from Open Library:', error);
    return null;
  }
}

/**
 * Search for a book by ISBN
 */
export async function searchByISBN(isbn: string): Promise<BookMetadata | null> {
  if (!isbn) {
    return null;
  }

  try {
    const bibkey = `ISBN:${isbn}`;
    const params = new URLSearchParams({
      bibkeys: bibkey,
      format: 'json',
      jscmd: 'data'
    });

    const url = `${OPEN_LIBRARY_BOOKS_URL}?${params.toString()}`;
    
    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      console.warn(`Open Library API returned ${response.status} for ISBN: ${isbn}`);
      return null;
    }

    const data = await response.json() as any;
    
    if (!data[bibkey]) {
      return null;
    }

    return parseBookData(data[bibkey]);
  } catch (error) {
    console.error('Error fetching from Open Library by ISBN:', error);
    return null;
  }
}

/**
 * Parse search result from Open Library search API
 */
function parseSearchResult(book: any): BookMetadata {
  const metadata: BookMetadata = {};

  // Extract basic info
  if (book.title) {
    // We don't set title here as it's already in SearchResult
  }

  // Publisher
  if (book.publisher && book.publisher.length > 0) {
    metadata.publisher = book.publisher[0];
  }

  // Publish date
  if (book.first_publish_year) {
    metadata.publishDate = book.first_publish_year.toString();
  } else if (book.publish_year && book.publish_year.length > 0) {
    metadata.publishDate = book.publish_year[0].toString();
  }

  // Page count
  if (book.number_of_pages_median) {
    metadata.pageCount = book.number_of_pages_median;
  }

  // Language
  if (book.language && book.language.length > 0) {
    metadata.language = book.language[0];
  }

  // Subjects
  if (book.subject && book.subject.length > 0) {
    // Take first 5 subjects to avoid clutter
    metadata.subjects = book.subject.slice(0, 5);
  }

  // ISBNs
  if (book.isbn && book.isbn.length > 0) {
    const isbns = book.isbn;
    // Try to find ISBN-13 (starts with 978 or 979)
    const isbn13 = isbns.find((isbn: string) => isbn.startsWith('978') || isbn.startsWith('979'));
    if (isbn13) {
      metadata.isbn13 = isbn13;
      metadata.isbn = isbn13;
    } else {
      metadata.isbn = isbns[0];
    }
  }

  // Cover images
  if (book.cover_i) {
    const coverId = book.cover_i;
    metadata.coverUrlSmall = `${OPEN_LIBRARY_COVERS_URL}/id/${coverId}-S.jpg`;
    metadata.coverUrlMedium = `${OPEN_LIBRARY_COVERS_URL}/id/${coverId}-M.jpg`;
    metadata.coverUrlLarge = `${OPEN_LIBRARY_COVERS_URL}/id/${coverId}-L.jpg`;
    metadata.coverUrl = metadata.coverUrlMedium; // Default to medium
  }

  // Open Library key
  if (book.key) {
    metadata.openLibraryKey = book.key;
  }

  // Ratings (if available from ratings field)
  if (book.ratings_average) {
    metadata.averageRating = book.ratings_average;
  }
  if (book.ratings_count) {
    metadata.ratingsCount = book.ratings_count;
  }

  return metadata;
}

/**
 * Parse book data from Open Library books API
 */
function parseBookData(book: any): BookMetadata {
  const metadata: BookMetadata = {};

  // Publisher
  if (book.publishers && book.publishers.length > 0) {
    metadata.publisher = book.publishers[0].name;
  }

  // Publish date
  if (book.publish_date) {
    metadata.publishDate = book.publish_date;
  }

  // Page count
  if (book.number_of_pages) {
    metadata.pageCount = book.number_of_pages;
  }

  // Subjects
  if (book.subjects && book.subjects.length > 0) {
    metadata.subjects = book.subjects.slice(0, 5).map((s: any) => s.name);
  }

  // ISBNs
  if (book.identifiers) {
    if (book.identifiers.isbn_13 && book.identifiers.isbn_13.length > 0) {
      metadata.isbn13 = book.identifiers.isbn_13[0];
      metadata.isbn = metadata.isbn13;
    } else if (book.identifiers.isbn_10 && book.identifiers.isbn_10.length > 0) {
      metadata.isbn = book.identifiers.isbn_10[0];
    }
  }

  // Cover images
  if (book.cover) {
    metadata.coverUrlSmall = book.cover.small;
    metadata.coverUrlMedium = book.cover.medium;
    metadata.coverUrlLarge = book.cover.large;
    metadata.coverUrl = book.cover.medium;
  }

  // Open Library key
  if (book.key) {
    metadata.openLibraryKey = book.key;
  }

  return metadata;
}

/**
 * Fetch with retry logic and timeout
 */
async function fetchWithRetry(
  url: string,
  retries = MAX_RETRIES
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ShelfSeeker/1.0 (tidusjar@gmail.com)',
      },
    });

    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);

    // If we have retries left and it's a network error, retry
    if (retries > 0 && (error instanceof Error && error.name === 'AbortError')) {
      console.log(`Request timed out, retrying... (${retries} attempts left)`);
      await sleep(RETRY_DELAY * (MAX_RETRIES - retries + 1)); // Exponential backoff
      return fetchWithRetry(url, retries - 1);
    }

    throw error;
  }
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate cover URL for a given identifier
 */
export function getCoverUrl(
  identifier: string,
  type: 'isbn' | 'olid' | 'id',
  size: 'S' | 'M' | 'L' = 'M'
): string {
  return `${OPEN_LIBRARY_COVERS_URL}/${type}/${identifier}-${size}.jpg`;
}
