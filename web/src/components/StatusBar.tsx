import { motion } from 'framer-motion';
import type { ConnectionStatus } from '../types';
import './StatusBar.css';

interface StatusBarProps {
  status: ConnectionStatus;
}

function StatusBar({ status }: StatusBarProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'var(--accent-secondary)';
      case 'connecting':
        return 'var(--accent-primary)';
      case 'disconnected':
        return 'var(--phosphor-red)';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting';
      case 'disconnected':
        return 'Disconnected';
    }
  };

  return (
    <div className="status-bar">
      <motion.div
        className="status-indicator"
        style={{ backgroundColor: getStatusColor() }}
        animate={{
          scale: status === 'connecting' ? [1, 1.2, 1] : 1,
          opacity: status === 'connecting' ? [1, 0.6, 1] : 1,
        }}
        transition={{
          duration: 1.5,
          repeat: status === 'connecting' ? Infinity : 0,
          ease: 'easeInOut',
        }}
      />
      <span className="status-text" style={{ color: getStatusColor() }}>
        {getStatusText()}
      </span>
    </div>
  );
}

export default StatusBar;
