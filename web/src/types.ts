export interface SearchResult {
  botName: string;
  bookNumber: number;
  title: string;
  author: string;
  fileType: string;
  size: string;
  command: string;
  filename: string;
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
