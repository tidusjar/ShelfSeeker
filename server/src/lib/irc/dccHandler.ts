import { EventEmitter } from 'events';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
// @ts-expect-error - adm-zip has no type definitions
import AdmZip from 'adm-zip';

export interface DccTransfer {
  filename: string;
  size: number;
  nick: string;
  port: number;
  ip: string;
}

export interface DccDownloadResult {
  filename: string;
  filepath: string;
  isZip: boolean;
  extractedFiles?: string[];
}

/**
 * Handles DCC file transfers from IRC bots
 */
export class DccHandler extends EventEmitter {
  private downloadDir: string;
  private tempDir: string;

  constructor(downloadDir: string = './downloads', tempDir: string = './.tmp') {
    super();
    this.downloadDir = downloadDir;
    this.tempDir = tempDir;

    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure download and temp directories exist
   */
  private ensureDirectories(): void {
    if (!existsSync(this.downloadDir)) {
      mkdirSync(this.downloadDir, { recursive: true });
    }
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Handle an incoming DCC transfer
   * @param transfer DCC transfer information from irc-framework
   * @param stream Readable stream from irc-framework
   * @param isSearchResult Whether this is a search result (goes to temp) or ebook (goes to downloads)
   */
  async handleTransfer(
    transfer: DccTransfer,
    stream: NodeJS.ReadableStream,
    isSearchResult: boolean = false
  ): Promise<DccDownloadResult> {
    const targetDir = isSearchResult ? this.tempDir : this.downloadDir;
    let filename = transfer.filename;

    // Handle filename collisions by appending timestamp
    let filepath = join(targetDir, filename);
    if (existsSync(filepath) && !isSearchResult) {
      const timestamp = Date.now();
      const parts = filename.split('.');
      const ext = parts.pop();
      const base = parts.join('.');
      filename = `${base}_${timestamp}.${ext}`;
      filepath = join(targetDir, filename);
    }

    // Download the file
    await this.downloadFile(stream, filepath);

    // If it's a zip file, extract it
    const isZip = filename.toLowerCase().endsWith('.zip');
    let extractedFiles: string[] | undefined;

    if (isZip) {
      extractedFiles = await this._extractZip(filepath, targetDir);
    }

    return {
      filename,
      filepath,
      isZip,
      extractedFiles
    };
  }

  /**
   * Download a file from a stream
   */
  private downloadFile(stream: NodeJS.ReadableStream, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filepath);

      stream.pipe(writeStream);

      writeStream.on('finish', () => {
        resolve();
      });

      writeStream.on('error', (err) => {
        reject(err);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Extract a zip file (private implementation)
   */
  private async _extractZip(zipPath: string, targetDir: string): Promise<string[]> {
    try {
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();
      const extractedFiles: string[] = [];

      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          const extractedPath = join(targetDir, entry.entryName);
          zip.extractEntryTo(entry, targetDir, false, true);
          extractedFiles.push(extractedPath);
        }
      }

      return extractedFiles;
    } catch (error) {
      throw new Error(`Failed to extract zip file: ${error}`);
    }
  }

  /**
   * Public method to extract a zip file
   */
  async extractZip(zipPath: string, targetDir: string): Promise<string[]> {
    return this._extractZip(zipPath, targetDir);
  }

  /**
   * Find the .txt file in extracted files (for search results)
   */
  findTextFile(extractedFiles: string[]): string | null {
    return extractedFiles.find(f => f.toLowerCase().endsWith('.txt')) || null;
  }
}
