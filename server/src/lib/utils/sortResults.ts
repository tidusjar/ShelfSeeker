import { SearchResult } from '../types.js';

export type SortOption = 'relevance' | 'title' | 'author' | 'size' | 'type';

/**
 * Parse file size to bytes for sorting
 */
function parseSizeToBytes(size: string): number {
  const units: { [key: string]: number } = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };
  
  const match = size.match(/^([\d.]+)\s*([A-Z]+)$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  return value * (units[unit] || 0);
}

/**
 * Sort search results based on the specified option
 */
export function sortResults(results: SearchResult[], sortBy: SortOption = 'relevance'): SearchResult[] {
  const sorted = [...results];
  
  switch (sortBy) {
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'author':
      sorted.sort((a, b) => {
        if (!a.author && !b.author) return 0;
        if (!a.author) return 1;
        if (!b.author) return -1;
        return a.author.localeCompare(b.author);
      });
      break;
    case 'size':
      sorted.sort((a, b) => parseSizeToBytes(b.filesize) - parseSizeToBytes(a.filesize));
      break;
    case 'type':
      sorted.sort((a, b) => a.fileType.localeCompare(b.fileType));
      break;
    case 'relevance':
    default:
      // Keep original order (already sorted by relevance)
      break;
  }

  return sorted;
}
