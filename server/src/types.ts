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
}
