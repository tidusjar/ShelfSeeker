import type { SearchResult, DownloadProgress, ConnectionStatus, ApiResponse } from './types';

const API_BASE = '/api';

export const api = {
  async connect(): Promise<ApiResponse<{ status: ConnectionStatus }>> {
    const response = await fetch(`${API_BASE}/connect`, { method: 'POST' });
    return response.json();
  },

  async search(query: string): Promise<ApiResponse<SearchResult[]>> {
    const response = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    return response.json();
  },

  async download(command: string): Promise<ApiResponse<{ filename: string }>> {
    const response = await fetch(`${API_BASE}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    return response.json();
  },

  async getStatus(): Promise<ApiResponse<{ connectionStatus: ConnectionStatus }>> {
    const response = await fetch(`${API_BASE}/status`);
    return response.json();
  },

  // WebSocket for real-time download progress (optional enhancement)
  subscribeToProgress(callback: (progress: DownloadProgress) => void): () => void {
    // This would use WebSocket in production
    // For now, returning a cleanup function
    return () => {};
  },
};
