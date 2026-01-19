/**
 * Centralized constants for timeouts and limits
 * Eliminates magic numbers throughout the codebase
 */

export const TIMEOUTS = {
  // IRC connection and operation timeouts
  IRC_CONNECTION: 30_000,      // 30 seconds - IRC server connection timeout
  IRC_SEARCH: 30_000,          // 30 seconds - Search result DCC transfer timeout
  IRC_DOWNLOAD: 300_000,       // 5 minutes - Ebook DCC transfer timeout (large files)
  IRC_RETRY_DELAY: 5_000,      // 5 seconds - Delay between IRC reconnection attempts
  
  // API and network timeouts
  API_REQUEST: 10_000,         // 10 seconds - HTTP request timeout for NZB/downloader APIs
  DCC_SOCKET: 60_000,          // 60 seconds - DCC socket inactivity timeout
  
  // Metadata enrichment
  ENRICHMENT: 10_000,          // 10 seconds - Per-result metadata enrichment timeout
} as const;

export const LIMITS = {
  // Cache and storage limits
  MAX_CACHE_SIZE: 10_000,             // Maximum metadata cache entries
  MAX_REQUEST_PAYLOAD_SIZE: '1mb',    // Maximum HTTP request body size
} as const;
