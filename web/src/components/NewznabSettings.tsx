import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import type { NzbProvider } from '../types';

interface NewznabSettingsProps {
  nzbProviders: NzbProvider[];
  onConfigUpdate: () => void;
}

interface FormData {
  name: string;
  url: string;
  apiKey: string;
  categories: string;
  priority: string;
  apiLimit: string;
}

function NewznabSettings({ nzbProviders, onConfigUpdate }: NewznabSettingsProps) {
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    url: '',
    apiKey: '',
    categories: '7000,7020',
    priority: '0',
    apiLimit: '0',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [testingForm, setTestingForm] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddIndexer = async () => {
    // Validate form
    if (!formData.name.trim() || !formData.url.trim() || !formData.apiKey.trim()) {
      setFeedback({ type: 'error', message: 'Please fill in Name, URL, and API Key' });
      setTimeout(() => setFeedback(null), 5000);
      return;
    }

    setIsAdding(true);
    setFeedback(null);

    try {
      // Parse categories from comma-separated string to number array
      const categories = formData.categories
        .split(',')
        .map(c => parseInt(c.trim(), 10))
        .filter(n => !isNaN(n));

      const provider = {
        name: formData.name.trim(),
        url: formData.url.trim(),
        apiKey: formData.apiKey.trim(),
        enabled: true,
        categories,
        priority: parseInt(formData.priority, 10) || 0,
        apiLimit: parseInt(formData.apiLimit, 10) || 0,
      };

      const response = await api.addNzbProvider(provider);

      if (response.success) {
        setFeedback({ type: 'success', message: `Indexer "${formData.name}" added successfully!` });
        // Clear form
        setFormData({
          name: '',
          url: '',
          apiKey: '',
          categories: '7000,7020',
          priority: '0',
          apiLimit: '0',
        });
        // Refresh provider list
        onConfigUpdate();
        setTimeout(() => setFeedback(null), 5000);
      } else {
        setFeedback({ type: 'error', message: response.error || 'Failed to add indexer' });
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error: Could not add indexer' });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsAdding(false);
    }
  };

  const handleTestProvider = async (providerId: string) => {
    setTestingProviderId(providerId);
    setFeedback(null);

    try {
      const response = await api.testNzbProvider(providerId);

      if (response.success) {
        const provider = nzbProviders.find(p => p.id === providerId);
        setFeedback({
          type: 'success',
          message: `${provider?.name || 'Provider'} test successful! Found ${response.data?.resultCount || 0} results`,
        });
        setTimeout(() => setFeedback(null), 5000);
      } else {
        setFeedback({ type: 'error', message: response.error || 'Test failed' });
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error: Could not test provider' });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleTestAll = async () => {
    if (nzbProviders.length === 0) {
      setFeedback({ type: 'error', message: 'No indexers configured to test' });
      setTimeout(() => setFeedback(null), 5000);
      return;
    }

    setIsTesting(true);
    setFeedback(null);

    try {
      const results = await Promise.allSettled(
        nzbProviders.map(provider => api.testNzbProvider(provider.id))
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      setFeedback({
        type: successful > 0 ? 'success' : 'error',
        message: `Test complete: ${successful} succeeded, ${failed} failed`,
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error: Could not test providers' });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestFormData = async () => {
    // Validate required fields
    if (!formData.name.trim() || !formData.url.trim() || !formData.apiKey.trim()) {
      setFeedback({ type: 'error', message: 'Please fill in Name, URL, and API Key to test' });
      setTimeout(() => setFeedback(null), 5000);
      return;
    }

    setTestingForm(true);
    setFeedback(null);

    try {
      // Create a temporary provider object to test
      const categories = formData.categories
        .split(',')
        .map(c => parseInt(c.trim(), 10))
        .filter(n => !isNaN(n));

      const testProvider = {
        name: formData.name.trim(),
        url: formData.url.trim(),
        apiKey: formData.apiKey.trim(),
        enabled: true,
        categories,
        priority: parseInt(formData.priority, 10) || 0,
        apiLimit: parseInt(formData.apiLimit, 10) || 0,
      };

      // Test with a temporary provider (you'll need to add this API endpoint)
      const response = await api.testNzbProviderData(testProvider);

      if (response.success) {
        setFeedback({
          type: 'success',
          message: `Connection successful! Found ${response.data?.resultCount || 0} test results`,
        });
        setTimeout(() => setFeedback(null), 5000);
      } else {
        setFeedback({ type: 'error', message: response.error || 'Connection test failed' });
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error: Could not test connection' });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setTestingForm(false);
    }
  };

  const handleEditProvider = (provider: NzbProvider) => {
    setEditingProviderId(provider.id);
    setFormData({
      name: provider.name,
      url: provider.url,
      apiKey: provider.apiKey,
      categories: provider.categories.join(','),
      priority: provider.priority.toString(),
      apiLimit: provider.apiLimit?.toString() ?? '',
    });
    // Scroll to form
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleUpdateProvider = async () => {
    if (!editingProviderId) return;

    // Validate form
    if (!formData.name.trim() || !formData.url.trim() || !formData.apiKey.trim()) {
      setFeedback({ type: 'error', message: 'Please fill in Name, URL, and API Key' });
      setTimeout(() => setFeedback(null), 5000);
      return;
    }

    setIsAdding(true);
    setFeedback(null);

    try {
      const categories = formData.categories
        .split(',')
        .map(c => parseInt(c.trim(), 10))
        .filter(n => !isNaN(n));

      const updatedProvider = {
        name: formData.name.trim(),
        url: formData.url.trim(),
        apiKey: formData.apiKey.trim(),
        categories,
        priority: parseInt(formData.priority, 10) || 0,
        apiLimit: parseInt(formData.apiLimit, 10) || 0,
      };

      const response = await api.updateNzbProvider(editingProviderId, updatedProvider);

      if (response.success) {
        setFeedback({ type: 'success', message: `Indexer "${formData.name}" updated successfully!` });
        // Clear form and exit edit mode
        setFormData({
          name: '',
          url: '',
          apiKey: '',
          categories: '7000,7020',
          priority: '0',
          apiLimit: '0',
        });
        setEditingProviderId(null);
        // Refresh provider list
        onConfigUpdate();
        setTimeout(() => setFeedback(null), 5000);
      } else {
        setFeedback({ type: 'error', message: response.error || 'Failed to update indexer' });
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error: Could not update indexer' });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleProvider = async (providerId: string, enabled: boolean) => {
    try {
      const response = await api.toggleNzbProvider(providerId, enabled);

      if (response.success) {
        onConfigUpdate();
      } else {
        setFeedback({ type: 'error', message: response.error || 'Failed to toggle provider' });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error: Could not toggle provider' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleDeleteProvider = async (providerId: string, providerName: string) => {
    if (!confirm(`Are you sure you want to delete "${providerName}"?`)) {
      return;
    }

    try {
      const response = await api.deleteNzbProvider(providerId);

      if (response.success) {
        setFeedback({ type: 'success', message: `Indexer "${providerName}" deleted successfully!` });
        onConfigUpdate();
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: 'error', message: response.error || 'Failed to delete indexer' });
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error: Could not delete indexer' });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleCancelEdit = () => {
    setEditingProviderId(null);
    setFormData({
      name: '',
      url: '',
      apiKey: '',
      categories: '7000,7020',
      priority: '0',
      apiLimit: '0',
    });
  };

  return (
    <div className="max-w-[960px] mx-auto p-6 lg:p-10">
      {/* Page Heading */}
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
          Newznab Indexers
        </h2>
        <p className="text-slate-500 dark:text-muted-dark text-lg">
          Configure your Newznab-compatible indexers to aggregate Usenet search results.
        </p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          data-testid={`nzb-feedback-${feedback.type}`}
          className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
          }`}
        >
          <span className={`material-symbols-outlined ${
            feedback.type === 'success'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}>
            {feedback.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <p className={`text-sm font-medium ${
            feedback.type === 'success'
              ? 'text-emerald-800 dark:text-emerald-200'
              : 'text-rose-800 dark:text-rose-200'
          }`}>
            {feedback.message}
          </p>
        </motion.div>
      )}

      {/* Toggle Action Panel */}
      <div className="mb-8 p-5 rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark flex items-center justify-between shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-slate-900 dark:text-white text-base font-bold">Enable Newznab Search</p>
          <p className="text-slate-500 dark:text-muted-dark text-sm leading-normal">
            Global toggle for all configured Newznab indexers.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={globalEnabled}
            onChange={(e) => setGlobalEnabled(e.target.checked)}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-border-dark peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {/* NZB Provider List Component */}
      <div className="mb-8 bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-border-dark">
          <h3 className="text-lg font-bold">Configured Indexers</h3>
        </div>
        <div className="p-6">
          {nzbProviders.length > 0 ? (
            <div className="space-y-3">
              {nzbProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="p-4 rounded-lg border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${provider.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{provider.name}</p>
                      <p className="text-sm text-slate-500 dark:text-muted-dark">{provider.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Individual Enable/Disable Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={provider.enabled}
                        onChange={(e) => handleToggleProvider(provider.id, e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-border-dark peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                    <button
                      onClick={() => handleTestProvider(provider.id)}
                      disabled={testingProviderId === provider.id}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Test connection"
                    >
                      {testingProviderId === provider.id ? (
                        <div className="w-4 h-4 border-2 border-slate-600 dark:border-slate-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-sm text-slate-600 dark:text-slate-400">bolt</span>
                      )}
                    </button>
                    <button
                      onClick={() => handleEditProvider(provider)}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                      title="Edit indexer"
                    >
                      <span className="material-symbols-outlined text-sm text-slate-600 dark:text-slate-400">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProvider(provider.id, provider.name)}
                      className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded transition-colors"
                      title="Delete indexer"
                    >
                      <span className="material-symbols-outlined text-sm text-rose-600 dark:text-rose-400">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-2">cloud_off</span>
              <p className="text-slate-500 dark:text-muted-dark">No Newznab providers configured</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Indexer Section */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-border-dark flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {editingProviderId ? 'Edit Indexer' : 'Add New Indexer'}
          </h3>
          <div className="flex items-center gap-2">
            {editingProviderId && (
              <button
                onClick={handleCancelEdit}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
              >
                Cancel
              </button>
            )}
            <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
              Newznab API
            </span>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="name">
                Indexer Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">label</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="name"
                  name="name"
                  placeholder="e.g. NZBGeek"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">A friendly name to identify this provider.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="url">
                API URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">link</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="url"
                  name="url"
                  placeholder="https://api.nzbgeek.info"
                  type="text"
                  value={formData.url}
                  onChange={handleInputChange}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">The base URL of the Newznab API.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="apikey">
                API Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">key</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="apiKey"
                  name="apiKey"
                  placeholder="Enter your API Key"
                  type="password"
                  value={formData.apiKey}
                  onChange={handleInputChange}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">Your personal API key for this indexer.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="categories">
                Categories
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">category</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="categories"
                  name="categories"
                  placeholder="7000,7020"
                  type="text"
                  value={formData.categories}
                  onChange={handleInputChange}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">
                Comma-separated category IDs (e.g. 7020 for Ebooks).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="priority">
                Priority
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">low_priority</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="priority"
                  name="priority"
                  placeholder="0"
                  type="number"
                  value={formData.priority}
                  onChange={handleInputChange}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">Higher numbers take precedence in results.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="limit">
                Daily API Limit
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">speed</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="apiLimit"
                  name="apiLimit"
                  placeholder="0"
                  type="number"
                  value={formData.apiLimit}
                  onChange={handleInputChange}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">
                Maximum allowed daily calls (leave 0 for unlimited).
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={editingProviderId ? handleUpdateProvider : handleAddIndexer}
              disabled={isAdding}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {editingProviderId ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">{editingProviderId ? 'save' : 'add'}</span>
                  {editingProviderId ? 'Update Indexer' : 'Add Indexer'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleTestFormData}
              disabled={testingForm}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-border-dark hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-2.5 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingForm ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  Test Connection
                </>
              )}
            </button>
            {!editingProviderId && nzbProviders.length > 0 && (
              <button
                type="button"
                onClick={handleTestAll}
                disabled={isTesting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-border-dark hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-2.5 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin" />
                    Testing All...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">bolt</span>
                    Test All
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 p-4 rounded-lg bg-primary/5 border border-primary/10 flex gap-4">
        <div className="text-primary shrink-0">
          <span className="material-symbols-outlined">info</span>
        </div>
        <div>
          <p className="text-sm text-slate-600 dark:text-muted-dark leading-relaxed">
            <strong>Newznab API:</strong> Ensure your indexer supports the standard Newznab XML or JSON API. ShelfSeeker uses these endpoints to pull metadata and download links for ebook results.
          </p>
        </div>
      </div>
    </div>
  );
}

export default NewznabSettings;
