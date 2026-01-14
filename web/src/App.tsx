import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './components/Home';
import SearchResults from './components/SearchResults';
import DownloadPanel from './components/DownloadPanel';
import SettingsModal from './components/SettingsModal';
import { api } from './api';
import type { SearchResult, DownloadProgress, ConfigData, ConnectionStatus, NzbProvider, Downloader } from './types';

type View = 'home' | 'results';

function App() {
  const [view, setView] = useState<View>('home');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentDownload, setCurrentDownload] = useState<DownloadProgress | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [nzbProviders, setNzbProviders] = useState<NzbProvider[]>([]);
  const [usenetDownloader, setUsenetDownloader] = useState<Downloader | null>(null);

  useEffect(() => {
    loadConfig();
    loadStatus();
    loadProviders();

    // Poll status every 5 seconds
    const statusInterval = setInterval(loadStatus, 5000);
    return () => clearInterval(statusInterval);
  }, []);

  const loadConfig = async () => {
    const response = await api.getConfig();
    if (response.success && response.data) {
      setConfig(response.data);
    }
  };

  const loadStatus = async () => {
    const response = await api.getStatus();
    if (response.success && response.data) {
      setConnectionStatus(response.data.connectionStatus);
    }
  };

  const loadProviders = async () => {
    const [providersResponse, downloaderResponse] = await Promise.all([
      api.getNzbProviders(),
      api.getEnabledUsenetDownloader(),
    ]);

    if (providersResponse.success && providersResponse.data) {
      setNzbProviders(providersResponse.data);
    }

    if (downloaderResponse.success && downloaderResponse.data) {
      setUsenetDownloader(downloaderResponse.data);
    }
  };

  const handleSaveConfig = (newConfig: ConfigData) => {
    setConfig(newConfig);
    // Reload status and providers after config change
    setTimeout(() => {
      loadStatus();
      loadProviders();
    }, 1000);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    setSearchResults([]);

    const response = await api.search(query);
    setIsSearching(false);

    if (response.success && response.data) {
      setSearchResults(response.data);
      setView('results');
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
      setTimeout(() => setCurrentDownload(null), 5000);
    }
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

  const handleBackToHome = () => {
    setView('home');
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-background-dark">
      <AnimatePresence mode="wait">
        {view === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Home
              onSearch={handleSearch}
              isSearching={isSearching}
              onOpenSettings={() => setShowSettings(true)}
              config={config}
              connectionStatus={connectionStatus}
              nzbProviders={nzbProviders}
              usenetDownloader={usenetDownloader}
            />
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SearchResults
              results={searchResults}
              searchQuery={searchQuery}
              onDownload={handleDownload}
              onSendToDownloader={handleSendToDownloader}
              onBackToHome={handleBackToHome}
              onNewSearch={handleSearch}
              onOpenSettings={() => setShowSettings(true)}
              config={config}
              connectionStatus={connectionStatus}
              nzbProviders={nzbProviders}
              usenetDownloader={usenetDownloader}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Panel */}
      <AnimatePresence>
        {currentDownload && (
          <DownloadPanel download={currentDownload} />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveConfig}
        currentConfig={config}
        isDownloading={currentDownload?.status === 'downloading'}
      />

      {/* Loading Overlay */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-slate-800 rounded-xl p-8 flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-lg font-medium">Searching archives...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
