import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchInterface from './components/SearchInterface';
import ResultsList from './components/ResultsList';
import DownloadPanel from './components/DownloadPanel';
import StatusBar from './components/StatusBar';
import { api } from './api';
import type { SearchResult, ConnectionStatus, DownloadProgress } from './types';
import './App.css';

function App() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentDownload, setCurrentDownload] = useState<DownloadProgress | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Auto-connect on mount
    handleConnect();
  }, []);

  const handleConnect = async () => {
    setConnectionStatus('connecting');
    const response = await api.connect();
    if (response.success) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    setSearchResults([]);

    const response = await api.search(query);
    setIsSearching(false);

    if (response.success && response.data) {
      setSearchResults(response.data);
    }
  };

  const handleDownload = async (result: SearchResult) => {
    setCurrentDownload({
      filename: result.title,
      progress: 0,
      speed: '0 KB/s',
      status: 'downloading',
    });

    const response = await api.download(result.command);

    if (response.success) {
      setCurrentDownload({
        filename: result.title,
        progress: 100,
        speed: '0 KB/s',
        status: 'complete',
      });

      // Clear download after 3 seconds
      setTimeout(() => setCurrentDownload(null), 3000);
    } else {
      setCurrentDownload({
        filename: result.title,
        progress: 0,
        speed: '0 KB/s',
        status: 'error',
      });
    }
  };

  return (
    <div className="app">
      {/* Grid Background */}
      <div className="grid-background" />

      {/* Main Content */}
      <motion.div
        className="container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Header */}
        <motion.header
          className="header"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-icon">█</div>
              <div>
                <h1 className="logo-title">IRC Archives</h1>
                <p className="logo-subtitle">Digital Library Terminal</p>
              </div>
            </div>
            <StatusBar status={connectionStatus} />
          </div>
          <div className="header-border" />
        </motion.header>

        {/* Search Interface */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <SearchInterface
            onSearch={handleSearch}
            isSearching={isSearching}
            disabled={connectionStatus !== 'connected'}
          />
        </motion.div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {searchResults.length > 0 && (
            <motion.div
              key="results"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ResultsList
                results={searchResults}
                onDownload={handleDownload}
                searchQuery={searchQuery}
              />
            </motion.div>
          )}

          {isSearching && (
            <motion.div
              key="searching"
              className="searching-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="searching-content">
                <div className="spinner" />
                <p className="searching-text">
                  <span className="glow">Searching archives</span>
                  <span className="dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Download Panel */}
        <AnimatePresence>
          {currentDownload && (
            <DownloadPanel download={currentDownload} />
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-text">
              <span className="footer-label">Server:</span>
              <span className="footer-value">irc.irchighway.net</span>
            </div>
            <div className="footer-text">
              <span className="footer-label">Channel:</span>
              <span className="footer-value">#ebooks</span>
            </div>
            <div className="footer-text footer-glow">
              {searchResults.length > 0 && `${searchResults.length} results found`}
            </div>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}

export default App;
