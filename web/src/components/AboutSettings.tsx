import { useState, useEffect } from 'react';
import { api } from '../api';
import type { SystemInfo } from '../types';

function AboutSettings() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    try {
      const response = await api.getSystemInfo();
      if (response.success && response.data) {
        setSystemInfo(response.data);
      }
    } catch (error) {
      console.error('Failed to load system info:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!systemInfo) {
    return (
      <div className="p-8">
        <div className="text-center text-slate-500 dark:text-muted-dark py-12">
          Failed to load system information
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">
          About {systemInfo.name}
        </h1>
        <p className="text-slate-600 dark:text-muted-dark">
          {systemInfo.description}
        </p>
      </div>

      {/* Version Information */}
      <div className="bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-border-dark p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">info</span>
          Version Information
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-border-dark">
            <span className="text-slate-600 dark:text-muted-dark">Version</span>
            <span className="font-mono text-slate-900 dark:text-slate-50 font-medium">
              v{systemInfo.version}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-border-dark">
            <span className="text-slate-600 dark:text-muted-dark">License</span>
            <span className="text-slate-900 dark:text-slate-50">{systemInfo.license}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-border-dark">
            <span className="text-slate-600 dark:text-muted-dark">Node.js Version</span>
            <span className="font-mono text-slate-900 dark:text-slate-50">{systemInfo.nodeVersion}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-border-dark">
            <span className="text-slate-600 dark:text-muted-dark">Platform</span>
            <span className="text-slate-900 dark:text-slate-50">{systemInfo.platform}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-600 dark:text-muted-dark">Server Uptime</span>
            <span className="text-slate-900 dark:text-slate-50">{formatUptime(systemInfo.uptime)}</span>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-border-dark p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">link</span>
          Links & Resources
        </h2>
        <div className="space-y-3">
          <a
            href={systemInfo.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-border-dark transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-600 dark:text-muted-dark">
                code
              </span>
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-50 group-hover:text-primary transition-colors">
                  GitHub Repository
                </div>
                <div className="text-sm text-slate-500 dark:text-muted-dark">
                  Source code, issues, and contributions
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400">
              open_in_new
            </span>
          </a>

          <a
            href={systemInfo.donationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-border-dark transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-600 dark:text-muted-dark">
                favorite
              </span>
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-50 group-hover:text-primary transition-colors">
                  Support Development
                </div>
                <div className="text-sm text-slate-500 dark:text-muted-dark">
                  Help keep this project alive
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400">
              open_in_new
            </span>
          </a>

          <a
            href={`${systemInfo.githubUrl}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-border-dark transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-600 dark:text-muted-dark">
                bug_report
              </span>
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-50 group-hover:text-primary transition-colors">
                  Report an Issue
                </div>
                <div className="text-sm text-slate-500 dark:text-muted-dark">
                  Found a bug? Let us know
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400">
              open_in_new
            </span>
          </a>

          <a
            href={`${systemInfo.githubUrl}/blob/main/README.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-border-dark transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-600 dark:text-muted-dark">
                description
              </span>
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-50 group-hover:text-primary transition-colors">
                  Documentation
                </div>
                <div className="text-sm text-slate-500 dark:text-muted-dark">
                  Setup guides and help
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400">
              open_in_new
            </span>
          </a>
        </div>
      </div>

      {/* Credits */}
      <div className="bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-border-dark p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">groups</span>
          Technologies
        </h2>
        <div className="text-sm text-slate-600 dark:text-muted-dark space-y-2">
          <p>
            Built with React, TypeScript, Vite, Express.js, and IRC Framework.
          </p>
          <p>
            Special thanks to the open-source community and all contributors.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AboutSettings;
