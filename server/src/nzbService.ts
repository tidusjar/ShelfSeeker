import { XMLParser } from 'fast-xml-parser';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { NzbProvider, NzbSearchResult, NzbApiResponse, NzbSearchItem } from './types.js';
import { NZBFilenameParser } from './lib/parser/nzbFilenameParser.js';
import { enrichSearchResults } from './lib/metadata/enrichmentService.js';
import { TIMEOUTS } from './constants.js';
import { logger } from './lib/logger.js';

export class NzbService {
  private xmlParser: XMLParser;
  private configService?: any;

  constructor(configService?: any) {
    this.configService = configService;
    // Configure parser to handle arrays and Newznab attributes
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name) => name === 'item' || name === 'newznab:attr'
    });
  }

  /**
   * Search all enabled NZB providers in parallel
   */
  async search(query: string, providers: NzbProvider[], enrich: boolean = false): Promise<NzbSearchResult[]> {
    const enabledProviders = providers.filter(p => p.enabled);

    if (enabledProviders.length === 0) {
      return [];
    }

    // Search all providers in parallel, catching errors gracefully
    const searchPromises = enabledProviders.map(provider =>
      this.searchProvider(query, provider).catch(error => {
        logger.error('[NzbService] Provider failed', { provider: provider.name, error: error.message });
        return []; // Return empty array on failure
      })
    );

    const results = await Promise.all(searchPromises);
    const flatResults = results.flat(); // Flatten array of arrays

    // Conditionally enrich results with metadata from Open Library
    if (!enrich) {
      return flatResults;
    }

    // Convert to enrichable format, enrich, then convert back
    const enrichableResults = flatResults.map(r => ({
      botCommand: '',
      filename: r.filename,
      filesize: r.size,
      rawCommand: '',
      title: r.title,
      author: r.author,
      fileType: r.fileType
    }));

    const enrichedResults = await enrichSearchResults(enrichableResults);

    // Merge metadata back into NZB results
    const enrichedNzbResults = flatResults.map((result, index) => ({
      ...result,
      metadata: enrichedResults[index].metadata
    }));

    return enrichedNzbResults;
  }

  /**
   * Search a single provider with timeout
   */
  private async searchProvider(query: string, provider: NzbProvider): Promise<NzbSearchResult[]> {
    // Build search URL
    const categories = provider.categories.join(',');
    const searchUrl = new URL(`${provider.url}/api`);
    searchUrl.searchParams.set('apikey', provider.apiKey);
    searchUrl.searchParams.set('t', 'search');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('cat', categories);
    searchUrl.searchParams.set('extended', '1');
    searchUrl.searchParams.set('limit', '100');

    logger.info('[NzbService] Testing provider', { provider: provider.name, url: searchUrl.toString().replace(provider.apiKey, '***') });

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.API_REQUEST);

    try {
      const response = await fetch(searchUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'shelfseeker/1.0'
        }
      });

      clearTimeout(timeoutId);

      logger.info('[NzbService] Provider responded', { provider: provider.name, status: response.status });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const apiResponse = this.parseXml(xmlText);

      logger.info('[NzbService] Provider returned items', { provider: provider.name, count: apiResponse.items.length });

      // Convert items to search results
      const results = apiResponse.items
        .map(item => this.convertToSearchResult(item, provider.name, provider.id))
        .filter((result): result is NzbSearchResult => result !== null);

      logger.info('[NzbService] Provider converted valid search results', { provider: provider.name, count: results.length });

      return results;

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${TIMEOUTS.API_REQUEST / 1000} seconds`);
      }
      throw error;
    }
  }

  /**
   * Parse Newznab XML response
   */
  private parseXml(xmlText: string): NzbApiResponse {
    const parsed = this.xmlParser.parse(xmlText);

    if (!parsed.rss?.channel) {
      return { items: [], total: 0 };
    }

    const channel = parsed.rss.channel;
    const items = channel.item || [];

    // Ensure items is always an array
    const itemsArray = Array.isArray(items) ? items : [items];

    const parsedItems = itemsArray
      .map((item: any) => this.parseItem(item))
      .filter((item): item is NzbSearchItem => item !== null);

    return {
      items: parsedItems,
      total: parsedItems.length
    };
  }

  /**
   * Parse individual item from XML
   */
  private parseItem(item: any): NzbSearchItem | null {
    try {
      // Extract title and link
      const title = item.title?.toString().trim();
      const link = item.link?.toString().trim();
      const guid = item.guid?.['#text']?.toString().trim() || item.guid?.toString().trim();

      if (!title || !link) {
        return null;
      }

      // Extract size from newznab attributes
      let size = 0;
      const attrs = item['newznab:attr'];

      if (attrs) {
        const attrsArray = Array.isArray(attrs) ? attrs : [attrs];
        const sizeAttr = attrsArray.find((attr: any) => attr['@_name'] === 'size');
        if (sizeAttr?.['@_value']) {
          size = parseInt(sizeAttr['@_value'], 10);
        }
      }

      return {
        title,
        link,
        guid: guid || link,
        size,
        pubDate: item.pubDate?.toString() || ''
      };
    } catch (error) {
      logger.error('[NzbService] Failed to parse item:', error);
      return null;
    }
  }

  /**
   * Convert NzbSearchItem to unified SearchResult format
   */
  private convertToSearchResult(
    item: NzbSearchItem,
    providerName: string,
    providerId: string
  ): NzbSearchResult | null {
    try {
      const metadata = this.extractMetadata(item.title);

      return {
        source: 'nzb',
        sourceProvider: providerName,
        providerId,
        botName: providerName,
        bookNumber: 0, // Not applicable for NZB
        title: metadata.title,
        author: metadata.author,
        fileType: metadata.fileType,
        size: this.formatBytes(item.size),
        filename: item.title,
        nzbUrl: item.link,
        guid: item.guid
      };
    } catch (error) {
      logger.error('[NzbService] Failed to convert item:', error);
      return null;
    }
  }

  /**
   * Extract metadata from NZB title using the NZB-specific parser.
   * Handles scene release formats with dot-separated metadata.
   */
  private extractMetadata(title: string): { title: string; author: string; fileType: string } {

    const parsed = NZBFilenameParser.parse(title);

    // Convert empty author to "Unknown" for NZB results (maintains backward compatibility)
    const author = parsed.author || 'Unknown';
    // Convert "unknown" file type to "Unknown" for consistency
    const fileType = parsed.fileType === 'unknown' ? 'Unknown' : parsed.fileType;

    return {
      title: parsed.title,
      author,
      fileType
    };
  }

  /**
   * Format bytes to human-readable size
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return 'Unknown';

    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
  }

  /**
   * Download NZB file and save to configured downloads folder
   */
  async download(nzbUrl: string, apiKey: string, filename?: string): Promise<string> {
    try {
      // Fetch NZB file
      const response = await fetch(nzbUrl, {
        headers: {
          'User-Agent': 'shelfseeker/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const nzbContent = await response.text();

      // Use provided filename (title) or fallback to URL-based name
      if (!filename) {
        const urlParts = nzbUrl.split('/');
        filename = urlParts[urlParts.length - 1];
      }

      // Ensure .nzb extension
      if (!filename.endsWith('.nzb')) {
        filename += '.nzb';
      }

      // Sanitize filename (preserve spaces, remove only truly problematic chars)
      filename = filename.replace(/[<>:"|?*\/\\]/g, '_');

      // Get configured download path or fallback to default
      const downloadsDir = this.configService?.getGeneralConfig().downloadPath || join(process.cwd(), 'downloads');
      await mkdir(downloadsDir, { recursive: true });

      // Handle filename collisions
      let finalPath = join(downloadsDir, filename);
      let counter = 1;
      const { existsSync } = await import('fs');

      while (existsSync(finalPath)) {
        const nameParts: string[] = filename.split('.');
        const ext: string = nameParts.pop() || 'nzb';
        const base: string = nameParts.join('.');
        filename = `${base}_${counter}.${ext}`;
        finalPath = join(downloadsDir, filename);
        counter++;
      }

      // Write file
      await writeFile(finalPath, nzbContent, 'utf-8');

      return filename;
    } catch (error: any) {
      throw new Error(`Failed to download NZB: ${error.message}`);
    }
  }
}
