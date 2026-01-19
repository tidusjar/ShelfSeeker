import { describe, it, expect, beforeEach, vi } from 'vitest';
import cache, { generateCacheKey } from './metadataCache.js';
import { BookMetadata } from '../types.js';

describe('MetadataCache', () => {
  const mockMetadata: BookMetadata = {
    isbn: '1234567890',
    publisher: 'Test Publisher',
    publishDate: '2023',
    pageCount: 300,
    coverUrl: 'https://example.com/cover.jpg'
  };

  beforeEach(() => {
    // Clear cache before each test
    cache.clear();
  });

  describe('generateCacheKey', () => {
    it('should generate key from title and author', () => {
      const key = generateCacheKey('The Great Book', 'John Doe');
      expect(key).toBe('the great book|john doe');
    });

    it('should normalize title and author to lowercase', () => {
      const key1 = generateCacheKey('UPPERCASE BOOK', 'UPPERCASE AUTHOR');
      const key2 = generateCacheKey('uppercase book', 'uppercase author');
      expect(key1).toBe(key2);
    });

    it('should trim whitespace', () => {
      const key1 = generateCacheKey('  Spaced Book  ', '  Spaced Author  ');
      const key2 = generateCacheKey('Spaced Book', 'Spaced Author');
      expect(key1).toBe(key2);
    });

    it('should handle empty author', () => {
      const key = generateCacheKey('Book Title', '');
      expect(key).toBe('book title|');
    });
  });

  describe('get', () => {
    it('should return null for non-existent key', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should return cached metadata for valid key', () => {
      const key = generateCacheKey('Test Book', 'Test Author');
      cache.set(key, mockMetadata);
      
      const result = cache.get(key);
      expect(result).toEqual(mockMetadata);
    });

    it('should return null for expired entry', () => {
      vi.useFakeTimers();
      
      const key = generateCacheKey('Test Book', 'Test Author');
      cache.set(key, mockMetadata);
      
      // Fast-forward time by 25 hours (beyond 24hr TTL)
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);
      
      const result = cache.get(key);
      expect(result).toBeNull();
      
      vi.useRealTimers();
    });

    it('should delete expired entry when accessed', () => {
      vi.useFakeTimers();
      
      const key = generateCacheKey('Test Book', 'Test Author');
      cache.set(key, mockMetadata);
      
      const statsBefore = cache.getStats();
      expect(statsBefore.size).toBe(1);
      
      // Fast-forward time by 25 hours
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);
      
      cache.get(key); // This should delete the expired entry
      
      const statsAfter = cache.getStats();
      expect(statsAfter.size).toBe(0);
      
      vi.useRealTimers();
    });
  });

  describe('set', () => {
    it('should store metadata with current timestamp', () => {
      const key = generateCacheKey('Test Book', 'Test Author');
      cache.set(key, mockMetadata);
      
      const result = cache.get(key);
      expect(result).toEqual(mockMetadata);
    });

    it('should overwrite existing entry with same key', () => {
      const key = generateCacheKey('Test Book', 'Test Author');
      const metadata1 = { ...mockMetadata, pageCount: 100 };
      const metadata2 = { ...mockMetadata, pageCount: 200 };
      
      cache.set(key, metadata1);
      cache.set(key, metadata2);
      
      const result = cache.get(key);
      expect(result?.pageCount).toBe(200);
    });

    it('should enforce max size limit (LRU eviction)', () => {
      // Set multiple entries up to max size
      for (let i = 0; i < 10000; i++) {
        cache.set(`key-${i}`, mockMetadata);
      }
      
      const stats = cache.getStats();
      expect(stats.size).toBe(10000);
      
      // Add one more entry - should evict oldest
      cache.set('key-10000', mockMetadata);
      
      const statsAfter = cache.getStats();
      expect(statsAfter.size).toBe(10000);
      
      // First entry should be evicted
      expect(cache.get('key-0')).toBeNull();
      // New entry should exist
      expect(cache.get('key-10000')).toEqual(mockMetadata);
    });

    it('should handle multiple entries', () => {
      cache.set('key1', { isbn: 'isbn-1', pageCount: 100 });
      cache.set('key2', { isbn: 'isbn-2', pageCount: 200 });
      cache.set('key3', { isbn: 'isbn-3', pageCount: 300 });
      
      expect(cache.get('key1')?.isbn).toBe('isbn-1');
      expect(cache.get('key2')?.isbn).toBe('isbn-2');
      expect(cache.get('key3')?.isbn).toBe('isbn-3');
    });
  });

  describe('clear', () => {
    it('should remove all cache entries', () => {
      cache.set('key1', mockMetadata);
      cache.set('key2', mockMetadata);
      cache.set('key3', mockMetadata);
      
      const statsBefore = cache.getStats();
      expect(statsBefore.size).toBe(3);
      
      cache.clear();
      
      const statsAfter = cache.getStats();
      expect(statsAfter.size).toBe(0);
      expect(cache.get('key1')).toBeNull();
    });

    it('should work on empty cache', () => {
      cache.clear();
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const stats = cache.getStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('ttl');
      expect(stats.maxSize).toBe(10000);
      expect(stats.ttl).toBe(24 * 60 * 60 * 1000); // 24 hours
    });

    it('should reflect current cache size', () => {
      cache.set('key1', mockMetadata);
      cache.set('key2', mockMetadata);
      
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('cleanup', () => {
    it('should remove all expired entries', () => {
      vi.useFakeTimers();
      
      // Add entries at different times
      cache.set('key1', mockMetadata);
      
      vi.advanceTimersByTime(12 * 60 * 60 * 1000); // 12 hours
      cache.set('key2', mockMetadata);
      
      vi.advanceTimersByTime(13 * 60 * 60 * 1000); // +13 hours (25 total)
      cache.set('key3', mockMetadata);
      
      // key1 is now 25 hours old (expired)
      // key2 is now 13 hours old (valid)
      // key3 is now 0 hours old (valid)
      
      const removed = cache.cleanup();
      
      expect(removed).toBe(1); // Only key1 should be removed
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).not.toBeNull();
      expect(cache.get('key3')).not.toBeNull();
      
      vi.useRealTimers();
    });

    it('should return 0 when no entries are expired', () => {
      cache.set('key1', mockMetadata);
      cache.set('key2', mockMetadata);
      
      const removed = cache.cleanup();
      expect(removed).toBe(0);
    });

    it('should handle empty cache', () => {
      const removed = cache.cleanup();
      expect(removed).toBe(0);
    });

    it('should remove multiple expired entries', () => {
      vi.useFakeTimers();
      
      cache.set('key1', mockMetadata);
      cache.set('key2', mockMetadata);
      cache.set('key3', mockMetadata);
      
      // Fast-forward beyond TTL
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);
      
      const removed = cache.cleanup();
      expect(removed).toBe(3);
      expect(cache.getStats().size).toBe(0);
      
      vi.useRealTimers();
    });
  });

  describe('cache persistence across operations', () => {
    it('should maintain data integrity through multiple operations', () => {
      const key1 = generateCacheKey('Book 1', 'Author 1');
      const key2 = generateCacheKey('Book 2', 'Author 2');
      
      cache.set(key1, { isbn: 'isbn-1', pageCount: 100 });
      cache.set(key2, { isbn: 'isbn-2', pageCount: 200 });
      
      expect(cache.get(key1)?.isbn).toBe('isbn-1');
      
      cache.cleanup();
      
      expect(cache.get(key1)?.isbn).toBe('isbn-1');
      expect(cache.get(key2)?.isbn).toBe('isbn-2');
    });

    it('should handle rapid successive operations', () => {
      for (let i = 0; i < 100; i++) {
        cache.set(`key-${i}`, { isbn: `isbn-${i}`, pageCount: i * 10 });
      }
      
      const stats = cache.getStats();
      expect(stats.size).toBe(100);
      
      for (let i = 0; i < 100; i++) {
        expect(cache.get(`key-${i}`)?.isbn).toBe(`isbn-${i}`);
      }
    });
  });
});
