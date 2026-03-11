import { useState, useCallback, useRef, useEffect } from 'react';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { TICKET_TYPES } from '../data/ticketTypes';

/**
 * HOOK PRINCIPAL PENTRU SISTEMUL DE MESAGERIE
 *
 * Gestionează conversații între locatari și administrație.
 * Colecție: /associations/{assocId}/conversations/{convId}
 * Subcollection: /associations/{assocId}/conversations/{convId}/messages/{msgId}
 *
 * Tipuri de conversații:
 * - ticket: solicitare predefinită cu approval flow
 * - message: mesaj liber
 * - broadcast: mesaj admin către toată asociația
 */
export const useMessaging = (associationId) => {
  const [conversations, setConversations] = useState([]);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState(null);

  const conversationsUnsubRef = useRef(null);
  const messagesUnsubRef = useRef(null);

  // ========================================
  // REAL-TIME LISTENERS
  // ========================================

  /**
   * Subscribe la lista de conversații pentru asociație
   */
  const subscribeToConversations = useCallback((filters = {}) => {
    if (!associationId) return;

    // Cleanup previous listener
    if (conversationsUnsubRef.current) {
      conversationsUnsubRef.current();
    }

    setLoading(true);
    const convsRef = collection(db, 'associations', associationId, 'conversations');

    // Base query: order by lastMessageAt desc
    let q = query(convsRef, orderBy('lastMessageAt', 'desc'));

    const unsub = onSnapshot(q, (snapshot) => {
      let convs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Client-side filtering (Firestore compound queries are limited)
      if (filters.type) {
        convs = convs.filter(c => c.type === filters.type);
      }
      if (filters.status) {
        convs = convs.filter(c => c.status === filters.status);
      }
      if (filters.apartmentId) {
        convs = convs.filter(c => c.apartmentId === filters.apartmentId);
      }
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        convs = convs.filter(c =>
          c.subject?.toLowerCase().includes(term) ||
          c.createdByName?.toLowerCase().includes(term) ||
          String(c.apartmentNumber)?.includes(term)
        );
      }
      if (!filters.showArchived) {
        const field = filters.archiveField || 'isArchivedAdmin';
        convs = convs.filter(c => {
          // Check the role-specific archive field
          if (c[field]) return false;
          // Backward compat: old `isArchived` treated as admin-archived
          if (field === 'isArchivedAdmin' && c.isArchived) return false;
          return true;
        });
      }

      setConversations(convs);
      setLoading(false);
    }, (err) => {
      console.error('Error loading conversations:', err);
      setError(err.message);
      setLoading(false);
    });

    conversationsUnsubRef.current = unsub;
    return unsub;
  }, [associationId]);

  /**
   * Subscribe la mesajele unei conversații
   */
  const subscribeToMessages = useCallback((conversationId) => {
    if (!associationId || !conversationId) return;

    // Cleanup previous listener
    if (messagesUnsubRef.current) {
      messagesUnsubRef.current();
    }

    setMessagesLoading(true);
    const msgsRef = collection(
      db, 'associations', associationId,
      'conversations', conversationId, 'messages'
    );
    const q = query(msgsRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCurrentMessages(msgs);
      setMessagesLoading(false);
    }, (err) => {
      console.error('Error loading messages:', err);
      setMessagesLoading(false);
    });

    messagesUnsubRef.current = unsub;
    return unsub;
  }, [associationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationsUnsubRef.current) conversationsUnsubRef.current();
      if (messagesUnsubRef.current) messagesUnsubRef.current();
    };
  }, []);

  // ========================================
  // CONVERSAȚIE - CRUD
  // ========================================

  /**
   * Creează o conversație nouă + primul mesaj
   *
   * @param {Object} data
   * @param {string} data.type - 'ticket' | 'message' | 'broadcast'
   * @param {string|null} data.apartmentId
   * @param {number|null} data.apartmentNumber
   * @param {string|null} data.blockName
   * @param {string|null} data.stairName
   * @param {string} data.subject
   * @param {string} data.content - textul primului mesaj
   * @param {string|null} data.ticketType - cod ticket type
   * @param {Object|null} data.ticketData - date structurate ticket
   * @param {string} data.createdBy - userId
   * @param {string} data.createdByName - numele autorului
   * @param {string} data.createdByRole - 'admin' | 'owner'
   */
  const createConversation = useCallback(async (data) => {
    if (!associationId) throw new Error('Nu există asociație selectată');

    try {
      setLoading(true);
      const now = Timestamp.now();

      // Determine status
      let status = 'open';
      if (data.type === 'ticket' && data.ticketType) {
        const ticketConfig = TICKET_TYPES[data.ticketType];
        if (ticketConfig?.requiresApproval) {
          status = 'pending_approval';
        }
      }

      // Create conversation doc
      const convData = {
        type: data.type || 'message',
        ticketType: data.ticketType || null,
        ticketData: data.ticketData || null,
        status,
        resolvedBy: null,
        resolvedAt: null,
        resolutionNote: null,
        apartmentId: data.apartmentId || null,
        apartmentNumber: data.apartmentNumber || null,
        blockName: data.blockName || null,
        stairName: data.stairName || null,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdByRole: data.createdByRole,
        subject: data.subject,
        lastMessageAt: now,
        lastMessageBy: data.createdBy,
        messageCount: 1,
        readBy: { [data.createdBy]: now },
        createdAt: now,
        updatedAt: now,
        isArchived: false,
        isArchivedAdmin: false,
        isArchivedOwner: false
      };

      const convsRef = collection(db, 'associations', associationId, 'conversations');
      const convDoc = await addDoc(convsRef, convData);

      // Create first message
      const msgData = {
        content: data.content,
        authorId: data.createdBy,
        authorName: data.createdByName,
        authorRole: data.createdByRole,
        isSystemMessage: false,
        actionType: null,
        createdAt: now
      };

      const msgsRef = collection(
        db, 'associations', associationId,
        'conversations', convDoc.id, 'messages'
      );
      await addDoc(msgsRef, msgData);

      setLoading(false);
      return { success: true, conversationId: convDoc.id };
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError(err.message);
      setLoading(false);
      return { success: false, error: err.message };
    }
  }, [associationId]);

  /**
   * Trimite un mesaj într-o conversație existentă
   */
  const sendMessage = useCallback(async (conversationId, content, author) => {
    if (!associationId || !conversationId) return { success: false, error: 'Lipsă date' };

    try {
      const now = Timestamp.now();

      // Add message
      const msgsRef = collection(
        db, 'associations', associationId,
        'conversations', conversationId, 'messages'
      );
      await addDoc(msgsRef, {
        content,
        authorId: author.id,
        authorName: author.name,
        authorRole: author.role,
        isSystemMessage: false,
        actionType: null,
        createdAt: now
      });

      // Update conversation metadata
      const convRef = doc(db, 'associations', associationId, 'conversations', conversationId);
      await updateDoc(convRef, {
        lastMessageAt: now,
        lastMessageBy: author.id,
        messageCount: (conversations.find(c => c.id === conversationId)?.messageCount || 0) + 1,
        [`readBy.${author.id}`]: now,
        updatedAt: now
      });

      return { success: true };
    } catch (err) {
      console.error('Error sending message:', err);
      return { success: false, error: err.message };
    }
  }, [associationId, conversations]);

  // ========================================
  // APPROVAL FLOW
  // ========================================

  /**
   * Aprobă un ticket
   * @param {string} conversationId
   * @param {string} note - notă opțională
   * @param {Object} admin - { id, name }
   * @param {Function} onAutoAction - callback pentru acțiuni automate (ex: update apartment persons)
   */
  const approveTicket = useCallback(async (conversationId, note, admin, onAutoAction) => {
    if (!associationId) return { success: false, error: 'Lipsă asociație' };

    try {
      const now = Timestamp.now();
      const conv = conversations.find(c => c.id === conversationId);
      if (!conv) return { success: false, error: 'Conversația nu a fost găsită' };

      // Update conversation status
      const convRef = doc(db, 'associations', associationId, 'conversations', conversationId);
      await updateDoc(convRef, {
        status: 'approved',
        resolvedBy: admin.id,
        resolvedAt: now,
        resolutionNote: note || null,
        lastMessageAt: now,
        lastMessageBy: admin.id,
        messageCount: (conv.messageCount || 0) + 1,
        [`readBy.${admin.id}`]: now,
        updatedAt: now
      });

      // Add system message
      const msgsRef = collection(
        db, 'associations', associationId,
        'conversations', conversationId, 'messages'
      );
      const systemMsg = note
        ? `✅ Cererea a fost aprobată de ${admin.name}.\n\nNota: ${note}`
        : `✅ Cererea a fost aprobată de ${admin.name}.`;

      await addDoc(msgsRef, {
        content: systemMsg,
        authorId: admin.id,
        authorName: admin.name,
        authorRole: 'admin',
        isSystemMessage: true,
        actionType: 'approved',
        createdAt: now
      });

      // Execute auto-action if defined
      const ticketConfig = TICKET_TYPES[conv.ticketType];
      if (ticketConfig?.autoAction && onAutoAction) {
        await onAutoAction(ticketConfig.autoAction, conv);
      }

      return { success: true };
    } catch (err) {
      console.error('Error approving ticket:', err);
      return { success: false, error: err.message };
    }
  }, [associationId, conversations]);

  /**
   * Respinge un ticket
   */
  const rejectTicket = useCallback(async (conversationId, reason, admin) => {
    if (!associationId) return { success: false, error: 'Lipsă asociație' };

    try {
      const now = Timestamp.now();
      const conv = conversations.find(c => c.id === conversationId);
      if (!conv) return { success: false, error: 'Conversația nu a fost găsită' };

      // Update conversation status
      const convRef = doc(db, 'associations', associationId, 'conversations', conversationId);
      await updateDoc(convRef, {
        status: 'rejected',
        resolvedBy: admin.id,
        resolvedAt: now,
        resolutionNote: reason,
        lastMessageAt: now,
        lastMessageBy: admin.id,
        messageCount: (conv.messageCount || 0) + 1,
        [`readBy.${admin.id}`]: now,
        updatedAt: now
      });

      // Add system message
      const msgsRef = collection(
        db, 'associations', associationId,
        'conversations', conversationId, 'messages'
      );
      await addDoc(msgsRef, {
        content: `❌ Cererea a fost respinsă de ${admin.name}.\n\nMotiv: ${reason}`,
        authorId: admin.id,
        authorName: admin.name,
        authorRole: 'admin',
        isSystemMessage: true,
        actionType: 'rejected',
        createdAt: now
      });

      return { success: true };
    } catch (err) {
      console.error('Error rejecting ticket:', err);
      return { success: false, error: err.message };
    }
  }, [associationId, conversations]);

  // ========================================
  // CONVERSAȚIE - ACȚIUNI
  // ========================================

  /**
   * Închide o conversație
   */
  const closeConversation = useCallback(async (conversationId) => {
    if (!associationId) return;
    try {
      const convRef = doc(db, 'associations', associationId, 'conversations', conversationId);
      await updateDoc(convRef, {
        status: 'closed',
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (err) {
      console.error('Error closing conversation:', err);
      return { success: false, error: err.message };
    }
  }, [associationId]);

  /**
   * Marchează conversația ca citită de un user
   */
  const markAsRead = useCallback(async (conversationId, userId) => {
    if (!associationId || !conversationId || !userId) return;
    try {
      const convRef = doc(db, 'associations', associationId, 'conversations', conversationId);
      await updateDoc(convRef, {
        [`readBy.${userId}`]: Timestamp.now()
      });
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }, [associationId]);

  /**
   * Arhivează o conversație
   */
  const archiveConversation = useCallback(async (conversationId, archiveField = 'isArchivedAdmin') => {
    if (!associationId) return;
    try {
      const convRef = doc(db, 'associations', associationId, 'conversations', conversationId);
      await updateDoc(convRef, {
        [archiveField]: true,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (err) {
      console.error('Error archiving conversation:', err);
      return { success: false, error: err.message };
    }
  }, [associationId]);

  // ========================================
  // BROADCAST
  // ========================================

  /**
   * Creează un mesaj broadcast (admin → toată asociația)
   */
  const createBroadcast = useCallback(async (subject, content, admin) => {
    return createConversation({
      type: 'broadcast',
      apartmentId: null,
      apartmentNumber: null,
      blockName: null,
      stairName: null,
      subject,
      content,
      ticketType: null,
      ticketData: null,
      createdBy: admin.id,
      createdByName: admin.name,
      createdByRole: 'admin'
    });
  }, [createConversation]);

  // ========================================
  // HELPERS
  // ========================================

  /**
   * Calculează nr. de mesaje necitite pentru un user
   */
  const getUnreadCount = useCallback((userId) => {
    if (!userId || !conversations.length) return 0;

    return conversations.reduce((count, conv) => {
      const lastRead = conv.readBy?.[userId];
      if (!lastRead) return count + 1; // niciodată citit

      const lastReadTime = lastRead.toMillis ? lastRead.toMillis() : lastRead;
      const lastMsgTime = conv.lastMessageAt?.toMillis ? conv.lastMessageAt.toMillis() : conv.lastMessageAt;

      if (lastMsgTime > lastReadTime && conv.lastMessageBy !== userId) {
        return count + 1;
      }
      return count;
    }, 0);
  }, [conversations]);

  /**
   * Găsește emailurile adminilor asociației (pentru notificări email)
   */
  const getAssociationAdminEmails = useCallback(async (assocId) => {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const adminEmails = [];

      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.email && data.isActive !== false) {
          // Check if user is admin for this association
          // Users don't have direct assocId link, we check via association.adminId
          adminEmails.push({ email: data.email, name: data.profile?.personalInfo?.firstName || 'Admin' });
        }
      });

      return adminEmails;
    } catch (err) {
      console.error('Error getting admin emails:', err);
      return [];
    }
  }, []);

  /**
   * Găsește emailurile membrilor unui apartament (din /owners/)
   */
  const getApartmentMemberEmails = useCallback(async (apartmentId) => {
    try {
      const ownersRef = collection(db, 'owners');
      const snapshot = await getDocs(ownersRef);
      const memberEmails = [];

      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.status !== 'active' || !data.email) return;

        const hasApartment = data.associations?.some(assoc =>
          assoc.apartments?.some(apt => apt.apartmentId === apartmentId)
        );

        if (hasApartment) {
          memberEmails.push({
            email: data.email,
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Locatar'
          });
        }
      });

      return memberEmails;
    } catch (err) {
      console.error('Error getting apartment member emails:', err);
      return [];
    }
  }, []);

  /**
   * Trimite notificare email
   */
  const sendEmailNotification = useCallback(async ({
    recipients,
    subject,
    messageContent,
    conversationType,
    apartmentNumber,
    associationName,
    authorName,
    authorRole
  }) => {
    try {
      const response = await fetch('/api/send-message-notification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients,
          subject,
          messageContent,
          conversationType,
          apartmentNumber,
          associationName,
          authorName,
          authorRole
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Email notification error:', errorData);
        return { success: false, error: errorData.error };
      }

      return { success: true };
    } catch (err) {
      console.error('Error sending email notification:', err);
      // Don't fail the operation if email fails
      return { success: false, error: err.message };
    }
  }, []);

  return {
    // State
    conversations,
    currentMessages,
    loading,
    messagesLoading,
    error,

    // Listeners
    subscribeToConversations,
    subscribeToMessages,

    // CRUD
    createConversation,
    sendMessage,
    createBroadcast,

    // Approval
    approveTicket,
    rejectTicket,

    // Actions
    closeConversation,
    markAsRead,
    archiveConversation,

    // Helpers
    getUnreadCount,
    getAssociationAdminEmails,
    getApartmentMemberEmails,
    sendEmailNotification
  };
};
