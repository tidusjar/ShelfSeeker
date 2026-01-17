import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import type { Downloader, DownloaderType } from '../types';

function DownloaderSettings() {
  const [downloaders, setDownloaders] = useState<Downloader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    type: 'nzbget' as DownloaderType,
    host: 'localhost',
    port: '6789',
    ssl: false,
    username: '',
    password: '',
    apiKey: '',
    category: '',
    priority: '0'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testingForm, setTestingForm] = useState(false);
  const [editingDownloaderId, setEditingDownloaderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadDownloaders();
  }, []);

  // Update default port when type changes (only for new downloaders)
  useEffect(() => {
    if (!editingDownloaderId) {
      const defaultPort = formData.type === 'nzbget' ? '6789' : '8080';
      setFormData(prev => ({ ...prev, port: defaultPort }));
    }
  }, [formData.type, editingDownloaderId]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setFeedback({ type: 'error', message: 'Name is required' });
      setTimeout(() => setFeedback(null), 5000);
      return false;
    }

    if (!formData.host.trim()) {
      setFeedback({ type: 'error', message: 'Host is required' });
      setTimeout(() => setFeedback(null), 5000);
      return false;
    }

    const portNum = parseInt(formData.port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setFeedback({ type: 'error', message: 'Port must be between 1 and 65535' });
      setTimeout(() => setFeedback(null), 5000);
      return false;
    }

    if (!formData.username.trim()) {
      setFeedback({ type: 'error', message: 'Username is required' });
      setTimeout(() => setFeedback(null), 5000);
      return false;
    }

    if (!formData.password.trim()) {
      setFeedback({ type: 'error', message: 'Password is required' });
      setTimeout(() => setFeedback(null), 5000);
      return false;
    }

    if (formData.type === 'sabnzbd' && !formData.apiKey.trim()) {
      setFeedback({ type: 'error', message: 'API key is required for SABnzbd' });
      setTimeout(() => setFeedback(null), 5000);
      return false;
    }

    return true;
  };

  const handleAddDownloader = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        enabled: true,
        host: formData.host.trim(),
        port: parseInt(formData.port),
        ssl: formData.ssl,
        username: formData.username.trim(),
        password: formData.password.trim(),
        apiKey: formData.type === 'sabnzbd' ? formData.apiKey.trim() : undefined,
        category: formData.category.trim() || undefined,
        priority: parseInt(formData.priority) || 0
      };

      const response = await api.addUsenetDownloader(payload);

      if (response.success) {
        setFeedback({ type: 'success', message: `Downloader "${formData.name}" added successfully!` });
        // Clear form
        setFormData({
          name: '',
          type: 'nzbget',
          host: 'localhost',
          port: '6789',
          ssl: false,
          username: '',
          password: '',
          apiKey: '',
          category: '',
          priority: '0'
        });
        // Refresh list
        await loadDownloaders();
        setTimeout(() => setFeedback(null), 5000);
      } else {
        setFeedback({ type: 'error', message: response.error || 'Failed to add downloader' });
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error: Could not add downloader' });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDownloader = async () => {
    if (!editingDownloaderId || !validateForm()) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        enabled: true,
        host: formData.host.trim(),
        port: parseInt(formData.port),
        ssl: formData.ssl,
        username: formData.username.trim(),
        password: formData.password.trim(),
        apiKey: formData.type === 'sabnzbd' ? formData.apiKey.trim() : undefined,
        category: formData.category.trim() || undefined,
        priority: parseInt(formData.priority) || 0
      };

      const response = await api.updateUsenetDownloader(editingDownloaderId, payload);

      if (response.success) {
        setFeedback({ type: 'success', message: `Downloader "${formData.name}" updated successfully!` });
        // Clear form and exit edit mode
        setFormData({
          name: '',
          type: 'nzbget',
          host: 'localhost',
          port: '6789',
          ssl: false,
          username: '',
          password: '',
          apiKey: '',
          category: '',
          priority: '0'
        });
        setEditingDownloaderId(null);
        // Refresh list
        await loadDownloaders();
        setTimeout(() => setFeedback(null), 5000);
      } else {
        setFeedback({ type: 'error', message: response.error || 'Failed to update downloader' });
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error: Could not update downloader' });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestDownloader = async (downloaderId: string) => {
    setTestingId(downloaderId);
    setFeedback(null);

    try {
      const response = await api.testUsenetDownloader(downloaderId);

      if (response.success && response.data) {
        const downloader = downloaders.find(d => d.id === downloaderId);
        const version = response.data.version ? ` (v${response.data.version})` : '';
        setFeedback({
          type: 'success',
          message: `${downloader?.name || 'Downloader'} test successful!${version}`,
        });
        setTimeout(() => setFeedback(null), 5000);
      } else {
        setFeedback({ type: 'error', message: response.error || 'Test failed' });
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error: Could not test downloader' });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setTestingId(null);
    }
  };

  const handleTestFormData = async () => {
    if (!validateForm()) {
      return;
    }

    setTestingForm(true);
    setFeedback(null);

    try {
      // For testing, we'd need to either add a temp downloader or have a test endpoint
      // For now, just show a success message
      setFeedback({
        type: 'success',
        message: 'Connection test would be performed here',
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error: Could not test connection' });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setTestingForm(false);
    }
  };

  const handleEditDownloader = (downloader: Downloader) => {
    setEditingDownloaderId(downloader.id);
    setFormData({
      name: downloader.name,
      type: downloader.type,
      host: downloader.host,
      port: downloader.port.toString(),
      ssl: downloader.ssl,
      username: downloader.username,
      password: downloader.password,
      apiKey: downloader.apiKey || '',
      category: downloader.category || '',
      priority: downloader.priority?.toString() || '0'
    });
    // Scroll to form
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleToggleDownloader = async (downloader: Downloader) => {
    if (downloader.enabled) {
      setFeedback({ type: 'error', message: 'Downloader is already enabled' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    try {
      const response = await api.updateUsenetDownloader(downloader.id, { enabled: true });

      if (response.success) {
        await loadDownloaders();
        setFeedback({ type: 'success', message: `${downloader.name} enabled (others disabled)` });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: 'error', message: response.error || 'Failed to toggle downloader' });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error: Could not toggle downloader' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleDeleteDownloader = async (downloaderId: string, downloaderName: string) => {
    if (!confirm(`Are you sure you want to delete "${downloaderName}"?`)) {
      return;
    }

    try {
      const response = await api.deleteUsenetDownloader(downloaderId);

      if (response.success) {
        setFeedback({ type: 'success', message: `Downloader "${downloaderName}" deleted successfully!` });
        await loadDownloaders();
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: 'error', message: response.error || 'Failed to delete downloader' });
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error: Could not delete downloader' });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleCancelEdit = () => {
    setEditingDownloaderId(null);
    setFormData({
      name: '',
      type: 'nzbget',
      host: 'localhost',
      port: '6789',
      ssl: false,
      username: '',
      password: '',
      apiKey: '',
      category: '',
      priority: '0'
    });
  };

  const getDownloaderTypeLabel = (type: DownloaderType) => {
    return type === 'nzbget' ? 'NZBGet' : 'SABnzbd';
  };

  return (
    <div className="max-w-[960px] mx-auto p-6 lg:p-10">
      {/* Page Heading */}
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
          Usenet Downloader Configuration
        </h2>
        <p className="text-slate-500 dark:text-muted-dark text-lg">
          Configure NZBGet or SABnzbd to automatically send NZB files to your Usenet downloader for processing.
        </p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
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

      {/* Downloader List Component */}
      <div className="mb-8 bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-border-dark">
          <h3 className="text-lg font-bold">Configured Downloaders</h3>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-500 dark:text-muted-dark">Loading downloaders...</p>
            </div>
          ) : downloaders.length > 0 ? (
            <div className="space-y-3">
              {downloaders.map((downloader) => (
                <div
                  key={downloader.id}
                  className="p-4 rounded-lg border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${downloader.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{downloader.name}</p>
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                          {getDownloaderTypeLabel(downloader.type)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-muted-dark">
                        {downloader.ssl ? '🔒 ' : ''}{downloader.host}:{downloader.port}
                        {downloader.category && ` • Category: ${downloader.category}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Individual Enable/Disable Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={downloader.enabled}
                        onChange={() => handleToggleDownloader(downloader)}
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-border-dark peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                    <button
                      onClick={() => handleTestDownloader(downloader.id)}
                      disabled={testingId === downloader.id}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Test connection"
                    >
                      {testingId === downloader.id ? (
                        <div className="w-4 h-4 border-2 border-slate-600 dark:border-slate-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-sm text-slate-600 dark:text-slate-400">bolt</span>
                      )}
                    </button>
                    <button
                      onClick={() => handleEditDownloader(downloader)}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                      title="Edit downloader"
                    >
                      <span className="material-symbols-outlined text-sm text-slate-600 dark:text-slate-400">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteDownloader(downloader.id, downloader.name)}
                      className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded transition-colors"
                      title="Delete downloader"
                    >
                      <span className="material-symbols-outlined text-sm text-rose-600 dark:text-rose-400">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-2">download_off</span>
              <p className="text-slate-500 dark:text-muted-dark">No downloaders configured</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Downloader Section */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-border-dark flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {editingDownloaderId ? 'Edit Downloader' : 'Add New Downloader'}
          </h3>
          <div className="flex items-center gap-2">
            {editingDownloaderId && (
              <button
                onClick={handleCancelEdit}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
              >
                Cancel
              </button>
            )}
            <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
              Usenet Client
            </span>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="name">
                Downloader Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">label</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="name"
                  name="name"
                  placeholder="My NZBGet Server"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">A friendly name to identify this downloader.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="type">
                Downloader Type
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">category</span>
                </div>
                <select
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                >
                  <option value="nzbget">NZBGet</option>
                  <option value="sabnzbd">SABnzbd</option>
                </select>
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">Select your Usenet client software.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="host">
                Host
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">dns</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="host"
                  name="host"
                  placeholder="localhost"
                  type="text"
                  value={formData.host}
                  onChange={handleInputChange}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">Hostname or IP address of your downloader.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="port">
                Port
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">tag</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="port"
                  name="port"
                  placeholder="6789"
                  type="number"
                  value={formData.port}
                  onChange={handleInputChange}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">
                Default: {formData.type === 'nzbget' ? '6789' : '8080'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">person</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="username"
                  name="username"
                  placeholder="nzbget"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">Username for authentication.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">lock</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="password"
                  name="password"
                  placeholder="Enter password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">Password for authentication.</p>
            </div>
          </div>

          {formData.type === 'sabnzbd' && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="apiKey">
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
                  placeholder="Found in SABnzbd Settings > General"
                  type="password"
                  value={formData.apiKey}
                  onChange={handleInputChange}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">
                Required for SABnzbd. Found in Settings → General → Security.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="category">
                Category
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">folder</span>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="category"
                  name="category"
                  placeholder="books"
                  type="text"
                  value={formData.category}
                  onChange={handleInputChange}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-dark">Optional download category.</p>
            </div>

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
              <p className="text-xs text-slate-400 dark:text-muted-dark">Download priority level.</p>
            </div>

            <div className="flex flex-col gap-2 justify-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="ssl"
                  checked={formData.ssl}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary focus:ring-2"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Use SSL (HTTPS)</span>
              </label>
              <p className="text-xs text-slate-400 dark:text-muted-dark">Enable for secure connections.</p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={editingDownloaderId ? handleUpdateDownloader : handleAddDownloader}
              disabled={isSaving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {editingDownloaderId ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">{editingDownloaderId ? 'save' : 'add'}</span>
                  {editingDownloaderId ? 'Update Downloader' : 'Add Downloader'}
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
            <strong>Note:</strong> Only one downloader can be active at a time. When you enable a downloader, all others will be automatically disabled. The active downloader will receive all NZB files from Newznab search results.
          </p>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-6 p-4 rounded-lg bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark">
        <div className="flex gap-4">
          <div className="text-slate-500 dark:text-muted-dark shrink-0">
            <span className="material-symbols-outlined">lightbulb</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Downloader Configuration Tips
            </p>
            <ul className="text-sm text-slate-600 dark:text-muted-dark space-y-1 list-disc list-inside">
              <li>
                <strong>NZBGet:</strong> Default port is 6789. Use username and password from NZBGet's web interface settings.
              </li>
              <li>
                <strong>SABnzbd:</strong> Default port is 8080. API key can be found in SABnzbd Settings → General → Security.
              </li>
              <li>
                Categories help organize downloads. Use existing categories from your downloader configuration.
              </li>
              <li>
                Priority controls download order. Higher priority downloads process first.
              </li>
              <li>
                Enable SSL if your downloader is configured with HTTPS (recommended for remote access).
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DownloaderSettings;
