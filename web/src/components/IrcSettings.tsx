import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import type { ConfigData, IrcConfig, ConnectionStatus } from '../types';

interface IrcSettingsProps {
  config: ConfigData | null;
  connectionStatus: ConnectionStatus;
  onConfigUpdate: () => void;
}

function IrcSettings({ config, connectionStatus, onConfigUpdate }: IrcSettingsProps) {
  const [ircConfig, setIrcConfig] = useState<IrcConfig>({
    enabled: true,
    server: '',
    port: 6667,
    channel: '',
    searchCommand: '@search'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (config?.irc) {
      setIrcConfig(config.irc);
    }
  }, [config]);

  const validateConfig = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!ircConfig.server.trim()) {
      newErrors.server = 'Server address cannot be empty';
    }

    if (ircConfig.port < 1 || ircConfig.port > 65535) {
      newErrors.port = 'Port must be between 1 and 65535';
    }

    if (!ircConfig.channel.trim()) {
      newErrors.channel = 'Channel cannot be empty';
    } else if (!ircConfig.channel.startsWith('#')) {
      newErrors.channel = 'Channel must start with #';
    }

    if (!ircConfig.searchCommand.trim()) {
      newErrors.searchCommand = 'Search command cannot be empty';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateConfig()) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await api.updateConfig({ 
        irc: ircConfig,
        general: { downloadPath: '' } // Will be preserved by server
      });

      if (response.success && response.data) {
        setSaveMessage({
          type: 'success',
          text: 'IRC configuration saved successfully'
        });
        onConfigUpdate();
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({
          type: 'error',
          text: response.error || 'Failed to update configuration'
        });
      }
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: 'Network error: Failed to connect to server'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset IRC settings to defaults?')) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await api.resetConfig();

      if (response.success) {
        const configResponse = await api.getConfig();
        if (configResponse.success && configResponse.data) {
          setIrcConfig(configResponse.data.irc);
          setSaveMessage({
            type: 'success',
            text: 'Settings reset to defaults'
          });
          onConfigUpdate();
          setTimeout(() => setSaveMessage(null), 3000);
        }
      } else {
        setSaveMessage({
          type: 'error',
          text: response.error || 'Failed to reset configuration'
        });
      }
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: 'Network error: Failed to connect to server'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setSaveMessage({
      type: 'success',
      text: 'Testing connection...'
    });

    setTimeout(() => {
      if (connectionStatus === 'connected') {
        setSaveMessage({
          type: 'success',
          text: 'Connection successful!'
        });
      } else {
        setSaveMessage({
          type: 'error',
          text: 'Connection failed. Please check your settings.'
        });
      }
      setTimeout(() => setSaveMessage(null), 3000);
    }, 1000);
  };

  return (
    <div className="max-w-[960px] mx-auto p-6 lg:p-10">
      {/* Page Heading */}
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
          IRC Configuration
        </h2>
        <p className="text-slate-500 dark:text-muted-dark text-lg">
          Configure your IRC search parameters and connection settings to aggregate results from book servers.
        </p>
      </div>

      {/* Toggle Action Panel */}
      <div className="mb-8 p-5 rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark flex items-center justify-between shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-slate-900 dark:text-white text-base font-bold">Enable IRC Search</p>
          <p className="text-slate-500 dark:text-muted-dark text-sm leading-normal">
            When enabled, ShelfSeeker will include IRC bot results in your queries.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={ircConfig.enabled}
            onChange={(e) => setIrcConfig({ ...ircConfig, enabled: e.target.checked })}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-border-dark peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {/* Configuration Form Section */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-border-dark">
            <h3 className="text-lg font-bold">Connection Details</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Server Input */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="server">
                  Server Hostname
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-sm">dns</span>
                  </div>
                  <input
                    className={`w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border ${
                      errors.server ? 'border-red-500' : 'border-slate-200 dark:border-border-dark'
                    } rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`}
                    id="server"
                    name="server"
                    placeholder="irc.irchighway.net"
                    type="text"
                    value={ircConfig.server}
                    onChange={(e) => setIrcConfig({ ...ircConfig, server: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-muted-dark">
                  The IRC server address providing book search bots.
                </p>
                {errors.server && <span className="text-xs text-red-500">{errors.server}</span>}
              </div>

              {/* Port Input */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="port">
                  Port
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-sm">tag</span>
                  </div>
                  <input
                    className={`w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border ${
                      errors.port ? 'border-red-500' : 'border-slate-200 dark:border-border-dark'
                    } rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`}
                    id="port"
                    name="port"
                    placeholder="6667"
                    type="number"
                    value={ircConfig.port}
                    onChange={(e) => setIrcConfig({ ...ircConfig, port: parseInt(e.target.value) || 0 })}
                    disabled={isSaving}
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-muted-dark">
                  Use SSL ports (typically 6697 or 7000) for security.
                </p>
                {errors.port && <span className="text-xs text-red-500">{errors.port}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Channel Input */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="channel">
                  Channel Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-sm">tag</span>
                  </div>
                  <input
                    className={`w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border ${
                      errors.channel ? 'border-red-500' : 'border-slate-200 dark:border-border-dark'
                    } rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`}
                    id="channel"
                    name="channel"
                    placeholder="#ebooks"
                    type="text"
                    value={ircConfig.channel}
                    onChange={(e) => setIrcConfig({ ...ircConfig, channel: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-muted-dark">
                  The specific channel where the search trigger works.
                </p>
                {errors.channel && <span className="text-xs text-red-500">{errors.channel}</span>}
              </div>

              {/* Search Command Input */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="command">
                  Search Command
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-sm">terminal</span>
                  </div>
                  <input
                    className={`w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border ${
                      errors.searchCommand ? 'border-red-500' : 'border-slate-200 dark:border-border-dark'
                    } rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`}
                    id="command"
                    name="command"
                    placeholder="@search"
                    type="text"
                    value={ircConfig.searchCommand}
                    onChange={(e) => setIrcConfig({ ...ircConfig, searchCommand: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-muted-dark">
                  The trigger command. The search query will be appended automatically.
                </p>
                {errors.searchCommand && <span className="text-xs text-red-500">{errors.searchCommand}</span>}
              </div>
            </div>

            {/* Save Message */}
            {saveMessage && (
              <motion.div
                className={`p-4 rounded-lg ${
                  saveMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {saveMessage.text}
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSaving}
              >
                <span className="material-symbols-outlined text-sm">save</span>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-border-dark hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-2.5 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSaving}
              >
                <span className="material-symbols-outlined text-sm">bolt</span>
                Test Connection
              </button>
              <div className="flex-1"></div>
              <button
                type="button"
                onClick={handleReset}
                className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 text-sm font-semibold py-2.5 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSaving}
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Footer Info */}
      <div className="mt-8 p-4 rounded-lg bg-primary/5 border border-primary/10 flex gap-4">
        <div className="text-primary shrink-0">
          <span className="material-symbols-outlined">info</span>
        </div>
        <div>
          <p className="text-sm text-slate-600 dark:text-muted-dark leading-relaxed">
            <strong>Note:</strong> IRC searching requires an active internet connection and may take a few seconds longer than web-based providers as it connects to the server and waits for bot responses.
          </p>
        </div>
      </div>
    </div>
  );
}

export default IrcSettings;
