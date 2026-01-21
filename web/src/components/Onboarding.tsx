import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import OnboardingWelcome from './OnboardingWelcome';
import OnboardingSourceSetup from './OnboardingSourceSetup';
import OnboardingDownloaderSetup from './OnboardingDownloaderSetup';
import { api } from '../api';
import type { ConfigData } from '../types';

export interface OnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
  config: ConfigData | null;
  onConfigUpdate?: () => void;
}

const Onboarding = ({ onComplete, onSkip, config, onConfigUpdate }: OnboardingProps) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Resume from lastStep if not at step 1
  useEffect(() => {
    const loadLastStep = async () => {
      const response = await api.getOnboardingStatus();
      if (response.success && response.data && response.data.lastStep > 0) {
        const step = response.data.lastStep as 1 | 2 | 3;
        if (step <= 3) {
          setCurrentStep(step);
        }
      }
    };
    loadLastStep();
  }, []);

  const handleNext = async () => {
    const nextStep = currentStep + 1 as 1 | 2 | 3;

    // Save progress to server
    await api.updateOnboardingProgress(nextStep);

    if (nextStep <= 3) {
      setCurrentStep(nextStep);
    } else {
      onComplete();
    }
  };

  const handleBack = async () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1 as 1 | 2 | 3;
      await api.updateOnboardingProgress(prevStep);
      setCurrentStep(prevStep);
    }
  };

  const handleStepSkip = () => {
    onSkip();
  };

  return (
    <AnimatePresence mode="wait">
      {currentStep === 1 && (
        <OnboardingWelcome
          key="step1"
          onNext={handleNext}
          onSkip={handleStepSkip}
        />
      )}
      {currentStep === 2 && (
        <OnboardingSourceSetup
          key="step2"
          onNext={handleNext}
          onBack={handleBack}
          onSkip={handleStepSkip}
          config={config}
          onConfigUpdate={onConfigUpdate}
        />
      )}
      {currentStep === 3 && (
        <OnboardingDownloaderSetup
          key="step3"
          onComplete={onComplete}
          onBack={handleBack}
          onSkip={handleStepSkip}
          onConfigUpdate={onConfigUpdate}
        />
      )}
    </AnimatePresence>
  );
};

export default Onboarding;
