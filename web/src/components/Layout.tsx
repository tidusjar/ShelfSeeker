import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import type { ConfigData, ConnectionStatus, NzbProvider, Downloader } from '../types';

interface LayoutProps {
  children: ReactNode;

  // Header configuration
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
  onSettingsClick: () => void;
  onLogoClick: () => void;
  showHelpButton?: boolean;

  // Footer configuration
  config: ConfigData | null;
  connectionStatus: ConnectionStatus;
  nzbProviders: NzbProvider[];
  usenetDownloader: Downloader | null;
  showFooter?: boolean;
}

function Layout({
  children,
  showSearch = false,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  onSettingsClick,
  onLogoClick,
  showHelpButton = true,
  config,
  connectionStatus,
  nzbProviders,
  usenetDownloader,
  showFooter = true,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 flex flex-col font-display">
      <Header
        onLogoClick={onLogoClick}
        onSettingsClick={onSettingsClick}
        showHelpButton={showHelpButton}
        showSearch={showSearch}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit}
      />

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {showFooter && (
        <Footer
          connectionStatus={connectionStatus}
          config={config}
          nzbProviders={nzbProviders}
          usenetDownloader={usenetDownloader}
        />
      )}
    </div>
  );
}

export default Layout;
