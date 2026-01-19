import type { ConnectionStatus, ConfigData, NzbProvider, Downloader } from '../types';

interface FooterProps {
  connectionStatus: ConnectionStatus;
  config: ConfigData | null;
  nzbProviders: NzbProvider[];
  usenetDownloader: Downloader | null;
}

function Footer({ connectionStatus, config, nzbProviders, usenetDownloader }: FooterProps) {
  return (
    <footer className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-6">
          {/* IRC Status */}
          <div className="flex items-center gap-2" data-testid="footer-irc-status">
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
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <span>ShelfSeeker v1.0.0</span>
          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <a className="hover:text-primary transition-colors" href="#">Documentation</a>
          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <a className="hover:text-primary transition-colors" href="#">Terms</a>
          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <a className="hover:text-primary transition-colors" href="#">API Docs</a>
          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <a className="hover:text-primary transition-colors" href="#">Safety Guide</a>
          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <a className="hover:text-primary transition-colors" href="#">Donate</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
