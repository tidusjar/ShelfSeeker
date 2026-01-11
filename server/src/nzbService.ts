import { XMLParser } from 'fast-xml-parser';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { NzbProvider, NzbSearchResult, NzbApiResponse, NzbSearchItem } from './types.js';

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
  async search(query: string, providers: NzbProvider[]): Promise<NzbSearchResult[]> {
    const enabledProviders = providers.filter(p => p.enabled);

    if (enabledProviders.length === 0) {
      return [];
    }

    // Search all providers in parallel, catching errors gracefully
    const searchPromises = enabledProviders.map(provider =>
      this.searchProvider(query, provider).catch(error => {
        console.error(`[NzbService] Provider ${provider.name} failed:`, error.message);
        return []; // Return empty array on failure
      })
    );

    const results = await Promise.all(searchPromises);
    return results.flat(); // Flatten array of arrays
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

    console.log(`[NzbService] Testing provider ${provider.name}: ${searchUrl.toString().replace(provider.apiKey, '***')}`);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(searchUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ircbooks/1.0'
        }
      });

      clearTimeout(timeoutId);

      console.log(`[NzbService] Provider ${provider.name} responded with status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const apiResponse = this.parseXml(xmlText);

      console.log(`[NzbService] Provider ${provider.name} returned ${apiResponse.items.length} items`);

      // Convert items to search results
      const results = apiResponse.items
        .map(item => this.convertToSearchResult(item, provider.name, provider.id))
        .filter((result): result is NzbSearchResult => result !== null);

      console.log(`[NzbService] Provider ${provider.name} converted ${results.length} valid search results`);

      return results;

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout after 10 seconds');
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
      console.error('[NzbService] Failed to parse item:', error);
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
      console.error('[NzbService] Failed to convert item:', error);
      return null;
    }
  }

  /**
   * Extract metadata from NZB title
   * Common patterns:
   * - "Author - Title (Year) [Format]"
   * - "Author - Title [Format]"
   * - "Title (Year) [Format]"
   * - "Title [Format]"
   * - "[Series 01] - Title (retail) (azw3)"
   * - "[Series 01] - Title (epub)"
   */
  private extractMetadata(title: string): { title: string; author: string; fileType: string } {
    // Valid ebook file types
    const validTypes = [
      'epub', 'pdf', 'mobi', 'azw', 'azw3', 'azw4', 'kfx', 'prc', 'tpz', 'azw1',  // Kindle formats
      'txt', 'rtf', 'doc', 'docx', 'html', 'htm',  // Document formats
      'fb2', 'lit', 'pdb', 'ibooks', 'djvu',  // Other ebook formats
      'cbr', 'cbz', 'cbt', 'cb7',  // Comic book formats
      'chm', 'lrf', 'odt', 'opf'  // Additional formats
    ];
    
    let author = 'Unknown';
    let bookTitle = title;
    let fileType = 'Unknown';

    // Extract file type from brackets [EPUB], [PDF], etc.
    const bracketTypeMatch = title.match(/\[([A-Z0-9]+)\]/i);
    if (bracketTypeMatch) {
      const potentialType = bracketTypeMatch[1].toLowerCase();
      if (validTypes.includes(potentialType)) {
        fileType = potentialType;
        bookTitle = title.replace(/\[.*?\]/g, '').trim();
      }
    }

    // Extract file type from parentheses (epub), (azw3), etc.
    // Look for parentheses containing valid file types (ignoring things like years or "retail")
    if (fileType === 'Unknown') {
      const parenMatches = title.matchAll(/\(([^)]+)\)/g);
      for (const match of parenMatches) {
        const content = match[1].toLowerCase().trim();
        if (validTypes.includes(content)) {
          fileType = content;
          // Remove all parentheses from title
          bookTitle = title.replace(/\([^)]+\)/g, '').trim();
          break;
        }
      }
    }

    // If still no type found, remove all brackets/parentheses for cleaner title
    if (fileType === 'Unknown') {
      bookTitle = title.replace(/[\[\(].*?[\]\)]/g, '').trim();
    }

    // Remove year in parentheses if still present
    bookTitle = bookTitle.replace(/\(\d{4}\)/g, '').trim();

    // Try to extract author from "Author - Title" pattern
    const authorMatch = bookTitle.match(/^(.+?)\s*-\s*(.+)$/);
    if (authorMatch) {
      author = authorMatch[1].trim();
      bookTitle = authorMatch[2].trim();
    }

    return {
      title: bookTitle || title,
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
          'User-Agent': 'ircbooks/1.0'
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
