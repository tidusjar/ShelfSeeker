import { readFileSync } from 'fs';
import { SearchResult } from '../types.js';
import { IRCFilenameParser } from './ircFilenameParser.js';

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
    // Extract the parts: Various bot formats:
    // !BotCommand filename ::INFO:: size
    // !BotCommand HASH | filename ::INFO:: size
    // !BotCommand %HASH% filename ::INFO:: size
    
    // First, extract bot command (everything from ! to first space)
    const botCommandMatch = line.match(/^(!\w+)\s+/);
    if (!botCommandMatch) {
      return null;
    }
    
    const botCommand = botCommandMatch[1];
    
    // Find ::INFO:: separator
    const infoIndex = line.indexOf('::INFO::');
    if (infoIndex === -1) {
      return null;
    }
    
    // Everything after ::INFO:: is the filesize
    const filesize = line.substring(infoIndex + 8).trim();
    
    // Everything between bot command and ::INFO:: is the filename (possibly with hash)
    let filenamePart = line.substring(botCommandMatch[0].length, infoIndex).trim();
    
    // Remove hash/ID patterns:
    // Pattern 1: "HASH | filename" - remove hash and pipe
    filenamePart = filenamePart.replace(/^[a-f0-9]+\s*\|\s*/, '');
    // Pattern 2: "%HASH% filename" - remove percent-encoded hash
    filenamePart = filenamePart.replace(/^%[A-F0-9]+%\s+/, '');
    
    const filename = filenamePart.trim();
    
    if (!filename || !filesize) {
      return null;
    }

    // Extract metadata from filename
    const { title, author, fileType } = this.extractMetadata(filename);

    return {
      botCommand: botCommand.trim(),
      filename: filename,
      filesize: filesize,
      rawCommand: `${botCommand.trim()} ${filename}`,
      title,
      author,
      fileType
    };
  }

  /**
   * Extract title, author, and file type from filename using the IRC parser.
   * Optimized for human-readable IRC bot filenames.
   */
  private static extractMetadata(filename: string): { title: string; author: string; fileType: string } {
    const parsed = IRCFilenameParser.parse(filename);
    return {
      title: parsed.title,
      author: parsed.author,
      fileType: parsed.fileType
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
