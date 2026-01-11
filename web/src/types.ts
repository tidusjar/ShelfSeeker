export interface SearchResult {
  source: 'irc' | 'nzb';
  sourceProvider: string;
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
}

export interface IrcConfig {
  server: string;
  port: number;
  channel: string;
  searchCommand: string;
}

export interface ConfigData {
  irc: IrcConfig;
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
