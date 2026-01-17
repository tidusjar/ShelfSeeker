export interface SearchResult {
  botCommand: string;    // e.g., "!Bsk"
  filename: string;      // e.g., "Diary of a Wimpy Kid.epub"
  filesize: string;      // e.g., "1001.7KB"
  rawCommand: string;    // Full command to send to IRC
  title: string;         // Extracted book title
  author: string;        // Extracted author name (if available)
  fileType: string;      // File extension (epub, pdf, mobi, etc.)
}

export type ConnectionStatus = 'connecting' | 'connected' | 'joined' | 'error' | 'disconnected';
export type OperationMode = 'idle' | 'searching' | 'downloading';
