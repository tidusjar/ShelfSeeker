import { SearchResult, BookMetadata } from '../types.js';
import { searchByTitleAuthor, searchByISBN } from './openLibraryService.js';
import cache, { generateCacheKey } from './metadataCache.js';
import { TIMEOUTS } from '../../constants.js';
import { logger } from '../logger.js';

/**
 * Enrichment Service
 * 
 * Orchestrates metadata enrichment for search results using:
 * - Cache lookup
 * - Open Library API
 * - Graceful error handling
 */

/**
 * Enrich a single search result with metadata
 */
export async function enrichSearchResult(
  result: SearchResult
): Promise<SearchResult> {
  // Skip if no title
  if (!result.title) {
    return result;
  }

  try {
    // Generate cache key
    const cacheKey = generateCacheKey(result.title, result.author);

    // Check cache first
    const cachedMetadata = cache.get(cacheKey);
    if (cachedMetadata) {
      logger.info('Cache hit', { title: result.title });
      return {
        ...result,
        metadata: cachedMetadata,
      };
    }

    // Fetch from API with timeout
    const metadata = await Promise.race([
      fetchMetadata(result.title, result.author),
      timeout(TIMEOUTS.ENRICHMENT),
    ]);

    if (metadata) {
      // Cache the result
      cache.set(cacheKey, metadata);

      return {
        ...result,
        metadata,
      };
    }

    // No metadata found, return original result
    return result;
  } catch (error) {
    // Log error but don't fail the search
    logger.error('Error enriching result', { title: result.title, error });
    return result;
  }
}

/**
 * Enrich multiple search results in parallel
 */
export async function enrichSearchResults(
  results: SearchResult[]
): Promise<SearchResult[]> {
  if (!results || results.length === 0) {
    return results;
  }

  logger.info('Enriching search results', { count: results.length });

  // Process all results in parallel
  const enrichmentPromises = results.map((result) =>
    enrichSearchResult(result)
  );

  // Use allSettled to ensure all requests complete even if some fail
  const settledResults = await Promise.allSettled(enrichmentPromises);

  // Extract fulfilled values
  const enrichedResults = settledResults.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      // If enrichment failed, return original result
      logger.error('Enrichment failed for result', { index, reason: result.reason });
      return results[index];
    }
  });

  // Log statistics
  const enrichedCount = enrichedResults.filter((r) => r.metadata).length;
  logger.info('Enriched results', { enrichedCount, totalCount: results.length });

  return enrichedResults;
}

/**
 * Fetch metadata from Open Library
 */
async function fetchMetadata(
  title: string,
  author: string
): Promise<BookMetadata | null> {
  // Try search by title and author
  const metadata = await searchByTitleAuthor(title, author);

  if (metadata) {
    return metadata;
  }

  // If no results with author, try title only
  if (author) {
    const metadataNoAuthor = await searchByTitleAuthor(title, '');
    if (metadataNoAuthor) {
      return metadataNoAuthor;
    }
  }

  return null;
}

/**
 * Timeout helper
 */
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Enrichment timeout')), ms)
  );
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return cache.getStats();
}

/**
 * Clear the metadata cache
 */
export function clearCache() {
  cache.clear();
}

/**
 * Run cache cleanup to remove expired entries
 */
export function cleanupCache() {
  const removed = cache.cleanup();
  logger.info('Removed expired cache entries', { count: removed });
  return removed;
}
