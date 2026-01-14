import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IrcSettings from './IrcSettings';
import NewznabSettings from './NewznabSettings';
import TorrentSettings from './TorrentSettings';
import type { ConfigData, NzbProvider, ConnectionStatus } from '../types';

interface SettingsProps {
  onBack: () => void;
  config: ConfigData | null;
  connectionStatus: ConnectionStatus;
  nzbProviders: NzbProvider[];
  onConfigUpdate: () => void;
}

type SettingsView = 'irc' | 'newznab' | 'torrents';

function Settings({ onBack, config, connectionStatus, nzbProviders, onConfigUpdate }: SettingsProps) {
  const [activeView, setActiveView] = useState<SettingsView>('irc');

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white flex flex-col font-display">
      {/* Header */}
      <header className="border-b border-solid border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined">menu_book</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight">ShelfSeeker</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-border-dark rounded-lg transition-colors">
            <span className="material-symbols-outlined text-slate-600 dark:text-muted-dark">notifications</span>
          </button>
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-border-dark rounded-lg transition-colors">
            <span className="material-symbols-outlined text-slate-600 dark:text-muted-dark">settings</span>
          </button>
          <div className="h-8 w-px bg-slate-200 dark:bg-border-dark mx-1" />
          <button className="flex items-center gap-2 pl-2 pr-1 py-1 hover:bg-slate-100 dark:hover:bg-border-dark rounded-lg transition-colors">
            <span className="text-sm font-medium">Admin</span>
            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs border border-primary/30">
              JD
            </div>
          </button>
        </div>
      </header>

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
              >
                <span className="material-symbols-outlined">nest_cam_magnet_mount</span>
                <span>Torrents</span>
              </button>
            </nav>
          </div>

          <div className="mt-auto">
            <nav className="space-y-1">
              <button
                onClick={onBack}
                className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-slate-600 dark:text-muted-dark hover:bg-slate-100 dark:hover:bg-border-dark transition-colors"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Back to Search</span>
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-slate-600 dark:text-muted-dark hover:bg-slate-100 dark:hover:bg-border-dark transition-colors">
                <span className="material-symbols-outlined">history</span>
                <span>Search History</span>
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-slate-600 dark:text-muted-dark hover:bg-slate-100 dark:hover:bg-border-dark transition-colors">
                <span className="material-symbols-outlined">help</span>
                <span>Support</span>
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
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default Settings;
