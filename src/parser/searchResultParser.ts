import { readFileSync } from 'fs';
import { SearchResult } from '../types.js';

/**
 * Parses search results from the IRC bot's text file.
 * Expected format: !BotName filename ::INFO:: size
 * Example: !Bsk Cube Kid - Minecraft- Diary of a Wimpy Villager - Book 02.epub  ::INFO:: 1001.7KB
 */
export class SearchResultParser {
  /**
   * Parse a search results text file
   * @param filePath Path to the .txt file containing search results
   * @returns Array of parsed search results
   */
  static parse(filePath: string): SearchResult[] {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const results: SearchResult[] = [];

    for (const line of lines) {
      // Skip empty lines and header/footer lines
      if (!line.trim() || !line.includes('::INFO::')) {
        continue;
      }

      const result = this.parseLine(line);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Parse a single line from the search results
   * @param line Single line from the search results file
   * @returns Parsed SearchResult or null if line is invalid
   */
  private static parseLine(line: string): SearchResult | null {
    // Extract the parts: !BotCommand filename ::INFO:: size
    const match = line.match(/^(![\w]+)\s+(.+?)\s+::INFO::\s+(.+)$/);

    if (!match) {
      return null;
    }

    const [, botCommand, filename, filesize] = match;

    return {
      botCommand: botCommand.trim(),
      filename: filename.trim(),
      filesize: filesize.trim(),
      rawCommand: `${botCommand.trim()} ${filename.trim()}`
    };
  }

  /**
   * Check if the search results file has any results
   * @param filePath Path to the .txt file
   * @returns true if results found, false otherwise
   */
  static hasResults(filePath: string): boolean {
    try {
      const results = this.parse(filePath);
      return results.length > 0;
    } catch {
      return false;
    }
  }
}
