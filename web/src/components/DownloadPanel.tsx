import { motion } from 'framer-motion';
import type { DownloadProgress } from '../types';
import './DownloadPanel.css';

interface DownloadPanelProps {
  download: DownloadProgress;
}

function DownloadPanel({ download }: DownloadPanelProps) {
  const getStatusIcon = () => {
    switch (download.status) {
      case 'downloading':
        return '⬇';
      case 'complete':
        return '✓';
      case 'error':
        return '✗';
    }
  };

  const getStatusColor = () => {
    switch (download.status) {
      case 'downloading':
        return 'var(--accent-primary)';
      case 'complete':
        return 'var(--accent-secondary)';
      case 'error':
        return 'var(--phosphor-red)';
    }
  };

  const getStatusText = () => {
    switch (download.status) {
      case 'downloading':
        return 'Downloading';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Failed';
    }
  };

  return (
    <motion.div
      className="download-panel"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="download-content">
        <div className="download-header">
          <div className="download-status" style={{ color: getStatusColor() }}>
            <span className="status-icon">{getStatusIcon()}</span>
            <span className="status-text">{getStatusText()}</span>
          </div>
          <div className="download-speed">{download.speed}</div>
        </div>

        <div className="download-filename">{download.filename}</div>

        <div className="download-progress-container">
          <motion.div
            className="download-progress-bar"
            initial={{ width: 0 }}
            animate={{ width: `${download.progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ backgroundColor: getStatusColor() }}
          />
          <div className="download-progress-text">
            {download.progress.toFixed(0)}%
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default DownloadPanel;
