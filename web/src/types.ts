export interface SearchResult {
  botName: string;
  bookNumber: number;
  title: string;
  size: string;
  command: string;
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
