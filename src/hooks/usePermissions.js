import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * 🔐 SISTEM CENTRALIZAT DE PERMISIUNI
 *
 * Determină ce acțiuni poate face un utilizator bazat pe:
 * - Rolul global (user, master)
 * - Rolul în organizație (org_owner, org_admin, org_member)
 * - Rolul în asociație (assoc_admin, assoc_president, assoc_censor, assoc_owner)
 *
 * Matricea de permisiuni:
 * https://docs.google.com/spreadsheets/d/... (din ARCHITECTURE_USERS_ROLES.md)
 */

// 📋 LISTA COMPLETĂ DE PERMISIUNI
export const PERMISSIONS = {
  // === ORGANIZATION LEVEL ===
  ORG_CREATE: 'org.create',
  ORG_DELETE: 'org.delete',
  ORG_EDIT: 'org.edit',
  ORG_VIEW: 'org.view',
  ORG_INVITE_MEMBERS: 'org.invite_members',
  ORG_MANAGE_MEMBERS: 'org.manage_members',
  ORG_ALLOCATE_ASSOCIATIONS: 'org.allocate_associations',
  ORG_VIEW_BILLING: 'org.view_billing',
  ORG_MANAGE_BILLING: 'org.manage_billing',
  ORG_TRANSFER_FOUNDER: 'org.transfer_founder',

  // === ASSOCIATION LEVEL ===
  ASSOC_CREATE: 'assoc.create',
  ASSOC_DELETE: 'assoc.delete',
  ASSOC_EDIT: 'assoc.edit',
  ASSOC_VIEW: 'assoc.view',
  ASSOC_MANAGE_APARTMENTS: 'assoc.manage_apartments',
  ASSOC_MANAGE_EXPENSES: 'assoc.manage_expenses',
  ASSOC_CREATE_SHEET: 'assoc.create_sheet',
  ASSOC_EDIT_SHEET: 'assoc.edit_sheet',
  ASSOC_PUBLISH_SHEET: 'assoc.publish_sheet',
  ASSOC_VIEW_SHEET: 'assoc.view_sheet',
  ASSOC_VIEW_HISTORY: 'assoc.view_history',
  ASSOC_VIEW_AUDIT: 'assoc.view_audit',
  ASSOC_EXPORT_REPORTS: 'assoc.export_reports',
  ASSOC_INVITE_OWNERS: 'assoc.invite_owners',
  ASSOC_MANAGE_OWNERS: 'assoc.manage_owners',
  ASSOC_MANAGE_PRESIDENT_CENSOR: 'assoc.manage_president_censor',
  ASSOC_VIEW_PAYMENTS: 'assoc.view_payments',
  ASSOC_RECORD_PAYMENTS: 'assoc.record_payments',
  ASSOC_MANAGE_SETTINGS: 'assoc.manage_settings',
  ASSOC_VIEW_BILLING: 'assoc.view_billing',
  ASSOC_MANAGE_BILLING: 'assoc.manage_billing',

  // === OWNER LEVEL ===
  OWNER_VIEW_OWN_DATA: 'owner.view_own_data',
  OWNER_VIEW_OWN_PAYMENTS: 'owner.view_own_payments',
  OWNER_SUBMIT_METERS: 'owner.submit_meters',
  OWNER_VIEW_HISTORY: 'owner.view_history'
};

// 📊 MATRICEA DE PERMISIUNI PER ROL
const PERMISSION_MATRIX = {
  // Master - toate permisiunile (owner BlocApp)
  master: Object.values(PERMISSIONS),

  // Organization Owner - gestiune completă organizație + asociații din org
  org_owner: [
    PERMISSIONS.ORG_DELETE,
    PERMISSIONS.ORG_EDIT,
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ORG_INVITE_MEMBERS,
    PERMISSIONS.ORG_MANAGE_MEMBERS,
    PERMISSIONS.ORG_ALLOCATE_ASSOCIATIONS,
    PERMISSIONS.ORG_VIEW_BILLING,
    PERMISSIONS.ORG_MANAGE_BILLING,
    PERMISSIONS.ORG_TRANSFER_FOUNDER,
    PERMISSIONS.ASSOC_CREATE,
    PERMISSIONS.ASSOC_DELETE,
    PERMISSIONS.ASSOC_EDIT,
    PERMISSIONS.ASSOC_VIEW,
    PERMISSIONS.ASSOC_MANAGE_APARTMENTS,
    PERMISSIONS.ASSOC_MANAGE_EXPENSES,
    PERMISSIONS.ASSOC_CREATE_SHEET,
    PERMISSIONS.ASSOC_EDIT_SHEET,
    PERMISSIONS.ASSOC_PUBLISH_SHEET,
    PERMISSIONS.ASSOC_VIEW_SHEET,
    PERMISSIONS.ASSOC_VIEW_HISTORY,
    PERMISSIONS.ASSOC_VIEW_AUDIT,
    PERMISSIONS.ASSOC_EXPORT_REPORTS,
    PERMISSIONS.ASSOC_INVITE_OWNERS,
    PERMISSIONS.ASSOC_MANAGE_OWNERS,
    PERMISSIONS.ASSOC_MANAGE_PRESIDENT_CENSOR,
    PERMISSIONS.ASSOC_VIEW_PAYMENTS,
    PERMISSIONS.ASSOC_RECORD_PAYMENTS,
    PERMISSIONS.ASSOC_MANAGE_SETTINGS,
    PERMISSIONS.ASSOC_VIEW_BILLING,
    PERMISSIONS.ASSOC_MANAGE_BILLING
  ],

  // Organization Admin - gestiune asociații alocate
  org_admin: [
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ASSOC_EDIT,
    PERMISSIONS.ASSOC_VIEW,
    PERMISSIONS.ASSOC_MANAGE_APARTMENTS,
    PERMISSIONS.ASSOC_MANAGE_EXPENSES,
    PERMISSIONS.ASSOC_CREATE_SHEET,
    PERMISSIONS.ASSOC_EDIT_SHEET,
    PERMISSIONS.ASSOC_PUBLISH_SHEET,
    PERMISSIONS.ASSOC_VIEW_SHEET,
    PERMISSIONS.ASSOC_VIEW_HISTORY,
    PERMISSIONS.ASSOC_VIEW_AUDIT,
    PERMISSIONS.ASSOC_EXPORT_REPORTS,
    PERMISSIONS.ASSOC_INVITE_OWNERS,
    PERMISSIONS.ASSOC_MANAGE_OWNERS,
    PERMISSIONS.ASSOC_VIEW_PAYMENTS,
    PERMISSIONS.ASSOC_RECORD_PAYMENTS,
    PERMISSIONS.ASSOC_MANAGE_SETTINGS
  ],

  // Organization Member - acces limitat la asociații alocate
  org_member: [
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ASSOC_VIEW,
    PERMISSIONS.ASSOC_VIEW_SHEET,
    PERMISSIONS.ASSOC_VIEW_HISTORY,
    PERMISSIONS.ASSOC_EXPORT_REPORTS,
    PERMISSIONS.ASSOC_VIEW_PAYMENTS
  ],

  // Association Admin (direct, fără firmă) - gestiune completă asociație
  assoc_admin: [
    PERMISSIONS.ASSOC_CREATE,
    PERMISSIONS.ASSOC_DELETE,
    PERMISSIONS.ASSOC_EDIT,
    PERMISSIONS.ASSOC_VIEW,
    PERMISSIONS.ASSOC_MANAGE_APARTMENTS,
    PERMISSIONS.ASSOC_MANAGE_EXPENSES,
    PERMISSIONS.ASSOC_CREATE_SHEET,
    PERMISSIONS.ASSOC_EDIT_SHEET,
    PERMISSIONS.ASSOC_PUBLISH_SHEET,
    PERMISSIONS.ASSOC_VIEW_SHEET,
    PERMISSIONS.ASSOC_VIEW_HISTORY,
    PERMISSIONS.ASSOC_VIEW_AUDIT,
    PERMISSIONS.ASSOC_EXPORT_REPORTS,
    PERMISSIONS.ASSOC_INVITE_OWNERS,
    PERMISSIONS.ASSOC_MANAGE_OWNERS,
    PERMISSIONS.ASSOC_MANAGE_PRESIDENT_CENSOR,
    PERMISSIONS.ASSOC_VIEW_PAYMENTS,
    PERMISSIONS.ASSOC_RECORD_PAYMENTS,
    PERMISSIONS.ASSOC_MANAGE_SETTINGS,
    PERMISSIONS.ASSOC_VIEW_BILLING,
    PERMISSIONS.ASSOC_MANAGE_BILLING
  ],

  // Președinte - vizualizare + aprobare (fără editare)
  assoc_president: [
    PERMISSIONS.ASSOC_VIEW,
    PERMISSIONS.ASSOC_VIEW_SHEET,
    PERMISSIONS.ASSOC_VIEW_HISTORY,
    PERMISSIONS.ASSOC_VIEW_AUDIT,
    PERMISSIONS.ASSOC_EXPORT_REPORTS,
    PERMISSIONS.ASSOC_VIEW_PAYMENTS
    // Aprobare sheet se gestionează separat prin workflow
  ],

  // Cenzor - vizualizare + export rapoarte
  assoc_censor: [
    PERMISSIONS.ASSOC_VIEW,
    PERMISSIONS.ASSOC_VIEW_SHEET,
    PERMISSIONS.ASSOC_VIEW_HISTORY,
    PERMISSIONS.ASSOC_VIEW_AUDIT,
    PERMISSIONS.ASSOC_EXPORT_REPORTS,
    PERMISSIONS.ASSOC_VIEW_PAYMENTS
  ],

  // Proprietar - vizualizare date proprii
  assoc_owner: [
    PERMISSIONS.OWNER_VIEW_OWN_DATA,
    PERMISSIONS.OWNER_VIEW_OWN_PAYMENTS,
    PERMISSIONS.OWNER_SUBMIT_METERS,
    PERMISSIONS.OWNER_VIEW_HISTORY
  ],

  // User fără roluri - doar creare
  user: [
    PERMISSIONS.ORG_CREATE,
    PERMISSIONS.ASSOC_CREATE
  ]
};

/**
 * Hook principal pentru sistemul de permisiuni
 */
export const usePermissions = (userId = null) => {
  const [userPermissions, setUserPermissions] = useState([]);
  const [userRoles, setUserRoles] = useState({
    globalRole: 'user',
    organizationRoles: {}, // { orgId: 'org_owner' | 'org_admin' | 'org_member' }
    associationRoles: {}   // { assocId: 'assoc_admin' | 'assoc_president' | 'assoc_censor' | 'assoc_owner' }
  });
  const [loading, setLoading] = useState(false);

  // 📥 ÎNCARCĂ ROLURILE UTILIZATORULUI
  const loadUserRoles = useCallback(async (userIdToLoad) => {
    if (!userIdToLoad) {
      setUserRoles({
        globalRole: 'user',
        organizationRoles: {},
        associationRoles: {}
      });
      return;
    }

    setLoading(true);

    try {
      // Obține user document
      const userRef = doc(db, 'users', userIdToLoad);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setUserRoles({
          globalRole: 'user',
          organizationRoles: {},
          associationRoles: {}
        });
        return;
      }

      const userData = userDoc.data();
      const organizationRoles = {};
      const associationRoles = {};

      // Global role
      const globalRole = userData.role === 'master' ? 'master' : 'user';

      // Organization roles din user.organizations[]
      const userOrganizations = userData.organizations || [];
      for (const org of userOrganizations) {
        organizationRoles[org.id] = org.role;
      }

      // Association roles - verifică asociațiile directe
      const directAssociations = userData.directAssociations || [];
      for (const assocId of directAssociations) {
        // Verifică dacă user-ul este admin al asociației
        const assocRef = doc(db, 'associations', assocId);
        const assocDoc = await getDoc(assocRef);

        if (assocDoc.exists()) {
          const assocData = assocDoc.data();
          if (assocData.adminId === userIdToLoad) {
            associationRoles[assocId] = 'assoc_admin';
          }
        }
      }

      // Verifică și în associations.members pentru roluri de președinte/cenzor
      // Acest query poate fi optimizat în producție
      const presidentQuery = query(
        collection(db, 'associations'),
        where('president.userId', '==', userIdToLoad)
      );
      const presidentSnapshot = await getDocs(presidentQuery);
      presidentSnapshot.forEach(doc => {
        if (!associationRoles[doc.id]) {
          associationRoles[doc.id] = 'assoc_president';
        }
      });

      setUserRoles({
        globalRole,
        organizationRoles,
        associationRoles
      });

      // Calculează permisiunile bazate pe toate rolurile
      calculatePermissions(globalRole, organizationRoles, associationRoles);

    } catch (err) {
      console.error('❌ Error loading user roles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 📊 CALCULEAZĂ PERMISIUNILE DIN TOATE ROLURILE
  const calculatePermissions = (globalRole, orgRoles, assocRoles) => {
    const allPermissions = new Set();

    // Adaugă permisiunile de la rolul global
    const globalPermissions = PERMISSION_MATRIX[globalRole] || PERMISSION_MATRIX.user;
    globalPermissions.forEach(p => allPermissions.add(p));

    // Adaugă permisiunile de la rolurile din organizații
    Object.values(orgRoles).forEach(role => {
      const rolePermissions = PERMISSION_MATRIX[role] || [];
      rolePermissions.forEach(p => allPermissions.add(p));
    });

    // Adaugă permisiunile de la rolurile din asociații
    Object.values(assocRoles).forEach(role => {
      const rolePermissions = PERMISSION_MATRIX[role] || [];
      rolePermissions.forEach(p => allPermissions.add(p));
    });

    setUserPermissions(Array.from(allPermissions));
  };

  // ✅ VERIFICĂ DACĂ USER ARE O PERMISIUNE
  const hasPermission = useCallback((permission, context = {}) => {
    const { organizationId, associationId } = context;

    // Master are toate permisiunile
    if (userRoles.globalRole === 'master') {
      return true;
    }

    // Verifică permisiunea generală
    if (userPermissions.includes(permission)) {
      // Dacă nu e specificat context, returnează true
      if (!organizationId && !associationId) {
        return true;
      }

      // Verifică contextul organizației
      if (organizationId) {
        const orgRole = userRoles.organizationRoles[organizationId];
        if (orgRole) {
          const orgPermissions = PERMISSION_MATRIX[orgRole] || [];
          return orgPermissions.includes(permission);
        }
      }

      // Verifică contextul asociației
      if (associationId) {
        const assocRole = userRoles.associationRoles[associationId];
        if (assocRole) {
          const assocPermissions = PERMISSION_MATRIX[assocRole] || [];
          return assocPermissions.includes(permission);
        }

        // Verifică și prin organizație (dacă asociația e parte din org)
        // Acest check e mai complex și poate necesita un query suplimentar
      }
    }

    return false;
  }, [userPermissions, userRoles]);

  // 📊 OBȚINE TOATE PERMISIUNILE PENTRU UN CONTEXT
  const getPermissionsForContext = useCallback((context = {}) => {
    const { organizationId, associationId } = context;
    const contextPermissions = new Set();

    // Master are toate
    if (userRoles.globalRole === 'master') {
      return Object.values(PERMISSIONS);
    }

    // Adaugă permisiunile globale
    const globalPermissions = PERMISSION_MATRIX[userRoles.globalRole] || PERMISSION_MATRIX.user;
    globalPermissions.forEach(p => contextPermissions.add(p));

    // Adaugă permisiunile din organizație
    if (organizationId) {
      const orgRole = userRoles.organizationRoles[organizationId];
      if (orgRole) {
        const orgPermissions = PERMISSION_MATRIX[orgRole] || [];
        orgPermissions.forEach(p => contextPermissions.add(p));
      }
    }

    // Adaugă permisiunile din asociație
    if (associationId) {
      const assocRole = userRoles.associationRoles[associationId];
      if (assocRole) {
        const assocPermissions = PERMISSION_MATRIX[assocRole] || [];
        assocPermissions.forEach(p => contextPermissions.add(p));
      }
    }

    return Array.from(contextPermissions);
  }, [userRoles]);

  // 📊 VERIFICĂ DACĂ USER POATE ACCESA O RESURSĂ
  const canAccess = useCallback((resource, action, context = {}) => {
    const permission = `${resource}.${action}`;
    return hasPermission(permission, context);
  }, [hasPermission]);

  // 📊 OBȚINE ROLUL USER-ULUI ÎNTR-O ORGANIZAȚIE
  const getRoleInOrganization = useCallback((organizationId) => {
    if (!organizationId) return null;
    return userRoles.organizationRoles[organizationId] || null;
  }, [userRoles]);

  // 📊 OBȚINE ROLUL USER-ULUI ÎNTR-O ASOCIAȚIE
  const getRoleInAssociation = useCallback((associationId) => {
    if (!associationId) return null;
    return userRoles.associationRoles[associationId] || null;
  }, [userRoles]);

  // 📊 VERIFICĂ DACĂ USER E MASTER (owner BlocApp)
  const isMaster = useMemo(() => {
    return userRoles.globalRole === 'master';
  }, [userRoles]);

  // 📊 VERIFICĂ DACĂ USER E OWNER ÎN VREO ORGANIZAȚIE
  const isOrgOwner = useMemo(() => {
    return Object.values(userRoles.organizationRoles).some(role => role === 'org_owner');
  }, [userRoles]);

  // 📊 VERIFICĂ DACĂ USER ARE ACCES LA DASHBOARD GENERAL
  const hasAccessToDashboard = useMemo(() => {
    // Master, org owners, sau useri cu asociații directe
    return isMaster ||
           isOrgOwner ||
           Object.keys(userRoles.associationRoles).length > 0;
  }, [isMaster, isOrgOwner, userRoles]);

  // 🔄 EFFECT: Încarcă rolurile când userId se schimbă
  useEffect(() => {
    if (userId) {
      loadUserRoles(userId);
    } else {
      setUserPermissions([]);
      setUserRoles({
        globalRole: 'user',
        organizationRoles: {},
        associationRoles: {}
      });
    }
  }, [userId, loadUserRoles]);

  return {
    // State
    userPermissions,
    userRoles,
    loading,

    // Permission Checks
    hasPermission,
    canAccess,
    getPermissionsForContext,

    // Role Checks
    getRoleInOrganization,
    getRoleInAssociation,
    isMaster,
    isOrgOwner,
    hasAccessToDashboard,

    // Reload
    loadUserRoles,

    // Constants
    PERMISSIONS,
    PERMISSION_MATRIX
  };
};

// Export constante pentru utilizare în alte componente
export { PERMISSION_MATRIX };
