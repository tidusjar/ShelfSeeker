import SearchBar from './SearchBar';

interface HeaderProps {
  onLogoClick: () => void;
  onSettingsClick: () => void;
  showHelpButton?: boolean;

  // Optional search integration
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
}

function Header({
  onLogoClick,
  onSettingsClick,
  showHelpButton = true,
  showSearch = false,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-[#232f48] px-8 py-6">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-8">
        {/* Logo and Title */}
        <button
          onClick={onLogoClick}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          data-testid="logo-button"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-2xl">auto_stories</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">ShelfSeeker</h1>
        </button>

        {/* Optional Search Bar (hidden on mobile) */}
        {showSearch && onSearchChange && onSearchSubmit && (
          <div className="hidden md:block flex-1 max-w-2xl">
            <SearchBar
              variant="compact"
              query={searchQuery}
              onQueryChange={onSearchChange}
              onSubmit={onSearchSubmit}
            />
          </div>
        )}

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={onSettingsClick}
            className="flex items-center justify-center p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
            data-testid="settings-button"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          {showHelpButton && (
            <button 
              className="flex items-center justify-center p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              data-testid="help-button"
            >
              <span className="material-symbols-outlined">help</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
