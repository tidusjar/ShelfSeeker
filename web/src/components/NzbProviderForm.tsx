import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import type { NzbProvider } from '../types';
import './NzbProviderForm.css';

interface NzbProviderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  provider: NzbProvider | null;
}

const CATEGORIES = [
  { id: 7000, label: 'Books (All)' },
  { id: 7020, label: 'Magazines' },
  { id: 8010, label: 'Audiobooks' }
];

function NzbProviderForm({ isOpen, onClose, onSave, provider }: NzbProviderFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    apiKey: '',
    enabled: true,
    categories: [7000],
    priority: 1,
    apiLimit: undefined as number | undefined
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load provider data when editing
  useEffect(() => {
    if (isOpen) {
      if (provider) {
        setFormData({
          name: provider.name,
          url: provider.url,
          apiKey: provider.apiKey,
          enabled: provider.enabled,
          categories: provider.categories,
          priority: provider.priority,
          apiLimit: provider.apiLimit
        });
      } else {
        // Reset form for new provider
        setFormData({
          name: '',
          url: '',
          apiKey: '',
          enabled: true,
          categories: [7000],
          priority: 1,
          apiLimit: undefined
        });
      }
      setErrors({});
      setSaveMessage(null);
    }
  }, [isOpen, provider]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name cannot be empty';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL cannot be empty';
    } else if (!formData.url.startsWith('http://') && !formData.url.startsWith('https://')) {
      newErrors.url = 'URL must start with http:// or https://';
    }

    if (!formData.apiKey.trim()) {
      newErrors.apiKey = 'API Key cannot be empty';
    }

    if (formData.categories.length === 0) {
      newErrors.categories = 'Select at least one category';
    }

    if (formData.priority < 1) {
      newErrors.priority = 'Priority must be at least 1';
    }

    if (formData.apiLimit !== undefined && formData.apiLimit < 1) {
      newErrors.apiLimit = 'API limit must be at least 1';
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
      let response;
      if (provider) {
        // Update existing provider
        response = await api.updateNzbProvider(provider.id, formData);
      } else {
        // Add new provider
        response = await api.addNzbProvider(formData);
      }

      if (response.success) {
        setSaveMessage({
          type: 'success',
          text: provider ? 'Provider updated successfully' : 'Provider added successfully'
        });

        // Close modal after a short delay
        setTimeout(() => {
          onSave();
        }, 1500);
      } else {
        setSaveMessage({
          type: 'error',
          text: response.error || 'Failed to save provider'
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

  const handleCategoryToggle = (categoryId: number) => {
    const newCategories = formData.categories.includes(categoryId)
      ? formData.categories.filter(c => c !== categoryId)
      : [...formData.categories, categoryId];

    setFormData({ ...formData, categories: newCategories });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isValid = Object.keys(errors).length === 0 &&
    formData.name.trim() !== '' &&
    formData.url.trim() !== '' &&
    formData.apiKey.trim() !== '' &&
    formData.categories.length > 0;

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
            className="settings-modal provider-form-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <div className="settings-header">
              <h2 className="settings-title">
                <span className="title-brackets">[</span>
                {provider ? 'Edit' : 'Add'} NZB Provider
                <span className="title-brackets">]</span>
              </h2>
              <button className="close-button" onClick={onClose} type="button">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="settings-form">
              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  <span className="label-prompt">&gt;</span>
                  Provider Name
                </label>
                <input
                  type="text"
                  id="name"
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isSaving}
                  placeholder="NZBGeek"
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="url">
                  <span className="label-prompt">&gt;</span>
                  API URL
                </label>
                <input
                  type="text"
                  id="url"
                  className={`form-input ${errors.url ? 'error' : ''}`}
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  disabled={isSaving}
                  placeholder="https://api.nzbgeek.info"
                />
                {errors.url && <span className="error-message">{errors.url}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="apiKey">
                  <span className="label-prompt">&gt;</span>
                  API Key
                </label>
                <input
                  type="password"
                  id="apiKey"
                  className={`form-input ${errors.apiKey ? 'error' : ''}`}
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  disabled={isSaving}
                  placeholder="Enter your API key"
                />
                {errors.apiKey && <span className="error-message">{errors.apiKey}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="label-prompt">&gt;</span>
                  Categories
                </label>
                <div className="category-checkboxes">
                  {CATEGORIES.map((category) => (
                    <label key={category.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        disabled={isSaving}
                      />
                      <span className="checkbox-text">{category.label} ({category.id})</span>
                    </label>
                  ))}
                </div>
                {errors.categories && <span className="error-message">{errors.categories}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="priority">
                    <span className="label-prompt">&gt;</span>
                    Priority
                  </label>
                  <input
                    type="number"
                    id="priority"
                    className={`form-input ${errors.priority ? 'error' : ''}`}
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                    disabled={isSaving}
                    placeholder="1"
                    min="1"
                  />
                  {errors.priority && <span className="error-message">{errors.priority}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="apiLimit">
                    <span className="label-prompt">&gt;</span>
                    Daily API Limit (Optional)
                  </label>
                  <input
                    type="number"
                    id="apiLimit"
                    className={`form-input ${errors.apiLimit ? 'error' : ''}`}
                    value={formData.apiLimit || ''}
                    onChange={(e) => setFormData({ ...formData, apiLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                    disabled={isSaving}
                    placeholder="100"
                    min="1"
                  />
                  {errors.apiLimit && <span className="error-message">{errors.apiLimit}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label enabled-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    disabled={isSaving}
                  />
                  <span className="checkbox-text">Enable this provider</span>
                </label>
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
                    disabled={!isValid || isSaving}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="button-brackets">[</span>
                    {isSaving ? 'Saving...' : (provider ? 'Update' : 'Add Provider')}
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

export default NzbProviderForm;
