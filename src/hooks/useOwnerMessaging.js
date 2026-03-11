import { useState, useEffect, useCallback } from 'react';
import { useMessaging } from './useMessaging';
import { TICKET_TYPES } from '../data/ticketTypes';

/**
 * HOOK MESAGERIE OWNER PORTAL
 *
 * Wrapper peste useMessaging filtrat pe apartamentId.
 * Arată doar conversațiile pentru apartamentul curent + broadcast-uri.
 */
export const useOwnerMessaging = (associationId, apartmentId) => {
  const messaging = useMessaging(associationId);
  const [ownerConversations, setOwnerConversations] = useState([]);

  // Filtrează conversațiile: doar cele cu apartmentId match + broadcast
  useEffect(() => {
    if (!apartmentId) {
      setOwnerConversations([]);
      return;
    }

    const filtered = messaging.conversations.filter(conv =>
      conv.apartmentId === apartmentId || conv.type === 'broadcast'
    );
    setOwnerConversations(filtered);
  }, [messaging.conversations, apartmentId]);

  /**
   * Trimite un ticket predefinit
   */
  const submitTicket = useCallback(async (ticketType, ticketData, apartmentInfo, ownerInfo) => {
    const config = TICKET_TYPES[ticketType];
    if (!config) return { success: false, error: 'Tip de solicitare necunoscut' };

    // Build subject from ticket type
    const subject = config.label;

    // Build content (first message) from ticket data
    let content = `**${config.label}**\n\n`;
    config.fields.forEach(field => {
      const value = ticketData[field.key];
      if (value !== undefined && value !== null && value !== '') {
        content += `${field.label}: ${value}\n`;
      }
    });

    return messaging.createConversation({
      type: 'ticket',
      apartmentId: apartmentInfo.id,
      apartmentNumber: apartmentInfo.number,
      blockName: apartmentInfo.blockName || null,
      stairName: apartmentInfo.stairName || null,
      subject,
      content: content.trim(),
      ticketType,
      ticketData,
      createdBy: ownerInfo.id,
      createdByName: ownerInfo.name,
      createdByRole: 'owner'
    });
  }, [messaging]);

  /**
   * Trimite un mesaj liber
   */
  const sendFreeMessage = useCallback(async (subject, content, apartmentInfo, ownerInfo) => {
    return messaging.createConversation({
      type: 'message',
      apartmentId: apartmentInfo.id,
      apartmentNumber: apartmentInfo.number,
      blockName: apartmentInfo.blockName || null,
      stairName: apartmentInfo.stairName || null,
      subject,
      content,
      ticketType: null,
      ticketData: null,
      createdBy: ownerInfo.id,
      createdByName: ownerInfo.name,
      createdByRole: 'owner'
    });
  }, [messaging]);

  /**
   * Calculează nr. de mesaje necitite pentru owner
   */
  const getOwnerUnreadCount = useCallback((userId) => {
    if (!userId || !ownerConversations.length) return 0;

    return ownerConversations.reduce((count, conv) => {
      const lastRead = conv.readBy?.[userId];
      if (!lastRead) return count + 1;

      const lastReadTime = lastRead.toMillis ? lastRead.toMillis() : lastRead;
      const lastMsgTime = conv.lastMessageAt?.toMillis ? conv.lastMessageAt.toMillis() : conv.lastMessageAt;

      if (lastMsgTime > lastReadTime && conv.lastMessageBy !== userId) {
        return count + 1;
      }
      return count;
    }, 0);
  }, [ownerConversations]);

  /**
   * Arhivează o conversație pentru owner
   */
  const archiveConversation = useCallback(async (conversationId) => {
    return messaging.archiveConversation(conversationId, 'isArchivedOwner');
  }, [messaging]);

  return {
    // Filtered conversations for this apartment
    conversations: ownerConversations,
    currentMessages: messaging.currentMessages,
    loading: messaging.loading,
    messagesLoading: messaging.messagesLoading,

    // Subscribe
    subscribeToConversations: messaging.subscribeToConversations,
    subscribeToMessages: messaging.subscribeToMessages,

    // Owner actions
    submitTicket,
    sendFreeMessage,
    sendMessage: messaging.sendMessage,
    markAsRead: messaging.markAsRead,
    archiveConversation,

    // Helpers
    getOwnerUnreadCount
  };
};
