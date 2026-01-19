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
