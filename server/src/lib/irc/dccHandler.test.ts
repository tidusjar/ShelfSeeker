import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DccHandler } from './dccHandler.js';
import * as fs from 'fs';

// Mock modules
vi.mock('fs');

describe('DccHandler', () => {
  let dccHandler: DccHandler;
  let mockExistsSync: any;
  let mockMkdirSync: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockExistsSync = vi.fn().mockReturnValue(false);
    mockMkdirSync = vi.fn();

    vi.mocked(fs.existsSync).mockImplementation(mockExistsSync);
    vi.mocked(fs.mkdirSync).mockImplementation(mockMkdirSync);

    dccHandler = new DccHandler('./downloads', './.tmp');
  });

  describe('constructor', () => {
    it('should create download and temp directories if they do not exist', () => {
      mockExistsSync.mockReturnValue(false);

      new DccHandler('./downloads', './.tmp');

      expect(mockMkdirSync).toHaveBeenCalledWith('./downloads', { recursive: true });
      expect(mockMkdirSync).toHaveBeenCalledWith('./.tmp', { recursive: true });
    });

    it('should use default directories if not specified', () => {
      mockExistsSync.mockReturnValue(false);

      new DccHandler();

      expect(mockExistsSync).toHaveBeenCalledWith('./downloads');
      expect(mockExistsSync).toHaveBeenCalledWith('./.tmp');
    });
  });

  describe('findTextFile', () => {
    it('should find .txt file in extracted files', () => {
      const files = [
        '/path/file1.pdf',
        '/path/results.txt',
        '/path/file2.epub'
      ];

      const textFile = dccHandler.findTextFile(files);

      expect(textFile).toBe('/path/results.txt');
    });

    it('should find .txt file case-insensitively', () => {
      const files = [
        '/path/file1.pdf',
        '/path/RESULTS.TXT',
        '/path/file2.epub'
      ];

      const textFile = dccHandler.findTextFile(files);

      expect(textFile).toBe('/path/RESULTS.TXT');
    });

    it('should return first .txt file if multiple exist', () => {
      const files = [
        '/path/file1.txt',
        '/path/file2.txt',
        '/path/file3.txt'
      ];

      const textFile = dccHandler.findTextFile(files);

      expect(textFile).toBe('/path/file1.txt');
    });

    it('should return null if no .txt file found', () => {
      const files = [
        '/path/file1.pdf',
        '/path/file2.epub',
        '/path/file3.mobi'
      ];

      const textFile = dccHandler.findTextFile(files);

      expect(textFile).toBeNull();
    });

    it('should return null for empty array', () => {
      const textFile = dccHandler.findTextFile([]);

      expect(textFile).toBeNull();
    });
  });
});
