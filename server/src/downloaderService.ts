import type { Downloader } from './types.js';
import { TIMEOUTS } from './constants.js';
import { logger } from './lib/logger.js';

export class DownloaderService {
  /**
   * Send NZB to NZBGet using JSON-RPC API
   */
  async sendToNZBGet(downloader: Downloader, nzbUrl: string, title: string): Promise<void> {
    if (downloader.type !== 'nzbget') {
      throw new Error('Invalid downloader type for NZBGet');
    }

    try {
      // Fetch the NZB file content
      const nzbResponse = await fetch(nzbUrl, {
        signal: AbortSignal.timeout(TIMEOUTS.API_REQUEST),
      });

      if (!nzbResponse.ok) {
        throw new Error(`Failed to fetch NZB: ${nzbResponse.statusText}`);
      }

      const nzbContent = await nzbResponse.text();
      const nzbBase64 = Buffer.from(nzbContent).toString('base64');

      // Build NZBGet URL (without credentials in URL)
      const protocol = downloader.ssl ? 'https' : 'http';
      const url = `${protocol}://${downloader.host}:${downloader.port}/jsonrpc`;

      // NZBGet JSON-RPC request
      const requestBody = {
        method: 'append',
        params: [
          `${title}.nzb`,           // NZB filename
          nzbBase64,                // Base64-encoded NZB content
          downloader.category || '', // Category (empty string if not set)
          downloader.priority || 0,  // Priority (0 = normal)
          false,                     // Add to top of queue
          false,                     // Add paused
          '',                        // Duplicate key
          0,                         // Duplicate score
          'SCORE',                   // Duplicate mode
        ],
      };

      // Use Basic Auth header instead of credentials in URL
      const auth = Buffer.from(`${downloader.username}:${downloader.password}`).toString('base64');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(TIMEOUTS.API_REQUEST),
      });

      if (!response.ok) {
        throw new Error(`NZBGet returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as any;

      // NZBGet returns { version: "1.1", result: <id> } on success
      if (result.error) {
        throw new Error(`NZBGet error: ${result.error.message || 'Unknown error'}`);
      }

      if (!result.result || result.result <= 0) {
        throw new Error('NZBGet rejected the NZB');
      }

      logger.info('✓ Sent NZB to NZBGet', { title, id: result.result });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to send to NZBGet: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Send NZB to SABnzbd using REST API
   */
  async sendToSABnzbd(downloader: Downloader, nzbUrl: string, title: string): Promise<void> {
    if (downloader.type !== 'sabnzbd') {
      throw new Error('Invalid downloader type for SABnzbd');
    }

    if (!downloader.apiKey) {
      throw new Error('SABnzbd API key is required');
    }

    try {
      // Build SABnzbd URL
      const protocol = downloader.ssl ? 'https' : 'http';
      const baseUrl = `${protocol}://${downloader.host}:${downloader.port}/api`;

      // SABnzbd addurl endpoint
      const params = new URLSearchParams({
        mode: 'addurl',
        name: nzbUrl,
        apikey: downloader.apiKey,
        output: 'json',
        nzbname: title,
      });

      if (downloader.category) {
        params.append('cat', downloader.category);
      }

      if (downloader.priority !== undefined) {
        // SABnzbd priority: -2 (Force), -1 (High), 0 (Normal), 1 (Low), 2 (Paused)
        params.append('priority', downloader.priority.toString());
      }

      // Add basic auth if username/password provided
      const headers: Record<string, string> = {};
      if (downloader.username && downloader.password) {
        const auth = Buffer.from(`${downloader.username}:${downloader.password}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }

      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(TIMEOUTS.API_REQUEST),
      });

      if (!response.ok) {
        throw new Error(`SABnzbd returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as any;

      // SABnzbd returns { status: true/false, nzo_ids: [...] }
      if (!result.status) {
        throw new Error(`SABnzbd error: ${result.error || 'Unknown error'}`);
      }

      if (!result.nzo_ids || result.nzo_ids.length === 0) {
        throw new Error('SABnzbd rejected the NZB');
      }

      logger.info('✓ Sent NZB to SABnzbd', { title, id: result.nzo_ids[0] });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to send to SABnzbd: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Test connection to downloader
   */
  async testConnection(downloader: Downloader): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      if (downloader.type === 'nzbget') {
        return await this.testNZBGetConnection(downloader);
      } else if (downloader.type === 'sabnzbd') {
        return await this.testSABnzbdConnection(downloader);
      } else {
        return { success: false, message: 'Unknown downloader type' };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message };
    }
  }

  /**
   * Test NZBGet connection using version method
   */
  private async testNZBGetConnection(downloader: Downloader): Promise<{ success: boolean; message: string; version?: string }> {
    const protocol = downloader.ssl ? 'https' : 'http';
    const url = `${protocol}://${downloader.host}:${downloader.port}/jsonrpc`;

    const requestBody = {
      method: 'version',
      params: [],
    };

    const auth = Buffer.from(`${downloader.username}:${downloader.password}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(TIMEOUTS.IRC_RETRY_DELAY),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json() as any;

    if (result.error) {
      throw new Error(result.error.message || 'Unknown error');
    }

    if (result.result) {
      return {
        success: true,
        message: 'Connected successfully',
        version: result.result,
      };
    }

    throw new Error('Invalid response from NZBGet');
  }

  /**
   * Test SABnzbd connection using version method
   */
  private async testSABnzbdConnection(downloader: Downloader): Promise<{ success: boolean; message: string; version?: string }> {
    if (!downloader.apiKey) {
      throw new Error('API key is required');
    }

    const protocol = downloader.ssl ? 'https' : 'http';
    const baseUrl = `${protocol}://${downloader.host}:${downloader.port}/api`;

    const params = new URLSearchParams({
      mode: 'version',
      apikey: downloader.apiKey,
      output: 'json',
    });

    const headers: Record<string, string> = {};
    if (downloader.username && downloader.password) {
      const auth = Buffer.from(`${downloader.username}:${downloader.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(TIMEOUTS.IRC_RETRY_DELAY),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json() as any;

    if (result.version) {
      return {
        success: true,
        message: 'Connected successfully',
        version: result.version,
      };
    }

    throw new Error('Invalid response from SABnzbd');
  }
}
