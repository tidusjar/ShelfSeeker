/**
 * Unified ebook filename parser with multi-strategy extraction.
 * Handles inconsistent filename formats from IRC and NZB sources.
 */

import { strategies } from './parsingStrategies.js';

/**
 * Valid ebook file types recognized by the parser.
 */
const VALID_EBOOK_TYPES = [
  'epub', 'mobi', 'azw3', 'azw', 'pdf', 'txt', 'doc', 'docx',
  'rtf', 'html', 'htm', 'fb2', 'lit', 'pdb', 'cbz', 'cbr'
];

/**
 * Metadata parsed from an ebook filename.
 */
export interface ParsedMetadata {
  title: string;
  author: string;
  fileType: string;
  confidence: 'high' | 'medium' | 'low';
  strategy: string;
}

/**
 * Main filename parser class that orchestrates parsing strategies.
 */
export class FilenameParser {
  /**
   * Parse an ebook filename to extract author, title, and file type.
   * Uses a fallback chain of parsing strategies ordered by confidence.
   *
   * @param filename - The filename to parse (with or without extension)
   * @returns Parsed metadata with best-effort extraction
   *
   * @example
   * ```typescript
   * const result = FilenameParser.parse('J K Rowling - Harry Potter.epub');
   * // { title: 'Harry Potter', author: 'J K Rowling', fileType: 'epub', ... }
   * ```
   */
  static parse(filename: string): ParsedMetadata {
    if (!filename || filename.trim() === '') {
      return {
        title: '',
        author: '',
        fileType: 'unknown',
        confidence: 'low',
        strategy: 'empty-input'
      };
    }

    // Step 1: Extract file type and get cleaned filename
    const { type: fileType, cleanName } = this.extractFileType(filename);

    // Step 2: Try each parsing strategy in order
    for (const strategy of strategies) {
      if (!strategy.matches(cleanName)) {
        continue;
      }

      const result = strategy.parse(cleanName);
      if (result) {
        // Step 3: Normalize and clean the extracted data
        const author = this.normalizeAuthorName(result.author);
        const title = this.cleanTitle(result.title);

        return {
          title,
          author,
          fileType,
          confidence: strategy.confidence,
          strategy: strategy.name
        };
      }
    }

    // Fallback: return cleaned filename as title
    return {
      title: this.cleanTitle(cleanName),
      author: '',
      fileType,
      confidence: 'low',
      strategy: 'fallback'
    };
  }

  /**
   * Extract file type from extension or embedded metadata.
   * Supports multiple formats: extensions, brackets, parentheses, embedded text.
   *
   * Priority order:
   * 1. File extension (.epub, .mobi, etc.)
   * 2. Bracketed format [EPUB], [PDF]
   * 3. Parenthesized format (epub), (mobi)
   * 4. Embedded in metadata (RETAIL.EPUB.eBook)
   *
   * @param filename - The filename to extract type from
   * @returns Object with file type and cleaned filename
   *
   * @example
   * ```typescript
   * extractFileType('Book.Title.2020.RETAIL.ePub.eBook-BitBook')
   * // { type: 'epub', cleanName: 'Book.Title.2020.RETAIL.eBook-BitBook' }
   * ```
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

    // Priority 2: Bracketed [EPUB], [PDF]
    const bracketMatch = filename.match(/\[([A-Z0-9]+)\]/i);
    if (bracketMatch && VALID_EBOOK_TYPES.includes(bracketMatch[1].toLowerCase())) {
      type = bracketMatch[1].toLowerCase();
      cleanName = filename.replace(/\[.*?\]/g, '').trim();
      return { type, cleanName };
    }

    // Priority 3: Parenthesized (epub), (mobi)
    const parenMatches = filename.matchAll(/\(([^)]+)\)/g);
    for (const match of parenMatches) {
      const content = match[1].toLowerCase().trim();
      if (VALID_EBOOK_TYPES.includes(content)) {
        type = content;
        cleanName = filename.replace(/\([^)]*\)/g, '').trim();
        return { type, cleanName };
      }
    }

    // Priority 4: Embedded metadata (e.g., ".EPUB.eBook", "RETAIL.EPUB")
    const metadataMatch = filename.match(/\.(EPUB|PDF|MOBI|AZW3|AZW)\..*$/i);
    if (metadataMatch) {
      type = metadataMatch[1].toLowerCase();
      cleanName = filename.substring(0, filename.indexOf(metadataMatch[0]));
      return { type, cleanName };
    }

    // Also check for uppercase embedded without dots
    const upperMatch = filename.match(/\b(EPUB|PDF|MOBI|AZW3|AZW)\b/i);
    if (upperMatch && VALID_EBOOK_TYPES.includes(upperMatch[1].toLowerCase())) {
      type = upperMatch[1].toLowerCase();
      cleanName = filename.replace(upperMatch[0], '').trim();
      return { type, cleanName };
    }

    // No file type found
    return { type: 'unknown', cleanName: filename };
  }

  /**
   * Normalize author name format to standard "First Last" or "I.N. Last".
   * Handles various input formats:
   * - "Rowling, J.K." → "J.K. Rowling"
   * - "J.K.Rowling" → "J.K. Rowling"
   * - "Rowling.J.K" → "J.K. Rowling"
   *
   * @param author - The author name to normalize
   * @returns Normalized author name
   *
   * @example
   * ```typescript
   * normalizeAuthorName('Rowling, J.K.')  // "J.K. Rowling"
   * normalizeAuthorName('J.K.Rowling')    // "J.K. Rowling"
   * ```
   */
  private static normalizeAuthorName(author: string): string {
    if (!author) return '';

    let normalized = author.trim();

    // Pattern 1: "Rowling, J.K." → "J.K. Rowling"
    const commaMatch = normalized.match(/^([^,]+),\s*(.+)$/);
    if (commaMatch) {
      normalized = `${commaMatch[2].trim()} ${commaMatch[1].trim()}`;
    }

    // Pattern 2: "J.K.Rowling" (initials stuck to name) → "J.K. Rowling"
    // Match pattern like A.B.Lastname or A.B.C.Lastname
    normalized = normalized.replace(/^((?:[A-Z]\.)+)([A-Z][a-z]+)/, '$1 $2');

    // Pattern 3: "Rowling.J.K" or similar dot-separated → "J.K. Rowling" or keep as is
    // Only convert dots to spaces if it's not an initial pattern
    if (normalized.includes('.') && !/^[A-Z]\.[A-Z]\./.test(normalized)) {
      // Check if it looks like "LastName.FirstName" format
      const parts = normalized.split('.');
      if (parts.length === 2 && parts[0].length > 2 && parts[1].length >= 1) {
        // Likely "Rowling.J" or "Rowling.JK" → "J Rowling" or "JK Rowling"
        normalized = `${parts[1]} ${parts[0]}`;
      } else if (parts.length >= 2) {
        // General dot-separated name → space-separated
        normalized = parts.join(' ');
      }
    }

    // Clean up multiple spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Clean title by removing metadata, release groups, and other noise.
   * Preserves series numbers in brackets.
   *
   * Removes:
   * - Years in parentheses (2023)
   * - Metadata keywords (RETAIL, eBook, EPUB, etc.)
   * - Release group suffixes (-BitBook, -CTO)
   * - Excessive dots (converts to spaces)
   *
   * @param title - The title to clean
   * @returns Cleaned title string
   *
   * @example
   * ```typescript
   * cleanTitle('Harry.Potter.2020.RETAIL.eBook-BitBook')
   * // "Harry Potter"
   * ```
   */
  private static cleanTitle(title: string): string {
    if (!title) return '';

    let cleaned = title.trim();

    // Remove year in parentheses: (2023), (2020)
    cleaned = cleaned.replace(/\(\d{4}\)/g, '');

    // Remove standalone years: "2020", "2021" (but not part of larger numbers)
    cleaned = cleaned.replace(/\b(19|20)\d{2}\b/g, '');

    // Remove metadata keywords (case insensitive)
    const metadataKeywords = [
      'RETAIL', 'Retail', 'retail',
      'eBook', 'ebook', 'EBOOK',
      'EPUB', 'PDF', 'MOBI', 'AZW3', 'AZW',
      'ePub', 'Pdf',
      'RETAiL', 'SWEDiSH', 'ENGLiSH'
    ];

    for (const keyword of metadataKeywords) {
      // Remove as whole word
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    }

    // Remove release group suffix: "-BitBook", "-CTO", "-DECiPHER"
    cleaned = cleaned.replace(/-[A-Z][a-zA-Z]+$/, '');

    // Remove bracketed metadata except series numbers
    // Keep: [Harry Potter 07], [Book 1]
    // Remove: [retail], [epub]
    cleaned = cleaned.replace(/\[(?!\d)(?!.*\d{1,2})[^\]]+\]/g, '');

    // Remove parenthesized metadata that's not part of title
    // Be conservative - only remove if it looks like metadata
    cleaned = cleaned.replace(/\((?:retail|epub|pdf|mobi|ebook|uk|us)\)/gi, '');

    // Convert dots to spaces if title is primarily dot-separated
    const dotCount = (cleaned.match(/\./g) || []).length;
    const spaceCount = (cleaned.match(/\s/g) || []).length;

    if (dotCount > spaceCount && dotCount >= 3) {
      cleaned = cleaned.replace(/\./g, ' ');
    }

    // Remove leading/trailing dots or dashes
    cleaned = cleaned.replace(/^[.\-\s]+|[.\-\s]+$/g, '');

    // Clean up multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Decode HTML entities if present
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/&quot;/g, '"');

    return cleaned;
  }
}
