import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from './Layout';
import IrcSettings from './IrcSettings';
import NewznabSettings from './NewznabSettings';
import TorrentSettings from './TorrentSettings';
import DownloaderSettings from './DownloaderSettings';
import AboutSettings from './AboutSettings';
import type { ConfigData, NzbProvider, ConnectionStatus, Downloader } from '../types';

interface SettingsProps {
  onBack: () => void;
  onNewSearch: (query: string) => void;
  config: ConfigData | null;
  connectionStatus: ConnectionStatus;
  nzbProviders: NzbProvider[];
  usenetDownloader: Downloader | null;
  onConfigUpdate: () => void;
}

type SettingsView = 'irc' | 'newznab' | 'torrents' | 'downloaders' | 'about';

function Settings({ onBack, onNewSearch, config, connectionStatus, nzbProviders, usenetDownloader, onConfigUpdate }: SettingsProps) {
  const [activeView, setActiveView] = useState<SettingsView>('irc');
  const [query, setQuery] = useState('');

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      onBack(); // Return to home/results
      onNewSearch(searchQuery.trim()); // Trigger search
    }
  };

  return (
    <Layout
      showSearch={true}
      searchQuery={query}
      onSearchChange={setQuery}
      onSearchSubmit={handleSearch}
      onSettingsClick={() => {}}
      onLogoClick={onBack}
      config={config}
      connectionStatus={connectionStatus}
      nzbProviders={nzbProviders}
      usenetDownloader={usenetDownloader}
      showFooter={true}
    >
      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark flex flex-col p-4 shrink-0 hidden md:flex">
          <div className="mb-6">
            <h2 className="px-3 text-xs font-semibold text-slate-400 dark:text-muted-dark uppercase tracking-wider mb-2">
              Search Providers
            </h2>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveView('irc')}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-colors ${
                  activeView === 'irc'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-slate-600 dark:text-muted-dark hover:bg-slate-100 dark:hover:bg-border-dark'
                }`}
                data-testid="settings-nav-irc"
              >
                <span className="material-symbols-outlined">chat</span>
                <span>IRC</span>
              </button>
              <button
                onClick={() => setActiveView('newznab')}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-colors ${
                  activeView === 'newznab'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-slate-600 dark:text-muted-dark hover:bg-slate-100 dark:hover:bg-border-dark'
                }`}
                data-testid="settings-nav-newznab"
              >
                <span className="material-symbols-outlined">cloud</span>
                <span>Newznab</span>
              </button>
              <button
                onClick={() => setActiveView('torrents')}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-colors ${
                  activeView === 'torrents'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-slate-600 dark:text-muted-dark hover:bg-slate-100 dark:hover:bg-border-dark'
                }`}
                data-testid="settings-nav-torrents"
              >
                <span className="material-symbols-outlined">nest_cam_magnet_mount</span>
                <span>Torrents</span>
              </button>
            </nav>
          </div>

          <div className="mb-6">
            <h2 className="px-3 text-xs font-semibold text-slate-400 dark:text-muted-dark uppercase tracking-wider mb-2">
              Download Clients
            </h2>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveView('downloaders')}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-colors ${
                  activeView === 'downloaders'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-slate-600 dark:text-muted-dark hover:bg-slate-100 dark:hover:bg-border-dark'
                }`}
              >
                <span className="material-symbols-outlined">download</span>
                <span>Usenet</span>
              </button>
            </nav>
          </div>

          <div className="mt-auto">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveView('about')}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-colors ${
                  activeView === 'about'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-slate-600 dark:text-muted-dark hover:bg-slate-100 dark:hover:bg-border-dark'
                }`}
              >
                <span className="material-symbols-outlined">info</span>
                <span>About</span>
              </button>
              <button
                onClick={onBack}
                className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-slate-600 dark:text-muted-dark hover:bg-slate-100 dark:hover:bg-border-dark transition-colors"
                data-testid="settings-back-button"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Back to Search</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeView === 'irc' && (
              <motion.div
                key="irc"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <IrcSettings
                  config={config}
                  connectionStatus={connectionStatus}
                  onConfigUpdate={onConfigUpdate}
                />
              </motion.div>
            )}
            {activeView === 'newznab' && (
              <motion.div
                key="newznab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <NewznabSettings
                  nzbProviders={nzbProviders}
                  onConfigUpdate={onConfigUpdate}
                />
              </motion.div>
            )}
            {activeView === 'torrents' && (
              <motion.div
                key="torrents"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <TorrentSettings />
              </motion.div>
            )}
            {activeView === 'downloaders' && (
              <motion.div
                key="downloaders"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <DownloaderSettings />
              </motion.div>
            )}
            {activeView === 'about' && (
              <motion.div
                key="about"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <AboutSettings />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </Layout>
  );
}

export default Settings;
