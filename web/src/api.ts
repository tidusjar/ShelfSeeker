import type {
  SearchResult,
  DownloadProgress,
  ConnectionStatus,
  ApiResponse,
  ConfigData,
  ConfigUpdateResult,
  NzbProvider,
  Downloader,
  SystemInfo
} from './types';

const API_BASE = '/api';

// Request deduplication to prevent React StrictMode duplicate calls
const pendingRequests = new Map<string, Promise<any>>();

function deduplicatedFetch<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  // Check if this request is already in flight
  if (pendingRequests.has(key)) {
    console.log(`[API] Deduplicating request: ${key}`);
    return pendingRequests.get(key)!;
  }

  // Start the request and store the promise
  const promise = fetchFn().finally(() => {
    // Remove from pending once complete
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

export const api = {
  async connect(): Promise<ApiResponse<{ status: ConnectionStatus }>> {
    const response = await fetch(`${API_BASE}/connect`, { method: 'POST' });
    return response.json();
  },

  async search(query: string): Promise<ApiResponse<SearchResult[]>> {
    return deduplicatedFetch(`search:${query}`, async () => {
      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      return response.json();
    });
  },

  async enrichResults(results: SearchResult[]): Promise<ApiResponse<SearchResult[]>> {
    // Create a stable key based on the book numbers being enriched
    const bookNumbers = results.map(r => r.bookNumber).sort().join(',');
    return deduplicatedFetch(`enrich:${bookNumbers}`, async () => {
      const response = await fetch(`${API_BASE}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results }),
      });
      return response.json();
    });
  },

  /**
   * Deep enrich specific results (fetch Works API data)
   */
  async deepEnrichResults(results: SearchResult[]): Promise<ApiResponse<SearchResult[]>> {
    const bookNumbers = results.map(r => r.bookNumber).sort().join(',');
    return deduplicatedFetch(`deep-enrich:${bookNumbers}`, async () => {
      const response = await fetch(`${API_BASE}/enrich/deep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results })
      });
      return response.json();
    });
  },

  async download(result: SearchResult): Promise<ApiResponse<{ filename: string }>> {
    const payload = result.source === 'irc'
      ? { source: 'irc', command: result.command }
      : { source: 'nzb', nzbUrl: result.nzbUrl, providerId: result.providerId, title: result.title };

    const response = await fetch(`${API_BASE}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  async getStatus(): Promise<ApiResponse<{ connectionStatus: ConnectionStatus }>> {
    const response = await fetch(`${API_BASE}/status`);
    return response.json();
  },

  async getConfig(): Promise<ApiResponse<ConfigData>> {
    const response = await fetch(`${API_BASE}/config`);
    return response.json();
  },

  async updateIrcConfig(config: ConfigData['irc']): Promise<ApiResponse<ConfigUpdateResult>> {
    const response = await fetch(`${API_BASE}/config/irc`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.json();
  },

  async updateGeneralConfig(config: ConfigData['general']): Promise<ApiResponse<ConfigUpdateResult>> {
    const response = await fetch(`${API_BASE}/config/general`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.json();
  },

  async resetConfig(): Promise<ApiResponse<ConfigUpdateResult>> {
    const response = await fetch(`${API_BASE}/config/reset`, {
      method: 'POST',
    });
    return response.json();
  },

  // NZB Provider Management
  async getNzbProviders(): Promise<ApiResponse<NzbProvider[]>> {
    const response = await fetch(`${API_BASE}/nzb/providers`);
    return response.json();
  },

  async addNzbProvider(provider: Omit<NzbProvider, 'id' | 'requestsToday' | 'lastResetDate'>): Promise<ApiResponse<NzbProvider>> {
    const response = await fetch(`${API_BASE}/nzb/providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(provider),
    });
    return response.json();
  },

  async updateNzbProvider(id: string, updates: Partial<NzbProvider>): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE}/nzb/providers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.json();
  },

  async deleteNzbProvider(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE}/nzb/providers/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  async testNzbProvider(id: string): Promise<ApiResponse<{ message: string; resultCount: number }>> {
    const response = await fetch(`${API_BASE}/nzb/providers/${id}/test`, {
      method: 'POST',
    });
    return response.json();
  },

  async testNzbProviderData(provider: Omit<NzbProvider, 'id' | 'requestsToday' | 'lastResetDate'>): Promise<ApiResponse<{ message: string; resultCount: number }>> {
    const response = await fetch(`${API_BASE}/nzb/providers/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(provider),
    });
    return response.json();
  },

  async toggleNzbProvider(id: string, enabled: boolean): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE}/nzb/providers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    return response.json();
  },

  // Downloader Management
  async getUsenetDownloaders(): Promise<ApiResponse<Downloader[]>> {
    const response = await fetch(`${API_BASE}/downloaders/usenet`);
    return response.json();
  },

  async getEnabledUsenetDownloader(): Promise<ApiResponse<Downloader | null>> {
    const response = await fetch(`${API_BASE}/downloaders/usenet/enabled`);
    return response.json();
  },

  async addUsenetDownloader(downloader: Omit<Downloader, 'id'>): Promise<ApiResponse<Downloader>> {
    const response = await fetch(`${API_BASE}/downloaders/usenet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(downloader),
    });
    return response.json();
  },

  async updateUsenetDownloader(id: string, updates: Partial<Downloader>): Promise<ApiResponse<Downloader>> {
    const response = await fetch(`${API_BASE}/downloaders/usenet/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.json();
  },

  async deleteUsenetDownloader(id: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE}/downloaders/usenet/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  async testUsenetDownloader(id: string): Promise<ApiResponse<{ version?: string }>> {
    const response = await fetch(`${API_BASE}/downloaders/usenet/${id}/test`, {
      method: 'POST',
    });
    return response.json();
  },

  async sendToDownloader(nzbUrl: string, title: string): Promise<ApiResponse<{ message: string; downloaderType: string }>> {
    const response = await fetch(`${API_BASE}/downloaders/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nzbUrl, title }),
    });
    return response.json();
  },

  // System Information
  async getSystemInfo(): Promise<ApiResponse<SystemInfo>> {
    const response = await fetch(`${API_BASE}/system/info`);
    return response.json();
  },

  // WebSocket for real-time download progress (optional enhancement)
  subscribeToProgress(_callback: (progress: DownloadProgress) => void): () => void {
    // This would use WebSocket in production
    // For now, returning a cleanup function
    return () => {};
  },
};
