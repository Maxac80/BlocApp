import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check, X, RotateCcw } from 'lucide-react';
import { useAuthEnhanced } from '../../context/AuthContextEnhanced';

// Import step components
import WelcomeStep from './WelcomeStep';
import ProfileStep from './ProfileStep';
import DocumentsStep from './DocumentsStep';
import SettingsStep from './SettingsStep';
import AssociationStep from './AssociationStep';
import TutorialStep from './TutorialStep';

/**
 * 🧙‍♂️ WIZARD ONBOARDING COMPLET CU 6 PAȘI GHIDAȚI
 * 
 * Features:
 * - Progress bar animat cu milestone-uri
 * - Salvare automată progres la fiecare pas
 * - Validări în timp real pentru fiecare pas
 * - Skip logic inteligent bazat pe completare
 * - Animații smooth între pași
 * - Auto-save draft la fiecare 30 secunde
 */
export default function OnboardingWizard({ onComplete, onSkip }) {
  const { 
    currentUser, 
    userProfile, 
    onboarding, 
    profileManager,
    security 
  } = useAuthEnhanced();
  
  const [wizardData, setWizardData] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [stepsCompleted, setStepsCompleted] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [canSkip, setCanSkip] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const hasLoadedRef = useRef(false);

  // 🎯 ÎNCĂRCARE PROGRES EXISTENT
  useEffect(() => {
    const loadProgress = async () => {
      if (currentUser?.uid && !hasLoadedRef.current) {
        hasLoadedRef.current = true;
        setIsLoading(true);
        try {
          await onboarding.loadOnboardingProgress(currentUser.uid);
          
          // Încarcă datele salvate
          const savedData = sessionStorage.getItem('onboarding_draft');
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData);
              setWizardData(parsed);
            } catch (error) {
              console.error('❌ Error parsing saved onboarding data:', error);
            }
          }
          
          setCurrentStep(onboarding.currentStep);
          setStepsCompleted(onboarding.stepsCompleted);
          
        } catch (error) {
          console.error('❌ Error loading onboarding progress:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadProgress();
  }, [currentUser?.uid, onboarding]);

  // 💾 AUTO-SAVE DRAFT LA 30 SECUNDE
  useEffect(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      if (Object.keys(wizardData).length > 0) {
        sessionStorage.setItem('onboarding_draft', JSON.stringify(wizardData));
        // console.log('💾 Auto-saved onboarding draft');
      }
    }, 30000); // 30 secunde

    setAutoSaveTimer(timer);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [wizardData]);

  // 🔍 UPDATE SKIP AVAILABILITY
  useEffect(() => {
    const currentStepInfo = onboarding.onboardingSteps[currentStep];
    if (currentStepInfo) {
      const completedCount = Object.keys(stepsCompleted).length;
      const minCompletionMet = completedCount >= currentStepInfo.minCompletionForSkip;
      setCanSkip(!currentStepInfo.required && minCompletionMet);
    }
  }, [currentStep, stepsCompleted, onboarding.onboardingSteps]);

  // 📝 UPDATE WIZARD DATA
  const updateWizardData = (stepId, data) => {
    // Prevenim actualizări inutile care cauzează re-render infinit
    setWizardData(prev => {
      // Verifică dacă datele sunt diferite
      const currentStepData = prev[stepId] || {};
      const hasChanges = JSON.stringify(currentStepData) !== JSON.stringify(data);
      
      if (!hasChanges) {
        return prev; // Nu actualiza dacă nu sunt schimbări
      }
      
      return {
        ...prev,
        [stepId]: data
      };
    });
    
    // Clear validation errors for this step
    if (validationErrors[stepId]) {
      setValidationErrors(prev => ({
        ...prev,
        [stepId]: null
      }));
    }
  };

  // ✅ VALIDARE PAS CURENT
  const validateCurrentStep = async () => {
    const currentStepInfo = onboarding.onboardingSteps[currentStep];
    const stepData = wizardData[currentStepInfo.id] || {};
    
    try {
      const validation = await onboarding.validateCurrentStep(currentUser.uid, stepData);
      
      if (!validation.isValid) {
        setValidationErrors(prev => ({
          ...prev,
          [currentStepInfo.id]: validation.errors
        }));
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error validating step:', error);
      return false;
    }
  };

  // 💾 SALVARE PROGRES PAS
  const saveStepProgress = async (stepId, isCompleted = false) => {
    if (!currentUser?.uid) return false;
    
    try {
      const stepData = wizardData[stepId] || {};
      const success = await onboarding.saveStepProgress(
        currentUser.uid, 
        stepId, 
        stepData, 
        isCompleted
      );
      
      if (success && isCompleted) {
        setStepsCompleted(prev => ({
          ...prev,
          [stepId]: {
            completed: true,
            completedAt: new Date().toISOString(),
            data: stepData
          }
        }));
        
        // Log progres
        await security.logActivity(currentUser.uid, 'ONBOARDING_STEP_COMPLETED', {
          stepId,
          stepNumber: currentStep + 1,
          totalSteps: onboarding.onboardingSteps.length
        });
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error saving step progress:', error);
      return false;
    }
  };

  // ➡️ NAVIGARE LA PASUL URMĂTOR
  const handleNextStep = async () => {
    const currentStepInfo = onboarding.onboardingSteps[currentStep];
    const isValid = await validateCurrentStep();
    
    if (!isValid && currentStepInfo.required) {
      return; // Nu poate continua dacă pasul e required și invalid
    }
    
    // Salvează progresul pasului curent
    await saveStepProgress(currentStepInfo.id, isValid);
    
    if (currentStep >= onboarding.onboardingSteps.length - 1) {
      // Ultimul pas - finalizează onboarding
      await completeOnboarding();
    } else {
      // Mergi la pasul următor
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await onboarding.goToNextStep(currentUser.uid);
    }
  };

  // ⬅️ NAVIGARE LA PASUL ANTERIOR
  const handlePreviousStep = async () => {
    if (currentStep > 0) {
      const previousStep = currentStep - 1;
      setCurrentStep(previousStep);
      await onboarding.goToPreviousStep(currentUser.uid);
    }
  };

  // 🎯 SALT LA PAS SPECIFIC
  const handleGoToStep = async (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < onboarding.onboardingSteps.length) {
      setCurrentStep(stepIndex);
      await onboarding.goToStep(currentUser.uid, stepIndex);
    }
  };

  // ⏭️ SKIP ONBOARDING
  const handleSkipOnboarding = async () => {
    if (!canSkip) return;
    
    try {
      const success = await onboarding.skipOnboarding(currentUser.uid);
      if (success && onSkip) {
        // Clear draft data
        sessionStorage.removeItem('onboarding_draft');
        onSkip();
      }
    } catch (error) {
      console.error('❌ Error skipping onboarding:', error);
    }
  };

  // ✅ FINALIZARE ONBOARDING
  const completeOnboarding = async () => {
    setIsLoading(true);
    
    try {
      // Salvează ultimul pas
      const currentStepInfo = onboarding.onboardingSteps[currentStep];
      await saveStepProgress(currentStepInfo.id, true);
      
      // Finalizează onboarding
      const success = await onboarding.completeOnboardingProcess(currentUser.uid);
      
      if (success) {
        // Clear draft data
        sessionStorage.removeItem('onboarding_draft');
        
        if (onComplete) {
          onComplete({
            completedSteps: Object.keys(stepsCompleted).length + 1,
            totalSteps: onboarding.onboardingSteps.length,
            wizardData
          });
        }
      }
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 RESET ONBOARDING (debug)
  const handleResetOnboarding = async () => {
    if (process.env.NODE_ENV === 'development') {
      try {
        await onboarding.resetOnboarding(currentUser.uid);
        setCurrentStep(0);
        setStepsCompleted({});
        setWizardData({});
        sessionStorage.removeItem('onboarding_draft');
      } catch (error) {
        console.error('❌ Error resetting onboarding:', error);
      }
    }
  };

  // 🎨 RENDER STEP COMPONENT
  const renderCurrentStep = () => {
    const currentStepInfo = onboarding.onboardingSteps[currentStep];
    if (!currentStepInfo) return null;

    const stepProps = {
      stepData: wizardData[currentStepInfo.id] || {},
      onUpdateData: (data) => updateWizardData(currentStepInfo.id, data),
      validationErrors: validationErrors[currentStepInfo.id] || [],
      isLoading,
      currentUser,
      userProfile,
      profileManager,
      onboarding,
      security
    };

    switch (currentStepInfo.id) {
      case 'welcome':
        return <WelcomeStep {...stepProps} />;
      case 'profile':
        return <ProfileStep {...stepProps} />;
      case 'documents':
        return <DocumentsStep {...stepProps} />;
      case 'settings':
        return <SettingsStep {...stepProps} />;
      case 'association':
        return <AssociationStep {...stepProps} />;
      case 'tutorial':
        return <TutorialStep {...stepProps} />;
      default:
        return <div>Pas necunoscut</div>;
    }
  };

  // 📊 CALCUL PROGRES TOTAL
  const calculateProgress = () => {
    const completedStepsCount = Object.keys(stepsCompleted).length;
    const currentStepProgress = currentStep > 0 ? 1 : 0; // Pasul curent contribuie cu 1
    const totalProgress = Math.round(((completedStepsCount + currentStepProgress) / onboarding.onboardingSteps.length) * 100);
    return Math.min(totalProgress, 100);
  };

  if (isLoading && Object.keys(stepsCompleted).length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă wizard-ul de configurare...</p>
        </div>
      </div>
    );
  }

  const currentStepInfo = onboarding.onboardingSteps[currentStep];
  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      
      {/* 📊 HEADER CU PROGRESS */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          
          {/* LOGO ȘI TITLU */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">BlocApp Setup</h1>
                <p className="text-sm text-gray-600">Configurează-ți contul în câțiva pași simpli</p>
              </div>
            </div>
            
            {/* DEBUG RESET (doar în development) */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={handleResetOnboarding}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Reset onboarding (dev only)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* PROGRESS BAR */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Pas {currentStep + 1} din {onboarding.onboardingSteps.length}
              </span>
              <span className="text-sm text-gray-600">{progress}% complet</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* STEP INDICATORS */}
          <div className="flex justify-between">
            {onboarding.onboardingSteps.map((step, index) => (
              <div 
                key={step.id}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => handleGoToStep(index)}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300
                  ${index === currentStep 
                    ? 'bg-blue-600 text-white' 
                    : stepsCompleted[step.id]?.completed
                    ? 'bg-green-500 text-white'
                    : index < currentStep
                    ? 'bg-gray-400 text-white'
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {stepsCompleted[step.id]?.completed ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-lg">{step.icon}</span>
                  )}
                </div>
                <span className={`
                  text-xs mt-1 text-center max-w-16 leading-tight
                  ${index === currentStep ? 'text-blue-600 font-medium' : 'text-gray-600'}
                `}>
                  {step.title.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 📋 CONȚINUT PAS CURENT */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          
          {/* HEADER PAS */}
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-3">{currentStepInfo?.icon}</span>
                  <h2 className="text-2xl font-bold text-gray-900">{currentStepInfo?.title}</h2>
                </div>
                <p className="text-gray-600">{currentStepInfo?.description}</p>
              </div>
              
              {canSkip && (
                <button
                  onClick={handleSkipOnboarding}
                  className="text-gray-400 hover:text-gray-600 text-sm flex items-center"
                >
                  <X className="w-4 h-4 mr-1" />
                  Omite
                </button>
              )}
            </div>
          </div>

          {/* CONȚINUT PAS */}
          <div className="px-8 py-6">
            {renderCurrentStep()}
          </div>

          {/* FOOTER CU BUTOANE NAVIGARE */}
          <div className="px-8 py-6 bg-gray-50 rounded-b-2xl border-t border-gray-100">
            <div className="flex justify-between items-center">
              
              {/* BUTON ÎNAPOI */}
              <button
                onClick={handlePreviousStep}
                disabled={currentStep === 0 || isLoading}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Înapoi
              </button>

              {/* INFO PROGRES */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {Object.keys(stepsCompleted).length} din {onboarding.onboardingSteps.length} pași completați
                </p>
                {validationErrors[currentStepInfo?.id]?.length > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    Te rugăm să corectezi erorile de mai sus
                  </p>
                )}
              </div>

              {/* BUTON URMĂTORUL */}
              <button
                onClick={handleNextStep}
                disabled={isLoading || (currentStepInfo?.required && validationErrors[currentStepInfo?.id]?.length > 0)}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Se salvează...
                  </>
                ) : currentStep >= onboarding.onboardingSteps.length - 1 ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Finalizează
                  </>
                ) : (
                  <>
                    Următorul
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}