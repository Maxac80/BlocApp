import { useMemo } from 'react';
import { useSubscription } from './useSubscription';

/**
 * 🔒 HOOK PENTRU READ-ONLY MODE
 *
 * Combină multiple surse pentru a determina dacă contextul curent este read-only:
 * 1. Subscription status (trial expirat, past_due, suspended)
 * 2. Association billing status (suspended)
 * 3. Organization billing status (suspended - afectează toate asociațiile)
 *
 * Returnează:
 * - isReadOnly: boolean - dacă modul read-only e activ
 * - readOnlyReason: string - motivul pentru care e read-only
 * - canEdit: boolean - poate edita (opusul lui isReadOnly)
 * - canPublish: boolean - poate publica sheet-uri
 * - canExportPdf: boolean - poate exporta PDF-uri
 * - canCreateAssociation: boolean - poate crea asociații noi
 */
export const useReadOnlyMode = (userId, association = null, organization = null, userRole = null) => {
  // Hook pentru subscription status
  const {
    status: subscriptionStatus,
    isTrialExpired,
    trialDaysRemaining,
    canEdit: subscriptionCanEdit,
    canPublish: subscriptionCanPublish,
    canExportPdf: subscriptionCanExportPdf,
    canCreateAssociation: subscriptionCanCreateAssociation,
    isReadOnly: subscriptionIsReadOnly,
    isBlocked: subscriptionIsBlocked
  } = useSubscription(userId);

  // Verifică dacă asociația e suspendată
  const associationSuspended = useMemo(() => {
    if (!association) return false;
    return association.billingStatus === 'suspended' || association.suspendedByOrganization === true;
  }, [association?.billingStatus, association?.suspendedByOrganization]);

  // Verifică dacă organizația e suspendată
  const organizationSuspended = useMemo(() => {
    if (!organization) return false;
    return organization.billingStatus === 'suspended';
  }, [organization?.billingStatus]);

  // Verifică dacă rolul utilizatorului e read-only (președinte/cenzor)
  const isRoleReadOnly = useMemo(() => {
    return userRole === 'assoc_president' || userRole === 'assoc_censor';
  }, [userRole]);

  const roleLabel = useMemo(() => {
    if (userRole === 'assoc_president') return 'Președinte';
    if (userRole === 'assoc_censor') return 'Cenzor';
    return null;
  }, [userRole]);

  // Determină starea finală read-only
  const readOnlyState = useMemo(() => {
    // Prioritate 1: Subscription blocat complet
    if (subscriptionIsBlocked) {
      return {
        isReadOnly: true,
        isBlocked: true,
        reason: subscriptionStatus === 'suspended'
          ? 'Contul tău este suspendat. Contactează suportul sau efectuează o plată.'
          : 'Contul tău a fost dezactivat.',
        source: 'subscription'
      };
    }

    // Prioritate 2: Subscription read-only (trial expirat / past_due)
    if (subscriptionIsReadOnly) {
      return {
        isReadOnly: true,
        isBlocked: false,
        reason: isTrialExpired
          ? 'Perioada de trial a expirat. Adaugă o metodă de plată pentru a continua să editezi.'
          : 'Contul tău este în modul read-only din cauza plăților restante.',
        source: 'subscription'
      };
    }

    // Prioritate 3: Rolul utilizatorului e read-only (președinte/cenzor)
    if (isRoleReadOnly) {
      return {
        isReadOnly: true,
        isBlocked: false,
        reason: `Ai acces de vizualizare ca ${roleLabel}. Doar administratorii pot edita datele.`,
        source: 'role'
      };
    }

    // Prioritate 4: Organizația e suspendată
    if (organizationSuspended) {
      return {
        isReadOnly: true,
        isBlocked: false,
        reason: 'Organizația a fost suspendată. Toate asociațiile din organizație sunt read-only.',
        source: 'organization'
      };
    }

    // Prioritate 4: Asociația e suspendată
    if (associationSuspended) {
      return {
        isReadOnly: true,
        isBlocked: false,
        reason: association?.suspendedByOrganization
          ? 'Această asociație este suspendată deoarece organizația a fost suspendată.'
          : 'Această asociație a fost suspendată. Reactivează-o pentru a putea edita.',
        source: 'association'
      };
    }

    // Nu e read-only
    return {
      isReadOnly: false,
      isBlocked: false,
      reason: null,
      source: null
    };
  }, [
    subscriptionIsBlocked,
    subscriptionIsReadOnly,
    subscriptionStatus,
    isTrialExpired,
    isRoleReadOnly,
    roleLabel,
    organizationSuspended,
    associationSuspended,
    association?.suspendedByOrganization
  ]);

  // Permisiuni finale
  const permissions = useMemo(() => {
    if (readOnlyState.isBlocked) {
      return {
        canEdit: false,
        canPublish: false,
        canExportPdf: false,
        canCreateAssociation: false,
        canViewData: false
      };
    }

    if (readOnlyState.isReadOnly) {
      return {
        canEdit: false,
        canPublish: false,
        canExportPdf: false,
        canCreateAssociation: false,
        canViewData: true
      };
    }

    // Nu e read-only, dar verifică permisiunile din subscription
    return {
      canEdit: subscriptionCanEdit,
      canPublish: subscriptionCanPublish,
      canExportPdf: subscriptionCanExportPdf,
      canCreateAssociation: subscriptionCanCreateAssociation,
      canViewData: true
    };
  }, [
    readOnlyState.isBlocked,
    readOnlyState.isReadOnly,
    subscriptionCanEdit,
    subscriptionCanPublish,
    subscriptionCanExportPdf,
    subscriptionCanCreateAssociation
  ]);

  return {
    // Read-only state
    isReadOnly: readOnlyState.isReadOnly,
    isBlocked: readOnlyState.isBlocked,
    readOnlyReason: readOnlyState.reason,
    readOnlySource: readOnlyState.source,

    // Permissions
    ...permissions,

    // Subscription info (pentru UI)
    subscriptionStatus,
    isTrialExpired,
    trialDaysRemaining,

    // Source states (pentru debugging/UI specific)
    associationSuspended,
    organizationSuspended,
    subscriptionIsReadOnly,
    subscriptionIsBlocked
  };
};

/**
 * Hook simplificat pentru verificare rapidă în componente
 * Folosește context-ul curent (association/organization din props sau context)
 */
export const useCanEdit = (userId, association = null, organization = null) => {
  const { canEdit, isReadOnly, readOnlyReason } = useReadOnlyMode(userId, association, organization);

  return {
    canEdit,
    isReadOnly,
    reason: readOnlyReason
  };
};

/**
 * Hook pentru a verifica dacă se poate publica
 */
export const useCanPublish = (userId, association = null, organization = null) => {
  const { canPublish, isReadOnly, readOnlyReason } = useReadOnlyMode(userId, association, organization);

  return {
    canPublish,
    isReadOnly,
    reason: readOnlyReason
  };
};

export default useReadOnlyMode;
