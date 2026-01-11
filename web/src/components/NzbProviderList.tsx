import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import type { NzbProvider } from '../types';
import NzbProviderForm from './NzbProviderForm';
import './NzbProviderList.css';

function NzbProviderList() {
  const [providers, setProviders] = useState<NzbProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<NzbProvider | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setIsLoading(true);
    try {
      const response = await api.getNzbProviders();
      if (response.success && response.data) {
        setProviders(response.data);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEnabled = async (provider: NzbProvider) => {
    try {
      const response = await api.updateNzbProvider(provider.id, { enabled: !provider.enabled });
      if (response.success) {
        await loadProviders();
        showMessage('success', `Provider ${!provider.enabled ? 'enabled' : 'disabled'}`);
      } else {
        showMessage('error', response.error || 'Failed to update provider');
      }
    } catch (error) {
      showMessage('error', 'Network error');
    }
  };

  const handleEdit = (provider: NzbProvider) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  const handleDelete = async (provider: NzbProvider) => {
    if (!confirm(`Delete provider "${provider.name}"?`)) {
      return;
    }

    try {
      const response = await api.deleteNzbProvider(provider.id);
      if (response.success) {
        await loadProviders();
        showMessage('success', 'Provider deleted successfully');
      } else {
        showMessage('error', response.error || 'Failed to delete provider');
      }
    } catch (error) {
      showMessage('error', 'Network error');
    }
  };

  const handleTest = async (provider: NzbProvider) => {
    setTestingId(provider.id);
    try {
      const response = await api.testNzbProvider(provider.id);
      if (response.success && response.data) {
        showMessage('success', `Connection successful! Found ${response.data.resultCount} results`);
      } else {
        showMessage('error', response.error || 'Connection failed');
      }
    } catch (error) {
      showMessage('error', 'Network error');
    } finally {
      setTestingId(null);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProvider(null);
  };

  const handleFormSave = async () => {
    await loadProviders();
    handleFormClose();
    showMessage('success', editingProvider ? 'Provider updated' : 'Provider added');
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  if (isLoading) {
    return (
      <div className="nzb-provider-list">
        <div className="loading-state">
          <span className="loading-spinner"></span>
          Loading providers...
        </div>
      </div>
    );
  }

  return (
    <div className="nzb-provider-list">
      <div className="provider-list-header">
        <motion.button
          type="button"
          className="action-button add-button"
          onClick={() => setShowForm(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="button-brackets">[</span>
          + Add Provider
          <span className="button-brackets">]</span>
        </motion.button>
      </div>

      {message && (
        <motion.div
          className={`provider-message ${message.type}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <span className="message-icon">
            {message.type === 'success' ? '✓' : '✗'}
          </span>
          {message.text}
        </motion.div>
      )}

      {providers.length === 0 ? (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="empty-icon">📡</div>
          <div className="empty-title">No NZB Providers</div>
          <div className="empty-description">
            Add a Newznab indexer to search for ebooks across multiple sources
          </div>
        </motion.div>
      ) : (
        <div className="providers-grid">
          <AnimatePresence>
            {providers.map((provider) => (
              <motion.div
                key={provider.id}
                className={`provider-card ${!provider.enabled ? 'disabled' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                layout
              >
                <div className="provider-card-header">
                  <div className="provider-name-section">
                    <h3 className="provider-name">{provider.name}</h3>
                    <div className="provider-url">{provider.url}</div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={provider.enabled}
                      onChange={() => handleToggleEnabled(provider)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="provider-stats">
                  <div className="stat-item">
                    <span className="stat-label">Priority:</span>
                    <span className="stat-value">{provider.priority}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Categories:</span>
                    <span className="stat-value">{provider.categories.join(', ')}</span>
                  </div>
                  {provider.apiLimit && (
                    <div className="stat-item">
                      <span className="stat-label">Usage:</span>
                      <span className="stat-value">
                        {provider.requestsToday || 0} / {provider.apiLimit}
                      </span>
                    </div>
                  )}
                </div>

                <div className="provider-actions">
                  <motion.button
                    type="button"
                    className="provider-action-btn test-btn"
                    onClick={() => handleTest(provider)}
                    disabled={!provider.enabled || testingId === provider.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {testingId === provider.id ? 'Testing...' : 'Test'}
                  </motion.button>
                  <motion.button
                    type="button"
                    className="provider-action-btn edit-btn"
                    onClick={() => handleEdit(provider)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Edit
                  </motion.button>
                  <motion.button
                    type="button"
                    className="provider-action-btn delete-btn"
                    onClick={() => handleDelete(provider)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Delete
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <NzbProviderForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSave={handleFormSave}
        provider={editingProvider}
      />
    </div>
  );
}

export default NzbProviderList;
