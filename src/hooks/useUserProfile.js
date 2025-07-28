import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { updateProfile, updateEmail, sendEmailVerification } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { useSecurity } from './useSecurity';

/**
 * 👤 HOOK PENTRU GESTIONAREA AVANSATĂ A PROFILULUI UTILIZATOR
 * 
 * Funcționalități:
 * - Profil complet cu date personale
 * - Upload documente (CI, contract administrare, certificat cursuri)
 * - Avatar upload și management
 * - Setări avansate (limba, timezone, notificări)
 * - Istoric modificări profil
 * - Export date GDPR
 */
export const useUserProfile = () => {
  const { logActivity } = useSecurity();
  
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [profileCompletion, setProfileCompletion] = useState(0);

  // 📋 STRUCTURA COMPLETĂ PROFIL
  const defaultProfileStructure = {
    // Date personale
    personalInfo: {
      firstName: '',
      lastName: '',
      cnp: '',
      phone: '',
      address: {
        street: '',
        number: '',
        building: '',
        apartment: '',
        city: '',
        county: '',
        zipCode: ''
      },
      birthDate: '',
      gender: ''
    },
    
    // Date profesionale
    professionalInfo: {
      companyName: '',
      position: '',
      experience: '',
      certifications: [],
      licenseNumber: ''
    },
    
    // Documente
    documents: {
      idCard: {
        uploaded: false,
        fileName: '',
        url: '',
        uploadDate: null,
        verified: false
      },
      adminContract: {
        uploaded: false,
        fileName: '',
        url: '',
        uploadDate: null,
        verified: false
      },
      certifications: {
        uploaded: false,
        fileName: '',
        url: '',
        uploadDate: null,
        verified: false
      },
      avatar: {
        uploaded: false,
        fileName: '',
        url: '',
        uploadDate: null
      }
    },
    
    // Setări aplicație
    settings: {
      language: 'ro',
      timezone: 'Europe/Bucharest',
      dateFormat: 'dd/MM/yyyy',
      currency: 'RON',
      notifications: {
        email: {
          maintenanceUpdates: true,
          paymentReminders: true,
          systemUpdates: true,
          securityAlerts: true,
          newMessages: true
        },
        sms: {
          urgentAlerts: true,
          paymentDue: false,
          securityAlerts: true
        },
        push: {
          realTimeUpdates: true,
          dailySummary: false,
          weeklyReports: true
        }
      },
      privacy: {
        shareDataWithAssociations: true,
        allowMarketingEmails: false,
        twoFactorAuth: false
      }
    },
    
    // Metadata
    metadata: {
      profileVersion: '1.0',
      lastUpdated: null,
      createdAt: null,
      completionPercentage: 0,
      onboardingCompleted: false,
      emailVerified: false,
      documentsVerified: false
    }
  };

  // 📊 CALCULARE PROGRES COMPLETARE PROFIL
  const calculateProfileCompletion = (profile) => {
    let totalFields = 0;
    let completedFields = 0;
    
    // Verifică date personale (40% din total)
    const personalFields = [
      'firstName', 'lastName', 'cnp', 'phone', 
      'address.street', 'address.city', 'address.county'
    ];
    
    personalFields.forEach(field => {
      totalFields += 4; // Weighting pentru importanță
      if (getNestedValue(profile.personalInfo, field)) completedFields += 4;
    });
    
    // Verifică documente (40% din total)
    const documentFields = ['idCard', 'adminContract'];
    documentFields.forEach(field => {
      totalFields += 4;
      if (profile.documents[field]?.uploaded) completedFields += 4;
    });
    
    // Verifică date profesionale (20% din total)
    const professionalFields = ['companyName', 'position'];
    professionalFields.forEach(field => {
      totalFields += 2;
      if (profile.professionalInfo[field]) completedFields += 2;
    });
    
    const percentage = Math.round((completedFields / totalFields) * 100);
    return Math.min(percentage, 100);
  };

  // 🔍 HELPER PENTRU ACCESARE VALORI NESTED
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // 📥 ÎNCĂRCARE PROFIL COMPLET
  const loadUserProfile = async (userId) => {
    if (!userId) return null;
    
    setProfileLoading(true);
    try {
      const profileRef = doc(db, 'user_profiles', userId);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        const existingProfile = profileDoc.data();
        // Merge cu structura default pentru a adăuga câmpuri noi
        const mergedProfile = mergeWithDefault(existingProfile, defaultProfileStructure);
        const completion = calculateProfileCompletion(mergedProfile);
        
        setProfileData(mergedProfile);
        setProfileCompletion(completion);
        
        return mergedProfile;
      } else {
        // Creează profil nou cu structura default
        const newProfile = {
          ...defaultProfileStructure,
          metadata: {
            ...defaultProfileStructure.metadata,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }
        };
        
        await setDoc(profileRef, newProfile);
        setProfileData(newProfile);
        setProfileCompletion(0);
        
        await logActivity(userId, 'PROFILE_CREATED', {
          profileVersion: newProfile.metadata.profileVersion
        });
        
        return newProfile;
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  // 🔄 MERGE CU STRUCTURA DEFAULT
  const mergeWithDefault = (existing, defaultStructure) => {
    const merged = { ...defaultStructure };
    
    Object.keys(existing).forEach(key => {
      if (typeof existing[key] === 'object' && !Array.isArray(existing[key])) {
        merged[key] = { ...merged[key], ...existing[key] };
      } else {
        merged[key] = existing[key];
      }
    });
    
    return merged;
  };

  // 💾 ACTUALIZARE PROFIL
  const updateUserProfile = async (userId, updates, section = null) => {
    if (!userId || !profileData) return false;
    
    try {
      const profileRef = doc(db, 'user_profiles', userId);
      
      let updatedProfile;
      if (section) {
        // Update specific section
        updatedProfile = {
          ...profileData,
          [section]: { ...profileData[section], ...updates },
          metadata: {
            ...profileData.metadata,
            lastUpdated: new Date().toISOString()
          }
        };
      } else {
        // Update entire profile
        updatedProfile = {
          ...profileData,
          ...updates,
          metadata: {
            ...profileData.metadata,
            lastUpdated: new Date().toISOString()
          }
        };
      }
      
      // Calculează completion nou
      const newCompletion = calculateProfileCompletion(updatedProfile);
      updatedProfile.metadata.completionPercentage = newCompletion;
      
      await updateDoc(profileRef, updatedProfile);
      setProfileData(updatedProfile);
      setProfileCompletion(newCompletion);
      
      // Log modificarea
      await logActivity(userId, 'PROFILE_UPDATED', {
        section: section || 'full_profile',
        completionPercentage: newCompletion,
        fieldsUpdated: Object.keys(updates)
      });
      
      // Update și Firebase Auth profile dacă e necesar
      if (updates.firstName || updates.lastName) {
        const displayName = `${updatedProfile.personalInfo.firstName} ${updatedProfile.personalInfo.lastName}`.trim();
        await updateProfile(auth.currentUser, { displayName });
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      return false;
    }
  };

  // 📤 UPLOAD DOCUMENT
  const uploadDocument = async (userId, file, documentType) => {
    if (!file || !userId) return null;
    
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tip fișier neacceptat. Folosește PDF, JPG sau PNG.');
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Fișierul este prea mare. Dimensiunea maximă este 5MB.');
    }
    
    try {
      setUploadProgress(prev => ({ ...prev, [documentType]: 0 }));
      
      // Șterge documentul vechi dacă există
      if (profileData.documents[documentType]?.url) {
        await deleteDocument(userId, documentType);
      }
      
      // Upload nou fișier
      const timestamp = Date.now();
      const fileName = `${documentType}_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `documents/${userId}/${fileName}`);
      
      setUploadProgress(prev => ({ ...prev, [documentType]: 50 }));
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setUploadProgress(prev => ({ ...prev, [documentType]: 90 }));
      
      // Update profil cu informațiile documentului
      const documentUpdate = {
        [`documents.${documentType}`]: {
          uploaded: true,
          fileName: file.name,
          url: downloadURL,
          uploadDate: new Date().toISOString(),
          verified: false,
          size: file.size,
          type: file.type
        }
      };
      
      await updateUserProfile(userId, documentUpdate);
      
      setUploadProgress(prev => ({ ...prev, [documentType]: 100 }));
      
      await logActivity(userId, 'DOCUMENT_UPLOADED', {
        documentType,
        fileName: file.name,
        size: file.size
      });
      
      // Șterge progress după 2 secunde
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[documentType];
          return newProgress;
        });
      }, 2000);
      
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading document:', error);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[documentType];
        return newProgress;
      });
      throw error;
    }
  };

  // 🗑️ ȘTERGERE DOCUMENT
  const deleteDocument = async (userId, documentType) => {
    if (!profileData.documents[documentType]?.url) return;
    
    try {
      // Șterge din storage
      const storageRef = ref(storage, profileData.documents[documentType].url);
      await deleteObject(storageRef);
      
      // Update profil
      const documentUpdate = {
        [`documents.${documentType}`]: {
          uploaded: false,
          fileName: '',
          url: '',
          uploadDate: null,
          verified: false
        }
      };
      
      await updateUserProfile(userId, documentUpdate);
      
      await logActivity(userId, 'DOCUMENT_DELETED', {
        documentType
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      return false;
    }
  };

  // 📧 UPDATE EMAIL CU VERIFICARE
  const updateUserEmail = async (newEmail) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Nu există utilizator autentificat');
      
      await updateEmail(user, newEmail);
      await sendEmailVerification(user);
      
      // Update profil
      await updateUserProfile(user.uid, {
        'metadata.emailVerified': false
      });
      
      await logActivity(user.uid, 'EMAIL_UPDATED', {
        oldEmail: user.email,
        newEmail: newEmail
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error updating email:', error);
      throw error;
    }
  };

  // 📊 EXPORT DATE GDPR
  const exportUserData = async (userId) => {
    try {
      const userData = {
        profile: profileData,
        exportDate: new Date().toISOString(),
        exportType: 'GDPR_REQUEST'
      };
      
      await logActivity(userId, 'DATA_EXPORT_REQUESTED', {
        exportType: 'GDPR'
      });
      
      return userData;
    } catch (error) {
      console.error('❌ Error exporting user data:', error);
      throw error;
    }
  };

  // 🎯 VERIFICARE DACĂ PROFILUL ESTE COMPLET
  const isProfileComplete = () => {
    return profileCompletion >= 80; // 80% completion required
  };

  // ✅ MARCARE ONBOARDING COMPLET
  const completeOnboarding = async (userId) => {
    try {
      // Actualizează în profilul extins
      await updateUserProfile(userId, {
        'metadata.onboardingCompleted': true
      });
      
      // Actualizează și în documentul principal users pentru compatibilitate
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        needsOnboarding: false,
        onboardingCompletedAt: new Date().toISOString()
      });
      
      await logActivity(userId, 'ONBOARDING_COMPLETED', {
        completionPercentage: profileCompletion
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      return false;
    }
  };

  return {
    // State
    profileData,
    profileLoading,
    uploadProgress,
    profileCompletion,
    
    // Functions
    loadUserProfile,
    updateUserProfile,
    uploadDocument,
    deleteDocument,
    updateUserEmail,
    exportUserData,
    isProfileComplete,
    completeOnboarding,
    calculateProfileCompletion,
    
    // Helpers
    defaultProfileStructure
  };
};