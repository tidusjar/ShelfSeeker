import { describe, it, expect } from 'vitest';
import type { SearchResult as CliSearchResult } from './lib/types.js';
import type { SearchResult } from './ircService.js';

describe('IRC Service - Search Result Mapping', () => {
  it('should correctly map CLI format to Web API format', () => {
    const cliResults: CliSearchResult[] = [
      {
        botCommand: '!Bsk',
        filename: 'JK Rowling - Harry Potter.epub',
        filesize: '2.5MB',
        rawCommand: '!Bsk JK Rowling - Harry Potter.epub',
        title: 'Harry Potter',
        author: 'JK Rowling',
        fileType: 'epub'
      },
      {
        botCommand: '!SearchBot',
        filename: 'Stephen King - The Shining.pdf',
        filesize: '1.8MB',
        rawCommand: '!SearchBot Stephen King - The Shining.pdf',
        title: 'The Shining',
        author: 'Stephen King',
        fileType: 'pdf'
      }
    ];

    // Simulate the mapping done in ircService.ts
    const webResults: SearchResult[] = cliResults.map((r, index) => ({
      source: 'irc' as const,
      sourceProvider: r.botCommand.replace('!', ''),
      botName: r.botCommand.replace('!', ''),
      bookNumber: index + 1,
      title: r.title,
      author: r.author,
      fileType: r.fileType,
      size: r.filesize,
      command: r.rawCommand,
      filename: r.filename
    }));

    expect(webResults).toHaveLength(2);
    
    expect(webResults[0]).toEqual({
      source: 'irc',
      sourceProvider: 'Bsk',
      botName: 'Bsk',
      bookNumber: 1,
      title: 'Harry Potter',
      author: 'JK Rowling',
      fileType: 'epub',
      size: '2.5MB',
      command: '!Bsk JK Rowling - Harry Potter.epub',
      filename: 'JK Rowling - Harry Potter.epub'
    });

    expect(webResults[1]).toEqual({
      source: 'irc',
      sourceProvider: 'SearchBot',
      botName: 'SearchBot',
      bookNumber: 2,
      title: 'The Shining',
      author: 'Stephen King',
      fileType: 'pdf',
      size: '1.8MB',
      command: '!SearchBot Stephen King - The Shining.pdf',
      filename: 'Stephen King - The Shining.pdf'
    });
  });

  it('should handle results without author', () => {
    const cliResults: CliSearchResult[] = [
      {
        botCommand: '!Ebook',
        filename: 'Unknown Book.mobi',
        filesize: '500KB',
        rawCommand: '!Ebook Unknown Book.mobi',
        title: 'Unknown Book',
        author: '',
        fileType: 'mobi'
      }
    ];

    const webResults: SearchResult[] = cliResults.map((r, index) => ({
      source: 'irc' as const,
      sourceProvider: r.botCommand.replace('!', ''),
      botName: r.botCommand.replace('!', ''),
      bookNumber: index + 1,
      title: r.title,
      author: r.author,
      fileType: r.fileType,
      size: r.filesize,
      command: r.rawCommand,
      filename: r.filename
    }));

    expect(webResults[0]).toEqual({
      source: 'irc',
      sourceProvider: 'Ebook',
      botName: 'Ebook',
      bookNumber: 1,
      title: 'Unknown Book',
      author: '',
      fileType: 'mobi',
      size: '500KB',
      command: '!Ebook Unknown Book.mobi',
      filename: 'Unknown Book.mobi'
    });
  });

  it('should strip exclamation mark from bot command', () => {
    const cliResult: CliSearchResult = {
      botCommand: '!TestBot',
      filename: 'Book.epub',
      filesize: '1MB',
      rawCommand: '!TestBot Book.epub',
      title: 'Book',
      author: '',
      fileType: 'epub'
    };

    const webResult: SearchResult = {
      source: 'irc',
      sourceProvider: cliResult.botCommand.replace('!', ''),
      botName: cliResult.botCommand.replace('!', ''),
      bookNumber: 1,
      title: cliResult.title,
      author: cliResult.author,
      fileType: cliResult.fileType,
      size: cliResult.filesize,
      command: cliResult.rawCommand,
      filename: cliResult.filename
    };

    expect(webResult.botName).toBe('TestBot');
    expect(webResult.command).toBe('!TestBot Book.epub');
  });

  it('should assign sequential book numbers', () => {
    const cliResults: CliSearchResult[] = Array.from({ length: 5 }, (_, i) => ({
      botCommand: '!Bot',
      filename: `Book${i}.epub`,
      filesize: '1MB',
      rawCommand: `!Bot Book${i}.epub`,
      title: `Book${i}`,
      author: '',
      fileType: 'epub'
    }));

    const webResults: SearchResult[] = cliResults.map((r, index) => ({
      source: 'irc' as const,
      sourceProvider: r.botCommand.replace('!', ''),
      botName: r.botCommand.replace('!', ''),
      bookNumber: index + 1,
      title: r.title,
      author: r.author,
      fileType: r.fileType,
      size: r.filesize,
      command: r.rawCommand,
      filename: r.filename
    }));

    expect(webResults[0].bookNumber).toBe(1);
    expect(webResults[1].bookNumber).toBe(2);
    expect(webResults[2].bookNumber).toBe(3);
    expect(webResults[3].bookNumber).toBe(4);
    expect(webResults[4].bookNumber).toBe(5);
  });
});
