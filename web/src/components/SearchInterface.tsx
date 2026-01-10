import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import './SearchInterface.css';

interface SearchInterfaceProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
  disabled: boolean;
}

function SearchInterface({ onSearch, isSearching, disabled }: SearchInterfaceProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isSearching && !disabled) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="search-interface">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-container">
          <div className="search-prompt">
            <span className="prompt-symbol">&gt;</span>
            <span className="prompt-text">query</span>
          </div>
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter search term..."
            className="search-input"
            disabled={disabled || isSearching}
            autoFocus
          />

          <motion.button
            type="submit"
            className="search-button"
            disabled={disabled || isSearching || !query.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="button-brackets">[</span>
            <span className="button-text">
              {isSearching ? 'Searching' : 'Search Archives'}
            </span>
            <span className="button-brackets">]</span>
          </motion.button>
        </div>

        {disabled && (
          <motion.p
            className="search-warning"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="warning-icon">⚠</span>
            Not connected to IRC server
          </motion.p>
        )}
      </form>

      {/* Search tips */}
      <div className="search-tips">
        <div className="tip">
          <span className="tip-label">Tip:</span>
          <span className="tip-text">Try searching for book titles, authors, or series names</span>
        </div>
      </div>
    </div>
  );
}

export default SearchInterface;
