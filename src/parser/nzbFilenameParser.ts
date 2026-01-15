/**
 * NZB/Scene release filename parser.
 * Optimized for dot-separated scene release formats.
 * 
 * Common patterns:
 * - Publisher.Author.Title.Year.Metadata-Group
 * - Author.Title.Year.Metadata.ePub-Group
 * - The.Official.Title.Year-Group
 */

export interface NZBParsedMetadata {
  title: string;
  author: string;
  fileType: string;
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

    // Extract file type first
    const { type: fileType, cleanName } = this.extractFileType(filename);

    // Try to extract author and title from dot-separated format
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
   * Extract author and title from dot-separated scene format.
   */
  private static extractAuthorAndTitle(filename: string): { author: string; title: string } {
    // Check for "by Author" pattern first (dot-separated)
    const byMatch = filename.match(/^(.+?)\.by\.(.+)$/i);
    if (byMatch) {
      const title = byMatch[1].replace(/\./g, ' ').trim();
      const author = byMatch[2].replace(/\./g, ' ').trim();
      return { title, author };
    }

    // Check if this is dot-separated (scene release format)
    const dotCount = (filename.match(/\./g) || []).length;
    if (dotCount < 3) {
      // Not enough dots, probably not a scene release
      return { author: '', title: filename };
    }

    // Remove release group suffix (e.g., "-BitBook")
    let cleaned = filename.replace(/-[A-Z][a-zA-Z]+$/, '');

    // Split on dots and hyphens
    const parts = cleaned.split(/[.\-]/);

    // Metadata keywords to filter out
    const metadataKeywords = [
      'retail', 'ebook', 'swedish', 'english', 'retial', 'retaιl'
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
      return { author: '', title: cleaned.replace(/\./g, ' ') };
    }

    // Known publishers (filter these out)
    const publisherIndicators = ['insight', 'editions', 'simon', 'schuster'];

    // Filter out publishers
    const nonPublisherParts = filteredParts.filter(part =>
      !publisherIndicators.includes(part.toLowerCase())
    );

    if (nonPublisherParts.length === 0) {
      return { author: '', title: cleaned.replace(/\./g, ' ') };
    }

    // Common title-starting words that indicate no author present
    const titleStartWords = ['the', 'a', 'an', 'harry', 'unofficial', 'official'];

    // Check if first word is a title-start indicator
    if (nonPublisherParts.length > 0 && titleStartWords.includes(nonPublisherParts[0].toLowerCase())) {
      // No author, everything is title
      return { author: '', title: nonPublisherParts.join(' ') };
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
      return { author: '', title: nonPublisherParts.join(' ') };
    }

    const author = authorParts.join(' ');
    const titleParts = nonPublisherParts.slice(titleStart);
    const title = titleParts.length > 0 ? titleParts.join(' ') : '';

    return { author, title: title || nonPublisherParts.join(' ') };
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
