import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Input from './Input';
import { api } from '../api';
import type { ConfigData } from '../types';
import './Onboarding.css';

export interface OnboardingSourceSetupProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  config: ConfigData | null;
  onConfigUpdate?: () => void;
}

const OnboardingSourceSetup = ({
  onNext,
  onBack,
  onSkip,
  config,
  onConfigUpdate,
}: OnboardingSourceSetupProps) => {
  const [ircEnabled, setIrcEnabled] = useState(false);
  const [nzbEnabled, setNzbEnabled] = useState(false);
  const [showIrcConfig, setShowIrcConfig] = useState(false);
  const [showNzbConfig, setShowNzbConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // IRC form state
  const [ircServer, setIrcServer] = useState(config?.irc.server || 'irc.irchighway.net');
  const [ircPort, setIrcPort] = useState(config?.irc.port || 6667);
  const [ircChannel, setIrcChannel] = useState(config?.irc.channel || '#ebooks');
  const [ircSearchCommand, setIrcSearchCommand] = useState(config?.irc.searchCommand || '@search');

  // NZB form state
  const [nzbName, setNzbName] = useState('');
  const [nzbUrl, setNzbUrl] = useState('');
  const [nzbApiKey, setNzbApiKey] = useState('');

  const handleContinue = async () => {
    setIsSaving(true);
    try {
      // Save IRC config if enabled
      if (ircEnabled) {
        await api.updateIrcConfig({
          enabled: true,
          server: ircServer,
          port: ircPort,
          channel: ircChannel,
          searchCommand: ircSearchCommand,
        });
      }

      // Save NZB provider if enabled
      if (nzbEnabled && nzbName && nzbUrl && nzbApiKey) {
        await api.addNzbProvider({
          name: nzbName,
          url: nzbUrl,
          apiKey: nzbApiKey,
          enabled: true,
          categories: [7020], // Ebook category ID
          priority: 0,
        });
      }

      // Trigger config update callback
      if (onConfigUpdate) {
        onConfigUpdate();
      }

      onNext();
    } catch (error) {
      console.error('Failed to save configuration:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
            <h1 className="onboarding-title">Configure Search Sources</h1>
            <p className="onboarding-subtitle">Enable and configure your preferred search sources</p>
          </motion.div>

          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="onboarding-progress mb-12"
          >
            <div className="onboarding-progress-step completed" />
            <div className="onboarding-progress-step active" />
            <div className="onboarding-progress-step pending" />
            <span className="onboarding-progress-label">Step 2 of 3</span>
          </motion.div>

          {/* Source Cards */}
          <div className="space-y-5 mb-12">
            {/* IRC Protocol */}
            <motion.div
              className={`onboarding-source-card ${ircEnabled ? 'enabled' : ''}`}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="onboarding-source-header">
                <div className="onboarding-source-info">
                  <div className="onboarding-source-icon">📡</div>
                  <div className="onboarding-source-meta">
                    <h3 className="onboarding-source-name">IRC Protocol</h3>
                    <p className="onboarding-source-description">
                      Connect to IRC channels for ebook searches
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIrcEnabled(!ircEnabled);
                    if (!ircEnabled) setShowIrcConfig(true);
                  }}
                  className={`onboarding-toggle ${ircEnabled ? 'active' : ''}`}
                  data-testid="onboarding-irc-toggle"
                >
                  <div className="onboarding-toggle-knob" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {ircEnabled && showIrcConfig && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="onboarding-config-panel space-y-4"
                  >
                    <Input
                      label="Server"
                      value={ircServer}
                      onChange={(e) => setIrcServer(e.target.value)}
                      placeholder="irc.irchighway.net"
                      fullWidth
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Port"
                        type="number"
                        value={ircPort}
                        onChange={(e) => setIrcPort(Number(e.target.value))}
                        fullWidth
                      />
                      <Input
                        label="Channel"
                        value={ircChannel}
                        onChange={(e) => setIrcChannel(e.target.value)}
                        placeholder="#ebooks"
                        fullWidth
                      />
                    </div>
                    <Input
                      label="Search Command"
                      value={ircSearchCommand}
                      onChange={(e) => setIrcSearchCommand(e.target.value)}
                      placeholder="@search"
                      fullWidth
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Newznab */}
            <motion.div
              className={`onboarding-source-card ${nzbEnabled ? 'enabled' : ''}`}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="onboarding-source-header">
                <div className="onboarding-source-info">
                  <div className="onboarding-source-icon">🔍</div>
                  <div className="onboarding-source-meta">
                    <h3 className="onboarding-source-name">Newznab</h3>
                    <p className="onboarding-source-description">
                      Add NZB indexers for more results
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setNzbEnabled(!nzbEnabled);
                    if (!nzbEnabled) setShowNzbConfig(true);
                  }}
                  className={`onboarding-toggle ${nzbEnabled ? 'active' : ''}`}
                  data-testid="onboarding-nzb-toggle"
                >
                  <div className="onboarding-toggle-knob" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {nzbEnabled && showNzbConfig && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="onboarding-config-panel space-y-4"
                  >
                    <Input
                      label="Provider Name"
                      value={nzbName}
                      onChange={(e) => setNzbName(e.target.value)}
                      placeholder="My NZB Indexer"
                      fullWidth
                    />
                    <Input
                      label="URL"
                      type="url"
                      value={nzbUrl}
                      onChange={(e) => setNzbUrl(e.target.value)}
                      placeholder="https://indexer.example.com"
                      fullWidth
                    />
                    <Input
                      label="API Key"
                      type="password"
                      value={nzbApiKey}
                      onChange={(e) => setNzbApiKey(e.target.value)}
                      placeholder="Your API key"
                      fullWidth
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Torrents - Coming Soon */}
            <motion.div
              className="onboarding-source-card opacity-50"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 0.5, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="onboarding-source-header">
                <div className="onboarding-source-info">
                  <div className="onboarding-source-icon">⏳</div>
                  <div className="onboarding-source-meta">
                    <h3 className="onboarding-source-name">Torrents</h3>
                    <p className="onboarding-source-description">Coming soon</p>
                  </div>
                </div>
                <button className="onboarding-toggle" disabled>
                  <div className="onboarding-toggle-knob" />
                </button>
              </div>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button variant="secondary" size="medium" onClick={onBack} data-testid="onboarding-back">
              Back
            </Button>
            <Button
              variant="primary"
              size="medium"
              onClick={handleContinue}
              disabled={isSaving}
              className="shadow-lg shadow-[#135bec]/30"
              data-testid="onboarding-continue"
            >
              {isSaving ? 'Saving...' : 'Continue to Downloader Setup'}
            </Button>
            <Button variant="ghost" size="medium" onClick={onSkip} data-testid="onboarding-skip-source">
              Skip for now
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingSourceSetup;
