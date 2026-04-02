import { useState } from 'react';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, arrayUnion } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../firebase';
import { useSecurity } from './useSecurity';
import { useUserProfile } from './useUserProfile';
import { useMonthManagement } from './useMonthManagement';

/**
 * 🚀 HOOK PENTRU WIZARD ONBOARDING COMPLET
 * 
 * Funcționalități:
 * - 5 pași ghidați pentru setup complet
 * - Salvare automată progres la fiecare pas
 * - Validări în timp real
 * - Skip opțional doar după completare minimă
 * - Tutorial interactiv cu tooltips
 * - Email de welcome la finalizare
 */
export const useOnboarding = () => {
  const { logActivity } = useSecurity();
  const { loadUserProfile, completeOnboarding } = useUserProfile();
  const { initializeMonths } = useMonthManagement();

  const [onboardingData, setOnboardingData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepsCompleted, setStepsCompleted] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [associationId, setAssociationId] = useState(null); // Track current association for nested storage

  // 📋 DEFINIREA PAȘILOR ONBOARDING
  const onboardingSteps = [
    {
      id: 'welcome',
      title: 'Start',
      description: 'Să configurăm contul tău pentru a începe administrarea eficientă',
      icon: '👋',
      required: true,
      minCompletionForSkip: 0
    },
    {
      id: 'profile',
      title: 'Profil Personal',
      description: 'Completează datele tale personale și profesionale',
      icon: '👤',
      required: true,
      minCompletionForSkip: 60,
      fields: [
        'personalInfo.firstName',
        'personalInfo.lastName',
        'personalInfo.phone',
        'personalInfo.address.city',
        'personalInfo.address.county',
        'professionalInfo.companyName'
      ]
    },
    {
      id: 'documents',
      title: 'Documente',
      description: 'Încarcă documentele pentru verificarea identității și autorizarea administrării',
      icon: '📄',
      required: true,
      minCompletionForSkip: 50,
      requiredDocuments: ['idCard', 'adminAttestation', 'criminalRecord']
    },
    {
      id: 'settings',
      title: 'Configurare',
      description: 'Configurează aplicația conform preferințelor tale',
      icon: '⚙️',
      required: false,
      minCompletionForSkip: 20,
      fields: [
        'settings.language',
        'settings.timezone',
        'settings.notifications.email.maintenanceUpdates'
      ]
    },
    {
      id: 'association',
      title: 'Asociația Mea',
      description: 'Creează prima asociație pentru a începe lucrul',
      icon: '🏢',
      required: false,
      minCompletionForSkip: 0
    },
    {
      id: 'tutorial',
      title: 'Ghid de Utilizare',
      description: 'Învață să folosești eficient toate funcționalitățile',
      icon: '🎓',
      required: false,
      minCompletionForSkip: 0
    }
  ];

  // 🧹 CURĂȚARE DATE PENTRU FIRESTORE (elimină File objects)
  const cleanDataForFirestore = (data) => {
    if (!data || typeof data !== 'object') return data;
    
    const cleaned = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof File) {
        // Înlocuiește File object cu metadata
        cleaned[key] = {
          name: value.name,
          size: value.size,
          type: value.type,
          lastModified: value.lastModified,
          isFile: true // marker pentru a ști că era un File
        };
      } else if (value && typeof value === 'object') {
        // Recursiv pentru obiecte nested
        cleaned[key] = cleanDataForFirestore(value);
      } else {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  };

  // 🎯 ÎNCĂRCARE PROGRES ONBOARDING
  const loadOnboardingProgress = async (userId, associationId = null) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      let onboardingRef, onboardingDoc;

      // Try nested location first if associationId provided
      if (associationId) {
        onboardingRef = doc(db, `associations/${associationId}/onboarding_progress`, userId);
        onboardingDoc = await getDoc(onboardingRef);
      }

      // Fallback to root location if not found in nested or no associationId
      if (!onboardingDoc || !onboardingDoc.exists()) {
        onboardingRef = doc(db, 'onboarding_progress', userId);
        onboardingDoc = await getDoc(onboardingRef);
      }

      if (onboardingDoc.exists()) {
        const data = onboardingDoc.data();
        setOnboardingData(data);
        setCurrentStep(data.currentStep || 0);
        setStepsCompleted(data.stepsCompleted || {});
        setAssociationId(associationId); // Store associationId for subsequent writes

        // Verifică dacă poate face skip
        updateSkipAvailability(data.currentStep, data.stepsCompleted);
      } else {
        // Inițializează progres nou
        const initialData = {
          userId,
          startedAt: new Date().toISOString(),
          currentStep: 0,
          stepsCompleted: {},
          completed: false,
          skipped: false
        };

        // Write to nested location if associationId provided, otherwise root
        if (associationId) {
          onboardingRef = doc(db, `associations/${associationId}/onboarding_progress`, userId);
        } else {
          onboardingRef = doc(db, 'onboarding_progress', userId);
        }

        await setDoc(onboardingRef, initialData);
        setOnboardingData(initialData);
        setCurrentStep(0);
        setStepsCompleted({});
        setAssociationId(associationId); // Store associationId for subsequent writes

        await logActivity(userId, 'ONBOARDING_STARTED', {
          totalSteps: onboardingSteps.length
        }, associationId);
      }
    } catch (error) {
      console.error('❌ Error loading onboarding progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 💾 SALVARE PROGRES PAS
  const saveStepProgress = async (userId, stepId, stepData, isCompleted = false) => {
    if (!userId || !onboardingData) return;

    try {
      // Curăță datele de obiecte File care nu pot fi salvate în Firestore
      const cleanStepData = cleanDataForFirestore(stepData);

      const updatedStepsCompleted = {
        ...stepsCompleted,
        [stepId]: {
          completed: isCompleted,
          data: cleanStepData,
          completedAt: isCompleted ? new Date().toISOString() : null,
          lastUpdated: new Date().toISOString()
        }
      };

      const updatedOnboardingData = {
        ...onboardingData,
        stepsCompleted: updatedStepsCompleted,
        lastUpdated: new Date().toISOString()
      };

      // Use nested location if associationId is set, otherwise root
      const onboardingRef = associationId
        ? doc(db, `associations/${associationId}/onboarding_progress`, userId)
        : doc(db, 'onboarding_progress', userId);

      await updateDoc(onboardingRef, updatedOnboardingData);

      setOnboardingData(updatedOnboardingData);
      setStepsCompleted(updatedStepsCompleted);

      // Update skip availability
      updateSkipAvailability(currentStep, updatedStepsCompleted);

      await logActivity(userId, 'ONBOARDING_STEP_PROGRESS', {
        stepId,
        isCompleted,
        stepNumber: currentStep + 1,
        totalSteps: onboardingSteps.length
      }, associationId);

      return true;
    } catch (error) {
      console.error('❌ Error saving step progress:', error);
      return false;
    }
  };

  // ➡️ NAVIGARE LA PASUL URMĂTOR
  const goToNextStep = async (userId) => {
    if (currentStep >= onboardingSteps.length - 1) {
      // Ultimul pas - finalizează onboarding
      return await completeOnboardingProcess(userId);
    }
    
    const nextStep = currentStep + 1;
    await updateCurrentStep(userId, nextStep);
    
    return true;
  };

  // ⬅️ NAVIGARE LA PASUL ANTERIOR
  const goToPreviousStep = async (userId) => {
    if (currentStep <= 0) return false;
    
    const previousStep = currentStep - 1;
    await updateCurrentStep(userId, previousStep);
    
    return true;
  };

  // 🎯 SALT LA PAS SPECIFIC
  const goToStep = async (userId, stepIndex) => {
    if (stepIndex < 0 || stepIndex >= onboardingSteps.length) return false;
    
    await updateCurrentStep(userId, stepIndex);
    return true;
  };

  // 🔄 UPDATE CURRENT STEP
  const updateCurrentStep = async (userId, stepIndex) => {
    try {
      // Use nested location if associationId is set, otherwise root
      const onboardingRef = associationId
        ? doc(db, `associations/${associationId}/onboarding_progress`, userId)
        : doc(db, 'onboarding_progress', userId);

      await updateDoc(onboardingRef, {
        currentStep: stepIndex,
        lastUpdated: new Date().toISOString()
      });

      setCurrentStep(stepIndex);
      updateSkipAvailability(stepIndex, stepsCompleted);

      await logActivity(userId, 'ONBOARDING_STEP_CHANGED', {
        fromStep: currentStep,
        toStep: stepIndex,
        stepName: onboardingSteps[stepIndex]?.id
      }, associationId);
    } catch (error) {
      console.error('❌ Error updating current step:', error);
    }
  };

  // ⏭️ SKIP ONBOARDING (cu condiții)
  const skipOnboarding = async (userId) => {
    if (!canSkip) return false;

    try {
      // Use nested location if associationId is set, otherwise root
      const onboardingRef = associationId
        ? doc(db, `associations/${associationId}/onboarding_progress`, userId)
        : doc(db, 'onboarding_progress', userId);

      await updateDoc(onboardingRef, {
        skipped: true,
        skippedAt: new Date().toISOString(),
        completed: false,
        lastUpdated: new Date().toISOString()
      });

      await logActivity(userId, 'ONBOARDING_SKIPPED', {
        atStep: currentStep + 1,
        stepsCompleted: Object.keys(stepsCompleted).length
      }, associationId);

      return true;
    } catch (error) {
      console.error('❌ Error skipping onboarding:', error);
      return false;
    }
  };

  // ✅ FINALIZARE ONBOARDING COMPLET
  const completeOnboardingProcess = async (userId) => {
    try {
      // Use nested location if associationId is set, otherwise root
      const onboardingRef = associationId
        ? doc(db, `associations/${associationId}/onboarding_progress`, userId)
        : doc(db, 'onboarding_progress', userId);

      await updateDoc(onboardingRef, {
        completed: true,
        completedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });

      // Salvează asociația dacă a fost creată în onboarding
      await saveAssociationFromOnboarding(userId);

      // Marchează profilul ca având onboarding complet
      await completeOnboarding(userId);

      // Trimite email de welcome
      await sendWelcomeEmail(userId);

      await logActivity(userId, 'ONBOARDING_COMPLETED', {
        totalSteps: onboardingSteps.length,
        stepsCompleted: Object.keys(stepsCompleted).length,
        duration: calculateOnboardingDuration()
      }, associationId);

      return true;
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      return false;
    }
  };

  // 💾 SALVARE ASOCIAȚIE DIN ONBOARDING
  const saveAssociationFromOnboarding = async (userId) => {
    try {
      
      // Verifică dacă există date de asociație în stepsCompleted
      const associationStepData = stepsCompleted?.association?.data;
      const profileStepData = stepsCompleted?.profile?.data;
      const documentsStepData = stepsCompleted?.documents?.data;
      
      
      if (!associationStepData || associationStepData.skipStep) {
        return;
      }

      const { associationData } = associationStepData;
      
      
      // Verifică dacă datele sunt complete
      if (!associationData?.name?.trim()) {
        return;
      }

      // Pregătește datele pentru salvare cu mapping corect pentru structura existentă
      const associationToSave = {
        name: associationData.name.trim(),
        cui: associationData.cui || '',
        registrationNumber: associationData.registrationNumber || '',
        
        // Salvăm atât în formatul vechi cât și în cel nou pentru compatibilitate
        // Format vechi (folosit în AssociationView)
        sediu_judet: associationData.address?.county || '',
        sediu_oras: associationData.address?.city || '',
        sediu_strada: associationData.address?.street || '',
        sediu_numar: associationData.address?.number || '',
        
        // Format nou (din wizard)
        address: {
          street: associationData.address?.street || '',
          number: associationData.address?.number || '',
          city: associationData.address?.city || '',
          county: associationData.address?.county || '',
          zipCode: associationData.address?.zipCode || ''
        },
        
        // Contact - salvăm în ambele formate
        email: associationData.contact?.email || '',
        phone: associationData.contact?.phone || '',
        contact: {
          phone: associationData.contact?.phone || '',
          email: associationData.contact?.email || '',
          website: associationData.contact?.website || ''
        },
        
        // Date bancare - salvăm în ambele formate
        bank: associationData.bankAccount?.bank || '',
        bankAccount: associationData.bankAccount?.iban || '',
        bankAccountData: {
          bank: associationData.bankAccount?.bank || '',
          iban: associationData.bankAccount?.iban || '',
          accountName: associationData.bankAccount?.accountName || ''
        },
        
        // Date administrator din ProfileStep
        adminProfile: profileStepData ? {
          firstName: profileStepData.firstName || '',
          lastName: profileStepData.lastName || '',
          phone: profileStepData.phone || '',
          email: profileStepData.email || '',
          avatarURL: profileStepData.avatarURL || '',
          companyName: profileStepData.professionalInfo?.companyName || '',
          position: profileStepData.professionalInfo?.position || '',
          experience: profileStepData.professionalInfo?.experience || '',
          licenseNumber: profileStepData.professionalInfo?.licenseNumber || '',
          // Adaugă datele de adresă din ProfileStep
          address: {
            street: profileStepData.address?.street || '',
            number: profileStepData.address?.number || '',
            building: profileStepData.address?.building || '',
            apartment: profileStepData.address?.apartment || '',
            city: profileStepData.address?.city || '',
            county: profileStepData.address?.county || ''
          },
          // Adaugă documentele din DocumentsStep
          documents: documentsStepData ? {
            idCard: documentsStepData.idCard || null,
            adminAttestation: documentsStepData.adminAttestation || null,
            criminalRecord: documentsStepData.criminalRecord || null,
            professionalCertifications: documentsStepData.professionalCertifications || null,
            adminContract: documentsStepData.adminContract || null
          } : {}
        } : {},
        
        adminId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'onboarding'
      };

      
      // Salvează în Firestore
      const associationsRef = collection(db, 'associations');
      const docRef = await addDoc(associationsRef, associationToSave);


      // Creează member doc pentru admin (fondator)
      try {
        const userDocSnap = await getDoc(doc(db, 'users', userId));
        const userData = userDocSnap.exists() ? userDocSnap.data() : {};
        const adminName = userData.profile?.personalInfo?.firstName
          ? `${userData.profile.personalInfo.firstName} ${userData.profile.personalInfo.lastName || ''}`.trim()
          : userData.name || '';

        await setDoc(doc(db, 'associations', docRef.id, 'members', userId), {
          userId,
          role: 'assoc_admin',
          status: 'active',
          name: adminName,
          email: userData.email || '',
          addedAt: new Date().toISOString(),
          joinedAt: new Date().toISOString()
        });
      } catch (memberErr) {
        console.warn('Could not create member doc for admin:', memberErr);
      }

      // 🎯 Sheet-ul va fi creat automat de `initializeMonths` în `completeOnboardingWithTabs`
      // Nu mai creăm manual sheet-ul aici pentru a evita duplicarea

      await logActivity(userId, 'ASSOCIATION_CREATED_FROM_ONBOARDING', {
        associationId: docRef.id,
        associationName: associationToSave.name
      });

      return docRef.id;
    } catch (error) {
      console.error('❌ Error saving association from onboarding:', error);
      return null;
    }
  };

  // ⏰ CALCULARE DURATĂ ONBOARDING
  const calculateOnboardingDuration = () => {
    if (!onboardingData?.startedAt) return 0;
    
    const startTime = new Date(onboardingData.startedAt);
    const endTime = new Date();
    return Math.round((endTime - startTime) / 1000 / 60); // minute
  };

  // 🔍 UPDATE DISPONIBILITATE SKIP
  const updateSkipAvailability = (stepIndex, completedSteps) => {
    const currentStepData = onboardingSteps[stepIndex];
    if (!currentStepData) {
      setCanSkip(false);
      return;
    }
    
    // Verifică dacă sunt pași required completați
    const requiredStepsCompleted = onboardingSteps
      .slice(0, stepIndex)
      .filter(step => step.required)
      .every(step => completedSteps[step.id]?.completed);
    
    // Verifică completarea minimă pentru skip
    const minCompletionMet = stepIndex >= currentStepData.minCompletionForSkip;
    
    setCanSkip(requiredStepsCompleted && minCompletionMet && !currentStepData.required);
  };

  // 📧 TRIMITERE EMAIL WELCOME
  const sendWelcomeEmail = async (userId) => {
    try {
      // Obține datele utilizatorului pentru email
      const userProfile = await loadUserProfile(userId);
      const user = {
        uid: userId,
        email: userProfile?.personalInfo?.email || 'user@example.com',
        displayName: `${userProfile?.personalInfo?.firstName || ''} ${userProfile?.personalInfo?.lastName || ''}`.trim() || 'Administrator'
      };
      
      const completionData = {
        completedSteps: Object.values(stepsCompleted).filter(step => step.completed).length,
        totalSteps: onboardingSteps.length
      };
      
      await logActivity(userId, 'WELCOME_EMAIL_SENT', {
        emailType: 'onboarding_complete',
        completionData
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      return false;
    }
  };

  // 📊 STATISTICI ONBOARDING
  const getOnboardingStats = () => {
    const totalSteps = onboardingSteps.length;
    const completedStepsCount = Object.values(stepsCompleted).filter(step => step.completed).length;
    const progressPercentage = Math.round((completedStepsCount / totalSteps) * 100);
    const currentStepInfo = onboardingSteps[currentStep];
    
    return {
      totalSteps,
      completedStepsCount,
      progressPercentage,
      currentStepInfo,
      remainingSteps: totalSteps - currentStep - 1,
      canSkip,
      isLastStep: currentStep >= totalSteps - 1
    };
  };

  // 🎓 CONTROL TUTORIAL
  const startTutorial = () => {
    setShowTutorial(true);
  };

  const stopTutorial = () => {
    setShowTutorial(false);
  };

  // 🔄 RESET ONBOARDING (pentru test/debug)
  const resetOnboarding = async (userId, resetAssociationId = null) => {
    try {
      // Use provided associationId or current one, or fallback to root
      const targetAssociationId = resetAssociationId || associationId;
      const onboardingRef = targetAssociationId
        ? doc(db, `associations/${targetAssociationId}/onboarding_progress`, userId)
        : doc(db, 'onboarding_progress', userId);

      const resetData = {
        userId,
        startedAt: new Date().toISOString(),
        currentStep: 0,
        stepsCompleted: {},
        completed: false,
        skipped: false,
        reset: true,
        resetAt: new Date().toISOString()
      };

      await setDoc(onboardingRef, resetData);
      setOnboardingData(resetData);
      setCurrentStep(0);
      setStepsCompleted({});
      setCanSkip(false);
      setAssociationId(targetAssociationId);

      await logActivity(userId, 'ONBOARDING_RESET', {
        reason: 'manual_reset'
      }, targetAssociationId);

      return true;
    } catch (error) {
      console.error('❌ Error resetting onboarding:', error);
      return false;
    }
  };

  // 📋 VALIDARE PAS CURENT
  const validateCurrentStep = async (userId, stepData) => {
    const currentStepInfo = onboardingSteps[currentStep];
    if (!currentStepInfo) return { isValid: false, errors: ['Pas invalid'] };
    
    const errors = [];
    
    // Validări specifice per tip de pas
    switch (currentStepInfo.id) {
      case 'profile':
        if (!stepData.firstName?.trim()) errors.push('Prenumele este obligatoriu');
        if (!stepData.lastName?.trim()) errors.push('Numele este obligatoriu');
        if (!stepData.phone?.trim()) errors.push('Telefonul este obligatoriu');
        break;
        
      case 'documents':
        // Folosește flag-ul isValid setat de componenta DocumentsStep
        if (!stepData.isValid) {
          errors.push('Te rugăm să încarci toate documentele obligatorii');
        }
        break;
        
      case 'association':
        // Verifică dacă pasul a fost omis sau datele sunt valide
        if (!stepData.skipStep && !stepData.isValid) {
          errors.push('Te rugăm să completezi informațiile asociației sau să omiți acest pas');
        }
        break;
        
      case 'tutorial':
        // Tutorial step este întotdeauna valid
        break;
        
      case 'settings':
        // Settings step este opțional, deci întotdeauna valid
        break;
        
      case 'welcome':
        // Welcome step este întotdeauna valid
        break;
      default:
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  return {
    // State
    onboardingData,
    currentStep,
    stepsCompleted,
    isLoading,
    canSkip,
    showTutorial,
    
    // Steps data
    onboardingSteps,
    
    // Functions
    loadOnboardingProgress,
    saveStepProgress,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    skipOnboarding,
    completeOnboardingProcess,
    completeOnboardingWithTabs: async (tabData, currentUser) => {
      try {

        // Salvez direct asociația fără să depend de funcția veche
        if (tabData.association && tabData.association.name) {
          const associationToSave = {
            name: tabData.association.name.trim(),
            cui: tabData.association.cui || '',
            registrationNumber: tabData.association.registrationNumber || '',

            // Format pentru AssociationView (câmpuri separate)
            sediu_judet: tabData.association.address?.county || '',
            sediu_oras: tabData.association.address?.city || '',
            sediu_strada: tabData.association.address?.street || '',
            sediu_numar: tabData.association.address?.number || '',
            sediu_bloc: tabData.association.address?.block || '',

            // Format nou (obiect address)
            address: {
              street: tabData.association.address?.street || '',
              number: tabData.association.address?.number || '',
              block: tabData.association.address?.block || '',
              city: tabData.association.address?.city || '',
              county: tabData.association.address?.county || '',
              zipCode: tabData.association.address?.zipCode || ''
            },

            // Date administrator din ProfileStep
            adminProfile: tabData.profile ? {
              firstName: tabData.profile.firstName || '',
              lastName: tabData.profile.lastName || '',
              phone: tabData.profile.phone || '',
              email: tabData.profile.email || '',
              avatarURL: tabData.profile.avatarURL || '',
              companyName: tabData.profile.professionalInfo?.companyName || '',
              position: tabData.profile.professionalInfo?.position || 'Administrator asociație',
              licenseNumber: tabData.profile.professionalInfo?.licenseNumber || '',
              address: {
                street: tabData.profile.address?.street || '',
                city: tabData.profile.address?.city || '',
                county: tabData.profile.address?.county || ''
              },
              documents: tabData.profile.documents || {}
            } : {},

            adminId: currentUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'onboarding_tabs'
          };

          // Salvează în Firestore
          const associationsRef = collection(db, 'associations');
          const docRef = await addDoc(associationsRef, associationToSave);

          // Creează member doc pentru admin (creatorul asociației)
          const memberRef = doc(db, 'associations', docRef.id, 'members', currentUser.uid);
          await setDoc(memberRef, {
            userId: currentUser.uid,
            role: 'assoc_admin',
            status: 'active',
            name: tabData.profile
              ? `${tabData.profile.firstName || ''} ${tabData.profile.lastName || ''}`.trim()
              : '',
            email: currentUser.email || '',
            addedAt: new Date().toISOString(),
            joinedAt: new Date().toISOString()
          });

          // Adaugă asociația la directAssociations[] pe user document
          const userRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userRef, {
            directAssociations: arrayUnion(docRef.id)
          });

          // Salvează datele de profil și în user doc (sursa de adevăr)
          if (tabData.profile) {
            const profileUpdate = {
              name: `${tabData.profile.firstName || ''} ${tabData.profile.lastName || ''}`.trim(),
              phone: tabData.profile.phone || '',
              avatarURL: tabData.profile.avatarURL || '',
              'profile.personalInfo.firstName': tabData.profile.firstName || '',
              'profile.personalInfo.lastName': tabData.profile.lastName || '',
              'profile.personalInfo.phone': tabData.profile.phone || '',
              'profile.personalInfo.address': {
                street: tabData.profile.address?.street || '',
                city: tabData.profile.address?.city || '',
                county: tabData.profile.address?.county || ''
              },
              'profile.professionalInfo.companyName': tabData.profile.professionalInfo?.companyName || '',
              'profile.professionalInfo.position': tabData.profile.professionalInfo?.position || 'Administrator asociație',
              'profile.professionalInfo.licenseNumber': tabData.profile.professionalInfo?.licenseNumber || ''
            };
            await updateDoc(userRef, profileUpdate);
            // Sync Firebase Auth displayName
            if (auth.currentUser) {
              await updateProfile(auth.currentUser, {
                displayName: profileUpdate.name
              });
            }
          }

          // 🎯 INIȚIALIZEAZĂ SISTEM DE SHEETS PENTRU NOUA ASOCIAȚIE
          try {
            await initializeMonths(associationToSave, docRef.id);
          } catch (sheetError) {
            console.error('❌ Error initializing sheet system:', sheetError);
            // Nu failăm întreaga operație pentru că asociația s-a creat cu succes
          }
        }

        // Marchează onboarding-ul ca fiind complet
        // Use nested location if associationId is set, otherwise root
        const onboardingRef = associationId
          ? doc(db, `associations/${associationId}/onboarding_progress`, currentUser.uid)
          : doc(db, 'onboarding_progress', currentUser.uid);

        await updateDoc(onboardingRef, {
          completed: true,
          completedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });

        // Marchează profilul ca având onboarding complet
        await completeOnboarding(currentUser.uid);

        return true;
      } catch (error) {
        console.error('❌ Error in completeOnboardingWithTabs:', error);
        throw error;
      }
    },
    validateCurrentStep,
    getOnboardingStats,
    startTutorial,
    stopTutorial,
    resetOnboarding
  };
};