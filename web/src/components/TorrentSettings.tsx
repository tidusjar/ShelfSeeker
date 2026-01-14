import { useState } from 'react';

function TorrentSettings() {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="max-w-[960px] mx-auto p-6 lg:p-10">
      {/* Page Heading */}
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
          Torrent Configuration
        </h2>
        <p className="text-slate-500 dark:text-muted-dark text-lg">
          Configure your Prowlarr or Jackett instance to search across public and private torrent trackers.
        </p>
      </div>

      {/* Toggle Action Panel */}
      <div className="mb-8 p-5 rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark flex items-center justify-between shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-slate-900 dark:text-white text-base font-bold">Enable Torrent Search</p>
          <p className="text-slate-500 dark:text-muted-dark text-sm leading-normal">
            When enabled, ShelfSeeker will include torrent results in your search results.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-border-dark peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {/* Configuration Form Section */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-border-dark">
          <h3 className="text-lg font-bold">Indexer Details</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="hostname">
                Hostname/URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">link</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="hostname"
                  name="hostname"
                  placeholder="http://127.0.0.1:9696"
                  type="text"
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">
                The base URL of your Prowlarr or Jackett installation.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="api_key">
                API Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">key</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="api_key"
                  name="api_key"
                  placeholder="Enter your API key"
                  type="password"
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">Found in your indexer settings page.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="categories">
                Categories
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">category</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="categories"
                  name="categories"
                  placeholder="7000, 7020, 8000"
                  type="text"
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">
                Comma-separated list of category IDs (e.g., 7000 for Ebooks, 8000 for Audiobooks).
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              Save Changes
            </button>
            <button
              type="button"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-border-dark hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-2.5 px-6 rounded-lg transition-all"
            >
              <span className="material-symbols-outlined text-sm">bolt</span>
              Test Connection
            </button>
            <div className="flex-1"></div>
            <button
              type="button"
              className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 text-sm font-semibold py-2.5 px-4 transition-colors"
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 p-4 rounded-lg bg-primary/5 border border-primary/10 flex gap-4">
        <div className="text-primary shrink-0">
          <span className="material-symbols-outlined">info</span>
        </div>
        <div>
          <p className="text-sm text-slate-600 dark:text-muted-dark leading-relaxed">
            <strong>Note:</strong> Torrent searches are proxied through your configured indexer (Prowlarr or Jackett). Ensure the service is reachable from this server's network.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TorrentSettings;
