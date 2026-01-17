import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloaderService } from './downloaderService.js';
import type { Downloader } from './types.js';

// Mock global fetch
global.fetch = vi.fn();

describe('DownloaderService', () => {
  let downloaderService: DownloaderService;

  const createMockNZBGetDownloader = (overrides: Partial<Downloader> = {}): Downloader => ({
    id: 'nzbget-1',
    name: 'Test NZBGet',
    type: 'nzbget',
    enabled: true,
    host: 'localhost',
    port: 6789,
    ssl: false,
    username: 'testuser',
    password: 'testpass',
    category: 'books',
    priority: 0,
    ...overrides
  });

  const createMockSABnzbdDownloader = (overrides: Partial<Downloader> = {}): Downloader => ({
    id: 'sabnzbd-1',
    name: 'Test SABnzbd',
    type: 'sabnzbd',
    enabled: true,
    host: 'localhost',
    port: 8080,
    ssl: false,
    username: 'testuser',
    password: 'testpass',
    apiKey: 'test-api-key-123',
    category: 'books',
    priority: 0,
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();
    downloaderService = new DownloaderService();
  });

  describe('sendToNZBGet', () => {
    it('should send NZB to NZBGet successfully', async () => {
      const mockNzbContent = '<?xml version="1.0"?><nzb>content</nzb>';

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue(mockNzbContent)
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            version: '1.1',
            result: 12345
          })
        } as any);

      const downloader = createMockNZBGetDownloader();

      await downloaderService.sendToNZBGet(
        downloader,
        'https://example.com/nzb/test.nzb',
        'Test Book'
      );

      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      // Check NZB fetch
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        'https://example.com/nzb/test.nzb',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );

      // Check NZBGet API call
      const secondCall = vi.mocked(global.fetch).mock.calls[1];
      expect(secondCall[0]).toBe('http://localhost:6789/jsonrpc');
      
      const requestBody = JSON.parse(secondCall[1]?.body as string);
      expect(requestBody.method).toBe('append');
      expect(requestBody.params[0]).toBe('Test Book.nzb');
      expect(requestBody.params[2]).toBe('books'); // category
      expect(requestBody.params[3]).toBe(0); // priority
    });

    it('should use SSL when configured', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue('<nzb>content</nzb>')
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ version: '1.1', result: 1 })
        } as any);

      const downloader = createMockNZBGetDownloader({ ssl: true });

      await downloaderService.sendToNZBGet(
        downloader,
        'https://example.com/test.nzb',
        'Test Book'
      );

      const apiCall = vi.mocked(global.fetch).mock.calls[1];
      expect(apiCall[0]).toBe('https://localhost:6789/jsonrpc');
    });

    it('should include Basic Auth header', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue('<nzb>content</nzb>')
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ version: '1.1', result: 1 })
        } as any);

      const downloader = createMockNZBGetDownloader({
        username: 'user',
        password: 'pass'
      });

      await downloaderService.sendToNZBGet(
        downloader,
        'https://example.com/test.nzb',
        'Test Book'
      );

      const apiCall = vi.mocked(global.fetch).mock.calls[1];
      const headers = apiCall[1]?.headers as Record<string, string>;
      
      expect(headers['Authorization']).toBeDefined();
      expect(headers['Authorization']).toMatch(/^Basic /);
    });

    it('should reject if downloader type is not nzbget', async () => {
      const downloader = createMockSABnzbdDownloader();

      await expect(
        downloaderService.sendToNZBGet(downloader, 'https://example.com/test.nzb', 'Test')
      ).rejects.toThrow('Invalid downloader type for NZBGet');
    });

    it('should handle NZB fetch failure', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      } as any);

      const downloader = createMockNZBGetDownloader();

      await expect(
        downloaderService.sendToNZBGet(downloader, 'https://example.com/test.nzb', 'Test')
      ).rejects.toThrow('Failed to send to NZBGet: Failed to fetch NZB: Not Found');
    });

    it('should handle NZBGet API error response', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue('<nzb>content</nzb>')
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            error: { message: 'Authentication failed' }
          })
        } as any);

      const downloader = createMockNZBGetDownloader();

      await expect(
        downloaderService.sendToNZBGet(downloader, 'https://example.com/test.nzb', 'Test')
      ).rejects.toThrow('NZBGet error: Authentication failed');
    });

    it('should handle NZBGet rejecting the NZB', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue('<nzb>content</nzb>')
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            version: '1.1',
            result: 0 // Rejected
          })
        } as any);

      const downloader = createMockNZBGetDownloader();

      await expect(
        downloaderService.sendToNZBGet(downloader, 'https://example.com/test.nzb', 'Test')
      ).rejects.toThrow('NZBGet rejected the NZB');
    });

    it('should use empty string for category when not set', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue('<nzb>content</nzb>')
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ version: '1.1', result: 1 })
        } as any);

      const downloader = createMockNZBGetDownloader({ category: undefined });

      await downloaderService.sendToNZBGet(
        downloader,
        'https://example.com/test.nzb',
        'Test Book'
      );

      const apiCall = vi.mocked(global.fetch).mock.calls[1];
      const requestBody = JSON.parse(apiCall[1]?.body as string);
      expect(requestBody.params[2]).toBe(''); // category
    });

    it('should use 0 for priority when not set', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue('<nzb>content</nzb>')
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ version: '1.1', result: 1 })
        } as any);

      const downloader = createMockNZBGetDownloader({ priority: undefined });

      await downloaderService.sendToNZBGet(
        downloader,
        'https://example.com/test.nzb',
        'Test Book'
      );

      const apiCall = vi.mocked(global.fetch).mock.calls[1];
      const requestBody = JSON.parse(apiCall[1]?.body as string);
      expect(requestBody.params[3]).toBe(0); // priority
    });
  });

  describe('sendToSABnzbd', () => {
    it('should send NZB to SABnzbd successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: true,
          nzo_ids: ['SABnzbd_nzo_12345']
        })
      } as any);

      const downloader = createMockSABnzbdDownloader();

      await downloaderService.sendToSABnzbd(
        downloader,
        'https://example.com/nzb/test.nzb',
        'Test Book'
      );

      expect(global.fetch).toHaveBeenCalled();
      
      const callUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain('http://localhost:8080/api');
      expect(callUrl).toContain('mode=addurl');
      expect(callUrl).toContain('apikey=test-api-key-123');
      expect(callUrl).toContain('nzbname=Test+Book');
    });

    it('should use SSL when configured', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: true,
          nzo_ids: ['id123']
        })
      } as any);

      const downloader = createMockSABnzbdDownloader({ ssl: true });

      await downloaderService.sendToSABnzbd(
        downloader,
        'https://example.com/test.nzb',
        'Test Book'
      );

      const callUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain('https://localhost:8080/api');
    });

    it('should include category when set', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: true,
          nzo_ids: ['id123']
        })
      } as any);

      const downloader = createMockSABnzbdDownloader({ category: 'ebooks' });

      await downloaderService.sendToSABnzbd(
        downloader,
        'https://example.com/test.nzb',
        'Test Book'
      );

      const callUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain('cat=ebooks');
    });

    it('should include priority when set', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: true,
          nzo_ids: ['id123']
        })
      } as any);

      const downloader = createMockSABnzbdDownloader({ priority: -1 });

      await downloaderService.sendToSABnzbd(
        downloader,
        'https://example.com/test.nzb',
        'Test Book'
      );

      const callUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain('priority=-1');
    });

    it('should include Basic Auth header when credentials provided', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: true,
          nzo_ids: ['id123']
        })
      } as any);

      const downloader = createMockSABnzbdDownloader({
        username: 'user',
        password: 'pass'
      });

      await downloaderService.sendToSABnzbd(
        downloader,
        'https://example.com/test.nzb',
        'Test Book'
      );

      const callOptions = vi.mocked(global.fetch).mock.calls[0][1];
      const headers = callOptions?.headers as Record<string, string>;
      
      expect(headers['Authorization']).toBeDefined();
      expect(headers['Authorization']).toMatch(/^Basic /);
    });

    it('should reject if downloader type is not sabnzbd', async () => {
      const downloader = createMockNZBGetDownloader();

      await expect(
        downloaderService.sendToSABnzbd(downloader, 'https://example.com/test.nzb', 'Test')
      ).rejects.toThrow('Invalid downloader type for SABnzbd');
    });

    it('should reject if API key is missing', async () => {
      const downloader = createMockSABnzbdDownloader({ apiKey: undefined });

      await expect(
        downloaderService.sendToSABnzbd(downloader, 'https://example.com/test.nzb', 'Test')
      ).rejects.toThrow('SABnzbd API key is required');
    });

    it('should handle SABnzbd error response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: false,
          error: 'Invalid API key'
        })
      } as any);

      const downloader = createMockSABnzbdDownloader();

      await expect(
        downloaderService.sendToSABnzbd(downloader, 'https://example.com/test.nzb', 'Test')
      ).rejects.toThrow('SABnzbd error: Invalid API key');
    });

    it('should handle SABnzbd rejecting the NZB', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: true,
          nzo_ids: [] // Empty array = rejected
        })
      } as any);

      const downloader = createMockSABnzbdDownloader();

      await expect(
        downloaderService.sendToSABnzbd(downloader, 'https://example.com/test.nzb', 'Test')
      ).rejects.toThrow('SABnzbd rejected the NZB');
    });

    it('should handle HTTP error response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as any);

      const downloader = createMockSABnzbdDownloader();

      await expect(
        downloaderService.sendToSABnzbd(downloader, 'https://example.com/test.nzb', 'Test')
      ).rejects.toThrow('SABnzbd returned 401: Unauthorized');
    });
  });

  describe('testConnection', () => {
    describe('NZBGet', () => {
      it('should test NZBGet connection successfully', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            version: '1.1',
            result: '21.0'
          })
        } as any);

        const downloader = createMockNZBGetDownloader();
        const result = await downloaderService.testConnection(downloader);

        expect(result).toEqual({
          success: true,
          message: 'Connected successfully',
          version: '21.0'
        });
      });

      it('should use correct NZBGet test endpoint', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            version: '1.1',
            result: '21.0'
          })
        } as any);

        const downloader = createMockNZBGetDownloader();
        await downloaderService.testConnection(downloader);

        const apiCall = vi.mocked(global.fetch).mock.calls[0];
        expect(apiCall[0]).toBe('http://localhost:6789/jsonrpc');
        
        const requestBody = JSON.parse(apiCall[1]?.body as string);
        expect(requestBody.method).toBe('version');
      });

      it('should handle NZBGet authentication error', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized'
        } as any);

        const downloader = createMockNZBGetDownloader();
        const result = await downloaderService.testConnection(downloader);

        expect(result.success).toBe(false);
        expect(result.message).toContain('HTTP 401');
      });

      it('should handle NZBGet API error', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            error: { message: 'Method not found' }
          })
        } as any);

        const downloader = createMockNZBGetDownloader();
        const result = await downloaderService.testConnection(downloader);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Method not found');
      });

      it('should handle invalid NZBGet response', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            version: '1.1'
            // Missing result field
          })
        } as any);

        const downloader = createMockNZBGetDownloader();
        const result = await downloaderService.testConnection(downloader);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Invalid response from NZBGet');
      });
    });

    describe('SABnzbd', () => {
      it('should test SABnzbd connection successfully', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            version: '3.7.0'
          })
        } as any);

        const downloader = createMockSABnzbdDownloader();
        const result = await downloaderService.testConnection(downloader);

        expect(result).toEqual({
          success: true,
          message: 'Connected successfully',
          version: '3.7.0'
        });
      });

      it('should use correct SABnzbd test endpoint', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            version: '3.7.0'
          })
        } as any);

        const downloader = createMockSABnzbdDownloader();
        await downloaderService.testConnection(downloader);

        const callUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
        expect(callUrl).toContain('http://localhost:8080/api');
        expect(callUrl).toContain('mode=version');
        expect(callUrl).toContain('apikey=test-api-key-123');
      });

      it('should reject if API key is missing', async () => {
        const downloader = createMockSABnzbdDownloader({ apiKey: undefined });
        const result = await downloaderService.testConnection(downloader);

        expect(result.success).toBe(false);
        expect(result.message).toBe('API key is required');
      });

      it('should handle SABnzbd HTTP error', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
          ok: false,
          status: 403,
          statusText: 'Forbidden'
        } as any);

        const downloader = createMockSABnzbdDownloader();
        const result = await downloaderService.testConnection(downloader);

        expect(result.success).toBe(false);
        expect(result.message).toContain('HTTP 403');
      });

      it('should handle invalid SABnzbd response', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            // Missing version field
          })
        } as any);

        const downloader = createMockSABnzbdDownloader();
        const result = await downloaderService.testConnection(downloader);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Invalid response from SABnzbd');
      });
    });

    it('should handle unknown downloader type', async () => {
      const downloader = createMockNZBGetDownloader({ type: 'unknown' as any });
      const result = await downloaderService.testConnection(downloader);

      expect(result).toEqual({
        success: false,
        message: 'Unknown downloader type'
      });
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const downloader = createMockNZBGetDownloader();
      const result = await downloaderService.testConnection(downloader);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
    });
  });
});
