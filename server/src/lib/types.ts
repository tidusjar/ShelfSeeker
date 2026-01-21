// Book metadata from external APIs (Open Library, Google Books, etc.)
export interface BookMetadata {
  // Cover images at different sizes
  coverUrl?: string;
  coverUrlSmall?: string;
  coverUrlMedium?: string;
  coverUrlLarge?: string;
  
  // Text metadata
  description?: string;
  publishDate?: string;
  publisher?: string;
  language?: string;
  
  // Numeric metadata
  pageCount?: number;
  averageRating?: number;
  ratingsCount?: number;
  
  // Identifiers
  isbn?: string;
  isbn13?: string;
  openLibraryKey?: string;
  
  // Categories
  subjects?: string[];
  
  // === NEW: From Search API (free - already in response) ===
  editionCount?: number;              // Total number of editions available
  firstPublishYear?: number;          // Original publication year
  authorAlternativeName?: string[];   // Pen names, translated names
  contributor?: string[];             // Illustrators, translators, editors
  
  // === NEW: From Works API (requires additional call) ===
  descriptionSource?: 'search' | 'works';  // Track which API provided description
  
  // Series information
  series?: string[];                  // e.g., ["Harry Potter", "Book 1"]
  
  // Future use - keep in model but don't display yet
  excerpts?: Array<{
    excerpt: string;
    comment?: string;
  }>;
  
  links?: Array<{
    url: string;
    title: string;
  }>;
  
  subjectPeople?: string[];           // Character names (for future use)
  subjectPlaces?: string[];           // Settings/locations (for future use)
  subjectTimes?: string[];            // Time periods (for future use)
}

export interface SearchResult {
  botCommand: string;    // e.g., "!Bsk"
  filename: string;      // e.g., "Diary of a Wimpy Kid.epub"
  filesize: string;      // e.g., "1001.7KB"
  rawCommand: string;    // Full command to send to IRC
  title: string;         // Extracted book title
  author: string;        // Extracted author name (if available)
  fileType: string;      // File extension (epub, pdf, mobi, etc.)
  
  // Optional enriched metadata from external APIs
  metadata?: BookMetadata;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'joined' | 'error' | 'disconnected';
export type OperationMode = 'idle' | 'searching' | 'downloading';
