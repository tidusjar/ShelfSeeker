import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import type { Downloader, DownloaderType } from '../types';
import './DownloaderForm.css';

interface DownloaderFormProps {
  downloader: Downloader | null;
  onClose: (success: boolean) => void;
}

function DownloaderForm({ downloader, onClose }: DownloaderFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'nzbget' as DownloaderType,
    enabled: true,
    host: 'localhost',
    port: 6789,
    ssl: false,
    username: '',
    password: '',
    apiKey: '',
    category: '',
    priority: 0
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load downloader data when editing
  useEffect(() => {
    if (downloader) {
      setFormData({
        name: downloader.name,
        type: downloader.type,
        enabled: downloader.enabled,
        host: downloader.host,
        port: downloader.port,
        ssl: downloader.ssl,
        username: downloader.username,
        password: downloader.password,
        apiKey: downloader.apiKey || '',
        category: downloader.category || '',
        priority: downloader.priority || 0
      });
    } else {
      // Reset for new downloader
      setFormData({
        name: '',
        type: 'nzbget',
        enabled: true,
        host: 'localhost',
        port: 6789,
        ssl: false,
        username: '',
        password: '',
        apiKey: '',
        category: '',
        priority: 0
      });
    }
    setErrors({});
    setSaveMessage(null);
  }, [downloader]);

  // Update default port when type changes
  useEffect(() => {
    if (!downloader) { // Only for new downloaders
      const defaultPort = formData.type === 'nzbget' ? 6789 : 8080;
      setFormData(prev => ({ ...prev, port: defaultPort }));
    }
  }, [formData.type, downloader]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.host.trim()) {
      newErrors.host = 'Host is required';
    }

    if (formData.port < 1 || formData.port > 65535) {
      newErrors.port = 'Port must be between 1 and 65535';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }

    if (formData.type === 'sabnzbd' && !formData.apiKey.trim()) {
      newErrors.apiKey = 'API key is required for SABnzbd';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const payload = {
        ...formData,
        apiKey: formData.type === 'sabnzbd' ? formData.apiKey : undefined,
        category: formData.category || undefined,
        priority: formData.priority || 0
      };

      const response = downloader
        ? await api.updateUsenetDownloader(downloader.id, payload)
        : await api.addUsenetDownloader(payload);

      if (response.success) {
        setSaveMessage({ type: 'success', text: downloader ? 'Downloader updated' : 'Downloader added' });
        setTimeout(() => onClose(true), 1000);
      } else {
        setSaveMessage({ type: 'error', text: response.error || 'Failed to save' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Network error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      className="downloader-form-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => onClose(false)}
    >
      <motion.div
        className="downloader-form-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="downloader-form-header">
          <h3>{downloader ? 'Edit Downloader' : 'Add Downloader'}</h3>
          <button className="downloader-form-close" onClick={() => onClose(false)}>
            ✕
          </button>
        </div>

        {saveMessage && (
          <div className={`downloader-form-message downloader-form-message-${saveMessage.type}`}>
            {saveMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="downloader-form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={errors.name ? 'error' : ''}
              placeholder="My NZBGet Server"
            />
            {errors.name && <span className="downloader-form-error">{errors.name}</span>}
          </div>

          {/* Type */}
          <div className="downloader-form-group">
            <label htmlFor="type">Downloader Type *</label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as DownloaderType })}
            >
              <option value="nzbget">NZBGet</option>
              <option value="sabnzbd">SABnzbd</option>
            </select>
          </div>

          {/* Host */}
          <div className="downloader-form-group">
            <label htmlFor="host">Host *</label>
            <input
              type="text"
              id="host"
              value={formData.host}
              onChange={(e) => setFormData({ ...formData, host: e.target.value })}
              className={errors.host ? 'error' : ''}
              placeholder="localhost or 192.168.1.100"
            />
            {errors.host && <span className="downloader-form-error">{errors.host}</span>}
          </div>

          {/* Port & SSL */}
          <div className="downloader-form-row">
            <div className="downloader-form-group">
              <label htmlFor="port">Port *</label>
              <input
                type="number"
                id="port"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
                className={errors.port ? 'error' : ''}
                min="1"
                max="65535"
              />
              {errors.port && <span className="downloader-form-error">{errors.port}</span>}
            </div>

            <div className="downloader-form-group downloader-form-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={formData.ssl}
                  onChange={(e) => setFormData({ ...formData, ssl: e.target.checked })}
                />
                Use SSL (HTTPS)
              </label>
            </div>
          </div>

          {/* Username */}
          <div className="downloader-form-group">
            <label htmlFor="username">Username *</label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className={errors.username ? 'error' : ''}
              autoComplete="off"
            />
            {errors.username && <span className="downloader-form-error">{errors.username}</span>}
          </div>

          {/* Password */}
          <div className="downloader-form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={errors.password ? 'error' : ''}
              autoComplete="new-password"
            />
            {errors.password && <span className="downloader-form-error">{errors.password}</span>}
          </div>

          {/* API Key (SABnzbd only) */}
          {formData.type === 'sabnzbd' && (
            <div className="downloader-form-group">
              <label htmlFor="apiKey">API Key *</label>
              <input
                type="password"
                id="apiKey"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className={errors.apiKey ? 'error' : ''}
                placeholder="Found in SABnzbd Settings > General"
              />
              {errors.apiKey && <span className="downloader-form-error">{errors.apiKey}</span>}
            </div>
          )}

          {/* Category (Optional) */}
          <div className="downloader-form-group">
            <label htmlFor="category">Default Category</label>
            <input
              type="text"
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="books (optional)"
            />
            <span className="downloader-form-hint">
              Category to assign downloads in {formData.type === 'nzbget' ? 'NZBGet' : 'SABnzbd'}
            </span>
          </div>

          {/* Priority (Optional) */}
          <div className="downloader-form-group">
            <label htmlFor="priority">
              Default Priority
              {formData.type === 'nzbget' && <span className="downloader-form-hint"> (-100 to 100)</span>}
              {formData.type === 'sabnzbd' && <span className="downloader-form-hint"> (-2 to 2)</span>}
            </label>
            <input
              type="number"
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              min={formData.type === 'nzbget' ? -100 : -2}
              max={formData.type === 'nzbget' ? 100 : 2}
            />
          </div>

          {/* Enabled */}
          <div className="downloader-form-group downloader-form-checkbox">
            <label>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
              Enable this downloader (disables all others)
            </label>
          </div>

          {/* Actions */}
          <div className="downloader-form-actions">
            <button
              type="button"
              className="downloader-form-btn downloader-form-btn-cancel"
              onClick={() => onClose(false)}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="downloader-form-btn downloader-form-btn-save"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : downloader ? 'Update' : 'Add Downloader'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default DownloaderForm;
