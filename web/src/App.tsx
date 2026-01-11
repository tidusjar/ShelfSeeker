import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchInterface from './components/SearchInterface';
import ResultsList from './components/ResultsList';
import DownloadPanel from './components/DownloadPanel';
import SettingsModal from './components/SettingsModal';
import { api } from './api';
import type { SearchResult, DownloadProgress, ConfigData } from './types';
import './App.css';

function App() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentDownload, setCurrentDownload] = useState<DownloadProgress | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Load configuration on mount
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const response = await api.getConfig();
    if (response.success && response.data) {
      setConfig(response.data);
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

    const response = await api.download(result);

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

  const handleSaveConfig = (newConfig: ConfigData) => {
    setConfig(newConfig);
  };

  const handleSendToDownloader = async (result: SearchResult) => {
    if (result.source !== 'nzb' || !result.nzbUrl) {
      console.error('Invalid result for downloader');
      return;
    }

    setCurrentDownload({
      filename: result.title,
      progress: 0,
      speed: 'Sending...',
      status: 'downloading',
    });

    try {
      const response = await api.sendToDownloader(result.nzbUrl, result.title);

      if (response.success) {
        setCurrentDownload({
          filename: result.title,
          progress: 100,
          speed: `Sent to ${response.data?.downloaderType || 'downloader'}`,
          status: 'complete',
        });

        // Clear download after 3 seconds
        setTimeout(() => setCurrentDownload(null), 3000);
      } else {
        setCurrentDownload({
          filename: result.title,
          progress: 0,
          speed: response.error || 'Failed to send',
          status: 'error',
        });
        setTimeout(() => setCurrentDownload(null), 5000);
      }
    } catch (error) {
      setCurrentDownload({
        filename: result.title,
        progress: 0,
        speed: 'Network error',
        status: 'error',
      });
      setTimeout(() => setCurrentDownload(null), 5000);
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
                <h1 className="logo-title">ShelfSeeker</h1>
                <p className="logo-subtitle">Multi-Source Digital Library</p>
              </div>
            </div>
            <div className="header-actions">
              <motion.button
                className="settings-button"
                onClick={() => setShowSettings(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="button-brackets">[</span>
                <span className="button-text">⚙ Settings</span>
                <span className="button-brackets">]</span>
              </motion.button>
            </div>
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
            disabled={false}
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
                onSendToDownloader={handleSendToDownloader}
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
      </motion.div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveConfig}
        currentConfig={config}
        isDownloading={currentDownload?.status === 'downloading'}
      />
    </div>
  );
}

export default App;
