import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import type { Downloader } from '../types';
import DownloaderForm from './DownloaderForm';
import './DownloaderList.css';

function DownloaderList() {
  const [downloaders, setDownloaders] = useState<Downloader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDownloader, setEditingDownloader] = useState<Downloader | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    loadDownloaders();
  }, []);

  const loadDownloaders = async () => {
    setIsLoading(true);
    try {
      const response = await api.getUsenetDownloaders();
      if (response.success && response.data) {
        setDownloaders(response.data);
      }
    } catch (error) {
      console.error('Failed to load downloaders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEnabled = async (downloader: Downloader) => {
    // Only allow enabling if not already enabled
    if (downloader.enabled) {
      showMessage('error', 'Downloader is already enabled');
      return;
    }

    try {
      const response = await api.updateUsenetDownloader(downloader.id, { enabled: true });
      if (response.success) {
        await loadDownloaders();
        showMessage('success', `${downloader.name} enabled (others disabled)`);
      } else {
        showMessage('error', response.error || 'Failed to update downloader');
      }
    } catch (error) {
      showMessage('error', 'Network error');
    }
  };

  const handleEdit = (downloader: Downloader) => {
    setEditingDownloader(downloader);
    setShowForm(true);
  };

  const handleDelete = async (downloader: Downloader) => {
    if (!confirm(`Delete downloader "${downloader.name}"?`)) {
      return;
    }

    try {
      const response = await api.deleteUsenetDownloader(downloader.id);
      if (response.success) {
        await loadDownloaders();
        showMessage('success', 'Downloader deleted successfully');
      } else {
        showMessage('error', response.error || 'Failed to delete downloader');
      }
    } catch (error) {
      showMessage('error', 'Network error');
    }
  };

  const handleTest = async (downloader: Downloader) => {
    setTestingId(downloader.id);
    try {
      const response = await api.testUsenetDownloader(downloader.id);
      if (response.success && response.data) {
        const version = response.data.version ? ` (v${response.data.version})` : '';
        showMessage('success', `Connection successful!${version}`);
      } else {
        showMessage('error', response.error || 'Connection failed');
      }
    } catch (error) {
      showMessage('error', 'Network error');
    } finally {
      setTestingId(null);
    }
  };

  const handleFormClose = async (success: boolean) => {
    setShowForm(false);
    setEditingDownloader(null);
    if (success) {
      await loadDownloaders();
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const getDownloaderTypeLabel = (type: string) => {
    switch (type) {
      case 'nzbget':
        return 'NZBGet';
      case 'sabnzbd':
        return 'SABnzbd';
      default:
        return type;
    }
  };

  return (
    <div className="downloader-list">
      {/* Header */}
      <div className="downloader-list-header">
        <div>
          <h3>Usenet Downloaders</h3>
          <p className="downloader-list-subtitle">
            Configure NZBGet or SABnzbd to send NZB files directly
          </p>
        </div>
        <button className="btn-add-downloader" onClick={() => setShowForm(true)}>
          + Add Downloader
        </button>
      </div>

      {/* Message Toast */}
      <AnimatePresence>
        {message && (
          <motion.div
            className={`downloader-message downloader-message-${message.type}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Downloader Grid */}
      {isLoading ? (
        <div className="downloader-loading">Loading downloaders...</div>
      ) : downloaders.length === 0 ? (
        <div className="downloader-empty">
          <div className="downloader-empty-icon">📥</div>
          <h4>No Downloaders Configured</h4>
          <p>Add a downloader to send NZB files directly to your Usenet client</p>
        </div>
      ) : (
        <div className="downloader-grid">
          {downloaders.map((downloader) => (
            <motion.div
              key={downloader.id}
              className={`downloader-card ${downloader.enabled ? 'downloader-card-enabled' : ''}`}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {/* Card Header */}
              <div className="downloader-card-header">
                <div className="downloader-card-title">
                  <h4>{downloader.name}</h4>
                  <span className="downloader-type-badge">
                    {getDownloaderTypeLabel(downloader.type)}
                  </span>
                </div>
                <label className="downloader-toggle">
                  <input
                    type="checkbox"
                    checked={downloader.enabled}
                    onChange={() => handleToggleEnabled(downloader)}
                  />
                  <span className="downloader-toggle-slider"></span>
                </label>
              </div>

              {/* Card Body */}
              <div className="downloader-card-body">
                <div className="downloader-info-row">
                  <span className="downloader-info-label">Host:</span>
                  <span className="downloader-info-value">
                    {downloader.ssl ? '🔒 ' : ''}{downloader.host}:{downloader.port}
                  </span>
                </div>
                {downloader.category && (
                  <div className="downloader-info-row">
                    <span className="downloader-info-label">Category:</span>
                    <span className="downloader-info-value">{downloader.category}</span>
                  </div>
                )}
                {downloader.enabled && (
                  <div className="downloader-status downloader-status-active">
                    ✓ Active Downloader
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="downloader-card-actions">
                <button
                  className="downloader-action-btn downloader-btn-test"
                  onClick={() => handleTest(downloader)}
                  disabled={testingId === downloader.id}
                >
                  {testingId === downloader.id ? 'Testing...' : 'Test'}
                </button>
                <button
                  className="downloader-action-btn downloader-btn-edit"
                  onClick={() => handleEdit(downloader)}
                >
                  Edit
                </button>
                <button
                  className="downloader-action-btn downloader-btn-delete"
                  onClick={() => handleDelete(downloader)}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <DownloaderForm
            downloader={editingDownloader}
            onClose={handleFormClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default DownloaderList;
