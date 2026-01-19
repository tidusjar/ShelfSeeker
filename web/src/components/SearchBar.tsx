import { FormEvent } from 'react';
import { motion } from 'framer-motion';

interface SearchBarProps {
  variant: 'large' | 'compact';
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: (query: string) => void;
  isSearching?: boolean;
  placeholder?: string;
  autoFocus?: boolean;

  // Large variant only
  showSourceToggles?: boolean;
  activeSources?: { irc: boolean; newznab: boolean; torrents: boolean };
  onToggleSource?: (source: 'irc' | 'newznab' | 'torrents') => void;
  ircAvailable?: boolean;
  newznabAvailable?: boolean;
}

function SearchBar({
  variant,
  query,
  onQueryChange,
  onSubmit,
  isSearching = false,
  placeholder,
  autoFocus = false,
  showSourceToggles = false,
  activeSources,
  onToggleSource,
  ircAvailable = false,
  newznabAvailable = false,
}: SearchBarProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isSearching) {
      onSubmit(query.trim());
    }
  };

  if (variant === 'large') {
    return (
      <div className="space-y-8">
        {/* Large Search Bar */}
        <motion.form
          onSubmit={handleSubmit}
          className="relative group"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          data-testid="search-form"
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
                onChange={(e) => onQueryChange(e.target.value)}
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden text-slate-900 dark:text-white focus:outline-0 focus:ring-0 border-none bg-white dark:bg-slate-800 focus:border-none h-full placeholder:text-slate-400 px-4 pl-3 text-lg font-medium"
                placeholder={placeholder || "Search by title or author"}
                disabled={isSearching}
                autoFocus={autoFocus}
                data-testid="search-input"
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
        {showSourceToggles && activeSources && onToggleSource && (
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
                    onChange={() => onToggleSource('irc')}
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
                    onChange={() => onToggleSource('newznab')}
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
        )}
      </div>
    );
  }

  // Compact variant
  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-2xl" data-testid="search-form-compact">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <span className="material-symbols-outlined">search</span>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border-none bg-slate-100 dark:bg-[#232f48] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-[#1a2335] transition-all text-sm"
          placeholder={placeholder || "Search for titles, authors, or ISBNs..."}
          disabled={isSearching}
          data-testid="search-input-compact"
        />
      </div>
    </form>
  );
}

export default SearchBar;
