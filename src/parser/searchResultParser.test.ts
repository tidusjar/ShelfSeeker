import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchResultParser } from './searchResultParser.js';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SearchResultParser', () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'shelfseeker-test-'));
    tempFile = join(tempDir, 'search-results.txt');
  });

  afterEach(() => {
    try {
      unlinkSync(tempFile);
    } catch {
      // File may not exist
    }
  });

  describe('parse', () => {
    it('should parse valid search results with author and title', () => {
      const content = `!Bsk JK Rowling - Harry Potter and the Philosopher's Stone.epub  ::INFO:: 2.5MB
!SearchBot Stephen King - The Shining.pdf  ::INFO:: 1.8MB`;
      
      writeFileSync(tempFile, content);
      const results = SearchResultParser.parse(tempFile);

      expect(results).toHaveLength(2);
      
      expect(results[0]).toEqual({
        botCommand: '!Bsk',
        filename: "JK Rowling - Harry Potter and the Philosopher's Stone.epub",
        filesize: '2.5MB',
        rawCommand: "!Bsk JK Rowling - Harry Potter and the Philosopher's Stone.epub",
        title: "Harry Potter and the Philosopher's Stone",
        author: 'JK Rowling',
        fileType: 'epub'
      });

      expect(results[1]).toEqual({
        botCommand: '!SearchBot',
        filename: 'Stephen King - The Shining.pdf',
        filesize: '1.8MB',
        rawCommand: '!SearchBot Stephen King - The Shining.pdf',
        title: 'The Shining',
        author: 'Stephen King',
        fileType: 'pdf'
      });
    });

    it('should parse results with title only (no author)', () => {
      const content = '!Ebook The Great Book.mobi  ::INFO:: 500KB';
      
      writeFileSync(tempFile, content);
      const results = SearchResultParser.parse(tempFile);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        botCommand: '!Ebook',
        filename: 'The Great Book.mobi',
        filesize: '500KB',
        rawCommand: '!Ebook The Great Book.mobi',
        title: 'The Great Book',
        author: '',
        fileType: 'mobi'
      });
    });

    it('should parse results with hash prefix (Pattern 1: HASH | filename)', () => {
      const content = '!Bot abc123 | Author - Book Title.epub  ::INFO:: 1.5MB';
      
      writeFileSync(tempFile, content);
      const results = SearchResultParser.parse(tempFile);

      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('Author - Book Title.epub');
      expect(results[0].author).toBe('Author');
      expect(results[0].title).toBe('Book Title');
    });

    it('should parse results with percent-encoded hash (Pattern 2: %HASH% filename)', () => {
      const content = '!Bot %ABC123% Author - Book Title.pdf  ::INFO:: 2MB';
      
      writeFileSync(tempFile, content);
      const results = SearchResultParser.parse(tempFile);

      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('Author - Book Title.pdf');
      expect(results[0].author).toBe('Author');
      expect(results[0].title).toBe('Book Title');
    });

    it('should handle multiple dashes in filename (series names)', () => {
      // Real IRC pattern: Title - Subtitle - Author
      const content = '!Bot Diary of a Wimpy Kid - Book 01 - Hard Luck - Jeff Kinney.epub  ::INFO:: 1MB';
      
      writeFileSync(tempFile, content);
      const results = SearchResultParser.parse(tempFile);

      expect(results).toHaveLength(1);
      // IRC pattern: author at end
      expect(results[0].author).toBe('Jeff Kinney');
      expect(results[0].title).toContain('Diary of a Wimpy Kid');
      expect(results[0].title).toContain('Hard Luck');
      expect(results[0].fileType).toBe('epub');
    });

    it('should handle various file types', () => {
      const content = `!Bot1 Book1.epub  ::INFO:: 1MB
!Bot2 Book2.pdf  ::INFO:: 2MB
!Bot3 Book3.mobi  ::INFO:: 3MB
!Bot4 Book4.azw3  ::INFO:: 4MB
!Bot5 Book6.txt  ::INFO:: 5KB`;
      
      writeFileSync(tempFile, content);
      const results = SearchResultParser.parse(tempFile);

      expect(results).toHaveLength(5);
      expect(results[0].fileType).toBe('epub');
      expect(results[1].fileType).toBe('pdf');
      expect(results[2].fileType).toBe('mobi');
      expect(results[3].fileType).toBe('azw3');
      expect(results[4].fileType).toBe('txt');
    });

    it('should skip empty lines', () => {
      const content = `!Bot1 Book1.epub  ::INFO:: 1MB

!Bot2 Book2.pdf  ::INFO:: 2MB

`;
      
      writeFileSync(tempFile, content);
      const results = SearchResultParser.parse(tempFile);

      expect(results).toHaveLength(2);
    });

    it('should skip lines without ::INFO::', () => {
      const content = `Header line
!Bot1 Book1.epub  ::INFO:: 1MB
Some other text
!Bot2 Book2.pdf  ::INFO:: 2MB
Footer line`;
      
      writeFileSync(tempFile, content);
      const results = SearchResultParser.parse(tempFile);

      expect(results).toHaveLength(2);
    });

    it('should handle file without extension', () => {
      const content = '!Bot Author - BookWithoutExtension  ::INFO:: 1MB';
      
      writeFileSync(tempFile, content);
      const results = SearchResultParser.parse(tempFile);

      expect(results).toHaveLength(1);
      expect(results[0].fileType).toBe('unknown');
      expect(results[0].title).toBe('BookWithoutExtension');
    });

    it('should return empty array for file with no valid results', () => {
      const content = `Header
Some random text
No valid lines`;
      
      writeFileSync(tempFile, content);
      const results = SearchResultParser.parse(tempFile);

      expect(results).toHaveLength(0);
    });

    it('should handle KB, MB file sizes', () => {
      const content = `!Bot1 Book1.epub  ::INFO:: 500KB
!Bot2 Book2.pdf  ::INFO:: 2.5MB
!Bot3 Book3.mobi  ::INFO:: 1024KB`;
      
      writeFileSync(tempFile, content);
      const results = SearchResultParser.parse(tempFile);

      expect(results).toHaveLength(3);
      expect(results[0].filesize).toBe('500KB');
      expect(results[1].filesize).toBe('2.5MB');
      expect(results[2].filesize).toBe('1024KB');
    });
  });

  describe('hasResults', () => {
    it('should return true when file has valid results', () => {
      const content = '!Bot Book.epub  ::INFO:: 1MB';
      writeFileSync(tempFile, content);

      expect(SearchResultParser.hasResults(tempFile)).toBe(true);
    });

    it('should return false when file has no valid results', () => {
      const content = 'Just some text';
      writeFileSync(tempFile, content);

      expect(SearchResultParser.hasResults(tempFile)).toBe(false);
    });

    it('should return false for non-existent file', () => {
      expect(SearchResultParser.hasResults('/non/existent/file.txt')).toBe(false);
    });
  });

  describe('extractMetadata', () => {
    it('should extract author and title from standard format', () => {
      // Access private method through type casting
      const extractMetadata = (SearchResultParser as any).extractMetadata.bind(SearchResultParser);
      
      const result = extractMetadata('Stephen King - The Shining.epub');
      expect(result).toEqual({
        title: 'The Shining',
        author: 'Stephen King',
        fileType: 'epub'
      });
    });

    it('should handle title only', () => {
      const extractMetadata = (SearchResultParser as any).extractMetadata.bind(SearchResultParser);
      
      const result = extractMetadata('Book Title.pdf');
      expect(result).toEqual({
        title: 'Book Title',
        author: '',
        fileType: 'pdf'
      });
    });

    it('should preserve multiple dashes in title', () => {
      const extractMetadata = (SearchResultParser as any).extractMetadata.bind(SearchResultParser);
      
      // Realistic IRC pattern with author at end
      const result = extractMetadata('Diary of a Wimpy Kid - Hard Luck - Jeff Kinney.mobi');
      expect(result).toEqual({
        title: 'Diary of a Wimpy Kid - Hard Luck',
        author: 'Jeff Kinney',
        fileType: 'mobi'
      });
    });

    it('should handle uppercase extensions', () => {
      const extractMetadata = (SearchResultParser as any).extractMetadata.bind(SearchResultParser);
      
      const result = extractMetadata('Book.EPUB');
      expect(result).toEqual({
        title: 'Book',
        author: '',
        fileType: 'epub'
      });
    });
  });
});
