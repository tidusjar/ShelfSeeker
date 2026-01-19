import { IrcService } from './ircService.js';
import { NzbService } from './nzbService.js';
import { ConfigService } from './configService.js';
import { logger } from './lib/logger.js';
import type { SearchResult as IrcSearchResult } from './ircService.js';
import type { NzbSearchResult } from './types.js';

// Unified search result type combining IRC and NZB results
export type UnifiedSearchResult = IrcSearchResult | NzbSearchResult;

export class SearchService {
  constructor(
    private ircService: IrcService,
    private nzbService: NzbService,
    private configService: ConfigService
  ) {}

  /**
   * Search both IRC and NZB sources in parallel, returning combined results
   * @param query Search query string
   * @param enrich Whether to enrich results with metadata (default: false for performance)
   */
  async search(query: string, enrich: boolean = false): Promise<{ results: UnifiedSearchResult[]; errors: string[] }> {
    const results: UnifiedSearchResult[] = [];
    const errors: string[] = [];

    // Check IRC enabled status and connection
    const ircConfig = this.configService.getIrcConfig();
    const ircEnabled = ircConfig.enabled && this.ircService.getStatus() === 'connected';

    // Get enabled NZB providers
    const nzbProviders = this.configService.getNzbProviders();
    const enabledNzbProviders = nzbProviders.filter(p => p.enabled);
    const nzbEnabled = enabledNzbProviders.length > 0;

    if (!ircEnabled && !nzbEnabled) {
      throw new Error('No search sources available. Please enable IRC or add NZB providers.');
    }

    logger.info('[SearchService] Starting search', { 
      ircEnabled, 
      nzbEnabled, 
      nzbProviderCount: enabledNzbProviders.length, 
      enrich,
      query 
    });

    // Launch parallel searches
    const searchPromises: Promise<UnifiedSearchResult[]>[] = [];

    // IRC search
    if (ircEnabled) {
      searchPromises.push(
        this.ircService.search(query, enrich).catch(error => {
          const errorMsg = `IRC: ${error.message}`;
          logger.error('[SearchService] IRC search failed', { query, error: error.message });
          errors.push(errorMsg);
          return []; // Return empty array on failure
        })
      );
    }

    // NZB search
    if (nzbEnabled) {
      searchPromises.push(
        this.searchNzb(query, enabledNzbProviders, enrich).catch(error => {
          const errorMsg = `NZB: ${error.message}`;
          logger.error('[SearchService] NZB search failed', { query, error: error.message });
          errors.push(errorMsg);
          return []; // Return empty array on failure
        })
      );
    }

    // Wait for all searches to complete
    const searchResults = await Promise.all(searchPromises);

    // Flatten and merge results
    const mergedResults = searchResults.flat();

    // Renumber results sequentially
    let bookNumber = 1;
    for (const result of mergedResults) {
      result.bookNumber = bookNumber++;
      results.push(result);
    }

    logger.info('[SearchService] Search complete', { 
      resultCount: results.length, 
      errorCount: errors.length,
      query 
    });

    return { results, errors };
  }

  /**
   * Search NZB providers and increment usage counters
   */
  private async searchNzb(query: string, providers: any[], enrich: boolean = false): Promise<NzbSearchResult[]> {
    // Perform search
    const results = await this.nzbService.search(query, providers, enrich);

    // Increment usage counters for all providers that were queried
    for (const provider of providers) {
      try {
        await this.configService.incrementNzbUsage(provider.id);
      } catch (error) {
        console.error(`[SearchService] Failed to increment usage for ${provider.name}:`, error);
        // Don't fail the search if usage tracking fails
      }
    }

    return results;
  }
}
