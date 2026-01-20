/**
 * NZB/Scene release filename parser.
 * Handles multiple formats:
 * - Hyphen-separated: "Author - Title (metadata)"
 * - Dot-separated scene releases: "Author.Title.Year.RETAIL.EPUB"
 * - Series formats: "Author - [Series XX] - Title"
 * - Multi-author: "Author1 & Author2 - Title"
 * 
 * Pattern detection uses confidence scoring to select best parse result.
 */

export interface NZBParsedMetadata {
  title: string;
  author: string;
  fileType: string;
}

interface ParseResult {
  author: string;
  title: string;
  confidence: number;
}

const VALID_EBOOK_TYPES = [
  'epub', 'mobi', 'azw3', 'azw', 'pdf', 'txt', 'doc', 'docx',
  'rtf', 'html', 'htm', 'fb2', 'lit', 'pdb', 'cbz', 'cbr'
];

export class NZBFilenameParser {
  /**
   * Parse an NZB/scene release filename to extract author, title, and file type.
   */
  static parse(filename: string): NZBParsedMetadata {
    if (!filename || filename.trim() === '') {
      return { title: '', author: '', fileType: 'unknown' };
    }

    // Decode HTML entities (e.g., &amp; -> &)
    const decodedFilename = this.decodeHtmlEntities(filename);

    // Extract file type first and clean filename
    const { type: fileType, cleanName } = this.extractFileType(decodedFilename);

    // Remove common suffixes/noise from filename
    const strippedName = this.stripMetadataNoise(cleanName);

    // Try to extract author and title using cascade of parsers
    const { author, title } = this.extractAuthorAndTitle(strippedName);

    return {
      title: this.cleanTitle(title),
      author: this.normalizeAuthor(author),
      fileType
    };
  }

  /**
   * Decode HTML entities in filename
   */
  private static decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  /**
   * Strip common metadata noise from filename before parsing
   */
  private static stripMetadataNoise(filename: string): string {
    let cleaned = filename;

    // Remove trailing suffixes like "repost", "WW", "[eCV]"
    cleaned = cleaned.replace(/\s+(repost|WW)$/i, '');
    cleaned = cleaned.replace(/\s+\[eCV\].*$/i, '');

    // Remove parenthetical metadata at the end
    // Match: (epub), (retail) (azw3), (2010), etc.
    cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/g, '');
    
    // Keep removing trailing parentheses until none left
    while (/\s*\([^)]*\)\s*$/.test(cleaned)) {
      cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/, '');
    }

    return cleaned.trim();
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

    // Priority 2: Embedded metadata (e.g., ".EPUB.eBook", "RETAIL.EPUB")
    const metadataMatch = filename.match(/\.(EPUB|PDF|MOBI|AZW3|AZW)\..*$/i);
    if (metadataMatch) {
      type = metadataMatch[1].toLowerCase();
      cleanName = filename.substring(0, filename.indexOf(metadataMatch[0]));
      return { type, cleanName };
    }

    // Priority 3: Uppercase embedded without dots
    const upperMatch = filename.match(/\b(EPUB|PDF|MOBI|AZW3|AZW)\b/i);
    if (upperMatch && VALID_EBOOK_TYPES.includes(upperMatch[1].toLowerCase())) {
      type = upperMatch[1].toLowerCase();
      cleanName = filename.replace(upperMatch[0], '').trim();
      return { type, cleanName };
    }

    // Priority 4: Bracketed [EPUB], [PDF]
    const bracketMatch = filename.match(/\[([A-Z0-9]+)\]/i);
    if (bracketMatch && VALID_EBOOK_TYPES.includes(bracketMatch[1].toLowerCase())) {
      type = bracketMatch[1].toLowerCase();
      cleanName = filename.replace(/\[.*?\]/g, '').trim();
      return { type, cleanName };
    }

    return { type: 'unknown', cleanName: filename };
  }

  /**
   * Extract author and title using cascade of parsers.
   * Returns best result based on confidence scoring.
   */
  private static extractAuthorAndTitle(filename: string): { author: string; title: string } {
    const results: ParseResult[] = [];

    // Try hyphen-separated parser first (most common for NZB)
    const hyphenResult = this.parseHyphenSeparated(filename);
    if (hyphenResult.confidence > 0) {
      results.push(hyphenResult);
    }

    // Try dot-separated scene release parser
    const dotResult = this.parseDotSeparated(filename);
    if (dotResult.confidence > 0) {
      results.push(dotResult);
    }

    // If no results, return empty
    if (results.length === 0) {
      return { author: '', title: filename };
    }

    // Sort by confidence and return best result
    results.sort((a, b) => b.confidence - a.confidence);
    const best = results[0];

    return { author: best.author, title: best.title };
  }

  /**
   * Parse hyphen-separated formats (e.g., "Author - Title", "Author - [Series] - Title")
   */
  private static parseHyphenSeparated(filename: string): ParseResult {
    // Check for " - " (space-hyphen-space) separator
    const hyphenCount = (filename.match(/ - /g) || []).length;
    
    if (hyphenCount === 0) {
      return { author: '', title: '', confidence: 0 };
    }

    // Split by " - "
    const segments = filename.split(' - ');

    // Filter out bracketed segments (series info like [Mistborn 04])
    const nonBracketedSegments = segments.filter(seg => !seg.match(/^\[.*\]$/));

    if (nonBracketedSegments.length === 1) {
      // Only one segment, treat as title
      return { author: '', title: nonBracketedSegments[0], confidence: 0.3 };
    }

    if (nonBracketedSegments.length === 2) {
      // Two segments: could be "Author - Title" or "Title - Author"
      const [first, second] = nonBracketedSegments;

      // Check if first segment looks like an author
      const firstIsAuthor = this.looksLikeAuthor(first);
      const secondIsAuthor = this.looksLikeAuthor(second);

      if (firstIsAuthor && !secondIsAuthor) {
        // "Author - Title"
        const author = this.extractAuthorFromSegment(first);
        return { author, title: second, confidence: 0.9 };
      } else if (!firstIsAuthor && secondIsAuthor) {
        // "Title - Author"
        const author = this.extractAuthorFromSegment(second);
        return { author, title: first, confidence: 0.8 };
      } else if (firstIsAuthor && secondIsAuthor) {
        // Both look like authors, need to determine which is more likely
        // Strong author indicators (high priority):
        // - Has comma (e.g., "Sanderson, Brandon")
        // - 2 simple capitalized words (e.g., "Stephen King")
        // 
        // Title indicators (deprioritize as author):
        // - Contains hyphens within words (e.g., "Mistborn-The Final Empire")
        // - More than 3 words
        
        const firstHasComma = /,/.test(first);
        const secondHasComma = /,/.test(second);
        const firstHasInternalHyphen = /[a-z]-[A-Z]/.test(first); // e.g., "Mistborn-The"
        const secondHasInternalHyphen = /[a-z]-[A-Z]/.test(second);
        
        // If first has comma, it's definitely the author
        if (firstHasComma) {
          const author = this.extractAuthorFromSegment(first);
          return { author, title: second, confidence: 0.9 };
        }
        
        // If second has comma and first doesn't, second is author
        if (secondHasComma && !firstHasComma) {
          const author = this.extractAuthorFromSegment(second);
          return { author, title: first, confidence: 0.85 };
        }
        
        // If second has internal hyphens (like "Mistborn-The"), it's likely a title
        if (secondHasInternalHyphen && !firstHasInternalHyphen) {
          const author = this.extractAuthorFromSegment(first);
          return { author, title: second, confidence: 0.85 };
        }
        
        // Word count comparison (for simple cases like "Later" vs "Stephen King")
        const firstWordCount = first.trim().split(/\s+/).length;
        const secondWordCount = second.trim().split(/\s+/).length;
        
        if (secondWordCount === 2 && firstWordCount === 1 && !secondHasInternalHyphen) {
          // Second is a 2-word name, first is single word -> second is likely author
          const author = this.extractAuthorFromSegment(second);
          return { author, title: first, confidence: 0.75 };
        }
        
        // Default: first segment is author
        const author = this.extractAuthorFromSegment(first);
        return { author, title: second, confidence: 0.7 };
      } else {
        // Neither looks like author, first is probably title
        return { author: '', title: first, confidence: 0.4 };
      }
    }

    if (nonBracketedSegments.length >= 3) {
      // Three or more segments
      // Common patterns:
      // - "Prefix - Author - Title" (skip prefix)
      // - "Author - Series XX - Title" (first is author, filter middle series, last is title)
      // - "Series - Title - Author" (last is author)

      const first = nonBracketedSegments[0];
      const middle = nonBracketedSegments.slice(1, -1);
      const last = nonBracketedSegments[nonBracketedSegments.length - 1];

      // Check if first is a prefix to skip
      if (this.isPrefix(first)) {
        // Skip first segment
        const remaining = nonBracketedSegments.slice(1);
        if (remaining.length >= 2) {
          const author = this.extractAuthorFromSegment(remaining[0]);
          const title = remaining.slice(1).join(' - ');
          return { author, title, confidence: 0.85 };
        }
      }

      // PRIORITIZE: Check if first is author (most common pattern)
      // This should be checked BEFORE checking if last is author
      // Pattern: "Author - Series XX - Title" or "LastName, FirstName - Series - Title"
      if (this.looksLikeAuthor(first)) {
        const author = this.extractAuthorFromSegment(first);
        // Filter out middle segments that are series names with numbers
        // e.g., "Harry Potter 08", "Holly Gibney 04", "Darktower 5"
        const titleSegments = nonBracketedSegments.slice(1).filter(seg => {
          // Keep segment if it doesn't match "Series Name Number" pattern
          return !/^.+\s+\d+$/.test(seg.trim());
        });
        const title = titleSegments.join(' - ');
        return { author, title, confidence: 0.8 };
      }

      // Check if last segment is author (less common: "Title - Author")
      if (this.looksLikeAuthor(last)) {
        const author = this.extractAuthorFromSegment(last);
        const title = nonBracketedSegments.slice(0, -1).join(' - ');
        return { author, title, confidence: 0.75 };
      }

      // Default: first is author, rest is title (joining middle segments back)
      const author = this.extractAuthorFromSegment(first);
      const title = nonBracketedSegments.slice(1).join(' - ');
      return { author, title, confidence: 0.7 };
    }

    return { author: '', title: filename, confidence: 0.2 };
  }

  /**
   * Check if a segment looks like an author name
   */
  private static looksLikeAuthor(segment: string): boolean {
    const trimmed = segment.trim();

    // Check for "LastName, FirstName" pattern
    if (/^[A-Z][a-z]+,\s*[A-Z]/.test(trimmed)) {
      return true;
    }

    // Check for "FirstName LastName" pattern (2-3 capitalized words)
    const words = trimmed.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      const capitalizedWords = words.filter(w => 
        /^[A-Z][a-z]+/.test(w) || // Regular capitalized word
        /^[A-Z]\.$/.test(w) ||    // Initial with period (J.)
        /^[A-Z]$/.test(w)          // Single letter (J)
      );
      if (capitalizedWords.length === words.length) {
        return true;
      }
    }

    // Single capitalized word might be author (e.g., "Author" in test cases)
    // But this is weak evidence, so return true cautiously
    if (words.length === 1 && /^[A-Z][a-z]+$/.test(trimmed)) {
      // Could be author, but need more context - check if it's a common single name
      // or if it appears to be an author's last name
      return true;
    }

    // Check for multi-author patterns with "&" or "and"
    if (/\s+(&|and)\s+/.test(trimmed)) {
      return true;
    }

    return false;
  }

  /**
   * Check if segment is a prefix to skip (e.g., "Hugo 2001 Winner Novel")
   */
  private static isPrefix(segment: string): boolean {
    const prefixKeywords = [
      'hugo', 'nominee', 'winner', 'award', 'collection', 'mega',
      'official', 'unofficial', 'novel', 'orbit', 'bbc'
    ];

    const lower = segment.toLowerCase();
    return prefixKeywords.some(keyword => lower.includes(keyword));
  }

  /**
   * Extract author from segment, handling various formats
   */
  private static extractAuthorFromSegment(segment: string): string {
    let author = segment.trim();

    // Handle "LastName, FirstName" format -> "FirstName LastName"
    const commaMatch = author.match(/^([^,]+),\s*(.+)$/);
    if (commaMatch) {
      author = `${commaMatch[2].trim()} ${commaMatch[1].trim()}`;
    }

    // Handle multi-author with "&" or "and"
    // Extract first author only (as per requirements)
    // Use word boundaries to ensure "and" is a standalone word, not part of "Sanderson"
    const multiAuthorMatch = author.match(/^(.+?)\s+(&|and)\s+/i);
    if (multiAuthorMatch) {
      author = multiAuthorMatch[1].trim();
    }

    // Handle "(ed)" marker
    author = author.replace(/\s*\(ed\)\s*/i, '').trim();

    // Detect reversed name pattern "King Stephen" -> "Stephen King"
    author = this.detectAndFixReversedName(author);

    return author;
  }

  /**
   * Detect reversed author names (e.g., "King Stephen" -> "Stephen King")
   */
  private static detectAndFixReversedName(name: string): string {
    const words = name.split(/\s+/);
    
    // Only check if exactly 2 words
    if (words.length !== 2) {
      return name;
    }

    const [first, second] = words;

    // Check if both words are capitalized and look like names
    const firstCapitalized = /^[A-Z][a-z]+$/.test(first);
    const secondCapitalized = /^[A-Z][a-z]+$/.test(second);

    if (!firstCapitalized || !secondCapitalized) {
      return name;
    }

    // Common last names that appear first in reversed format
    const commonLastNames = [
      'king', 'rowling', 'sanderson', 'martin', 'tolkien', 
      'christie', 'wilde', 'austen', 'hemingway', 'fitzgerald'
    ];

    if (commonLastNames.includes(first.toLowerCase())) {
      // Likely reversed: "King Stephen" -> "Stephen King"
      return `${second} ${first}`;
    }

    // Default: keep original order
    return name;
  }

  /**
   * Parse dot-separated scene release format
   */
  private static parseDotSeparated(filename: string): ParseResult {
    // Check for "by Author" pattern first (dot-separated)
    const byMatch = filename.match(/^(.+?)\.by\.(.+)$/i);
    if (byMatch) {
      const title = byMatch[1].replace(/\./g, ' ').trim();
      const author = byMatch[2].replace(/\./g, ' ').trim();
      return { author, title, confidence: 0.9 };
    }

    // Check for dot-hyphen format: Author.Name-Title.Words
    // e.g., "Stephen.King-Never.Flinch.A.Novel.2025.RETAIL.EPUB"
    // BUT: Also check for Publisher.Name-Title patterns (e.g., "Gallery.Books-The.End...")
    const dotHyphenMatch = filename.match(/^([^-]+)-(.+)$/);
    if (dotHyphenMatch) {
      const beforeHyphen = dotHyphenMatch[1];
      const afterHyphen = dotHyphenMatch[2];
      
      // Check if beforeHyphen looks like an author (contains dots)
      if (beforeHyphen.includes('.')) {
        const potentialAuthor = beforeHyphen.replace(/\./g, ' ').trim();
        // Check if it looks like a name
        const words = potentialAuthor.split(/\s+/);
        
        // Known publisher patterns (2-word publishers)
        const publisherPatterns = [
          'insight editions',
          'gallery books',
          'simon schuster',
          'del rey',
          'tor books',
          'bantam books',
          'penguin books'
        ];
        
        const lowerPotentialAuthor = potentialAuthor.toLowerCase();
        const isPublisher = publisherPatterns.some(pub => lowerPotentialAuthor.includes(pub));
        
        if (words.length === 2 && words.every(w => /^[A-Z][a-z]+/.test(w)) && !isPublisher) {
          // Likely "FirstName.LastName-Title..." (not a publisher)
          const titleParts = afterHyphen.split(/\./);
          const filteredTitleParts = titleParts.filter(part => {
            const lower = part.toLowerCase();
            return !['retail', 'epub', 'pdf', 'mobi', 'azw3', 'azw', 'ebook', 'novel'].includes(lower) &&
                   !/^\d{4}$/.test(part) && part.length > 1;
          });
          return {
            author: potentialAuthor,
            title: filteredTitleParts.join(' '),
            confidence: 0.8
          };
        }
      }
    }

    // Check for collection format with multiple hyphens: "Collection-Author-Title"
    // e.g., "PoF.eBook.Mega.Collection-Stephen.King-The.Shining"
    const multiHyphenMatch = filename.match(/^(.+?)-([^-]+)-([^-]+)$/);
    if (multiHyphenMatch) {
      const [, prefix, middle, suffix] = multiHyphenMatch;
      
      // Check if prefix contains collection/publisher keywords
      const prefixLower = prefix.toLowerCase();
      if (prefixLower.includes('collection') || prefixLower.includes('mega') || prefixLower.includes('pof')) {
        // This is likely: Collection-Author-Title
        const potentialAuthor = middle.replace(/\./g, ' ').trim();
        const potentialTitle = suffix.replace(/\./g, ' ').trim();
        
        // Clean metadata from title
        const titleWords = potentialTitle.split(/\s+/).filter(word => {
          const lower = word.toLowerCase();
          return !['retail', 'epub', 'pdf', 'mobi', 'azw3', 'ebook'].includes(lower) &&
                 !/^\d{4}$/.test(word);
        });
        
        return {
          author: potentialAuthor,
          title: titleWords.join(' '),
          confidence: 0.75
        };
      }
    }

    // Check if this is dot-separated (scene release format)
    const dotCount = (filename.match(/\./g) || []).length;
    if (dotCount < 3) {
      // Not enough dots, probably not a scene release
      return { author: '', title: '', confidence: 0 };
    }

    // Remove release group suffix (e.g., "-BitBook")
    let cleaned = filename.replace(/-[A-Z][a-zA-Z]+$/, '');

    // Split on dots and hyphens
    const parts = cleaned.split(/[.\-]/);

    // Metadata keywords to filter out
    const metadataKeywords = [
      'retail', 'ebook', 'swedish', 'english', 'retial', 'retaιl',
      'epub', 'pdf', 'mobi', 'azw3', 'azw', 'hybrid', 'magazine'
    ];

    // Filter out metadata tokens
    const filteredParts: string[] = [];
    for (const part of parts) {
      // Skip years
      if (/^\d{4}$/.test(part)) continue;

      // Skip metadata keywords (case insensitive)
      if (metadataKeywords.includes(part.toLowerCase())) continue;

      // Skip single letters
      if (part.length <= 1) continue;

      // Skip "Vol" followed by numbers
      if (/^vol$/i.test(part)) continue;

      // Skip number-only parts like "03", "07"
      if (/^\d+$/.test(part)) continue;

      filteredParts.push(part);
    }

    if (filteredParts.length === 0) {
      return { author: '', title: cleaned.replace(/\./g, ' '), confidence: 0.3 };
    }

    // Known publishers (filter these out)
    const publisherIndicators = ['insight', 'editions', 'simon', 'schuster', 'gallery', 'books', 'pof'];

    // Filter out publishers
    const nonPublisherParts = filteredParts.filter(part =>
      !publisherIndicators.includes(part.toLowerCase())
    );

    if (nonPublisherParts.length === 0) {
      return { author: '', title: cleaned.replace(/\./g, ' '), confidence: 0.3 };
    }

    // Common title-starting words that indicate no author present
    const titleStartWords = ['the', 'a', 'an', 'harry', 'unofficial', 'official'];

    // Check if first word is a title-start indicator
    if (nonPublisherParts.length > 0 && titleStartWords.includes(nonPublisherParts[0].toLowerCase())) {
      // No author, everything is title
      return { author: '', title: nonPublisherParts.join(' '), confidence: 0.6 };
    }

    // Look for author patterns
    let authorParts: string[] = [];
    let titleStart = 0;

    // Check first few parts for author pattern
    for (let i = 0; i < Math.min(6, nonPublisherParts.length); i++) {
      const part = nonPublisherParts[i];
      const lowerPart = part.toLowerCase();

      // Found "And" after 2-3 names, likely multi-author
      if (lowerPart === 'and' && authorParts.length >= 2 && authorParts.length <= 3) {
        authorParts.push(part);
        titleStart = i + 1;
        continue;
      }

      // After "And", collect next 1-2 author names
      if (authorParts.length > 0 && authorParts[authorParts.length - 1].toLowerCase() === 'and') {
        if (/^[A-Z]/.test(part) && part.length > 2) {
          authorParts.push(part);
          titleStart = i + 1;
          // Check if there's one more name part
          if (i + 1 < nonPublisherParts.length) {
            const nextPart = nonPublisherParts[i + 1];
            if (/^[A-Z]/.test(nextPart) && nextPart.length > 2 && nextPart.toLowerCase() !== 'the') {
              authorParts.push(nextPart);
              titleStart = i + 2;
              i++; // Skip next iteration
            }
          }
        }
        break; // Done collecting second author
      }
      // First few capitalized words might be author
      else if (authorParts.length < 3 && /^[A-Z]/.test(part) && part.length > 2 && !titleStartWords.includes(lowerPart)) {
        authorParts.push(part);
        titleStart = i + 1;
      } else {
        break; // Stop looking for author
      }
    }

    // Only treat as author if we have a clear pattern:
    // - Contains "And" connector (multi-author)
    // - OR exactly 2 names followed by "The" or similar title word
    const hasAnd = authorParts.some(p => p.toLowerCase() === 'and');
    const nextWordIsTitle = titleStart < nonPublisherParts.length && 
                           titleStartWords.includes(nonPublisherParts[titleStart]?.toLowerCase());
    const hasClearAuthor = hasAnd || (authorParts.length === 2 && nextWordIsTitle);

    if (!hasClearAuthor) {
      // No clear author, treat everything as title
      return { author: '', title: nonPublisherParts.join(' '), confidence: 0.4 };
    }

    const author = authorParts.join(' ');
    const titleParts = nonPublisherParts.slice(titleStart);
    const title = titleParts.length > 0 ? titleParts.join(' ') : '';

    return { author, title: title || nonPublisherParts.join(' '), confidence: 0.7 };
  }

  /**
   * Normalize author name.
   */
  private static normalizeAuthor(author: string): string {
    if (!author) return '';
    return author.trim();
  }

  /**
   * Clean title by removing metadata and converting dots to spaces.
   */
  private static cleanTitle(title: string): string {
    if (!title) return '';

    let cleaned = title.trim();

    // Remove years (already filtered in extraction, but just in case)
    cleaned = cleaned.replace(/\b(19|20)\d{2}\b/g, '');

    // Remove metadata keywords
    const metadataKeywords = [
      'RETAIL', 'Retail', 'retail',
      'eBook', 'ebook', 'EBOOK',
      'EPUB', 'PDF', 'MOBI', 'AZW3', 'AZW',
      'ePub', 'Pdf',
      'RETAiL', 'SWEDiSH', 'ENGLiSH'
    ];

    for (const keyword of metadataKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    }

    // Remove release group suffix patterns
    cleaned = cleaned.replace(/-[A-Z][a-zA-Z]+$/, '');

    // Convert dots to spaces if still present
    cleaned = cleaned.replace(/\./g, ' ');

    // Clean up multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove leading/trailing dots or dashes
    cleaned = cleaned.replace(/^[.\-\s]+|[.\-\s]+$/g, '');

    return cleaned;
  }
}
