import { BookMetadata } from '../types.js';
import { TIMEOUTS } from '../../constants.js';
import { logger } from '../logger.js';

/**
 * Open Library API Service
 * 
 * Provides functionality to search for book metadata using the Open Library API.
 * Documentation: https://openlibrary.org/developers/api
 */

// Allow override for testing
const OPEN_LIBRARY_BASE_URL = process.env.OPENLIBRARY_BASE_URL || 'https://openlibrary.org';
const OPEN_LIBRARY_COVERS_BASE_URL = process.env.OPENLIBRARY_COVERS_URL || 'https://covers.openlibrary.org';

const OPEN_LIBRARY_SEARCH_URL = `${OPEN_LIBRARY_BASE_URL}/search.json`;
const OPEN_LIBRARY_BOOKS_URL = `${OPEN_LIBRARY_BASE_URL}/api/books`;
const OPEN_LIBRARY_COVERS_URL = `${OPEN_LIBRARY_COVERS_BASE_URL}/b`;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Start with 1 second

/**
 * Search for a book by title and author
 * @param title - Book title
 * @param author - Author name
 * @param includeWorkDetails - If true, fetch Works API for full description/series
 */
export async function searchByTitleAuthor(
  title: string,
  author: string,
  includeWorkDetails: boolean = false
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
    logger.info(url);
    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      logger.warn('Open Library API error', { status: response.status, query: title });
      return null;
    }

    const data = await response.json() as any;
    
    if (!data.docs || data.docs.length === 0) {
      return null;
    }

    const book = data.docs[0];
    const metadata = parseSearchResult(book);
    
    // Optionally fetch full work details
    if (includeWorkDetails && metadata.openLibraryKey) {
      const workDetails = await fetchWorkDetails(metadata.openLibraryKey);
      if (workDetails) {
        // Merge work details into metadata
        Object.assign(metadata, workDetails);
      }
    }
    
    return metadata;
  } catch (error) {
    logger.error('Error fetching from Open Library:', error);
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
      logger.warn('Open Library API error for ISBN', { status: response.status, isbn });
      return null;
    }

    const data = await response.json() as any;
    
    if (!data[bibkey]) {
      return null;
    }

    return parseBookData(data[bibkey]);
  } catch (error) {
    logger.error('Error fetching from Open Library by ISBN:', error);
    return null;
  }
}

/**
 * Fetch detailed metadata from Works API
 * @param workKey - The Open Library work key (e.g., "OL82563W" or "/works/OL82563W")
 * @returns Partial metadata from Works API or null on error
 */
export async function fetchWorkDetails(workKey: string): Promise<Partial<BookMetadata> | null> {
  if (!workKey) {
    return null;
  }

  try {
    // Clean work key (handle both "OL82563W" and "/works/OL82563W")
    const cleanKey = workKey.replace('/works/', '');
    const url = `${OPEN_LIBRARY_BASE_URL}/works/${cleanKey}.json`;
    
    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      logger.warn('Works API error', { status: response.status, workKey });
      return null;
    }

    const work = await response.json();
    return parseWorkDetails(work);
  } catch (error) {
    logger.error('Error fetching from Works API:', error);
    return null;
  }
}

/**
 * Parse work data from Open Library Works API
 * @param work - Raw work object from API
 * @returns Partial metadata with Works-specific fields
 */
function parseWorkDetails(work: any): Partial<BookMetadata> {
  const details: Partial<BookMetadata> = {};
  
  // Description (can be string or object with {value: "...", type: "..."})
  if (work.description) {
    if (typeof work.description === 'string') {
      details.description = work.description;
      details.descriptionSource = 'works';
    } else if (work.description.value) {
      details.description = work.description.value;
      details.descriptionSource = 'works';
    }
  }
  
  // Series information (can be single string or array)
  if (work.series) {
    details.series = Array.isArray(work.series) ? work.series : [work.series];
  }
  
  // Excerpts (for future use)
  if (work.excerpts && work.excerpts.length > 0) {
    details.excerpts = work.excerpts.slice(0, 3).map((e: any) => ({
      excerpt: e.excerpt,
      comment: e.comment
    }));
  }
  
  // Links (for future use)
  if (work.links && work.links.length > 0) {
    details.links = work.links.slice(0, 5).map((l: any) => ({
      url: l.url,
      title: l.title
    }));
  }
  
  // Contextual subjects (for future use)
  if (work.subject_people) {
    details.subjectPeople = work.subject_people.slice(0, 10);
  }
  if (work.subject_places) {
    details.subjectPlaces = work.subject_places.slice(0, 5);
  }
  if (work.subject_times) {
    details.subjectTimes = work.subject_times.slice(0, 3);
  }
  
  return details;
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

  // === NEW FIELDS ===
  
  // Edition count
  if (book.edition_count) {
    metadata.editionCount = book.edition_count;
  }
  
  // First publish year (distinct from publish_date)
  if (book.first_publish_year) {
    metadata.firstPublishYear = book.first_publish_year;
  }
  
  // Alternative author names
  if (book.author_alternative_name?.length > 0) {
    metadata.authorAlternativeName = book.author_alternative_name;
  }
  
  // Contributors (limit to first 3)
  if (book.contributor?.length > 0) {
    metadata.contributor = book.contributor.slice(0, 3);
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
  const timeout = setTimeout(() => controller.abort(), TIMEOUTS.API_REQUEST);

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
      logger.info('Request timed out, retrying...', { retriesLeft: retries });
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
