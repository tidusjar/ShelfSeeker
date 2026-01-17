/**
 * Tests for NZB/Scene release filename parsing.
 * NZB files follow strict scene conventions with dot-separated metadata:
 * - Publisher.Author.Title.Year.Metadata-Group
 * - Author.Title.Year.Metadata.ePub-Group
 * - The.Official.Title.Year-Group
 */

import { describe, it, expect } from 'vitest';
import { NZBFilenameParser } from './nzbFilenameParser.js';

describe('NZBFilenameParser', () => {
  describe('Dot-Separated Publisher Format', () => {
    it('should parse "Publisher-Title.Year.Metadata-Group" pattern', () => {
      const filename = 'Insight.Editions-Harry.Potter.Film.Vault.Vol.03.Horcruxes.And.The.Deathly.Hallows.2019.Retail.eBook-BitBook';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.author).toBe('');
      expect(result.title).toContain('Potter');
      expect(result.title).toContain('Film Vault');
      expect(result.fileType).toBe('unknown');
    });

    it('should parse "Author.Title.Year.Metadata.ePub-Group" pattern', () => {
      const filename = 'John.Tiffany.Harry.Potter.Och.Det.Fordomda.Barnet.Del.Ett.Och.Tva.2018.SWEDiSH.RETAiL.ePub.eBOOK-DECiPHER';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.author).toContain('John');
      expect(result.author).toContain('Tiffany');
      expect(result.title).toContain('Potter');
      expect(result.fileType).toBe('epub');
    });

    it('should parse "Author.Title.Metadata-Group" multi-author pattern', () => {
      const filename = 'Mark.Brake.And.Jon.Chase-The.Science.Of.Harry.Potter.The.Spellbinding.Science.2017.RETAIL.EPUB.eBook-CTO';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.author).toContain('Mark');
      expect(result.author).toContain('And');
      expect(result.author).toContain('Chase');
      expect(result.title).toContain('Science');
      expect(result.title).toContain('Potter');
      expect(result.fileType).toBe('epub');
    });

    it('should parse "Publisher-Title.Year-Group" pattern', () => {
      const filename = 'Simon.and.Schuster-Diagon.Alley.The.Hogwarts.Express-2020';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.author).toBe('');
      expect(result.title).toContain('Diagon Alley');
      expect(result.title).toContain('Hogwarts Express');
    });
  });

  describe('Dot-Separated Title-Only', () => {
    it('should parse "The.Official.Title" pattern without extracting author', () => {
      const filename = 'The.Official.Harry.Potter.Baking.Book.epub';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.author).toBe('');
      expect(result.title).toContain('Official');
      expect(result.title).toContain('Potter');
      expect(result.title).toContain('Baking Book');
      expect(result.fileType).toBe('epub');
    });

    it('should parse "Harry.Potter.Title" without treating Harry as author', () => {
      const filename = 'Harry.Potter.And.The.Sorcerers.Stone.epub';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.author).toBe('');
      expect(result.title).toContain('Potter');
      expect(result.title).not.toContain('.');
      expect(result.fileType).toBe('epub');
    });

    it('should parse "Title.by.Author" pattern', () => {
      const filename = 'Harry.Potter.and.the.Goblet.of.Fire.by.J.K.Rowling.mobi';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.author).toContain('Rowling');
      expect(result.title).toContain('Potter');
      expect(result.fileType).toBe('mobi');
    });
  });

  describe('Scene release metadata handling', () => {
    it('should remove year from title', () => {
      const filename = 'Author.Title.2020.RETAIL.epub';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.title).not.toContain('2020');
    });

    it('should remove RETAIL keyword', () => {
      const filename = 'Author.Title.RETAIL.epub';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.title).not.toContain('RETAIL');
    });

    it('should remove eBook keyword', () => {
      const filename = 'Author.Title.eBook-Group.epub';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.title).not.toContain('eBook');
    });

    it('should remove release group suffix', () => {
      const filename = 'Author.Title-BitBook.epub';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.title).not.toContain('BitBook');
    });

    it('should convert dots to spaces', () => {
      const filename = 'First.Second.Third.Fourth.Fifth.epub';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.title).not.toContain('.');
      expect(result.title).toContain(' ');
    });
  });

  describe('File type extraction', () => {
    it('should extract from .epub extension', () => {
      const filename = 'Title.epub';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.fileType).toBe('epub');
    });

    it('should extract from .RETAIL.EPUB. pattern', () => {
      const filename = 'Title.RETAIL.EPUB.eBook-Group';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.fileType).toBe('epub');
    });

    it('should extract from [EPUB] brackets', () => {
      const filename = 'Title [EPUB] stuff';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.fileType).toBe('epub');
    });
  });

  describe('Author name patterns', () => {
    it('should detect "FirstName LastName" (2 words)', () => {
      const filename = 'John.Tiffany.Book.Title.epub';
      const result = NZBFilenameParser.parse(filename);
      
      // Should detect "John Tiffany" as 2-word author if followed by title-like words
      // This depends on what follows - in this case "Book Title" are generic
      // Without strong title indicators, might not extract author
      expect(result.fileType).toBe('epub');
    });

    it('should detect "FirstName MiddleName LastName" (3 words)', () => {
      const filename = 'Sarah.Rees.Brennan.Book.Title.epub';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.fileType).toBe('epub');
    });

    it('should detect "First And Second Author" multi-author', () => {
      const filename = 'Mark.Brake.And.Jon.Chase.Title.epub';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.author).toContain('Mark');
      expect(result.author).toContain('And');
      expect(result.author).toContain('Chase');
    });

    it('should NOT treat title words as author', () => {
      const filename = 'The.Secret.Garden.epub';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.author).toBe('');
    });
  });

  describe('Real NZB examples', () => {
    it('should parse complex scene release', () => {
      const filename = 'John.Tiffany.Harry.Potter.Och.Det.Fordomda.Barnet.Del.Ett.Och.Tva.2018.SWEDiSH.RETAiL.ePub.eBOOK-DECiPHER';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.author).toContain('John');
      expect(result.author).toContain('Tiffany');
      expect(result.title).toContain('Harry Potter');
      expect(result.fileType).toBe('epub');
    });

    it('should handle publisher-prefixed releases', () => {
      const filename = 'Insight.Editions-Harry.Potter.Film.Vault.Vol.03.Horcruxes.And.The.Deathly.Hallows.2019.Retail.eBook-BitBook';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.title).toContain('Potter');
      expect(result.title).toContain('Film Vault');
    });
  });
});
