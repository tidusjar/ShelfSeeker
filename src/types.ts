export interface SearchResult {
  botCommand: string;    // e.g., "!Bsk"
  filename: string;      // e.g., "Diary of a Wimpy Kid.epub"
  filesize: string;      // e.g., "1001.7KB"
  rawCommand: string;    // Full command to send to IRC
}

export type ConnectionStatus = 'connecting' | 'connected' | 'joined' | 'error' | 'disconnected';
export type OperationMode = 'idle' | 'searching' | 'downloading';
