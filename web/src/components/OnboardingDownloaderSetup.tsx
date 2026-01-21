import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Input from './Input';
import { api } from '../api';
import './Onboarding.css';

export interface OnboardingDownloaderSetupProps {
  onComplete: () => void;
  onBack: () => void;
  onSkip: () => void;
  onConfigUpdate?: () => void;
}

const OnboardingDownloaderSetup = ({
  onComplete,
  onBack,
  onSkip,
  onConfigUpdate,
}: OnboardingDownloaderSetupProps) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [downloaderType, setDownloaderType] = useState<'nzbget' | 'sabnzbd'>('nzbget');
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('My Downloader');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(6789);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleFinish = async () => {
    // If no config shown, just complete
    if (!showConfig) {
      onComplete();
      return;
    }

    setIsSaving(true);
    try {
      // Save the downloader
      await api.addUsenetDownloader({
        name,
        type: downloaderType,
        enabled: true,
        host,
        port,
        ssl: false,
        username,
        password,
        apiKey: downloaderType === 'sabnzbd' ? apiKey : undefined,
      });

      // Trigger config update callback
      if (onConfigUpdate) {
        onConfigUpdate();
      }

      setShowSuccess(true);

      // Auto-redirect after 2 seconds
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Failed to save downloader:', error);
      alert('Failed to save downloader configuration. Please try again.');
      setIsSaving(false);
    }
  };

  // Success State
  if (showSuccess) {
    return (
      <div className="onboarding-container">
        {/* Ambient Grid Overlay */}
        <div className="onboarding-grid-overlay" />

        {/* Decorative Corners */}
        <div className="onboarding-corner top-left" />
        <div className="onboarding-corner bottom-right" />

        {/* Main Content */}
        <div className="onboarding-content">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="onboarding-success-container"
          >
            {/* Animated Success Icon */}
            <motion.div
              className="onboarding-success-icon"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: 0.2,
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
            >
              <svg
                className="w-12 h-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5, duration: 0.5, ease: 'easeInOut' }}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>

            {/* Success Messages */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <h2 className="onboarding-title mb-2">You're all set!</h2>
              <p className="onboarding-subtitle">ShelfSeeker is ready to use</p>
            </motion.div>

            {/* Decorative Elements */}
            <motion.div
              className="flex gap-4 mt-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.4 }}
            >
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <span className="text-green-400">✓</span>
                <span>Search sources configured</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <span className="text-green-400">✓</span>
                <span>Downloader ready</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Configuration State
  return (
    <div className="onboarding-container">
      {/* Ambient Grid Overlay */}
      <div className="onboarding-grid-overlay" />

      {/* Decorative Corners */}
      <div className="onboarding-corner top-left" />
      <div className="onboarding-corner bottom-right" />

      {/* Main Content */}
      <div className="onboarding-content">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="onboarding-card"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center mb-12"
          >
            <h1 className="onboarding-title">Where should we send your books?</h1>
            <p className="onboarding-subtitle">
              Configure a downloader to automatically send NZB files
            </p>
          </motion.div>

          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="onboarding-progress mb-12"
          >
            <div className="onboarding-progress-step completed" />
            <div className="onboarding-progress-step completed" />
            <div className="onboarding-progress-step active" />
            <span className="onboarding-progress-label">Step 3 of 3</span>
          </motion.div>

          {/* Downloader Cards */}
          <div className="space-y-5 mb-12">
            {/* NZB Downloader */}
            <motion.div
              className={`onboarding-source-card ${showConfig ? 'enabled' : ''}`}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="onboarding-source-header">
                <div className="onboarding-source-info">
                  <div className="onboarding-source-icon">⬇️</div>
                  <div className="onboarding-source-meta">
                    <h3 className="onboarding-source-name">NZB Downloader</h3>
                    <p className="onboarding-source-description">
                      SABnzbd or NZBGet
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setShowConfig(!showConfig)}
                  data-testid="onboarding-downloader-configure"
                >
                  {showConfig ? 'Cancel' : 'Configure'}
                </Button>
              </div>

              <AnimatePresence mode="wait">
                {showConfig && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="onboarding-config-panel"
                  >
                    {/* Downloader Type Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Downloader Type
                      </label>
                      <div className="flex gap-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setDownloaderType('nzbget')}
                          className={`flex-1 py-3 px-4 rounded-lg border transition-all duration-200 ${
                            downloaderType === 'nzbget'
                              ? 'border-[#135bec] bg-gradient-to-r from-[#135bec]/20 to-[#3b82f6]/20 text-white shadow-lg shadow-[#135bec]/20'
                              : 'border-[#232f48] text-gray-400 hover:border-[#135bec]/50'
                          }`}
                        >
                          NZBGet
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setDownloaderType('sabnzbd')}
                          className={`flex-1 py-3 px-4 rounded-lg border transition-all duration-200 ${
                            downloaderType === 'sabnzbd'
                              ? 'border-[#135bec] bg-gradient-to-r from-[#135bec]/20 to-[#3b82f6]/20 text-white shadow-lg shadow-[#135bec]/20'
                              : 'border-[#232f48] text-gray-400 hover:border-[#135bec]/50'
                          }`}
                        >
                          SABnzbd
                        </motion.button>
                      </div>
                    </div>

                    {/* Configuration Fields */}
                    <div className="space-y-4">
                      <Input
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My Downloader"
                        fullWidth
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <Input
                          label="Host"
                          value={host}
                          onChange={(e) => setHost(e.target.value)}
                          placeholder="localhost"
                          fullWidth
                        />
                        <Input
                          label="Port"
                          type="number"
                          value={port}
                          onChange={(e) => setPort(Number(e.target.value))}
                          placeholder="6789"
                          fullWidth
                        />
                        <div /> {/* Spacer for grid alignment */}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Username"
                          fullWidth
                        />
                        <Input
                          label="Password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          fullWidth
                        />
                      </div>
                      {downloaderType === 'sabnzbd' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <Input
                            label="API Key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Your SABnzbd API key"
                            fullWidth
                          />
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Torrent Downloader - Coming Soon */}
            <motion.div
              className="onboarding-source-card opacity-50"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 0.5, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="onboarding-source-header">
                <div className="onboarding-source-info">
                  <div className="onboarding-source-icon">⏳</div>
                  <div className="onboarding-source-meta">
                    <h3 className="onboarding-source-name">Torrent Downloader</h3>
                    <p className="onboarding-source-description">
                      qBittorrent or Transmission (Coming Soon)
                    </p>
                  </div>
                </div>
                <Button variant="secondary" size="small" disabled>
                  Configure
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button variant="secondary" size="medium" onClick={onBack} data-testid="onboarding-back">
              Back
            </Button>
            <Button
              variant="primary"
              size="medium"
              onClick={handleFinish}
              disabled={isSaving}
              className="shadow-lg shadow-[#135bec]/30"
              data-testid="onboarding-finish"
            >
              {isSaving ? 'Saving...' : showConfig ? 'Finish Setup' : 'Skip Downloader'}
            </Button>
            <Button variant="ghost" size="medium" onClick={onSkip} data-testid="onboarding-skip-downloader">
              Skip for now
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingDownloaderSetup;
