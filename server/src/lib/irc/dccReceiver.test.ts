import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DccReceiver } from './dccReceiver.js';

describe('DccReceiver', () => {
  describe('parseDccSend', () => {
    it('should parse valid DCC SEND message', () => {
      const message = '\x01DCC SEND test.epub 3232235777 6789 1048576\x01';
      const result = DccReceiver.parseDccSend(message);

      expect(result).toEqual({
        filename: 'test.epub',
        ip: '192.168.1.1',
        port: 6789,
        filesize: 1048576
      });
    });

    it('should parse DCC SEND message without CTCP markers', () => {
      const message = 'DCC SEND book.pdf 2130706433 12345 2097152';
      const result = DccReceiver.parseDccSend(message);

      expect(result).toEqual({
        filename: 'book.pdf',
        ip: '127.0.0.1',
        port: 12345,
        filesize: 2097152
      });
    });

    it('should parse DCC SEND message without filesize', () => {
      const message = 'DCC SEND file.txt 16909060 8080';
      const result = DccReceiver.parseDccSend(message);

      expect(result).toEqual({
        filename: 'file.txt',
        ip: '1.2.3.4',
        port: 8080,
        filesize: 0
      });
    });

    it('should handle filenames with quotes', () => {
      const message = 'DCC SEND "My Book.epub" 3232235777 6789 1048576';
      const result = DccReceiver.parseDccSend(message);

      expect(result?.filename).toBe('"My Book.epub"');
    });

    it('should convert various IP decimal formats correctly', () => {
      const testCases = [
        { decimal: '0', expected: '0.0.0.0' },
        { decimal: '16777217', expected: '1.0.0.1' }, // Fixed: 16777216 = 1.0.0.0, we need +1
        { decimal: '2130706433', expected: '127.0.0.1' },
        { decimal: '3232235777', expected: '192.168.1.1' },
        { decimal: '4294967295', expected: '255.255.255.255' }
      ];

      for (const { decimal, expected } of testCases) {
        const message = `DCC SEND test.txt ${decimal} 1234 1000`;
        const result = DccReceiver.parseDccSend(message);
        expect(result?.ip).toBe(expected);
      }
    });

    it('should return null for invalid message format', () => {
      const invalidMessages = [
        'INVALID MESSAGE',
        'DCC SEND',
        'DCC SEND file.txt',
        'DCC RESUME file.txt 12345 0',
        ''
      ];

      for (const message of invalidMessages) {
        const result = DccReceiver.parseDccSend(message);
        expect(result).toBeNull();
      }
    });

    it('should handle trimmed whitespace in message', () => {
      // The parser trims the entire message first, so external whitespace is removed
      const message = '  DCC SEND file.txt 3232235777 6789 1048576  ';
      const result = DccReceiver.parseDccSend(message);

      expect(result).toEqual({
        filename: 'file.txt',
        ip: '192.168.1.1',
        port: 6789,
        filesize: 1048576
      });
    });

    it('should trim filename', () => {
      const message = 'DCC SEND  file.txt  3232235777 6789 1048576';
      const result = DccReceiver.parseDccSend(message);

      expect(result?.filename).toBe('file.txt');
    });

    it('should handle large filesizes', () => {
      const message = 'DCC SEND hugefile.zip 3232235777 6789 4294967295';
      const result = DccReceiver.parseDccSend(message);

      expect(result?.filesize).toBe(4294967295);
    });

    it('should handle port numbers at edge of range', () => {
      const testCases = [
        { port: '1', expected: 1 },
        { port: '80', expected: 80 },
        { port: '65535', expected: 65535 }
      ];

      for (const { port, expected } of testCases) {
        const message = `DCC SEND file.txt 2130706433 ${port} 1000`;
        const result = DccReceiver.parseDccSend(message);
        expect(result?.port).toBe(expected);
      }
    });
  });
});
