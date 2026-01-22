import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './components/Home';
import SearchResults from './components/SearchResults';
import DownloadPanel from './components/DownloadPanel';
import Settings from './components/Settings';
import Onboarding from './components/Onboarding';
import { api } from './api';
import type { SearchResult, DownloadProgress, ConfigData, ConnectionStatus, NzbProvider, Downloader, OnboardingState } from './types';

type View = 'home' | 'results' | 'settings' | 'onboarding';

function App() {
  const [view, setView] = useState<View>(() => {
    console.log('[App] Initial view: home');
    return 'home';
  });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentDownload, setCurrentDownload] = useState<DownloadProgress | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [nzbProviders, setNzbProviders] = useState<NzbProvider[]>([]);
  const [usenetDownloader, setUsenetDownloader] = useState<Downloader | null>(null);
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);

  useEffect(() => {
    console.log('[App] Component mounted, loading initial state...');
    loadConfig();
    loadStatus();
    loadProviders();
    loadOnboardingState();

    // Poll status every 5 seconds
    const statusInterval = setInterval(loadStatus, 5000);
    return () => clearInterval(statusInterval);
  }, []);

  useEffect(() => {
    console.log('[App] View changed to:', view);
  }, [view]);

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

  const loadOnboardingState = async () => {
    console.log('[App] Loading onboarding state...');
    const response = await api.getOnboardingStatus();
    console.log('[App] Onboarding status response:', response);
    if (response.success && response.data) {
      setOnboardingState(response.data);
      console.log('[App] Onboarding data:', response.data);
      // If onboarding not completed, redirect to onboarding view
      if (!response.data.completed) {
        console.log('[App] Onboarding not completed, setting view to onboarding');
        setView('onboarding');
      } else {
        console.log('[App] Onboarding already completed, staying on current view');
      }
    } else {
      console.log('[App] Failed to load onboarding state:', response.error);
    }
  };

  const handleConfigUpdate = () => {
    // Reload config, status and providers after config change
    loadConfig();
    loadStatus();
    loadProviders();
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

  const handleDirectNzbDownload = (result: SearchResult) => {
    if (result.source !== 'nzb' || !result.nzbUrl) {
      console.error('Invalid result for direct NZB download');
      return;
    }

    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = result.nzbUrl;
    link.download = `${result.title}.nzb`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackToHome = () => {
    setView('home');
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleOpenSettings = () => {
    setView('settings');
  };

  const handleBackFromSettings = () => {
    setView('home');
  };

  const handleOnboardingComplete = async () => {
    await api.completeOnboarding();
    setOnboardingState({
      completed: true,
      skipped: false,
      lastStep: 3,
      completedAt: new Date().toISOString(),
    });
    setView('home');
  };

  const handleOnboardingSkip = async () => {
    await api.skipOnboarding();
    setOnboardingState({
      completed: true,
      skipped: true,
      lastStep: onboardingState?.lastStep || 0,
    });
    setView('home');
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
              onOpenSettings={handleOpenSettings}
              config={config}
              connectionStatus={connectionStatus}
              nzbProviders={nzbProviders}
              usenetDownloader={usenetDownloader}
            />
          </motion.div>
        ) : view === 'results' ? (
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
              onDirectNzbDownload={handleDirectNzbDownload}
              onBackToHome={handleBackToHome}
              onNewSearch={handleSearch}
              onOpenSettings={handleOpenSettings}
              config={config}
              connectionStatus={connectionStatus}
              nzbProviders={nzbProviders}
              usenetDownloader={usenetDownloader}
            />
          </motion.div>
        ) : view === 'onboarding' ? (
          <Onboarding
            key="onboarding"
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
            config={config}
            onConfigUpdate={handleConfigUpdate}
          />
        ) : (
          <motion.div
            key="settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Settings
              onBack={handleBackFromSettings}
              onNewSearch={handleSearch}
              config={config}
              connectionStatus={connectionStatus}
              nzbProviders={nzbProviders}
              usenetDownloader={usenetDownloader}
              onConfigUpdate={handleConfigUpdate}
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
