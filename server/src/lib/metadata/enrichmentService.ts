import { SearchResult, BookMetadata } from '../types.js';
import { searchByTitleAuthor, searchByISBN } from './openLibraryService.js';
import cache, { generateCacheKey } from './metadataCache.js';

/**
 * Enrichment Service
 * 
 * Orchestrates metadata enrichment for search results using:
 * - Cache lookup
 * - Open Library API
 * - Graceful error handling
 */

const ENRICHMENT_TIMEOUT = 10000; // 10 seconds per result

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
      console.log(`Cache hit for: ${result.title}`);
      return {
        ...result,
        metadata: cachedMetadata,
      };
    }

    // Fetch from API with timeout
    const metadata = await Promise.race([
      fetchMetadata(result.title, result.author),
      timeout(ENRICHMENT_TIMEOUT),
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
    console.error(`Error enriching result for "${result.title}":`, error);
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

  console.log(`Enriching ${results.length} search results...`);

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
      console.error(`Enrichment failed for result ${index}:`, result.reason);
      return results[index];
    }
  });

  // Log statistics
  const enrichedCount = enrichedResults.filter((r) => r.metadata).length;
  console.log(`Enriched ${enrichedCount}/${results.length} results`);

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
  console.log(`Removed ${removed} expired cache entries`);
  return removed;
}
