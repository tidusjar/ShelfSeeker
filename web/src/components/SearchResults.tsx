import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SearchResult, ConfigData, ConnectionStatus, NzbProvider, Downloader } from '../types';

interface SearchResultsProps {
  results: SearchResult[];
  searchQuery: string;
  onDownload: (result: SearchResult) => void;
  onSendToDownloader?: (result: SearchResult) => void;
  onBackToHome: () => void;
  onNewSearch: (query: string) => void;
  onOpenSettings: () => void;
  config: ConfigData | null;
  connectionStatus: ConnectionStatus;
  nzbProviders: NzbProvider[];
  usenetDownloader: Downloader | null;
}

function SearchResults({
  results,
  searchQuery,
  onDownload,
  onSendToDownloader,
  onBackToHome,
  onNewSearch,
  onOpenSettings,
  config,
  connectionStatus,
  nzbProviders,
  usenetDownloader
}: SearchResultsProps) {
  const [query, setQuery] = useState(searchQuery);
  const [fileTypeFilter, setFileTypeFilter] = useState<Set<string>>(new Set(['EPUB']));
  const [sourceFilter, setSourceFilter] = useState<'irc' | 'newznab' | 'torrents' | null>('irc');
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | 'month'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 10;

  // Derive available sources from actual configuration
  const ircAvailable = config?.irc?.enabled && connectionStatus === 'connected';
  const newznabAvailable = nzbProviders.filter(p => p.enabled).length > 0;
  const torrentsAvailable = false; // Not implemented yet

  // Check if results contain each source type
  const hasIrcResults = results.some(r => r.source === 'irc');
  const hasNzbResults = results.some(r => r.source === 'nzb');

  const toggleFileType = (type: string) => {
    const newSet = new Set(fileTypeFilter);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setFileTypeFilter(newSet);
  };

  const filteredResults = useMemo(() => {
    let filtered = results;

    // File type filter
    if (fileTypeFilter.size > 0) {
      filtered = filtered.filter(r => fileTypeFilter.has(r.fileType.toUpperCase()));
    }

    // Source filter
    if (sourceFilter) {
      filtered = filtered.filter(r => {
        if (sourceFilter === 'irc') return r.source === 'irc';
        if (sourceFilter === 'newznab') return r.source === 'nzb';
        return false;
      });
    }

    return filtered;
  }, [results, fileTypeFilter, sourceFilter]);

  const totalPages = Math.ceil(filteredResults.length / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const paginatedResults = filteredResults.slice(startIndex, startIndex + resultsPerPage);

  const formatFileSize = (size: string) => size;

  const getFileTypeColor = (fileType: string) => {
    const type = fileType.toUpperCase();
    switch (type) {
      case 'EPUB':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
      case 'PDF':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      case 'MOBI':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'AZW3':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onNewSearch(query.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background-dark dark:bg-background-dark text-slate-900 dark:text-slate-100">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-[#232f48] px-4 md:px-10 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-8 flex-1">
            <button onClick={onBackToHome} className="flex items-center gap-3 text-primary hover:opacity-80 transition-opacity">
              <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined">auto_stories</span>
              </div>
              <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-tight">ShelfSeeker</h2>
            </button>
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border-none bg-slate-100 dark:bg-[#232f48] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-[#1a2335] transition-all text-sm"
                  placeholder="Search for titles, authors, or ISBNs..."
                />
              </div>
            </form>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden lg:flex items-center gap-6">
              <a className="hover:text-primary transition-colors text-sm font-medium" href="#">History</a>
              <a className="hover:text-primary transition-colors text-sm font-medium" href="#">My Library</a>
              <button
                onClick={onOpenSettings}
                className="hover:text-primary transition-colors text-sm font-medium"
              >
                Settings
              </button>
            </nav>
            <div className="h-10 w-10 rounded-full border-2 border-primary/20 p-0.5">
              <div className="w-full h-full bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto flex flex-col md:flex-row gap-8 px-4 md:px-10 py-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 shrink-0 space-y-8">
          <div className="flex flex-col gap-6 md:sticky md:top-24">
            {/* File Type Filter */}
            <div>
              <h3 className="text-slate-900 dark:text-white text-sm font-bold uppercase tracking-wider mb-4">File Type</h3>
              <div className="space-y-1">
                {['EPUB', 'PDF', 'MOBI', 'AZW3'].map(type => (
                  <label key={type} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232f48] cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={fileTypeFilter.has(type)}
                      onChange={() => toggleFileType(type)}
                      className="h-5 w-5 rounded border-slate-300 dark:border-[#324467] bg-transparent text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Source Filter */}
            <div>
              <h3 className="text-slate-900 dark:text-white text-sm font-bold uppercase tracking-wider mb-4">Source</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => hasIrcResults && setSourceFilter(sourceFilter === 'irc' ? null : 'irc')}
                  disabled={!hasIrcResults}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                    !hasIrcResults
                      ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-[#232f48] text-slate-400'
                      : sourceFilter === 'irc'
                      ? 'bg-primary/10 text-primary border border-primary/20 cursor-pointer'
                      : 'bg-slate-100 dark:bg-[#232f48] text-slate-600 dark:text-slate-300 hover:bg-primary/20 hover:text-primary cursor-pointer'
                  }`}
                  title={!hasIrcResults ? 'No IRC results available' : ''}
                >
                  <span className="material-symbols-outlined text-sm">terminal</span>
                  <span className="text-xs font-semibold">IRC</span>
                  {!hasIrcResults && <span className="text-[10px] opacity-60">(0)</span>}
                </button>
                <button
                  onClick={() => hasNzbResults && setSourceFilter(sourceFilter === 'newznab' ? null : 'newznab')}
                  disabled={!hasNzbResults}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                    !hasNzbResults
                      ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-[#232f48] text-slate-400'
                      : sourceFilter === 'newznab'
                      ? 'bg-primary/10 text-primary border border-primary/20 cursor-pointer'
                      : 'bg-slate-100 dark:bg-[#232f48] text-slate-600 dark:text-slate-300 hover:bg-primary/20 hover:text-primary cursor-pointer'
                  }`}
                  title={!hasNzbResults ? 'No Newznab results available' : ''}
                >
                  <span className="material-symbols-outlined text-sm">database</span>
                  <span className="text-xs font-semibold">Newznab</span>
                  {!hasNzbResults && <span className="text-[10px] opacity-60">(0)</span>}
                </button>
                <button
                  disabled
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full opacity-50 cursor-not-allowed bg-slate-100 dark:bg-[#232f48] text-slate-400"
                  title="Torrents coming soon"
                >
                  <span className="material-symbols-outlined text-sm">nest_cam_magnet_mount</span>
                  <span className="text-xs font-semibold">Torrents</span>
                  <span className="text-[10px] opacity-60">(soon)</span>
                </button>
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <h3 className="text-slate-900 dark:text-white text-sm font-bold uppercase tracking-wider mb-4">Date Added</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setDateFilter('all')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    dateFilter === 'all'
                      ? 'bg-primary text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">calendar_today</span>
                  <span className="text-sm font-medium">All Time</span>
                </button>
                <button
                  onClick={() => setDateFilter('24h')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    dateFilter === '24h'
                      ? 'bg-primary text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">schedule</span>
                  <span className="text-sm font-medium">Last 24 Hours</span>
                </button>
                <button
                  onClick={() => setDateFilter('month')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    dateFilter === 'month'
                      ? 'bg-primary text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">event</span>
                  <span className="text-sm font-medium">This Month</span>
                </button>
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setFileTypeFilter(new Set(['EPUB']));
                setSourceFilter('irc');
                setDateFilter('all');
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#232f48] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232f48] hover:text-slate-900 dark:hover:text-white transition-all text-sm font-semibold"
            >
              <span className="material-symbols-outlined text-lg">filter_alt_off</span>
              Reset Filters
            </button>
          </div>
        </aside>

        {/* Main Results Area */}
        <section className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">
              Found {filteredResults.length} results for '{searchQuery}'
            </h2>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#232f48] p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-background-dark shadow-sm text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-lg">format_list_bulleted</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-background-dark shadow-sm text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-lg">grid_view</span>
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="flex flex-col gap-4">
            {paginatedResults.map((result) => (
              <motion.div
                key={`${result.botName}-${result.bookNumber}`}
                className="group relative flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-white dark:bg-[#111722] rounded-xl border border-slate-200 dark:border-[#232f48] hover:border-primary/50 dark:hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex gap-5 items-start">
                  <div className="w-16 h-24 shrink-0 bg-slate-200 dark:bg-[#232f48] rounded-lg overflow-hidden shadow-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-400 text-4xl">book</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-slate-900 dark:text-white text-lg font-bold group-hover:text-primary transition-colors">
                      {result.title}
                    </h3>
                    {result.author && (
                      <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">by {result.author}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getFileTypeColor(result.fileType)}`}>
                        {result.fileType.toUpperCase()}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 text-xs flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">attachment</span>
                        {formatFileSize(result.size)}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 text-xs flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">
                          {result.source === 'irc' ? 'terminal' : 'database'}
                        </span>
                        {result.sourceProvider}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 md:mt-0 w-full md:w-auto">
                  <motion.button
                    onClick={() => onDownload(result)}
                    className="w-full md:w-auto px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="material-symbols-outlined text-lg">download</span>
                    Download
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-3">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-[#232f48] hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl font-medium text-sm transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-white font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="px-2 text-slate-400">...</span>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-600 dark:text-slate-400 font-medium text-sm transition-colors"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-[#232f48] hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 dark:border-[#232f48] py-8">
        <div className="max-w-[1440px] mx-auto px-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="material-symbols-outlined">auto_stories</span>
            <span className="text-sm font-medium">ShelfSeeker Search Tool © 2024</span>
          </div>
          <div className="flex gap-8">
            <a className="text-xs font-semibold text-slate-400 hover:text-primary transition-colors" href="#">API Docs</a>
            <a className="text-xs font-semibold text-slate-400 hover:text-primary transition-colors" href="#">Safety Guide</a>
            <a className="text-xs font-semibold text-slate-400 hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <a className="text-xs font-semibold text-slate-400 hover:text-primary transition-colors" href="#">Donate</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default SearchResults;
