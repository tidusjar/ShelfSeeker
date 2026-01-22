import { motion } from 'framer-motion';
import Button from './Button';
import './Onboarding.css';

export interface OnboardingWelcomeProps {
  onNext: () => void;
  onSkip: () => void;
}

const OnboardingWelcome = ({ onNext, onSkip }: OnboardingWelcomeProps) => {
  const features = [
    {
      title: 'IRC Archive Search',
      description: 'Access millions of ebooks through IRC channels',
      icon: '📡',
      gradient: 'from-blue-500/20 to-cyan-500/20',
    },
    {
      title: 'NZB Integration',
      description: 'Connect Newznab indexers for expanded results',
      icon: '🔍',
      gradient: 'from-purple-500/20 to-pink-500/20',
    },
    {
      title: 'Seamless Downloads',
      description: 'Send books directly to your download manager',
      icon: '⬇️',
      gradient: 'from-emerald-500/20 to-teal-500/20',
    },
  ];

  // Floating particles for atmosphere
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 15}s`,
    duration: `${15 + Math.random() * 10}s`,
  }));

  return (
    <div className="onboarding-container">
      {/* Ambient Grid Overlay */}
      <div className="onboarding-grid-overlay" />

      {/* Floating Particles */}
      <div className="onboarding-particles">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="onboarding-particle"
            style={{
              left: particle.left,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>

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
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
            className="text-center mb-16"
          >
            {/* Logo Mark */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-6"
            >
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-[#135bec] to-[#3b82f6] shadow-2xl shadow-[#135bec]/30">
                <span className="text-5xl">📚</span>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              className="onboarding-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              ShelfSeeker
            </motion.h1>

            {/* Subtitle with animated gradient text */}
            <motion.p
              className="onboarding-subtitle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Your personal library awaits
            </motion.p>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            variants={{
              animate: {
                transition: {
                  staggerChildren: 0.12,
                  delayChildren: 0.5,
                },
              },
            }}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={{
                  initial: { opacity: 0, y: 30 },
                  animate: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.5,
                      ease: [0.4, 0, 0.2, 1],
                    },
                  },
                }}
                className="onboarding-feature-card"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4`}>
                  <span className="text-3xl">{feature.icon}</span>
                </div>
                <h3 className="onboarding-feature-title">{feature.title}</h3>
                <p className="onboarding-feature-description">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Progress Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="onboarding-progress"
          >
            <div className="onboarding-progress-step active" />
            <div className="onboarding-progress-step pending" />
            <div className="onboarding-progress-step pending" />
            <span className="onboarding-progress-label">Step 1 of 3</span>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button
              variant="primary"
              size="large"
              onClick={onNext}
              className="px-10 shadow-lg shadow-[#135bec]/30"
              data-testid="onboarding-begin-setup"
            >
              Begin Setup
            </Button>
            <Button
              variant="ghost"
              size="large"
              onClick={onSkip}
              className="px-8"
              data-testid="onboarding-skip-welcome"
            >
              Skip for now
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingWelcome;
