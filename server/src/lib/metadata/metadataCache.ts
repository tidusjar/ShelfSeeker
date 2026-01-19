import { BookMetadata } from '../types.js';
import { LIMITS } from '../../constants.js';

/**
 * Metadata Cache
 * 
 * Simple in-memory cache for book metadata to reduce API calls
 * and improve response times.
 */

interface CachedEntry {
  data: BookMetadata;
  timestamp: number;
}

class MetadataCache {
  private cache = new Map<string, CachedEntry>();
  private TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private maxSize = LIMITS.MAX_CACHE_SIZE;

  /**
   * Get metadata from cache
   * Returns null if not found or expired
   */
  get(key: string): BookMetadata | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set metadata in cache
   * Implements LRU eviction when cache is full
   */
  set(key: string, data: BookMetadata): void {
    // If cache is full, remove oldest entry (simple LRU)
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if a cache entry has expired
   */
  private isExpired(entry: CachedEntry): boolean {
    return Date.now() - entry.timestamp > this.TTL;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.TTL,
    };
  }

  /**
   * Remove expired entries (maintenance)
   */
  cleanup(): number {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// Singleton instance
const cache = new MetadataCache();

export default cache;

/**
 * Generate a cache key from title and author
 */
export function generateCacheKey(title: string, author: string): string {
  const normalizedTitle = title.toLowerCase().trim();
  const normalizedAuthor = author.toLowerCase().trim();
  return `${normalizedTitle}|${normalizedAuthor}`;
}
