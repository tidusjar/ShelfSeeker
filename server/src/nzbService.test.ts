import { describe, it, expect } from 'vitest';
import { NzbService } from './nzbService.js';

describe('NzbService', () => {
  describe('extractMetadata', () => {
    // Access private method for testing
    const extractMetadata = (title: string) => {
      const service = new NzbService();
      return (service as any).extractMetadata(title);
    };

    it('should extract type from brackets', () => {
      const result = extractMetadata('Author - Book Title [EPUB]');
      expect(result.fileType).toBe('epub');
      expect(result.author).toBe('Author');
      expect(result.title).toBe('Book Title');
    });

    it('should extract type from parentheses - single type', () => {
      const result = extractMetadata('[Mistborn 01] - Mistborn-The Final Empire (epub)');
      expect(result.fileType).toBe('epub');
      expect(result.title).toBe('Mistborn-The Final Empire');
      expect(result.author).toBe('[Mistborn 01]');
    });

    it('should extract type from parentheses - retail variant', () => {
      const result = extractMetadata('[Mistborn 01] - Mistborn-The Final Empire (retail) (azw3)');
      expect(result.fileType).toBe('azw3');
      expect(result.title).toBe('Mistborn-The Final Empire');
      expect(result.author).toBe('[Mistborn 01]');
    });

    it('should ignore non-file-type parentheses like ISBN', () => {
      const result = extractMetadata('Lost Metal A Mistborn Novel (9780765391209)');
      expect(result.fileType).toBe('Unknown');
      expect(result.title).toBe('Lost Metal A Mistborn Novel');
      expect(result.author).toBe('Unknown');
    });

    it('should handle various valid file types', () => {
      const types = ['epub', 'pdf', 'mobi', 'azw', 'azw3', 'azw4', 'kfx', 'prc', 
                     'txt', 'fb2', 'cbr', 'cbz', 'lit', 'djvu', 'rtf'];
      
      types.forEach(type => {
        const result = extractMetadata(`Book Title (${type})`);
        expect(result.fileType).toBe(type);
      });
    });

    it('should handle uppercase types in parentheses', () => {
      const result = extractMetadata('Book Title (EPUB)');
      expect(result.fileType).toBe('epub');
      expect(result.title).toBe('Book Title');
    });

    it('should handle mixed case types', () => {
      const result = extractMetadata('Book Title (ePub)');
      expect(result.fileType).toBe('epub');
      expect(result.title).toBe('Book Title');
    });

    it('should prioritize bracket types over parentheses', () => {
      const result = extractMetadata('Book Title [PDF] (retail) (epub)');
      expect(result.fileType).toBe('pdf');
    });

    it('should handle author and title with dashes', () => {
      const result = extractMetadata('Author Name - Book Title - Subtitle (epub)');
      expect(result.author).toBe('Author Name');
      expect(result.title).toBe('Book Title - Subtitle');
      expect(result.fileType).toBe('epub');
    });

    it('should remove year while preserving other parentheses content', () => {
      const result = extractMetadata('Author - Book Title (2023) [EPUB]');
      expect(result.author).toBe('Author');
      expect(result.title).toBe('Book Title');
      expect(result.fileType).toBe('epub');
    });

    it('should handle title only with type in parentheses', () => {
      const result = extractMetadata('Simple Book Title (mobi)');
      expect(result.author).toBe('Unknown');
      expect(result.title).toBe('Simple Book Title');
      expect(result.fileType).toBe('mobi');
    });

    it('should handle title without any type indicator', () => {
      const result = extractMetadata('Author - Book Title');
      expect(result.author).toBe('Author');
      expect(result.title).toBe('Book Title');
      expect(result.fileType).toBe('Unknown');
    });

    it('should clean up multiple parentheses and brackets', () => {
      const result = extractMetadata('[Series 01] Book Title (retail) (v1.0) (azw3)');
      expect(result.fileType).toBe('azw3');
      // Note: [Series 01] remains because there's no dash to split on
      expect(result.title).toBe('[Series 01] Book Title');
    });

    it('should handle series numbers in brackets correctly', () => {
      const result = extractMetadata('[Book 03] - Author - Title (pdf)');
      expect(result.author).toBe('[Book 03]');
      // Title includes "Author - Title" after first dash split
      expect(result.title).toBe('Author - Title');
      expect(result.fileType).toBe('pdf');
    });

    it('should ignore invalid file types in parentheses', () => {
      const result = extractMetadata('Book Title (hardcover) (retail)');
      expect(result.fileType).toBe('Unknown');
      expect(result.title).toBe('Book Title');
    });

    it('should handle complex real-world example', () => {
      const result = extractMetadata('[Mistborn Era 2 04] - Brandon Sanderson - Lost Metal (retail) (epub)');
      expect(result.author).toBe('[Mistborn Era 2 04]');
      expect(result.title).toBe('Brandon Sanderson - Lost Metal');
      expect(result.fileType).toBe('epub');
    });

    it('should handle Amazon Kindle formats (kfx, azw4, prc)', () => {
      const result1 = extractMetadata('Book Title (kfx)');
      expect(result1.fileType).toBe('kfx');
      
      const result2 = extractMetadata('[Series] - Title (azw4)');
      expect(result2.fileType).toBe('azw4');
      
      const result3 = extractMetadata('Author - Book (prc)');
      expect(result3.fileType).toBe('prc');
    });

    it('should handle comic book formats', () => {
      const result1 = extractMetadata('Comic Book (cbr)');
      expect(result1.fileType).toBe('cbr');
      
      const result2 = extractMetadata('Manga Title (cbz)');
      expect(result2.fileType).toBe('cbz');
    });
  });
});
