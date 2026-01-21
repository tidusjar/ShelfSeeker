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
  source: 'irc' | 'nzb';
  sourceProvider: string;
  providerId?: string;         // NZB only - provider UUID for download routing
  botName: string;
  bookNumber: number;
  title: string;
  author: string;
  fileType: string;
  size: string;
  filename: string;
  command?: string;            // IRC only
  nzbUrl?: string;             // NZB only
  guid?: string;               // NZB only
  metadata?: BookMetadata;     // Optional enriched metadata from external APIs
}

export interface DownloadProgress {
  filename: string;
  progress: number;
  speed: string;
  status: 'downloading' | 'complete' | 'error';
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];  // Array of errors from different sources (e.g., IRC, NZB)
}

export interface IrcConfig {
  enabled: boolean;
  server: string;
  port: number;
  channel: string;
  searchCommand: string;
}

export interface GeneralConfig {
  downloadPath: string;
}

export interface ConfigData {
  irc: IrcConfig;
  general: GeneralConfig;
}

export interface ConfigValidation {
  isValid: boolean;
  errors: {
    [key: string]: string;
  };
}

export interface ConfigUpdateResult {
  reconnected: boolean;
  message: string;
}

export interface NzbProvider {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  enabled: boolean;
  categories: number[];
  priority: number;
  apiLimit?: number;
  requestsToday?: number;
  lastResetDate?: string;
}

export type DownloaderType = 'nzbget' | 'sabnzbd';

export interface Downloader {
  id: string;
  name: string;
  type: DownloaderType;
  enabled: boolean;
  host: string;
  port: number;
  ssl: boolean;
  username: string;
  password: string;
  apiKey?: string;
  category?: string;
  priority?: number;
}

export interface SystemInfo {
  version: string;
  name: string;
  description: string;
  githubUrl: string;
  donationUrl: string;
  license: string;
  platform: string;
  nodeVersion: string;
  uptime: number;
}

export interface OnboardingState {
  completed: boolean;
  skipped: boolean;
  lastStep: number;
  completedAt?: string;
}

export interface OnboardingConfig {
  ircEnabled: boolean;
  nzbEnabled: boolean;
  torrentsEnabled: boolean;
}
