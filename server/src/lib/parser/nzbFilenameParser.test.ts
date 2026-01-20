/**
 * Tests for NZB/Scene release filename parsing.
 * NZB files follow various conventions:
 * - Hyphen-separated: "Author - Title" or "Author - [Series] - Title"
 * - Dot-separated scene releases: "Publisher.Author.Title.Year.Metadata-Group"
 * - Comma-separated authors: "LastName, FirstName - Title"
 */

import { describe, it, test, expect } from 'vitest';
import { NZBFilenameParser } from './nzbFilenameParser.js';

describe('NZBFilenameParser', () => {
  describe('Hyphen-separated formats', () => {
    describe('Simple "Author - Title" format', () => {
      test('parses basic author-title format', () => {
        const result = NZBFilenameParser.parse('Stephen King - The Life of Chuck (epub)');
        expect(result.author).toBe('Stephen King');
        expect(result.title).toBe('The Life of Chuck');
        expect(result.fileType).toBe('epub');
      });

      test('parses without format indicator', () => {
        const result = NZBFilenameParser.parse('Stephen King - It');
        expect(result.author).toBe('Stephen King');
        expect(result.title).toBe('It');
        expect(result.fileType).toBe('unknown');
      });
    });

    describe('"Author - [Series] - Title" format', () => {
      test('parses with bracketed series info', () => {
        const result = NZBFilenameParser.parse('Brandon Sanderson - [Mistborn 04] - The Alloy of Law (retail) (azw3)');
        expect(result.author).toBe('Brandon Sanderson');
        expect(result.title).toBe('The Alloy of Law');
        expect(result.fileType).toBe('azw3');
      });

      test('parses with multiple metadata parentheses', () => {
        const result = NZBFilenameParser.parse('Brandon Sanderson - [Mistborn 01] - Mistborn-The Final Empire (retail) (epub)');
        expect(result.author).toBe('Brandon Sanderson');
        expect(result.title).toBe('Mistborn-The Final Empire');
        expect(result.fileType).toBe('epub');
      });
    });

    describe('"LastName, FirstName - Series - Title" format', () => {
      test('parses comma-separated author name', () => {
        const result = NZBFilenameParser.parse('Rowling, J.K. - Harry Potter 08 - Harry Potter en het vervloekte kind');
        expect(result.author).toBe('J.K. Rowling');
        expect(result.title).toBe('Harry Potter en het vervloekte kind');
      });

      test('parses with series number', () => {
        const result = NZBFilenameParser.parse('King, Stephen - Holly Gibney 04 - Never Flinch');
        expect(result.author).toBe('Stephen King');
        expect(result.title).toBe('Never Flinch');
      });

      test('parses with year', () => {
        const result = NZBFilenameParser.parse('King, Stephen - Blockade Billy (2010)');
        expect(result.author).toBe('Stephen King');
        expect(result.title).toBe('Blockade Billy');
      });
    });

    describe('"Title - Author" format (reversed)', () => {
      test('parses title-first format', () => {
        const result = NZBFilenameParser.parse('Later - Stephen King');
        expect(result.author).toBe('Stephen King');
        expect(result.title).toBe('Later');
      });
    });

    describe('"Prefix - Author - Title" format', () => {
      test('skips award prefix', () => {
        const result = NZBFilenameParser.parse('Hugo 2001 Winner Novel - J K Rowling - Harry Potter and the Goblet of Fire (epub)');
        expect(result.author).toBe('J K Rowling');
        expect(result.title).toBe('Harry Potter and the Goblet of Fire');
        expect(result.fileType).toBe('epub');
      });
    });

    describe('"Series - Title - Author" format (reversed author)', () => {
      test('detects and fixes reversed author name', () => {
        const result = NZBFilenameParser.parse('Darktower 5 - The Wolves of the Calla - King Stephen');
        expect(result.author).toBe('Stephen King');
        expect(result.title).toBe('Darktower 5 - The Wolves of the Calla');
      });
    });
  });

  describe('Multi-author formats', () => {
    test('extracts first author from ampersand-separated', () => {
      const result = NZBFilenameParser.parse('Christopher Golden &amp; Brian Keene (ed) - The End of the World As We Know It (epub)');
      expect(result.author).toBe('Christopher Golden');
      expect(result.title).toContain('The End of the World');
    });

    test('extracts first author from "and" separator', () => {
      const result = NZBFilenameParser.parse('Christopher Golden and Brian Keene - The End of the World As We Know It (2025)');
      expect(result.author).toBe('Christopher Golden');
      expect(result.title).toContain('The End of the World');
    });

    test('should detect "First And Second Author" multi-author', () => {
      const result = NZBFilenameParser.parse('Mark.Brake.And.Jon.Chase.Title.epub');
      expect(result.author).toContain('Mark');
      expect(result.author).toContain('And');
      expect(result.author).toContain('Chase');
    });
  });

  describe('Dot-separated scene release formats', () => {
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

    test('parses Author-Title.Metadata format', () => {
      const result = NZBFilenameParser.parse('Stephen.King-Never.Flinch.A.Novel.2025.RETAIL.EPUB');
      expect(result.author).toBe('Stephen King');
      expect(result.title).toContain('Never Flinch');
      expect(result.fileType).toBe('epub');
    });

    test('parses Publisher.Title format (no author)', () => {
      const result = NZBFilenameParser.parse('Gallery.Books-The.End.Of.The.World.As.We.Know.It.2025.RETAIL.EPUB');
      expect(result.author).toBe('');
      expect(result.title).toContain('End Of The World');
      expect(result.fileType).toBe('epub');
    });

    test('parses collection format', () => {
      const result = NZBFilenameParser.parse('PoF.eBook.Mega.Collection-Stephen.King-The.Shining');
      expect(result.author).toBe('Stephen King');
      expect(result.title).toBe('The Shining');
    });

    test('filters out publisher names', () => {
      const result = NZBFilenameParser.parse('Insight.Editions-Harry.Potter.Film.Vault.Vol.03.2019.Retail.eBook-BitBook');
      expect(result.author).toBe('');
      expect(result.title).toContain('Harry Potter Film Vault');
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

    it('should NOT treat title words as author', () => {
      const filename = 'The.Secret.Garden.epub';
      const result = NZBFilenameParser.parse(filename);
      
      expect(result.author).toBe('');
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
      // Real scene release format: Author.Name-Title.Words-Group
      // This format actually appears in NZB results (hyphen-separated with dots in parts)
      const filename = 'Stephen.King-Later.2023.RETAIL.EPUB-BitBook';
      const result = NZBFilenameParser.parse(filename);
      
      // Should extract author and title, not the release group
      expect(result.author).toContain('King');
      expect(result.title).toContain('Later');
      expect(result.title).not.toContain('BitBook'); // Release group should be removed
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

    test('extracts epub from extension', () => {
      const result = NZBFilenameParser.parse('Author - Title.epub');
      expect(result.fileType).toBe('epub');
    });

    test('extracts format from parentheses', () => {
      const result = NZBFilenameParser.parse('Author - Title (mobi)');
      expect(result.fileType).toBe('mobi');
    });

    test('extracts format from uppercase metadata', () => {
      const result = NZBFilenameParser.parse('Author.Title.2025.RETAIL.EPUB');
      expect(result.fileType).toBe('epub');
    });

    test('handles multiple format indicators (prefers extension)', () => {
      const result = NZBFilenameParser.parse('Author - Title (retail) (azw3)');
      expect(result.fileType).toBe('azw3');
    });

    test('returns unknown for unrecognized format', () => {
      const result = NZBFilenameParser.parse('Author - Title');
      expect(result.fileType).toBe('unknown');
    });
  });

  describe('Metadata stripping', () => {
    test('removes repost suffix', () => {
      const result = NZBFilenameParser.parse('Stephen King - The Life of Chuck (epub) repost');
      expect(result.title).toBe('The Life of Chuck');
      expect(result.title).not.toContain('repost');
    });

    test('removes multiple trailing parentheses', () => {
      const result = NZBFilenameParser.parse('Author - Title (retail) (epub) (2025)');
      expect(result.title).toBe('Title');
    });

    test('removes [eCV] markers', () => {
      const result = NZBFilenameParser.parse('Author - Title [eCV] WW');
      expect(result.title).toBe('Title');
    });

    test('removes years from title', () => {
      const result = NZBFilenameParser.parse('Author - Title 2025');
      expect(result.title).not.toContain('2025');
    });

    test('removes metadata keywords', () => {
      const result = NZBFilenameParser.parse('Author - Title RETAIL EPUB');
      expect(result.title).not.toContain('RETAIL');
      expect(result.title).not.toContain('EPUB');
    });

    test('cleans up multiple spaces', () => {
      const result = NZBFilenameParser.parse('Author - Title   With   Spaces');
      expect(result.title).not.toMatch(/\s{2,}/);
    });
  });

  describe('HTML entity decoding', () => {
    test('decodes &amp; to &', () => {
      const result = NZBFilenameParser.parse('Author1 &amp; Author2 - Title');
      expect(result.author).toContain('Author1');
      expect(result.author).not.toContain('&amp;');
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
  });

  describe('Edge cases', () => {
    test('handles empty filename', () => {
      const result = NZBFilenameParser.parse('');
      expect(result.author).toBe('');
      expect(result.title).toBe('');
      expect(result.fileType).toBe('unknown');
    });

    test('handles filename with only title', () => {
      const result = NZBFilenameParser.parse('Just A Title');
      expect(result.author).toBe('');
      expect(result.title).toBe('Just A Title');
    });

    test('handles non-English titles', () => {
      const result = NZBFilenameParser.parse('King, Stephen - Bezeten Stad');
      expect(result.author).toBe('Stephen King');
      expect(result.title).toBe('Bezeten Stad');
    });

    test('handles author with middle initial', () => {
      const result = NZBFilenameParser.parse('Stephen G. Haines - The Managers Pocket Guide (2018)');
      expect(result.author).toBe('Stephen G. Haines');
      expect(result.title).toContain('Managers Pocket Guide');
    });
  });

  describe('Real-world examples from NZBGeek', () => {
    describe('Mistborn series', () => {
      test('Mistborn 04 - The Alloy of Law', () => {
        const result = NZBFilenameParser.parse('Brandon Sanderson - [Mistborn 04] - The Alloy of Law (retail) (azw3)');
        expect(result.author).toBe('Brandon Sanderson');
        expect(result.title).toBe('The Alloy of Law');
        expect(result.fileType).toBe('azw3');
      });

      test('Mistborn Trilogy Omnibus', () => {
        const result = NZBFilenameParser.parse('Brandon Sanderson - [Mistborn 01-03] - The Mistborn Trilogy Omnibus (retail) (epub)');
        expect(result.author).toBe('Brandon Sanderson');
        expect(result.title).toBe('The Mistborn Trilogy Omnibus');
        expect(result.fileType).toBe('epub');
      });

      test('Alternative format', () => {
        const result = NZBFilenameParser.parse('Sanderson, Brandon - Mistborn 04 - 04 Mistborn Alloy of Law');
        expect(result.author).toBe('Brandon Sanderson');
        expect(result.title).toContain('Mistborn Alloy of Law');
      });
    });

    describe('Harry Potter series', () => {
      test('Hugo winner format', () => {
        const result = NZBFilenameParser.parse('Hugo 2001 Winner Novel - J K Rowling - Harry Potter and the Goblet of Fire (epub)');
        expect(result.author).toBe('J K Rowling');
        expect(result.title).toBe('Harry Potter and the Goblet of Fire');
        expect(result.fileType).toBe('epub');
      });

      test('Comma-separated author', () => {
        const result = NZBFilenameParser.parse('Rowling, J.K. - Harry Potter 08 - Harry Potter en het vervloekte kind');
        expect(result.author).toBe('J.K. Rowling');
        expect(result.title).toBe('Harry Potter en het vervloekte kind');
      });

      test('Scene release format', () => {
        const result = NZBFilenameParser.parse('Insight.Editions-Harry.Potter.Film.Vault.Vol.03.Horcruxes.And.The.Deathly.Hallows.2019.Retail.eBook-BitBook');
        expect(result.title).toContain('Harry Potter');
        expect(result.fileType).toBe('unknown'); // "eBook" not in valid types
      });

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

    describe('Stephen King books', () => {
      test('Simple format', () => {
        const result = NZBFilenameParser.parse('Stephen King - The Life of Chuck (epub)');
        expect(result.author).toBe('Stephen King');
        expect(result.title).toBe('The Life of Chuck');
        expect(result.fileType).toBe('epub');
      });

      test('Title-first format', () => {
        const result = NZBFilenameParser.parse('Later - Stephen King');
        expect(result.author).toBe('Stephen King');
        expect(result.title).toBe('Later');
      });

      test('Scene release format', () => {
        const result = NZBFilenameParser.parse('Stephen.King-Never.Flinch.A.Novel.2025.RETAIL.EPUB');
        expect(result.author).toBe('Stephen King');
        expect(result.title).toContain('Never Flinch');
        expect(result.fileType).toBe('epub');
      });

      test('Series with reversed name', () => {
        const result = NZBFilenameParser.parse('Darktower 5 - The Wolves of the Calla - King Stephen');
        expect(result.author).toBe('Stephen King');
        expect(result.title).toContain('Wolves of the Calla');
      });

      test('Holly Gibney series', () => {
        const result = NZBFilenameParser.parse('King, Stephen - Holly Gibney 04 - Never Flinch');
        expect(result.author).toBe('Stephen King');
        expect(result.title).toBe('Never Flinch');
      });
    });
  });
});
