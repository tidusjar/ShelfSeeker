/**
 * IRC-specific filename parser.
 * Optimized for human-readable filenames from IRC bots.
 * 
 * Common patterns:
 * - Author - Title
 * - Title - Subtitle - Author (author at end)
 * - Title - LastName, FirstName (comma-separated author at end)
 * - Author - [Series XX] - Title
 */

export interface IRCParsedMetadata {
  title: string;
  author: string;
  fileType: string;
}

const VALID_EBOOK_TYPES = [
  'epub', 'mobi', 'azw3', 'azw', 'pdf', 'txt', 'doc', 'docx',
  'rtf', 'html', 'htm', 'fb2', 'lit', 'pdb', 'cbz', 'cbr'
];

export class IRCFilenameParser {
  /**
   * Parse an IRC bot filename to extract author, title, and file type.
   */
  static parse(filename: string): IRCParsedMetadata {
    if (!filename || filename.trim() === '') {
      return { title: '', author: '', fileType: 'unknown' };
    }

    // Extract file type first
    const { type: fileType, cleanName } = this.extractFileType(filename);

    // Try to extract author and title
    const { author, title } = this.extractAuthorAndTitle(cleanName);

    return {
      title: this.cleanTitle(title),
      author: this.normalizeAuthor(author),
      fileType
    };
  }

  /**
   * Extract file type from extension or embedded metadata.
   */
  private static extractFileType(filename: string): { type: string; cleanName: string } {
    let type = 'unknown';
    let cleanName = filename;

    // Priority 1: File extension
    const extMatch = filename.match(/\.([a-z0-9]+)$/i);
    if (extMatch && VALID_EBOOK_TYPES.includes(extMatch[1].toLowerCase())) {
      type = extMatch[1].toLowerCase();
      cleanName = filename.substring(0, filename.lastIndexOf('.'));
      return { type, cleanName };
    }

    // Priority 2: Parenthesized (azw3), (epub)
    const parenMatches = filename.matchAll(/\(([^)]+)\)/g);
    for (const match of parenMatches) {
      const content = match[1].toLowerCase().trim();
      if (VALID_EBOOK_TYPES.includes(content)) {
        type = content;
        // Don't remove parentheses here, let cleaning handle it
        break;
      }
    }

    return { type, cleanName };
  }

  /**
   * Extract author and title from cleaned filename.
   */
  private static extractAuthorAndTitle(filename: string): { author: string; title: string } {
    // No dash separator - title only
    if (!filename.includes(' - ')) {
      // Check for "by Author" pattern
      const byMatch = filename.match(/^(.+?)\s+by\s+(.+)$/i);
      if (byMatch) {
        return { title: byMatch[1].trim(), author: byMatch[2].trim() };
      }
      return { author: '', title: filename };
    }

    const parts = filename.split(' - ');

    // Single dash: could be Author - Title or Title - Author
    if (parts.length === 2) {
      const first = parts[0].trim();
      const second = parts[1].trim();

      const firstLooksLikeAuthor = this.looksLikeAuthor(first);
      const secondLooksLikeAuthor = this.looksLikeAuthor(second);

      // "The" is almost always a title word, not an author
      const firstStartsWithThe = /^the\s+/i.test(first);
      const secondStartsWithThe = /^the\s+/i.test(second);

      // Comma-separated or initials are strong author indicators
      const firstIsStrongAuthor = /^[A-Z][a-z]+,\s*[A-Z]|^[A-Z]\.[A-Z]\./.test(first);
      const secondIsStrongAuthor = /^[A-Z][a-z]+,\s*[A-Z]|^[A-Z]\.[A-Z]\./.test(second);

      // Prefer second if it's a strong author indicator
      if (secondIsStrongAuthor) {
        return { author: second, title: first };
      }

      // Prefer first if it's a strong author indicator and second starts with "The"
      if (firstIsStrongAuthor || (firstLooksLikeAuthor && secondStartsWithThe)) {
        return { author: first, title: second };
      }

      // If both look like authors, prefer the shorter one
      if (firstLooksLikeAuthor && secondLooksLikeAuthor) {
        if (first.length <= second.length) {
          return { author: first, title: second };
        } else {
          return { author: second, title: first };
        }
      }

      // Check if second part looks like an author
      if (secondLooksLikeAuthor) {
        return { author: second, title: first };
      }

      // Check if first part looks like author
      if (firstLooksLikeAuthor) {
        return { author: first, title: second };
      }

      // Default: first is author
      return { author: first, title: second };
    }

    // Multiple dashes: check for author in different positions
    const lastPart = parts[parts.length - 1].trim();
    const middlePart = parts.length >= 3 ? parts[1].trim() : '';
    
    // Strong author indicators (initials, comma-separated)
    const lastIsStrongAuthor = /^[A-Z]\s+[A-Z]\s+[A-Z]|^[A-Z][a-z]+,\s*[A-Z]/.test(lastPart);
    const middleIsStrongAuthor = middlePart && /^[A-Z]\s+[A-Z]\s+[A-Z]|^[A-Z][a-z]+,\s*[A-Z]/.test(middlePart);
    
    // Prefer last part if it's a strong author or looks like author
    if (lastIsStrongAuthor || this.looksLikeAuthor(lastPart)) {
      return {
        author: lastPart,
        title: parts.slice(0, -1).join(' - ')
      };
    }
    
    // Check middle part only if it's a strong author indicator
    if (parts.length >= 3 && middleIsStrongAuthor) {
      return {
        author: middlePart,
        title: [...parts.slice(0, 1), ...parts.slice(2)].join(' - ')
      };
    }

    // Check if first part is author
    const firstPart = parts[0].trim();
    if (this.looksLikeAuthor(firstPart)) {
      return {
        author: firstPart,
        title: parts.slice(1).join(' - ')
      };
    }

    // Fallback: treat as Author - Title
    return {
      author: parts[0].trim(),
      title: parts.slice(1).join(' - ')
    };
  }

  /**
   * Check if a string looks like an author name.
   */
  private static looksLikeAuthor(text: string): boolean {
    // Comma-separated: "LastName, FirstName"
    if (/^[A-Z][a-z]+,\s*[A-Z]/.test(text)) {
      return true;
    }

    // Single capitalized word (could be single-name author like "Madonna")
    if (/^[A-Z][a-z]+$/.test(text) && text.length >= 4) {
      return true;
    }

    // 2-4 word names: "John Smith", "J.K. Rowling", "Sarah Rees Brennan"
    const words = text.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      // All words start with capital, no numbers, reasonable length
      const allCap = words.every(w => /^[A-Z]/.test(w));
      const noNumbers = !/\d/.test(text);
      const shortEnough = text.length <= 40;

      if (allCap && noNumbers && shortEnough) {
        return true;
      }
    }

    return false;
  }

  /**
   * Normalize author name (handle comma-separated format).
   */
  private static normalizeAuthor(author: string): string {
    if (!author) return '';

    // "LastName, FirstName" → "FirstName LastName"
    const commaMatch = author.match(/^([^,]+),\s*(.+)$/);
    if (commaMatch) {
      return `${commaMatch[2].trim()} ${commaMatch[1].trim()}`;
    }

    return author.trim();
  }

  /**
   * Clean title by removing metadata parenthesized info.
   */
  private static cleanTitle(title: string): string {
    if (!title) return '';

    let cleaned = title.trim();

    // Remove (retail), (azw3), etc. metadata in parentheses
    cleaned = cleaned.replace(/\s*\((?:retail|azw3|epub|mobi|pdf|kf8 mobi|lrf|illustrated)\)\s*/gi, '');

    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }
}
