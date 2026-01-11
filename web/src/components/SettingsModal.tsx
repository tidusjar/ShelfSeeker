import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import type { ConfigData, IrcConfig } from '../types';
import NzbProviderList from './NzbProviderList';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ConfigData) => void;
  currentConfig: ConfigData | null;
  isDownloading: boolean;
}

function SettingsModal({
  isOpen,
  onClose,
  onSave,
  currentConfig,
  isDownloading
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'irc' | 'nzb'>('general');
  const [config, setConfig] = useState<IrcConfig>({
    enabled: true,
    server: '',
    port: 6667,
    channel: '',
    searchCommand: ''
  });
  const [generalConfig, setGeneralConfig] = useState({ downloadPath: '/app/server/downloads' });
  const [ircStatus, setIrcStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load current config when modal opens
  useEffect(() => {
    if (isOpen && currentConfig) {
      setConfig(currentConfig.irc);
      setGeneralConfig(currentConfig.general || { downloadPath: '/app/server/downloads' });
      setErrors({});
      setSaveMessage(null);
      // Check IRC status
      checkIrcStatus();
    }
  }, [isOpen, currentConfig]);

  const checkIrcStatus = async () => {
    const response = await api.getStatus();
    if (response.success && response.data) {
      setIrcStatus(response.data.connectionStatus);
    }
  };

  const validateConfig = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (activeTab === 'general') {
      if (!generalConfig.downloadPath.trim()) {
        newErrors.downloadPath = 'Download path cannot be empty';
      }
    } else if (activeTab === 'irc') {
      if (!config.server.trim()) {
        newErrors.server = 'Server address cannot be empty';
      }

      if (config.port < 1 || config.port > 65535) {
        newErrors.port = 'Port must be between 1 and 65535';
      }

      if (!config.channel.trim()) {
        newErrors.channel = 'Channel cannot be empty';
      } else if (!config.channel.startsWith('#')) {
        newErrors.channel = 'Channel must start with #';
      }

      if (!config.searchCommand.trim()) {
        newErrors.searchCommand = 'Search command cannot be empty';
      }
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
      const updatePayload: any = {};
      if (activeTab === 'general') {
        updatePayload.general = generalConfig;
      } else if (activeTab === 'irc') {
        updatePayload.irc = config;
      }

      const response = await api.updateConfig(updatePayload);

      if (response.success && response.data) {
        setSaveMessage({
          type: 'success',
          text: response.data.message
        });
        
        // Update parent state
        onSave({
          irc: activeTab === 'irc' ? config : currentConfig?.irc || config,
          general: activeTab === 'general' ? generalConfig : currentConfig?.general || generalConfig
        });

        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
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
    if (!confirm('Reset all settings to defaults?')) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await api.resetConfig();

      if (response.success && response.data) {
        // Fetch the new config
        const configResponse = await api.getConfig();
        if (configResponse.success && configResponse.data) {
          setConfig(configResponse.data.irc);
          setGeneralConfig(configResponse.data.general);
          setSaveMessage({
            type: 'success',
            text: response.data.message
          });
          onSave(configResponse.data);

          // Close modal after a short delay
          setTimeout(() => {
            onClose();
          }, 1500);
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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isValid = Object.keys(errors).length === 0 && (
    (activeTab === 'general' && generalConfig.downloadPath.trim() !== '') ||
    (activeTab === 'irc' && config.server.trim() !== '' && config.channel.trim() !== '' && config.searchCommand.trim() !== '')
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="settings-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            className="settings-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <div className="settings-header">
              <h2 className="settings-title">
                <span className="title-brackets">[</span>
                Configuration
                <span className="title-brackets">]</span>
              </h2>
              <button className="close-button" onClick={onClose} type="button">
                ✕
              </button>
            </div>

            <div className="settings-tabs">
              <motion.button
                type="button"
                className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveTab('general')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="button-brackets">[</span>
                General
                <span className="button-brackets">]</span>
              </motion.button>
              <motion.button
                type="button"
                className={`tab-button ${activeTab === 'irc' ? 'active' : ''}`}
                onClick={() => setActiveTab('irc')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="button-brackets">[</span>
                IRC
                <span className="button-brackets">]</span>
              </motion.button>
              <motion.button
                type="button"
                className={`tab-button ${activeTab === 'nzb' ? 'active' : ''}`}
                onClick={() => setActiveTab('nzb')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="button-brackets">[</span>
                NZB Providers
                <span className="button-brackets">]</span>
              </motion.button>
            </div>

            {isDownloading && (activeTab === 'irc' || activeTab === 'general') && (
              <motion.div
                className="settings-warning"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="warning-icon">⚠</span>
                Cannot change settings during active download
              </motion.div>
            )}

            {activeTab === 'general' ? (
              <form onSubmit={handleSubmit} className="settings-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="downloadPath">
                    <span className="label-prompt">&gt;</span>
                    Download Path
                  </label>
                  <input
                    type="text"
                    id="downloadPath"
                    className={`form-input ${errors.downloadPath ? 'error' : ''}`}
                    value={generalConfig.downloadPath}
                    onChange={(e) => setGeneralConfig({ ...generalConfig, downloadPath: e.target.value })}
                    disabled={isSaving || isDownloading}
                    placeholder="/app/server/downloads"
                  />
                  {errors.downloadPath && <span className="error-message">{errors.downloadPath}</span>}
                  <p className="form-help">
                    Path where downloaded files will be saved. For Docker users, ensure this matches your volume mount (e.g., /app/server/downloads).
                  </p>
                </div>

                {saveMessage && (
                  <motion.div
                    className={`save-message ${saveMessage.type}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="message-icon">
                      {saveMessage.type === 'success' ? '✓' : '✗'}
                    </span>
                    {saveMessage.text}
                  </motion.div>
                )}

                <div className="settings-actions">
                  <div className="primary-actions">
                    <motion.button
                      type="button"
                      className="action-button cancel-button"
                      onClick={onClose}
                      disabled={isSaving}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="button-brackets">[</span>
                      Cancel
                      <span className="button-brackets">]</span>
                    </motion.button>

                    <motion.button
                      type="submit"
                      className="action-button save-button"
                      disabled={!isValid || isSaving || isDownloading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="button-brackets">[</span>
                      {isSaving ? 'Saving...' : 'Save'}
                      <span className="button-brackets">]</span>
                    </motion.button>
                  </div>
                </div>
              </form>
            ) : activeTab === 'irc' ? (
              <form onSubmit={handleSubmit} className="settings-form">
              <div className="form-group irc-toggle-group">
                <label className="form-label" htmlFor="ircEnabled">
                  <span className="label-prompt">&gt;</span>
                  Enable IRC Search
                </label>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    id="ircEnabled"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    disabled={isSaving || isDownloading}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {/* IRC Connection Status */}
              <div className="irc-status-display">
                <span className="status-label">Connection Status:</span>
                <span className={`status-value status-${ircStatus}`}>
                  {ircStatus === 'connected' ? '● Connected' : 
                   ircStatus === 'connecting' ? '○ Connecting...' : 
                   '○ Disconnected'}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="server">
                  <span className="label-prompt">&gt;</span>
                  IRC Server
                </label>
                <input
                  type="text"
                  id="server"
                  className={`form-input ${errors.server ? 'error' : ''}`}
                  value={config.server}
                  onChange={(e) => setConfig({ ...config, server: e.target.value })}
                  disabled={isSaving || isDownloading}
                  placeholder="irc.irchighway.net"
                />
                {errors.server && <span className="error-message">{errors.server}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="port">
                  <span className="label-prompt">&gt;</span>
                  Port
                </label>
                <input
                  type="number"
                  id="port"
                  className={`form-input ${errors.port ? 'error' : ''}`}
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 0 })}
                  disabled={isSaving || isDownloading}
                  placeholder="6667"
                  min="1"
                  max="65535"
                />
                {errors.port && <span className="error-message">{errors.port}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="channel">
                  <span className="label-prompt">&gt;</span>
                  Channel
                </label>
                <input
                  type="text"
                  id="channel"
                  className={`form-input ${errors.channel ? 'error' : ''}`}
                  value={config.channel}
                  onChange={(e) => setConfig({ ...config, channel: e.target.value })}
                  disabled={isSaving || isDownloading}
                  placeholder="#ebooks"
                />
                {errors.channel && <span className="error-message">{errors.channel}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="searchCommand">
                  <span className="label-prompt">&gt;</span>
                  Search Command
                </label>
                <input
                  type="text"
                  id="searchCommand"
                  className={`form-input ${errors.searchCommand ? 'error' : ''}`}
                  value={config.searchCommand}
                  onChange={(e) => setConfig({ ...config, searchCommand: e.target.value })}
                  disabled={isSaving || isDownloading}
                  placeholder="@search"
                />
                {errors.searchCommand && <span className="error-message">{errors.searchCommand}</span>}
              </div>

              {saveMessage && (
                <motion.div
                  className={`save-message ${saveMessage.type}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span className="message-icon">
                    {saveMessage.type === 'success' ? '✓' : '✗'}
                  </span>
                  {saveMessage.text}
                </motion.div>
              )}

              <div className="settings-actions">
                <motion.button
                  type="button"
                  className="action-button reset-button"
                  onClick={handleReset}
                  disabled={isSaving || isDownloading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="button-brackets">[</span>
                  Reset to Defaults
                  <span className="button-brackets">]</span>
                </motion.button>

                <div className="primary-actions">
                  <motion.button
                    type="button"
                    className="action-button cancel-button"
                    onClick={onClose}
                    disabled={isSaving}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="button-brackets">[</span>
                    Cancel
                    <span className="button-brackets">]</span>
                  </motion.button>

                  <motion.button
                    type="submit"
                    className="action-button save-button"
                    disabled={!isValid || isSaving || isDownloading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="button-brackets">[</span>
                    {isSaving ? 'Saving...' : 'Save & Reconnect'}
                    <span className="button-brackets">]</span>
                  </motion.button>
                </div>
              </div>
            </form>
            ) : (
              <div className="nzb-tab-content">
                <NzbProviderList />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SettingsModal;
