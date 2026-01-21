import { SearchResult, BookMetadata } from '../types.js';
import { searchByTitleAuthor, searchByISBN } from './openLibraryService.js';
import cache, { generateCacheKey } from './metadataCache.js';
import { TIMEOUTS, DEEP_ENRICHMENT_FIRST_N_RESULTS } from '../../constants.js';
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
 * @param result - Search result to enrich
 * @param deepEnrich - If true, fetch Works API for full metadata
 */
export async function enrichSearchResult(
  result: SearchResult,
  deepEnrich: boolean = false
): Promise<SearchResult> {
  // Skip if no title
  if (!result.title) {
    return result;
  }

  try {
    // Generate cache key (different for deep vs shallow)
    const cacheKey = generateCacheKey(result.title, result.author, deepEnrich);

    // Check cache first
    const cachedMetadata = cache.get(cacheKey);
    if (cachedMetadata) {
      logger.info('Cache hit', { title: result.title, deep: deepEnrich });
      return {
        ...result,
        metadata: cachedMetadata,
      };
    }

    // Fetch from API with timeout
    const metadata = await Promise.race([
      fetchMetadata(result.title, result.author, deepEnrich),
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
 * @param results - Array of search results
 * @param deepEnrichCount - Number of results to deep enrich (default from constant)
 */
export async function enrichSearchResults(
  results: SearchResult[],
  deepEnrichCount: number = DEEP_ENRICHMENT_FIRST_N_RESULTS
): Promise<SearchResult[]> {
  if (!results || results.length === 0) {
    return results;
  }

  logger.info('Enriching search results', { 
    count: results.length,
    deepEnrichCount 
  });

  // Process results with mixed enrichment strategy
  const enrichmentPromises = results.map((result, index) => {
    const shouldDeepEnrich = index < deepEnrichCount;
    return enrichSearchResult(result, shouldDeepEnrich);
  });

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
  const deepEnrichedCount = enrichedResults
    .slice(0, deepEnrichCount)
    .filter((r) => r.metadata?.descriptionSource === 'works')
    .length;
  const shallowEnrichedCount = enrichedResults
    .filter((r) => r.metadata && r.metadata.descriptionSource !== 'works')
    .length;
    
  logger.info('Enrichment complete', { 
    deepEnrichedCount, 
    shallowEnrichedCount,
    totalCount: results.length 
  });

  return enrichedResults;
}

/**
 * Fetch metadata from Open Library
 * @param deepEnrich - If true, include Works API call
 */
async function fetchMetadata(
  title: string,
  author: string,
  deepEnrich: boolean = false
): Promise<BookMetadata | null> {
  // Try search by title and author with optional deep enrichment
  const metadata = await searchByTitleAuthor(title, author, deepEnrich);

  if (metadata) {
    return metadata;
  }

  // If no results with author, try title only (only if not deep, to avoid double API calls)
  if (author && !deepEnrich) {
    const metadataNoAuthor = await searchByTitleAuthor(title, '', false);
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
