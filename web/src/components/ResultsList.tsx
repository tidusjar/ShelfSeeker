import { motion } from 'framer-motion';
import type { SearchResult } from '../types';
import './ResultsList.css';

interface ResultsListProps {
  results: SearchResult[];
  onDownload: (result: SearchResult) => void;
  searchQuery: string;
}

function ResultsList({ results, onDownload, searchQuery }: ResultsListProps) {
  const formatFileSize = (size: string) => {
    // Size is already formatted from the backend
    return size;
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
            <span className="results-count">{results.length}</span>
            <span className="results-label">Results Found</span>
          </h2>
          <p className="results-query">
            <span className="query-label">Query:</span>
            <span className="query-value">"{searchQuery}"</span>
          </p>
        </div>
        <div className="results-border" />
      </div>

      <motion.div
        className="results-grid"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {results.map((result, index) => (
          <motion.div
            key={`${result.botName}-${result.bookNumber}`}
            className="result-card"
            variants={item}
            whileHover={{ scale: 1.01, y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="result-number">
              <span className="number-hash">#</span>
              <span className="number-value">{(index + 1).toString().padStart(3, '0')}</span>
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
                  <span className="meta-label">Bot:</span>
                  <span className="meta-value">{result.botName}</span>
                </div>
              </div>
            </div>

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
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default ResultsList;
