import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Creăm contextul
const AuthContext = createContext();

// Hook pentru a folosi contextul
export function useAuth() {
  return useContext(AuthContext);
}

/**
 * 🔐 AUTH CONTEXT PROVIDER (v2.0)
 *
 * Funcționalități noi:
 * - Context switching între organizații și asociații directe
 * - Încărcare automată a organizațiilor și asociațiilor utilizatorului
 * - Role-based access în funcție de context curent
 *
 * Context types:
 * - 'organization': User lucrează în contextul unei firme
 * - 'association': User lucrează în contextul unei asociații directe
 * - null: Niciun context selectat (afișează ContextSelectorView)
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // 🆕 STATE PENTRU CONTEXT SWITCHING
  const [currentContext, setCurrentContext] = useState(null);
  // currentContext = { type: 'organization' | 'association', id: string, data: object, role: string }

  const [userOrganizations, setUserOrganizations] = useState([]);
  const [userDirectAssociations, setUserDirectAssociations] = useState([]);
  const [contextsLoading, setContextsLoading] = useState(false);

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

  // 🆕 ÎNCĂRCARE ORGANIZAȚII ȘI ASOCIAȚII DIRECTE
  const loadUserContexts = useCallback(async (userId) => {
    if (!userId) {
      setUserOrganizations([]);
      setUserDirectAssociations([]);
      return;
    }

    setContextsLoading(true);

    try {
      // Încarcă datele utilizatorului pentru organizations[] și directAssociations[]
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (!userDoc.exists()) {
        setUserOrganizations([]);
        setUserDirectAssociations([]);
        return;
      }

      const userData = userDoc.data();

      // Încarcă organizațiile cu date complete
      const orgs = [];
      if (userData.organizations && userData.organizations.length > 0) {
        for (const orgRef of userData.organizations) {
          try {
            const orgDoc = await getDoc(doc(db, 'organizations', orgRef.id));
            if (orgDoc.exists()) {
              orgs.push({
                id: orgRef.id,
                userRole: orgRef.role,
                joinedAt: orgRef.joinedAt,
                ...orgDoc.data()
              });
            }
          } catch (err) {
            console.error(`Error loading org ${orgRef.id}:`, err);
          }
        }
      }
      setUserOrganizations(orgs);

      // Încarcă asociațiile directe cu date complete
      const assocs = [];
      if (userData.directAssociations && userData.directAssociations.length > 0) {
        for (const assocId of userData.directAssociations) {
          try {
            const assocDoc = await getDoc(doc(db, 'associations', assocId));
            if (assocDoc.exists()) {
              assocs.push({
                id: assocId,
                ...assocDoc.data()
              });
            }
          } catch (err) {
            console.error(`Error loading assoc ${assocId}:`, err);
          }
        }
      }
      setUserDirectAssociations(assocs);
    } catch (err) {
      console.error('Error loading user contexts:', err);
    } finally {
      setContextsLoading(false);
    }
  }, []);

  // 🆕 SELECTARE CONTEXT ORGANIZAȚIE
  const selectOrganization = useCallback(async (organization) => {
    if (!organization) {
      setCurrentContext(null);
      localStorage.removeItem('blocapp_context');
      return;
    }

    const role = organization.userRole ||
      userProfile?.organizations?.find(o => o.id === organization.id)?.role ||
      'org_member';

    const context = {
      type: 'organization',
      id: organization.id,
      data: organization,
      role
    };

    setCurrentContext(context);

    // Persistă în localStorage pentru reload
    localStorage.setItem('blocapp_context', JSON.stringify({
      type: 'organization',
      id: organization.id
    }));
  }, [userProfile]);

  // 🆕 SELECTARE CONTEXT ASOCIAȚIE DIRECTĂ
  const selectDirectAssociation = useCallback(async (association) => {
    if (!association) {
      setCurrentContext(null);
      localStorage.removeItem('blocapp_context');
      return;
    }

    const context = {
      type: 'association',
      id: association.id,
      data: association,
      role: 'assoc_admin' // Admin pentru asociații directe
    };

    setCurrentContext(context);

    // Persistă în localStorage pentru reload
    localStorage.setItem('blocapp_context', JSON.stringify({
      type: 'association',
      id: association.id
    }));
  }, []);

  // 🆕 CLEAR CONTEXT (back to selector)
  const clearContext = useCallback(() => {
    setCurrentContext(null);
    localStorage.removeItem('blocapp_context');
  }, []);

  // 🆕 RESTAURARE CONTEXT DIN localStorage
  const restoreContext = useCallback(async () => {
    const saved = localStorage.getItem('blocapp_context');
    if (!saved) return;

    try {
      const { type, id } = JSON.parse(saved);

      if (type === 'organization') {
        const org = userOrganizations.find(o => o.id === id);
        if (org) {
          selectOrganization(org);
        } else {
          localStorage.removeItem('blocapp_context');
        }
      } else if (type === 'association') {
        const assoc = userDirectAssociations.find(a => a.id === id);
        if (assoc) {
          selectDirectAssociation(assoc);
        } else {
          localStorage.removeItem('blocapp_context');
        }
      }
    } catch (err) {
      localStorage.removeItem('blocapp_context');
    }
  }, [userOrganizations, userDirectAssociations, selectOrganization, selectDirectAssociation]);

  // 🆕 VERIFICĂRI ROL ÎN CONTEXT CURENT
  const isOrgOwner = useCallback(() => {
    return currentContext?.type === 'organization' && currentContext?.role === 'org_owner';
  }, [currentContext]);

  const isOrgAdmin = useCallback(() => {
    return currentContext?.type === 'organization' &&
      (currentContext?.role === 'org_owner' || currentContext?.role === 'org_admin');
  }, [currentContext]);

  const isOrgMember = useCallback(() => {
    return currentContext?.type === 'organization' && currentContext?.role === 'org_member';
  }, [currentContext]);

  const isDirectAssocAdmin = useCallback(() => {
    return currentContext?.type === 'association';
  }, [currentContext]);

  // 🆕 VERIFICĂ DACĂ ARE ACCES LA ORGANIZAȚIE
  const hasOrgAccess = useCallback((orgId) => {
    return userOrganizations.some(o => o.id === orgId);
  }, [userOrganizations]);

  // 🆕 VERIFICĂ DACĂ ARE ACCES LA ASOCIAȚIE
  const hasAssocAccess = useCallback((assocId) => {
    // Are acces direct
    if (userDirectAssociations.some(a => a.id === assocId)) return true;

    // Are acces prin organizație (trebuie verificat dacă e alocat)
    // Acest lucru ar necesita date suplimentare din context
    return false;
  }, [userDirectAssociations]);

  // 🆕 OBȚINE ROLUL ÎN CONTEXTUL CURENT
  const getCurrentRole = useCallback(() => {
    return currentContext?.role || null;
  }, [currentContext]);

  // Effect pentru a urmări schimbările de autentificare
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Încarcă profilul cu un mic delay pentru a lăsa timp Firestore să salveze
        setTimeout(async () => {
          await loadUserProfile(user);
          await loadUserContexts(user.uid);
          setLoading(false);
        }, 500);
      } else {
        setUserProfile(null);
        setUserOrganizations([]);
        setUserDirectAssociations([]);
        setCurrentContext(null);
        localStorage.removeItem('blocapp_context');
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [loadUserContexts]);

  // 🆕 Effect pentru restaurare context după încărcare
  useEffect(() => {
    if (!contextsLoading && (userOrganizations.length > 0 || userDirectAssociations.length > 0)) {
      restoreContext();
    }
  }, [contextsLoading, userOrganizations, userDirectAssociations, restoreContext]);

  const value = {
    // Auth state
    user: currentUser,
    currentUser,
    userProfile,
    loading,

    // Auth actions
    register,
    login,
    logout,
    signup: register, // Alias pentru register

    // 🆕 Context switching
    currentContext,
    contextsLoading,
    userOrganizations,
    userDirectAssociations,
    selectOrganization,
    selectDirectAssociation,
    clearContext,
    loadUserContexts,

    // Legacy role checks (păstrate pentru backward compatibility)
    isSuperAdmin,
    isAdminAsociatie,
    isPresedinte,
    isCenzor,
    isProprietar,
    canAdminister,
    canReview,
    canManage,

    // 🆕 New role checks (context-aware)
    isOrgOwner,
    isOrgAdmin,
    isOrgMember,
    isDirectAssocAdmin,
    hasOrgAccess,
    hasAssocAccess,
    getCurrentRole,

    // 🆕 Helper pentru verificare dacă trebuie afișat context selector
    needsContextSelection: () => {
      if (loading || contextsLoading) return false;
      if (!currentUser) return false;
      // Super admin nu are nevoie de context selection
      if (userProfile?.role === 'super_admin') return false;
      // Dacă nu are nici organizații, nici asociații directe → onboarding
      if (userOrganizations.length === 0 && userDirectAssociations.length === 0) return false;
      // Dacă nu are context selectat → arată selector
      return !currentContext;
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}