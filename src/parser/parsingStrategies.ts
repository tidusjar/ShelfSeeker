/**
 * Parsing strategies for extracting author and title from ebook filenames.
 * Each strategy handles a specific filename pattern with associated confidence level.
 */

export interface ParsingStrategy {
  name: string;
  confidence: 'high' | 'medium' | 'low';
  matches: (filename: string) => boolean;
  parse: (filename: string) => { title: string; author: string } | null;
}

/**
 * Strategy 1: Standard Dash Separator (HIGH CONFIDENCE, 22%)
 * Pattern: Author - Title
 * Example: "J K Rowling - Harry Potter and the Goblet of Fire"
 */
const standardDashStrategy: ParsingStrategy = {
  name: 'Standard Dash Separator',
  confidence: 'high',
  matches: (filename: string) => filename.includes(' - '),
  parse: (filename: string) => {
    const dashIndex = filename.indexOf(' - ');
    if (dashIndex === -1) return null;

    const author = filename.substring(0, dashIndex).trim();
    const title = filename.substring(dashIndex + 3).trim();

    // Reject if author part looks like a series indicator
    if (/^\[.*\]$/.test(author) || /^vol\.?\s*\d+/i.test(author)) {
      return null;
    }

    return { author, title };
  }
};

/**
 * Strategy 2: Comma-Separated Author (HIGH CONFIDENCE, 8%)
 * Pattern: LastName, FirstName - Title
 * Example: "Rowling, J.K. - Harry Potter 08"
 */
const commaSeparatedAuthorStrategy: ParsingStrategy = {
  name: 'Comma-Separated Author',
  confidence: 'high',
  matches: (filename: string) => /^[^,]+,\s*[^-]+-\s*.+/.test(filename),
  parse: (filename: string) => {
    const match = filename.match(/^([^,]+),\s*([^-]+)-\s*(.+)$/);
    if (!match) return null;

    const lastName = match[1].trim();
    const firstName = match[2].trim();
    const title = match[3].trim();

    // Reformat to "FirstName LastName"
    const author = `${firstName} ${lastName}`;

    return { author, title };
  }
};

/**
 * Strategy 3: Bracketed Series with Dash (MEDIUM CONFIDENCE, 12%)
 * Pattern: [Series XX] - Author - Title or Author - [Series XX] - Title
 * Example: "J K Rowling - [Harry Potter 07] - Deathly Hallows"
 */
const bracketedSeriesStrategy: ParsingStrategy = {
  name: 'Bracketed Series',
  confidence: 'medium',
  matches: (filename: string) => /\[.*?\]/.test(filename) && filename.includes(' - '),
  parse: (filename: string) => {
    // Remove bracketed content first
    const withoutBrackets = filename.replace(/\[.*?\]/g, '').trim();

    // Try standard dash separator on the remainder
    const dashIndex = withoutBrackets.indexOf(' - ');
    if (dashIndex === -1) {
      // Only title remains after removing brackets
      return { author: '', title: withoutBrackets };
    }

    const author = withoutBrackets.substring(0, dashIndex).trim();
    const title = withoutBrackets.substring(dashIndex + 3).trim();

    return { author, title };
  }
};

/**
 * Strategy 4: Dot-Separated Publisher Format (MEDIUM CONFIDENCE, 25%)
 * Pattern: Publisher.Author.Title.Metadata.Year-Group
 * Example: "Insight.Editions-Harry.Potter.Film.Vault.Vol.03.2019.Retail.eBook-BitBook"
 */
const dotSeparatedPublisherStrategy: ParsingStrategy = {
  name: 'Dot-Separated Publisher',
  confidence: 'medium',
  matches: (filename: string) => {
    // Must have multiple dots and no " - " separator
    const dotCount = (filename.match(/\./g) || []).length;
    return dotCount >= 3 && !filename.includes(' - ');
  },
  parse: (filename: string) => {
    // Remove release group suffix (e.g., "-BitBook")
    let cleaned = filename.replace(/-[A-Z][a-zA-Z]+$/, '');

    // Split on dots and hyphens
    const parts = cleaned.split(/[.\-]/);

    // Metadata keywords to filter out (more selective now)
    const metadataKeywords = [
      'retail', 'ebook', 'swedish', 'english', 'retial'
    ];

    // Filter out metadata tokens
    const filteredParts: string[] = [];
    for (const part of parts) {
      // Skip years
      if (/^\d{4}$/.test(part)) continue;

      // Skip metadata keywords (case insensitive)
      if (metadataKeywords.includes(part.toLowerCase())) continue;

      // Skip single letters (but keep important words)
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

    // Known publishers (skip these)
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

    // Look for clear author patterns: "FirstName LastName And FirstName LastName"
    //  or "FirstName MiddleName LastName"
    let authorParts: string[] = [];
    let titleStart = 0;

    // Check if first few parts look like an author (multi-word proper name with "And" connector)
    for (let i = 0; i < Math.min(6, nonPublisherParts.length); i++) {
      const part = nonPublisherParts[i];
      const lowerPart = part.toLowerCase();

      if (lowerPart === 'and' && authorParts.length >= 2 && authorParts.length <= 3) {
        // Found "And" after 2-3 names, likely multi-author (e.g., "Mark Brake And Jon Chase")
        authorParts.push(part);
        titleStart = i + 1;
        continue;
      }

      // After "And", collect next 1-2 author names
      if (authorParts.length > 0 && authorParts[authorParts.length - 1].toLowerCase() === 'and') {
        if (/^[A-Z]/.test(part) && part.length > 2) {
          authorParts.push(part);
          titleStart = i + 1;
          // Check if there's one more name part after this (for "FirstName LastName")
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
      // First few capitalized words might be author (but stop at common title words)
      else if (authorParts.length < 3 && /^[A-Z]/.test(part) && part.length > 2 && !titleStartWords.includes(lowerPart)) {
        authorParts.push(part);
        titleStart = i + 1;
      } else {
        break; // Stop looking for author
      }
    }

    // Only treat as author if we have a clear pattern:
    // - Contains "And" connector (multi-author like "Mark Brake And Jon Chase")
    // - OR exactly 2 names followed by "The" or similar (like "John Tiffany" before "The...")
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
};

/**
 * Strategy 5: Dot-Separated Author Name (MEDIUM CONFIDENCE, 20%)
 * Pattern: J.K.Rowling - Title (initials stuck to name)
 * Example: "J.K.Rowling - Harry Potter Series"
 */
const dotSeparatedAuthorStrategy: ParsingStrategy = {
  name: 'Dot-Separated Author Name',
  confidence: 'medium',
  matches: (filename: string) => /^([A-Z]\.)+[A-Z][a-z]+\s*-\s*.+/.test(filename),
  parse: (filename: string) => {
    const match = filename.match(/^(([A-Z]\.)+[A-Z][a-z]+)\s*-\s*(.+)$/);
    if (!match) return null;

    const author = match[1];
    const title = match[3].trim();

    return { author, title };
  }
};

/**
 * Strategy 6: "by Author" Suffix (LOW CONFIDENCE, 5%)
 * Pattern: Title by Author
 * Example: "Harry Potter and the Sorcerer's Stone by J.K. Rowling"
 */
const byAuthorSuffixStrategy: ParsingStrategy = {
  name: '"by Author" Suffix',
  confidence: 'low',
  matches: (filename: string) => / by /i.test(filename) || /\.by\./i.test(filename),
  parse: (filename: string) => {
    // Try space-separated first
    let match = filename.match(/^(.+?)\s+by\s+(.+)$/i);
    if (match) {
      return {
        title: match[1].trim(),
        author: match[2].trim()
      };
    }

    // Try dot-separated
    match = filename.match(/^(.+?)\.by\.(.+)$/i);
    if (match) {
      const title = match[1].replace(/\./g, ' ').trim();
      const author = match[2].replace(/\./g, ' ').trim();
      return { title, author };
    }

    return null;
  }
};

/**
 * Strategy 7: Publisher-Author Hyphen Format (LOW CONFIDENCE, 10%)
 * Pattern: Publisher-Author-Title
 * Example: "Simon.and.Schuster-Harry.Potter.Film.Vault-2020"
 */
const publisherAuthorHyphenStrategy: ParsingStrategy = {
  name: 'Publisher-Author Hyphen',
  confidence: 'low',
  matches: (filename: string) => {
    const hyphenCount = (filename.match(/-/g) || []).length;
    return hyphenCount >= 2 && !filename.includes(' - ');
  },
  parse: (filename: string) => {
    // Known publishers
    const knownPublishers = [
      'simon.and.schuster',
      'insight.editions',
      'penguin',
      'harper',
      'random.house'
    ];

    const parts = filename.split('-');
    if (parts.length < 2) return null;

    const firstPart = parts[0].toLowerCase();
    const isKnownPublisher = knownPublishers.some(pub => firstPart.includes(pub));

    if (isKnownPublisher && parts.length >= 2) {
      // Publisher-Title or Publisher-Title-Metadata
      const title = parts.slice(1).join(' ').replace(/\./g, ' ');
      return { author: '', title };
    }

    // Otherwise treat as Author-Title
    const author = parts[0].replace(/\./g, ' ');
    const title = parts.slice(1).join(' ').replace(/\./g, ' ');

    return { author, title };
  }
};

/**
 * Strategy 8: Title-Only Fallback (LOW CONFIDENCE, 15-26%)
 * Pattern: No clear author indicator
 * Example: "Unofficial Harry Potter Knits magazine 2013"
 */
const titleOnlyStrategy: ParsingStrategy = {
  name: 'Title-Only Fallback',
  confidence: 'low',
  matches: () => true, // Always matches as final fallback
  parse: (filename: string) => {
    // No author, just use cleaned filename as title
    return {
      author: '',
      title: filename
    };
  }
};

/**
 * All parsing strategies in priority order (high to low confidence).
 * Strategies are tried in this order until one succeeds.
 */
export const strategies: ParsingStrategy[] = [
  standardDashStrategy,
  commaSeparatedAuthorStrategy,
  bracketedSeriesStrategy,
  dotSeparatedPublisherStrategy,
  dotSeparatedAuthorStrategy,
  byAuthorSuffixStrategy,
  publisherAuthorHyphenStrategy,
  titleOnlyStrategy
];
