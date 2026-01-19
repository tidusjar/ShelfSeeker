import { EventEmitter } from 'events';
import { Socket } from 'net';
import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';
import { TIMEOUTS } from '../../constants.js';
import { logger } from '../logger.js';

/**
 * DCC SEND protocol handler
 * Parses CTCP DCC messages and downloads files via TCP
 */
export class DccReceiver extends EventEmitter {
  /**
   * Parse a CTCP DCC SEND message
   * Format: DCC SEND filename ip port filesize
   * IP is in decimal format (convert from dotted notation)
   */
  static parseDccSend(message: string): {
    filename: string;
    ip: string;
    port: number;
    filesize: number;
  } | null {
    // CTCP messages are wrapped in \x01 characters
    const cleanMessage = message.replace(/\x01/g, '').trim();
    
    // Match: DCC SEND filename ip port filesize
    const match = cleanMessage.match(/^DCC SEND (.+?) (\d+) (\d+)(?: (\d+))?$/);
    
    if (!match) {
      logger.info('[DCC] Failed to parse DCC SEND message', { message: cleanMessage });
      return null;
    }

    const [, filename, ipDecimal, portStr, filesizeStr] = match;
    
    // Convert decimal IP to dotted notation
    const ipNum = parseInt(ipDecimal, 10);
    const ip = [
      (ipNum >>> 24) & 0xFF,
      (ipNum >>> 16) & 0xFF,
      (ipNum >>> 8) & 0xFF,
      ipNum & 0xFF
    ].join('.');

    return {
      filename: filename.trim(),
      ip,
      port: parseInt(portStr, 10),
      filesize: filesizeStr ? parseInt(filesizeStr, 10) : 0
    };
  }

  /**
   * Download a file via DCC
   */
  static async downloadFile(
    filename: string,
    ip: string,
    port: number,
    filesize: number,
    outputPath: string,
    onProgress?: (bytesReceived: number, totalBytes: number) => void
  ): Promise<{ filename: string; filepath: string; size: number }> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      const filepath = join(outputPath, filename);
      const writeStream = createWriteStream(filepath);
      
      let bytesReceived = 0;

      socket.on('data', (chunk: Buffer) => {
        writeStream.write(chunk);
        bytesReceived += chunk.length;

        // Call progress callback if provided
        if (onProgress) {
          onProgress(bytesReceived, filesize);
        }

        // Send acknowledgment (DCC SEND protocol requirement)
        const ack = Buffer.allocUnsafe(4);
        ack.writeUInt32BE(bytesReceived, 0);
        socket.write(ack);

        // Check if transfer is complete
        if (filesize > 0 && bytesReceived >= filesize) {
          writeStream.end();
          socket.end();
        }
      });

      socket.on('end', () => {
        writeStream.end();
        resolve({ filename, filepath, size: bytesReceived });
      });

      socket.on('error', (err) => {
        writeStream.end();
        reject(err);
      });

      writeStream.on('error', (err) => {
        socket.destroy();
        reject(err);
      });

      // Connect to the DCC server
      socket.connect(port, ip);

      // Timeout after inactivity
      socket.setTimeout(TIMEOUTS.DCC_SOCKET, () => {
        socket.destroy();
        reject(new Error('DCC transfer timeout'));
      });
    });
  }
}
