import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Layout from './Layout';
import SearchBar from './SearchBar';
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
    irc: ircAvailable || false,
    newznab: newznabAvailable || false,
    torrents: false
  });

  // Update active sources when availability changes
  useEffect(() => {
    setActiveSources(prev => ({
      irc: Boolean(prev.irc && ircAvailable), // Keep checked only if still available
      newznab: Boolean(prev.newznab && newznabAvailable),
      torrents: false
    }));
  }, [ircAvailable, newznabAvailable]);

  const handleSubmit = (query: string) => {
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
    <Layout
      showSearch={false}
      onSettingsClick={onOpenSettings}
      onLogoClick={() => {}}
      config={config}
      connectionStatus={connectionStatus}
      nzbProviders={nzbProviders}
      usenetDownloader={usenetDownloader}
      showFooter={true}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-4">
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
          <SearchBar
            variant="large"
            query={query}
            onQueryChange={setQuery}
            onSubmit={handleSubmit}
            isSearching={isSearching}
            showSourceToggles={true}
            activeSources={activeSources}
            onToggleSource={toggleSource}
            ircAvailable={ircAvailable}
            newznabAvailable={newznabAvailable}
            autoFocus={true}
          />
        </div>
      </div>
    </Layout>
  );
}

export default Home;
