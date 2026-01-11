import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SearchResult } from '../types';
import './ResultsList.css';

interface ResultsListProps {
  results: SearchResult[];
  onDownload: (result: SearchResult) => void;
  onSendToDownloader?: (result: SearchResult) => void;
  searchQuery: string;
}

type SourceFilter = 'all' | 'irc' | 'nzb';
type SortOption = 'relevance' | 'title' | 'author' | 'size' | 'type';

function ResultsList({ results, onDownload, onSendToDownloader, searchQuery }: ResultsListProps) {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());

  const formatFileSize = (size: string) => {
    // Size is already formatted from the backend
    return size;
  };

  // Helper to parse file size to bytes for sorting
  const parseSizeToBytes = (size: string): number => {
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
  };

  // Calculate source counts
  const sourceCounts = useMemo(() => {
    const counts = {
      all: results.length,
      irc: results.filter(r => r.source === 'irc').length,
      nzb: results.filter(r => r.source === 'nzb').length
    };
    return counts;
  }, [results]);

  // Filter and sort results
  const filteredAndSortedResults = useMemo(() => {
    // First filter by source
    let filtered = sourceFilter === 'all' 
      ? results 
      : results.filter(r => r.source === sourceFilter);

    // Then sort
    const sorted = [...filtered];
    
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
        sorted.sort((a, b) => parseSizeToBytes(b.size) - parseSizeToBytes(a.size));
        break;
      case 'type':
        sorted.sort((a, b) => a.fileType.localeCompare(b.fileType));
        break;
      case 'relevance':
      default:
        // Keep original order (already sorted by relevance from backend)
        break;
    }

    return sorted;
  }, [results, sourceFilter, sortBy]);

  const handleSendToDownloader = async (result: SearchResult) => {
    if (!onSendToDownloader || result.source !== 'nzb') return;
    
    const resultId = result.guid || result.filename;
    setSendingIds(prev => new Set(prev).add(resultId));
    
    try {
      await onSendToDownloader(result);
    } finally {
      // Keep button disabled - don't re-enable
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { x: -20, opacity: 0 },
    show: { x: 0, opacity: 1 },
  };

  return (
    <div className="results-list">
      <div className="results-header">
        <div className="results-header-content">
          <h2 className="results-title">
            <span className="results-count">{filteredAndSortedResults.length}</span>
            <span className="results-label">Results Found</span>
          </h2>
          <p className="results-query">
            <span className="query-label">Query:</span>
            <span className="query-value">"{searchQuery}"</span>
          </p>
        </div>
        <div className="results-border" />
      </div>

      {/* Modern Filter & Sort Control Bar */}
      <motion.div 
        className="control-bar"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Source Filter Section */}
        <div className="control-section">
          <div className="control-section-header">
            <svg className="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="21" x2="4" y2="14"></line>
              <line x1="4" y1="10" x2="4" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12" y2="3"></line>
              <line x1="20" y1="21" x2="20" y2="16"></line>
              <line x1="20" y1="12" x2="20" y2="3"></line>
              <line x1="1" y1="14" x2="7" y2="14"></line>
              <line x1="9" y1="8" x2="15" y2="8"></line>
              <line x1="17" y1="16" x2="23" y2="16"></line>
            </svg>
            <span className="control-label">Filter by Source</span>
          </div>
          <div className="filter-buttons">
            <motion.button
              type="button"
              className={`filter-chip ${sourceFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSourceFilter('all')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="chip-text">All Sources</span>
              <span className="chip-badge">{sourceCounts.all}</span>
            </motion.button>
            <motion.button
              type="button"
              className={`filter-chip ${sourceFilter === 'irc' ? 'active' : ''}`}
              onClick={() => setSourceFilter('irc')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={sourceCounts.irc === 0}
            >
              <span className="chip-icon">📡</span>
              <span className="chip-text">IRC</span>
              <span className="chip-badge">{sourceCounts.irc}</span>
            </motion.button>
            <motion.button
              type="button"
              className={`filter-chip ${sourceFilter === 'nzb' ? 'active' : ''}`}
              onClick={() => setSourceFilter('nzb')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={sourceCounts.nzb === 0}
            >
              <span className="chip-icon">🌐</span>
              <span className="chip-text">NZB</span>
              <span className="chip-badge">{sourceCounts.nzb}</span>
            </motion.button>
          </div>
        </div>

        {/* Divider */}
        <div className="control-divider" />

        {/* Sort Section */}
        <div className="control-section">
          <div className="control-section-header">
            <svg className="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h12M3 18h6"></path>
            </svg>
            <span className="control-label">Sort by</span>
          </div>
          <div className="sort-buttons">
            <motion.button
              type="button"
              className={`sort-chip ${sortBy === 'relevance' ? 'active' : ''}`}
              onClick={() => setSortBy('relevance')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="chip-sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <span className="chip-text">Relevance</span>
            </motion.button>
            <motion.button
              type="button"
              className={`sort-chip ${sortBy === 'title' ? 'active' : ''}`}
              onClick={() => setSortBy('title')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="chip-sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              <span className="chip-text">Title</span>
            </motion.button>
            <motion.button
              type="button"
              className={`sort-chip ${sortBy === 'author' ? 'active' : ''}`}
              onClick={() => setSortBy('author')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="chip-sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span className="chip-text">Author</span>
            </motion.button>
            <motion.button
              type="button"
              className={`sort-chip ${sortBy === 'size' ? 'active' : ''}`}
              onClick={() => setSortBy('size')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="chip-sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              <span className="chip-text">Size</span>
            </motion.button>
            <motion.button
              type="button"
              className={`sort-chip ${sortBy === 'type' ? 'active' : ''}`}
              onClick={() => setSortBy('type')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="chip-sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
              <span className="chip-text">Type</span>
            </motion.button>
          </div>
        </div>
      </motion.div>


      <motion.div
        className="results-grid"
        variants={container}
        initial="hidden"
        animate="show"
        key={`${sourceFilter}-${sortBy}`}
      >
        {filteredAndSortedResults.map((result, index) => (
          <motion.div
            key={`${result.botName}-${result.bookNumber}`}
            className="result-card"
            variants={item}
            layout
            whileHover={{ scale: 1.01, y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="result-header-row">
              <div className="result-number">
                <span className="number-hash">#</span>
                <span className="number-value">{(index + 1).toString().padStart(3, '0')}</span>
              </div>
              <div className={`source-badge source-${result.source}`}>
                {result.source === 'irc' ? '📡 IRC' : '🌐 NZB'}
              </div>
            </div>

            <div className="result-content">
              <h3 className="result-title">{result.title}</h3>
              {result.author && (
                <p className="result-author">{result.author}</p>
              )}

              <div className="result-meta">
                <div className="meta-item">
                  <span className="meta-label">Type:</span>
                  <span className="meta-value meta-filetype">{result.fileType.toUpperCase()}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Size:</span>
                  <span className="meta-value">{formatFileSize(result.size)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Source:</span>
                  <span className="meta-value">{result.sourceProvider}</span>
                </div>
              </div>
            </div>

            {/* Download Button(s) */}
            {result.source === 'nzb' && onSendToDownloader ? (
              <div className="download-buttons">
                <motion.button
                  className="send-to-downloader-button"
                  onClick={() => handleSendToDownloader(result)}
                  disabled={sendingIds.has(result.guid || result.filename)}
                  whileHover={!sendingIds.has(result.guid || result.filename) ? { scale: 1.02 } : {}}
                  whileTap={!sendingIds.has(result.guid || result.filename) ? { scale: 0.98 } : {}}
                >
                  <svg
                    className="download-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span className="download-text">
                    {sendingIds.has(result.guid || result.filename) ? 'Sent ✓' : 'Send to Downloader'}
                  </span>
                </motion.button>
                <motion.button
                  className="download-nzb-button"
                  onClick={() => onDownload(result)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title="Download .nzb file"
                >
                  📥 NZB
                </motion.button>
              </div>
            ) : (
              <motion.button
                className="download-button"
                onClick={() => onDownload(result)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  className="download-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span className="download-text">Download</span>
              </motion.button>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default ResultsList;
