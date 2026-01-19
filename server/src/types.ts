// NZB Provider Types

export interface NzbProvider {
  id: string;                    // UUID for management
  name: string;                  // User-friendly name (e.g., "NZBGeek")
  url: string;                   // Base URL (e.g., "https://api.nzbgeek.info")
  apiKey: string;                // API authentication key
  enabled: boolean;              // Toggle without deletion
  categories: number[];          // Newznab category IDs (7000=Books, 8010=Audiobooks)
  priority: number;              // Search order (lower = higher priority)
  apiLimit?: number;             // Optional daily request limit
  requestsToday?: number;        // Usage tracking counter
  lastResetDate?: string;        // ISO date string for daily reset
}

export interface NzbSearchItem {
  title: string;                 // From <title>
  link: string;                  // NZB download URL from <link>
  guid: string;                  // Unique identifier from <guid>
  pubDate: string;               // Publication date from <pubDate>
  size: number;                  // Bytes from <newznab:attr name="size">
}

export interface NzbApiResponse {
  items: NzbSearchItem[];        // Parsed <item> elements
  total: number;                 // Total number of items
}

export interface NzbSearchResult {
  source: 'nzb';
  sourceProvider: string;        // Provider name
  providerId: string;            // Provider UUID for download routing
  botName: string;               // Same as sourceProvider for compatibility
  bookNumber: number;            // Always 0 for NZB (IRC compatibility)
  title: string;
  author: string;
  fileType: string;
  size: string;                  // Formatted size string
  filename: string;              // Extracted from title
  nzbUrl: string;                // For download
  guid: string;                  // Unique identifier
  metadata?: import('./lib/types.js').BookMetadata;  // Optional enriched metadata
}

// Downloader Types
export type DownloaderType = 'nzbget' | 'sabnzbd';

export interface Downloader {
  id: string;                    // UUID
  name: string;                  // User-friendly name (e.g., "My NZBGet")
  type: DownloaderType;          // nzbget or sabnzbd
  enabled: boolean;              // Toggle without deletion
  host: string;                  // e.g., "localhost" or "192.168.1.100"
  port: number;                  // e.g., 6789 for NZBGet, 8080 for SABnzbd
  ssl: boolean;                  // Use HTTPS
  username: string;              // Auth username (required for both)
  password: string;              // Auth password (required for both)
  apiKey?: string;               // SABnzbd only - API key
  category?: string;             // Default category in downloader (e.g., "books")
  priority?: number;             // Default priority (-100 to 100 for NZBGet, -2 to 2 for SABnzbd)
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];  // Array of errors from different sources (e.g., IRC, NZB)
}
