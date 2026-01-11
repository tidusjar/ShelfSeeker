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
  size: string;                  // From <newznab:attr name="size">
  category: string;              // From <category>
  description: string;           // From <description>
  provider: string;              // Provider name for tracking
}

export interface NzbApiResponse {
  offset: number;                // From <newznab:response offset>
  total: number;                 // From <newznab:response total>
  items: NzbSearchItem[];        // Parsed <item> elements
}

export interface NzbSearchResult {
  source: 'nzb';
  sourceProvider: string;        // Provider name
  botName: string;               // Same as sourceProvider for compatibility
  title: string;
  author: string;
  fileType: string;
  size: string;
  nzbUrl: string;                // For download
  guid: string;                  // Unique identifier
  filename: string;              // Extracted from title
}
