import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import type { ConfigData, IrcConfig } from '../types';
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
  const [config, setConfig] = useState<IrcConfig>({
    server: '',
    port: 6667,
    channel: '',
    searchCommand: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load current config when modal opens
  useEffect(() => {
    if (isOpen && currentConfig) {
      setConfig(currentConfig.irc);
      setErrors({});
      setSaveMessage(null);
    }
  }, [isOpen, currentConfig]);

  const validateConfig = (): boolean => {
    const newErrors: { [key: string]: string } = {};

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
      const response = await api.updateConfig({ irc: config });

      if (response.success && response.data) {
        setSaveMessage({
          type: 'success',
          text: response.data.message
        });
        onSave({ irc: config });

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

  const isValid = Object.keys(errors).length === 0 &&
    config.server.trim() !== '' &&
    config.channel.trim() !== '' &&
    config.searchCommand.trim() !== '';

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
                IRC Configuration
                <span className="title-brackets">]</span>
              </h2>
              <button className="close-button" onClick={onClose} type="button">
                ✕
              </button>
            </div>

            {isDownloading && (
              <motion.div
                className="settings-warning"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="warning-icon">⚠</span>
                Cannot change settings during active download
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="settings-form">
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SettingsModal;
