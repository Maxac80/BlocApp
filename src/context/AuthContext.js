import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Creăm contextul
const AuthContext = createContext();

// Hook pentru a folosi contextul
export function useAuth() {
  return useContext(AuthContext);
}

// Provider-ul care înfășoară toată aplicația
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // Înregistrare utilizator nou - FĂRĂ organizationName
async function register(email, password, userData) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Actualizează profilul utilizatorului
    await updateProfile(user, {
      displayName: userData.name
    });

    // Determină rolul (implicit administrator asociație)
    const userRole = userData.role || 'admin_asociatie';

    // Salvează datele în Firestore
    const userProfileData = {
      email: email,
      name: userData.name,
      role: userRole,
      subscriptionStatus: userRole === 'admin_asociatie' ? 'trial' : null,
      createdAt: new Date().toISOString(),
      isActive: true
    };
    
    await setDoc(doc(db, 'users', user.uid), userProfileData);

    // ✅ ÎNCARCĂ IMEDIAT PROFILUL DUPĂ CREARE
    setUserProfile(userProfileData);
    // console.log('✅ Utilizator înregistrat și profil încărcat:', userProfileData);

    return user;
  } catch (error) {
    throw error;
  }
}

  // Login
  async function login(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Logout
  async function logout() {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      throw error;
    }
  }

  // Încarcă profilul utilizatorului din Firestore
  async function loadUserProfile(user) {
    if (!user) {
      setUserProfile(null);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const profileData = userDoc.data();
        setUserProfile(profileData);
        // console.log('✅ Profil utilizator încărcat:', profileData);
      } else {
        // console.log('❌ Nu s-a găsit profil pentru utilizator');
        setUserProfile(null);
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      setUserProfile(null);
    }
  }

  // Verifică dacă utilizatorul e super admin (tu)
  function isSuperAdmin() {
    return userProfile?.role === 'super_admin';
  }

  // Verifică dacă utilizatorul e administrator asociație (clientul)
  function isAdminAsociatie() {
    return userProfile?.role === 'admin_asociatie';
  }

  // Verifică dacă utilizatorul e președinte (revizor 1)
  function isPresedinte() {
    return userProfile?.role === 'presedinte';
  }

  // Verifică dacă utilizatorul e cenzor (revizor 2)
  function isCenzor() {
    return userProfile?.role === 'cenzor';
  }

  // Verifică dacă utilizatorul e proprietar
  function isProprietar() {
    return userProfile?.role === 'proprietar';
  }

  // Verifică dacă are acces la administrare (super admin sau admin asociație)
  function canAdminister() {
    return isSuperAdmin() || isAdminAsociatie();
  }

  // Verifică dacă poate revizui (președinte sau cenzor)
  function canReview() {
    return isPresedinte() || isCenzor();
  }

  // Verifică dacă are acces la gestionare (admin, președinte, cenzor)
  function canManage() {
    return canAdminister() || canReview();
  }

  // Effect pentru a urmări schimbările de autentificare
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    // console.log('🔄 Auth state changed:', user ? user.uid : 'No user');
    setCurrentUser(user);
    
    if (user) {
      // Încarcă profilul cu un mic delay pentru a lăsa timp Firestore să salveze
      setTimeout(async () => {
        await loadUserProfile(user);
        setLoading(false);
      }, 500);
    } else {
      setUserProfile(null);
      setLoading(false);
    }
  });

  return unsubscribe;
}, []);

  const value = {
    user: currentUser,
    currentUser,
    userProfile,
    loading,
    register,
    login,
    logout,
    isSuperAdmin,
    isAdminAsociatie,
    isPresedinte,
    isCenzor,
    isProprietar,
    canAdminister,
    canReview,
    canManage
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}