import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import type { ConfigData, ConnectionStatus, NzbProvider, Downloader } from '../types';

interface HomeProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
  onOpenSettings: () => void;
  config: ConfigData | null;
  connectionStatus: ConnectionStatus;
  nzbProviders: NzbProvider[];
  usenetDownloader: Downloader | null;
}

function Home({ onSearch, isSearching, onOpenSettings, config, connectionStatus, nzbProviders, usenetDownloader }: HomeProps) {
  const [query, setQuery] = useState('');
  
  // Rotating headlines
  const headlines = [
    "Find your next read.",
    "Discover your next adventure.",
    "Search the literary universe.",
    "Your next page-turner awaits.",
    "Explore millions of ebooks.",
    "Feed your reading addiction.",
    "Books, books, and more books.",
    "The library never closes.",
    "Dive into endless stories.",
    "Where book lovers unite.",
    "Your digital library awaits.",
    "Lost in books? Good.",
    "One search, infinite books.",
    "Reading fuel incoming.",
    "All the books you can handle.",
    "Ctrl+F for literature.",
    "Books at the speed of IRC.",
    "Your TBR list starts here.",
    "Because one book is never enough.",
    "Hoarding books responsibly.",
    "A reader lives a thousand lives.",
    "Just one more chapter...",
    "Escape reality, find a book.",
    "Books: the original binge-watch.",
    "Reading is not a crime.",
    "Download now, read later (maybe).",
    "Your shelf called, it's hungry.",
    "Literary treasures await.",
    "From bestsellers to hidden gems.",
    "The ultimate book finder.",
    "Search smarter, read more.",
    "Building your digital empire.",
    "Every book, everywhere, all at once.",
    "Indexing the world's stories.",
    "Your reading queue, supercharged.",
    "Books discovered, lives changed.",
    "The search ends here.",
    "Too many books? Never.",
    "Resistance is futile. Download.",
    "Knowledge is just a search away.",
    "Turning pages since... now.",
    "Where words come alive.",
    "Bibliophile paradise found.",
    "Read more, worry less.",
    "Your next obsession awaits.",
    "Books without borders.",
    "Stories from every corner.",
    "Because sleep is overrated.",
    "Infinite shelves, zero dust.",
    "Adventure is one click away.",
    "Search once, discover forever.",
    "The bookworm's headquarters.",
    "Where stories find you.",
    "Powered by pure literature.",
    "Your imagination's fuel station.",
    "Every genre, every author.",
    "The ultimate page-turner hub.",
    "Books faster than light.",
    "Reading: unlocked.",
    "Your literary command center.",
    "From classics to new releases.",
    "The book you need is here.",
    "Expanding minds, one book at a time.",
    "Never run out of reading material.",
    "Books: downloaded and ready.",
    "Your personal Alexandria.",
    "Where readers become explorers.",
    "The next great read is waiting.",
    "Unlimited stories, zero limits.",
    "Find it, download it, love it.",
    "Your reading life, simplified.",
    "Books at your fingertips.",
    "The search for great books ends here.",
    "Curating your perfect library.",
    "Adventure between the lines.",
    "Every book lover's dream.",
    "Stories worth staying up for.",
    "Your next favorite book is here.",
    "Reading made effortless.",
    "The world's books, one search.",
  ];
  const [headlineIndex, setHeadlineIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((prev) => {
        let next;
        do {
          next = Math.floor(Math.random() * headlines.length);
        } while (next === prev && headlines.length > 1);
        return next;
      });
    }, 10000); // Rotate every 10 seconds
    return () => clearInterval(interval);
  }, [headlines.length]);

  // Derive available sources from actual configuration
  const ircAvailable = config?.irc?.enabled && connectionStatus === 'connected';
  const newznabAvailable = nzbProviders.filter(p => p.enabled).length > 0;
  const torrentsAvailable = false; // Not implemented yet

  const [activeSources, setActiveSources] = useState({
    irc: ircAvailable,
    newznab: newznabAvailable,
    torrents: false
  });

  // Update active sources when availability changes
  useEffect(() => {
    setActiveSources(prev => ({
      irc: prev.irc && ircAvailable, // Keep checked only if still available
      newznab: prev.newznab && newznabAvailable,
      torrents: false
    }));
  }, [ircAvailable, newznabAvailable]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isSearching) {
      onSearch(query.trim());
    }
  };

  const toggleSource = (source: 'irc' | 'newznab' | 'torrents') => {
    // Only allow toggling if the source is available
    if (source === 'irc' && !ircAvailable) return;
    if (source === 'newznab' && !newznabAvailable) return;
    if (source === 'torrents' && !torrentsAvailable) return;

    setActiveSources(prev => ({
      ...prev,
      [source]: !prev[source]
    }));
  };

  return (
    <div className="min-h-screen bg-background-dark dark:bg-background-dark text-slate-900 dark:text-slate-100 flex flex-col font-display">
      {/* Header */}
      <header className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-2xl">auto_stories</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">ShelfSeeker</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button className="flex items-center justify-center p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">help</span>
          </button>
          <div className="h-10 w-10 rounded-full border-2 border-primary/20 bg-slate-700" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-20">
        <div className="w-full max-w-3xl space-y-8">
          {/* Headline */}
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              <motion.span
                key={headlineIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              >
                {headlines[headlineIndex]}
              </motion.span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
              Search millions of ebooks across IRC, Newznab, and Torrent trackers in one unified interface.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.form
            onSubmit={handleSubmit}
            className="relative group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-xl blur opacity-25 group-focus-within:opacity-100 transition duration-1000" />
            <div className="relative flex flex-col min-w-40 h-16 w-full">
              <div className="flex w-full flex-1 items-stretch rounded-xl h-full shadow-2xl overflow-hidden">
                <div className="text-slate-400 flex border-none bg-white dark:bg-slate-800 items-center justify-center pl-6 rounded-l-xl">
                  <span className="material-symbols-outlined text-2xl">search</span>
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden text-slate-900 dark:text-white focus:outline-0 focus:ring-0 border-none bg-white dark:bg-slate-800 focus:border-none h-full placeholder:text-slate-400 px-4 pl-3 text-lg font-medium"
                  placeholder="Search by title or author"
                  disabled={isSearching}
                  autoFocus
                />
                <div className="bg-white dark:bg-slate-800 flex items-center pr-6 rounded-r-xl">
                  <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                    <span className="text-xs">ENTER</span>
                  </kbd>
                </div>
              </div>
            </div>
          </motion.form>

          {/* Source Toggles */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex flex-col items-center gap-3">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium tracking-wide uppercase">Active Sources</p>
              <div className="flex h-14 w-full max-w-xl items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 p-1.5 shadow-inner">
                <label className={`flex h-full grow items-center justify-center gap-2 overflow-hidden rounded-lg px-4 transition-all ${
                  !ircAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${activeSources.irc && ircAvailable ? 'bg-primary text-white' : 'text-slate-500 dark:text-slate-400'} text-sm font-semibold leading-normal`}>
                  <span className="material-symbols-outlined text-xl">terminal</span>
                  <span className="truncate">IRC</span>
                  {!ircAvailable && <span className="text-xs opacity-60">(offline)</span>}
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={activeSources.irc && ircAvailable}
                    onChange={() => toggleSource('irc')}
                    disabled={!ircAvailable}
                  />
                </label>
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />
                <label className={`flex h-full grow items-center justify-center gap-2 overflow-hidden rounded-lg px-4 transition-all ${
                  !newznabAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${activeSources.newznab && newznabAvailable ? 'bg-primary text-white' : 'text-slate-500 dark:text-slate-400'} text-sm font-semibold leading-normal`}>
                  <span className="material-symbols-outlined text-xl">database</span>
                  <span className="truncate">Newznab</span>
                  {!newznabAvailable && <span className="text-xs opacity-60">(no providers)</span>}
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={activeSources.newznab && newznabAvailable}
                    onChange={() => toggleSource('newznab')}
                    disabled={!newznabAvailable}
                  />
                </label>
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />
                <label className={`flex h-full grow items-center justify-center gap-2 overflow-hidden rounded-lg px-4 transition-all opacity-50 cursor-not-allowed text-slate-500 dark:text-slate-400 text-sm font-semibold leading-normal`}>
                  <span className="material-symbols-outlined text-xl">nest_cam_magnet_mount</span>
                  <span className="truncate">Torrents</span>
                  <span className="text-xs opacity-60">(coming soon)</span>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={false}
                    disabled
                  />
                </label>
              </div>
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-sm font-normal leading-normal text-center">
              Toggle sources to broaden or narrow your indexing results.
            </p>
          </motion.div>
        </div>
      </main>

      {/* Footer Status */}
      <footer className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-6">
            {/* IRC Status */}
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-slate-400'
              }`} />
              <span>
                IRC {connectionStatus === 'connected' ? 'Online' : connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}
                {config?.irc?.enabled && connectionStatus === 'connected' && (
                  <span className="text-slate-400 dark:text-slate-500"> ({config.irc.server})</span>
                )}
              </span>
            </div>

            {/* Newznab Status */}
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${
                nzbProviders.filter(p => p.enabled).length > 0 ? 'bg-emerald-500' : 'bg-slate-400'
              }`} />
              <span>
                Newznab {nzbProviders.filter(p => p.enabled).length > 0 ?
                  `(${nzbProviders.filter(p => p.enabled).length} ${nzbProviders.filter(p => p.enabled).length === 1 ? 'provider' : 'providers'})` :
                  'Idle'}
              </span>
            </div>

            {/* Downloader Status */}
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${usenetDownloader ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span>
                Downloader {usenetDownloader ? `(${usenetDownloader.name})` : 'Not configured'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span>ShelfSeeker v1.0.0</span>
            <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <a className="hover:text-primary transition-colors" href="#">Documentation</a>
            <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <a className="hover:text-primary transition-colors" href="#">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
