/**
 * Tests for IRC-specific filename parsing.
 * IRC bots serve files with human-readable names, often in these formats:
 * - Author - Title
 * - Title - Subtitle - Author
 * - Title - Author (with comma-separated author)
 * - Author - [Series XX] - Title
 */

import { describe, it, expect } from 'vitest';
import { IRCFilenameParser } from './ircFilenameParser.js';

describe('IRCFilenameParser', () => {
  describe('Real IRC Examples from Diary of a Wimpy Kid search', () => {
    it('should parse "Author - Title - Book XX.ext"', () => {
      // Pattern: Author - Series/Title - Book Number
      const filename = 'Cube Kid - Minecraft- Diary of a Wimpy Villager - Book 02.epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Cube Kid');
      expect(result.title).toContain('Minecraft');
      expect(result.title).toContain('Diary of a Wimpy Villager');
      expect(result.fileType).toBe('epub');
    });

    it('should parse "Title - Subtitle - Author.ext" with author at end', () => {
      const filename = 'Diary of a Wimpy Kid - Old School - Jeff Kinney.epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Jeff Kinney');
      expect(result.title).toBe('Diary of a Wimpy Kid - Old School');
      expect(result.fileType).toBe('epub');
    });

    it('should parse "Title XX - Subtitle - Author.ext"', () => {
      const filename = 'Diary Of A Wimpy Kid 08 - Hard Luck - Jeff Kinney.epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Jeff Kinney');
      expect(result.title).toBe('Diary Of A Wimpy Kid 08 - Hard Luck');
      expect(result.fileType).toBe('epub');
    });

    it('should parse "Title (Series, Book X) - LastName, FirstName.ext"', () => {
      const filename = 'Cabin Fever (Diary of a Wimpy Kid, Book 6) - Kinney, Jeff.mobi';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Jeff Kinney');
      expect(result.title).toBe('Cabin Fever (Diary of a Wimpy Kid, Book 6)');
      expect(result.fileType).toBe('mobi');
    });

    it('should parse "Author - [Series XX] - Title (metadata).ext"', () => {
      const filename = 'Jeff Kinney - [Diary of a Wimpy Kid 13] - The Meltdown (retail) (azw3).azw3';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Jeff Kinney');
      expect(result.title).toContain('Meltdown');
      expect(result.fileType).toBe('azw3');
    });

    it('should parse "Title (Series, Book X) - LastName, FirstName.ext" variant', () => {
      const filename = 'Dog Days (Diary of a Wimpy Kid, Book 4) - Kinney, Jeff.pdf';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Jeff Kinney');
      expect(result.title).toBe('Dog Days (Diary of a Wimpy Kid, Book 4)');
      expect(result.fileType).toBe('pdf');
    });

    it('should parse "Title Subtitle Number.ext" (no author)', () => {
      const filename = 'Diary of a Wimpy Kid The Third Wheel 7.epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('');
      expect(result.title).toBe('Diary of a Wimpy Kid The Third Wheel 7');
      expect(result.fileType).toBe('epub');
    });

    it('should parse "Title by Author (Series X).ext"', () => {
      const filename = 'Double Down by Jeff Kinney (Diary of a Wimpy Kid 11).pdf';
      const result = IRCFilenameParser.parse(filename);
      
      // Author should be extracted without series info
      expect(result.author).toBe('Jeff Kinney');
      expect(result.title).toBe('Double Down');
      expect(result.fileType).toBe('pdf');
    });

    it('should parse "Author - (Series XX) - Title (metadata).ext"', () => {
      const filename = 'Jeff Kinney - (Diary of a Wimpy Kid 01) - Diary of a Wimpy Kid (retail).epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Jeff Kinney');
      expect(result.title).toContain('Diary of a Wimpy Kid');
      expect(result.fileType).toBe('epub');
    });

    it('should parse "Title - Author.ext" simple format', () => {
      const filename = 'Diary of a Wimpy Kid - Jeff Kinney.epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Jeff Kinney');
      expect(result.title).toBe('Diary of a Wimpy Kid');
      expect(result.fileType).toBe('epub');
    });
  });

  describe('Common IRC patterns', () => {
    it('should parse standard IRC format "Author - Title"', () => {
      const filename = 'John Smith - Some Book Title.epub';
      const result = IRCFilenameParser.parse(filename);

      expect(result.author).toBe('John Smith');
      expect(result.title).toBe('Some Book Title');
    });

    it('should detect "LastName, FirstName" format', () => {
      // Comma-separated name is a strong author indicator
      const filename = 'Smith, John - Book Title.epub';
      const result = IRCFilenameParser.parse(filename);

      expect(result.author).toBe('John Smith');
      expect(result.title).toBe('Book Title');
    });

    it('should detect "I.N. LastName" pattern', () => {
      // Initials pattern is a strong author indicator
      const filename = 'J.K. Rowling - Harry Potter.epub';
      const result = IRCFilenameParser.parse(filename);

      expect(result.author).toBe('J.K. Rowling');
      expect(result.title).toBe('Harry Potter');
    });

    it('should handle "Author - Title" with "The" in title', () => {
      const filename = 'Stephen King - The Shining.pdf';
      const result = IRCFilenameParser.parse(filename);

      expect(result.author).toBe('Stephen King');
      expect(result.title).toBe('The Shining');
    });

    it('should handle ambiguous multi-part filenames', () => {
      // This is genuinely ambiguous - in practice, this format is rare
      // Our parser will detect the first author-like part
      const filename = 'Hugo Award Winner - J K Rowling - Harry Potter.epub';
      const result = IRCFilenameParser.parse(filename);
      
      // First part looks like author (3 capitalized words), so it takes priority
      // In reality, "J K Rowling" is the author, but without better context,
      // the parser chooses the first author-like part
      expect(result.author).toBe('Hugo Award Winner');
      expect(result.title).toBe('J K Rowling - Harry Potter');
      
      // Note: A better-formatted filename would be:
      // "J K Rowling - Harry Potter.epub" or 
      // "J K Rowling - [Hugo Award Winner] - Harry Potter.epub"
    });
  });

  describe('Edge cases', () => {
    it('should handle title with numbers but author at end', () => {
      const filename = 'Book 2020 Something - Author Name.epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Author Name');
      expect(result.title).toContain('2020');
    });

    it('should handle very long titles', () => {
      const filename = 'This Is A Really Long Book Title That Goes On And On - John Smith.epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('John Smith');
      expect(result.title).toBe('This Is A Really Long Book Title That Goes On And On');
    });

    it('should handle single word author', () => {
      // IRC format: Author - Title (single-name author like Madonna, Cher)
      const filename = 'Madonna - Evita Soundtrack.epub';
      const result = IRCFilenameParser.parse(filename);

      expect(result.author).toBe('Madonna');
      expect(result.title).toBe('Evita Soundtrack');
    });

    it('should extract file type correctly', () => {
      const filename = 'Author - Title.epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.fileType).toBe('epub');
    });

    it('should extract file type from (azw3) metadata', () => {
      const filename = 'Author - Title (retail) (azw3).azw3';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.fileType).toBe('azw3');
    });
  });

  describe('Integration with search results', () => {
    it('should handle filenames from !Bsk bot', () => {
      const filename = 'Diary of a Wimpy Kid - The Long Haul - Jeff Kinney.epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Jeff Kinney');
      expect(result.title).toBe('Diary of a Wimpy Kid - The Long Haul');
    });

    it('should handle filenames from !Dumbledoo bot', () => {
      const filename = 'Cube Kid - Minecraft- Diary of a Wimpy Villager - Book 01 (retail).epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Cube Kid');
      expect(result.title).toContain('Minecraft');
      expect(result.title).toContain('Villager');
    });
  });

  describe('Mistborn-style patterns (Brandon Sanderson examples)', () => {
    it('should parse "Author - [Series XX] - Title.ext"', () => {
      const filename = 'Brandon Sanderson - [Mistborn 01] - The Final Empire.epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Brandon Sanderson');
      expect(result.title).toBe('The Final Empire');
      expect(result.fileType).toBe('epub');
    });

    it('should parse "[Series XX] - Title.ext" (no author)', () => {
      const filename = '[Mistborn 01] - The Final Empire.epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('');
      expect(result.title).toBe('The Final Empire');
      expect(result.fileType).toBe('epub');
    });

    it('should parse "Author - [Series XX] - Title () () ().rar"', () => {
      const filename = 'Brandon Sanderson - [Mistborn 01] - Mistborn-The Final Empire () () ().rar';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Brandon Sanderson');
      expect(result.title).toBe('Mistborn-The Final Empire');
      expect(result.fileType).toBe('archive');
    });

    it('should parse "LastName, FirstName - Series XX - Title.ext"', () => {
      const filename = 'Sanderson, Brandon - Mistborn 01 - The Final Empire.epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Brandon Sanderson');
      expect(result.title).toBe('Mistborn 01 - The Final Empire');
      expect(result.fileType).toBe('epub');
    });

    it('should parse "[Series XX-XX] - Title Omnibus.rar"', () => {
      const filename = '[Mistborn 01-03] - The Mistborn Trilogy Omnibus.rar';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('');
      expect(result.title).toBe('The Mistborn Trilogy Omnibus');
      expect(result.fileType).toBe('archive');
    });

    it('should parse "Author - (Series XX) - Title (retail).epub"', () => {
      const filename = 'Brandon Sanderson - (Mistborn 01) - The Final Empire (retail).epub';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Brandon Sanderson');
      expect(result.title).toBe('The Final Empire');
      expect(result.fileType).toBe('epub');
    });

    it('should parse "Author - Title - Subtitle.rar"', () => {
      const filename = 'Brandon Sanderson - Mistborn - Secret History.rar';
      const result = IRCFilenameParser.parse(filename);
      
      expect(result.author).toBe('Brandon Sanderson');
      expect(result.title).toBe('Mistborn - Secret History');
      expect(result.fileType).toBe('archive');
    });

    it('should handle archive file extensions correctly', () => {
      const filenameRar = 'Author - Title.rar';
      const filenameZip = 'Author - Title.zip';
      const filename7z = 'Author - Title.7z';
      
      expect(IRCFilenameParser.parse(filenameRar).fileType).toBe('archive');
      expect(IRCFilenameParser.parse(filenameZip).fileType).toBe('archive');
      expect(IRCFilenameParser.parse(filename7z).fileType).toBe('archive');
    });
  });
});
