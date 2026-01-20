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

const ARCHIVE_TYPES = [
  'rar', 'zip', '7z', 'tar', 'gz', 'bz2'
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

    // Remove series information before parsing
    const withoutSeries = this.removeSeriesInfo(cleanName);

    // Try to extract author and title
    const { author, title } = this.extractAuthorAndTitle(withoutSeries);

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
    if (extMatch) {
      const ext = extMatch[1].toLowerCase();
      
      // Check if it's an archive type
      if (ARCHIVE_TYPES.includes(ext)) {
        type = 'archive';
        cleanName = filename.substring(0, filename.lastIndexOf('.'));
        return { type, cleanName };
      }
      
      // Check if it's an ebook type
      if (VALID_EBOOK_TYPES.includes(ext)) {
        type = ext;
        cleanName = filename.substring(0, filename.lastIndexOf('.'));
        return { type, cleanName };
      }
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
   * Remove series information from filename.
   * Patterns: [Series XX], [Series XX-XX], (Series XX), etc.
   * But preserve parenthesized series info if it contains commas (likely part of title).
   */
  private static removeSeriesInfo(filename: string): string {
    let cleaned = filename;

    // Remove bracketed series: [Mistborn 01], [Mistborn 01-03], [Series Name 123]
    // Keep the series name but remove the number notation
    cleaned = cleaned.replace(/\[([^\]]*?)\s*\d+(?:-\d+)?\]/g, '');
    
    // Remove parenthesized series: (Mistborn 01), (Series 02)
    // BUT preserve if it contains a comma (likely part of title like "Book Title (Series, Book X)")
    cleaned = cleaned.replace(/\(([^),]*?)\s*\d+(?:-\d+)?\)/g, (match, content) => {
      // If the parentheses contain a comma, keep them
      if (match.includes(',')) {
        return match;
      }
      return '';
    });
    
    // Clean up any double spaces or dashes left behind
    cleaned = cleaned.replace(/\s+-\s+-\s+/g, ' - ');
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    
    // Remove leading/trailing dashes or spaces
    cleaned = cleaned.replace(/^[\s\-]+|[\s\-]+$/g, '');
    
    return cleaned.trim();
  }

  /**
   * Extract author and title from cleaned filename.
   */
  private static extractAuthorAndTitle(filename: string): { author: string; title: string } {
    // No dash separator - check for special patterns first
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

      // Check for strong author indicators first
      const firstIsCommaName = /^[A-Z][a-z]+,\s*[A-Z]/.test(first);
      const secondIsCommaName = /^[A-Z][a-z]+,\s*[A-Z]/.test(second);
      const firstIsInitials = /^[A-Z]\.[A-Z]\.?\s+[A-Z][a-z]+/.test(first);
      const secondIsInitials = /^[A-Z]\.[A-Z]\.?\s+[A-Z][a-z]+/.test(second);

      // Strong indicator: comma-separated name or initials pattern
      if ((firstIsCommaName || firstIsInitials) && !secondIsCommaName && !secondIsInitials) {
        return { author: first, title: second };
      }
      if ((secondIsCommaName || secondIsInitials) && !firstIsCommaName && !firstIsInitials) {
        return { author: second, title: first };
      }

      const firstLooksLikeAuthor = this.looksLikeAuthor(first);
      const secondLooksLikeAuthor = this.looksLikeAuthor(second);

      // "The" is almost always a title word, not an author
      const firstStartsWithThe = /^the\s+/i.test(first);
      const secondStartsWithThe = /^the\s+/i.test(second);

      // Prefer second if it looks like author and first starts with "The"
      if (secondLooksLikeAuthor && firstStartsWithThe) {
        return { author: second, title: first };
      }

      // Prefer first if it looks like author and second starts with "The"
      if (firstLooksLikeAuthor && secondStartsWithThe) {
        return { author: first, title: second };
      }

      // If both look like authors, prefer the FIRST as author
      // IRC format is typically "Author - Title", so first part is usually the author
      if (firstLooksLikeAuthor && secondLooksLikeAuthor) {
        return { author: first, title: second };
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
    // Priority 1: Check first part for comma-separated name (strong author indicator)
    const firstPart = parts[0].trim();
    const lastPart = parts[parts.length - 1].trim();
    
    const firstIsCommaName = /^[A-Z][a-z]+,\s*[A-Z]/.test(firstPart);
    const firstIsInitials = /^[A-Z]\.[A-Z]\.?\s+[A-Z][a-z]+/.test(firstPart);
    const firstLooksLikeAuthor = this.looksLikeAuthor(firstPart);
    const lastLooksLikeAuthor = this.looksLikeAuthor(lastPart);
    
    // Strong author indicator: comma-separated name
    if (firstIsCommaName) {
      return {
        author: firstPart,
        title: parts.slice(1).join(' - ')
      };
    }

    // If first part is initials + name or a known author pattern, prefer it
    // even if last part also looks like author
    if ((firstIsInitials || firstLooksLikeAuthor) && !firstPart.startsWith('The ')) {
      // But only if the last part also looks like it could be part of the title
      // (e.g., "Secret History" could be title or author - ambiguous)
      if (lastLooksLikeAuthor && parts.length === 3) {
        // Special case: 3 parts where first and last both look like authors
        // Check if middle part looks like a title (e.g., "Mistborn")
        const middlePart = parts[1].trim();
        // If middle part is a single capitalized word, it's likely a title/series
        if (/^[A-Z][a-z]+$/.test(middlePart)) {
          return {
            author: firstPart,
            title: parts.slice(1).join(' - ')
          };
        }
      }
      // Default: first part is author
      return {
        author: firstPart,
        title: parts.slice(1).join(' - ')
      };
    }

    // Priority 2: Check last part for author (common in IRC: Title - Subtitle - Author)
    if (lastLooksLikeAuthor) {
      return {
        author: lastPart,
        title: parts.slice(0, -1).join(' - ')
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

    // Initials with dots: "J.K. Rowling", "A.B. Smith"
    if (/^[A-Z]\.[A-Z]\.?\s+[A-Z][a-z]+/.test(text)) {
      return true;
    }

    // Single capitalized word (could be single-name author like "Madonna")
    if (/^[A-Z][a-z]+$/.test(text) && text.length >= 4) {
      return true;
    }

    // 2-4 word names: "John Smith", "Sarah Rees Brennan"
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

    // Remove empty parentheses: (), () (), () () ()
    cleaned = cleaned.replace(/\(\s*\)/g, '');

    // Remove (retail), (azw3), etc. metadata in parentheses
    cleaned = cleaned.replace(/\s*\((?:retail|azw3|epub|mobi|pdf|kf8 mobi|lrf|illustrated|ebook|uk|us)\)\s*/gi, '');

    // Remove standalone years in parentheses: (2020), (2023)
    cleaned = cleaned.replace(/\s*\(\d{4}\)\s*/g, '');

    // Clean up whitespace and multiple dashes
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/\s*-\s*-\s*/g, ' - ');
    
    // Remove leading/trailing dashes or spaces
    cleaned = cleaned.replace(/^[\s\-]+|[\s\-]+$/g, '');

    return cleaned;
  }
}
