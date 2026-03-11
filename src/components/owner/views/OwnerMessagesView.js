/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Plus, Send, ArrowLeft, Ticket, Megaphone,
  Clock, CheckCircle, XCircle, Loader2, Archive, MoreVertical
} from 'lucide-react';
import { useOwnerContext } from '../OwnerApp';
import { useOwnerMessaging } from '../../../hooks/useOwnerMessaging';
import { getStatusLabel, getStatusColor, getTypeLabel, TICKET_TYPES } from '../../../data/ticketTypes';
import NewTicketModal from '../../modals/NewTicketModal';
import { useAuthEnhanced } from '../../../context/AuthContextEnhanced';

/**
 * VIEW MESAJE - Owner Portal
 *
 * Layout split: lista conversații (stânga) + detaliu conversație (dreapta)
 * Mobile: full-screen list, tap → detail cu back button
 */
export default function OwnerMessagesView() {
  const {
    apartmentId,
    apartmentNumber,
    apartmentData,
    associationId,
    associationName,
    ownerProfile
  } = useOwnerContext();

  const { currentUser } = useAuthEnhanced();

  const {
    conversations,
    currentMessages,
    loading,
    messagesLoading,
    subscribeToConversations,
    subscribeToMessages,
    submitTicket,
    sendFreeMessage,
    sendMessage,
    markAsRead,
    getOwnerUnreadCount,
    archiveConversation
  } = useOwnerMessaging(associationId, apartmentId);

  // State
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const actionMenuRef = useRef(null);

  const messagesEndRef = useRef(null);

  const ownerName = ownerProfile?.firstName && ownerProfile?.lastName
    ? `${ownerProfile.firstName} ${ownerProfile.lastName}`
    : apartmentData?.owner || 'Locatar';

  // Subscribe la conversații
  useEffect(() => {
    if (associationId) {
      const unsub = subscribeToConversations({ archiveField: 'isArchivedOwner', showArchived });
      return () => { if (unsub) unsub(); };
    }
  }, [associationId, showArchived]);

  // Subscribe la mesaje când se selectează o conversație
  useEffect(() => {
    if (selectedConversation?.id) {
      const unsub = subscribeToMessages(selectedConversation.id);
      if (currentUser?.uid) {
        markAsRead(selectedConversation.id, currentUser.uid);
      }
      return () => { if (unsub) unsub(); };
    }
  }, [selectedConversation?.id]);

  // Scroll la ultimul mesaj
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // Close action menu on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setShowActionMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // === HANDLERS ===

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    setReplyText('');
  };

  const handleArchive = async (convId) => {
    await archiveConversation(convId);
    setShowActionMenu(null);
    if (selectedConversation?.id === convId) {
      setSelectedConversation(null);
    }
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConversation) return;

    setSendingReply(true);
    const result = await sendMessage(selectedConversation.id, replyText.trim(), {
      id: currentUser?.uid,
      name: ownerName,
      role: 'owner'
    });

    if (result.success) {
      setReplyText('');
    }
    setSendingReply(false);
  };

  const handleSubmitTicket = async (ticketType, ticketData) => {
    setTicketLoading(true);
    const result = await submitTicket(ticketType, ticketData, {
      id: apartmentId,
      number: apartmentNumber,
      blockName: apartmentData?.block || null,
      stairName: apartmentData?.stair || null
    }, {
      id: currentUser?.uid,
      name: ownerName
    });

    if (result.success) {
      setShowNewTicketModal(false);
    } else {
      alert('Eroare: ' + result.error);
    }
    setTicketLoading(false);
  };

  const handleSendFreeMessage = async (subject, content) => {
    setTicketLoading(true);
    const result = await sendFreeMessage(subject, content, {
      id: apartmentId,
      number: apartmentNumber,
      blockName: apartmentData?.block || null,
      stairName: apartmentData?.stair || null
    }, {
      id: currentUser?.uid,
      name: ownerName
    });

    if (result.success) {
      setShowNewTicketModal(false);
    } else {
      alert('Eroare: ' + result.error);
    }
    setTicketLoading(false);
  };

  // === HELPERS ===

  const isUnread = (conv) => {
    if (!currentUser?.uid) return false;
    const lastRead = conv.readBy?.[currentUser.uid];
    if (!lastRead) return true;
    const lastReadTime = lastRead.toMillis ? lastRead.toMillis() : lastRead;
    const lastMsgTime = conv.lastMessageAt?.toMillis ? conv.lastMessageAt.toMillis() : conv.lastMessageAt;
    return lastMsgTime > lastReadTime && conv.lastMessageBy !== currentUser.uid;
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Acum';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) {
      const days = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
      return days[date.getDay()];
    }
    return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
  };

  const getConversationIcon = (conv) => {
    if (conv.type === 'broadcast') return <Megaphone className="w-4 h-4 text-purple-500" />;
    if (conv.type === 'ticket') return <Ticket className="w-4 h-4 text-orange-500" />;
    return <MessageSquare className="w-4 h-4 text-emerald-500" />;
  };

  const unreadCount = currentUser?.uid ? getOwnerUnreadCount(currentUser.uid) : 0;

  // === RENDER CONVERSATION LIST ===

  const renderConversationList = () => (
    <div className={`flex flex-col h-full bg-white ${selectedConversation ? 'hidden lg:flex' : 'flex'} lg:w-96 lg:border-r border-gray-200`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Mesaje</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowNewTicketModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Cerere nouă</span>
          </button>
        </div>

        {/* Archived toggle */}
        <div className="flex">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              showArchived
                ? 'bg-gray-700 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Archive className="w-3 h-3" />
            Arhivate
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nu ai mesaje încă</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">
              Trimite o cerere sau un mesaj către administrație
            </p>
            <button
              onClick={() => setShowNewTicketModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Prima cerere
            </button>
          </div>
        ) : (
          conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => handleSelectConversation(conv)}
              className={`w-full p-3 sm:p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedConversation?.id === conv.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
              } ${isUnread(conv) ? 'bg-emerald-50/50' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Icon + Unread dot */}
                <div className="relative flex-shrink-0 mt-0.5">
                  {getConversationIcon(conv)}
                  {isUnread(conv) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Subject + Time */}
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${isUnread(conv) ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {conv.subject}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatTimestamp(conv.lastMessageAt)}
                    </span>
                  </div>

                  {/* Type info */}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {conv.type === 'broadcast' ? 'Anunț de la administrație' : getTypeLabel(conv.type)}
                    {conv.messageCount > 1 && ` • ${conv.messageCount} mesaje`}
                  </p>

                  {/* Status badge for tickets */}
                  {conv.type === 'ticket' && conv.status && (
                    <div className="mt-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(conv.status).bg} ${getStatusColor(conv.status).text}`}>
                        {getStatusLabel(conv.status)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  // === RENDER CONVERSATION DETAIL ===

  const renderConversationDetail = () => {
    if (!selectedConversation) {
      return (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Selectează o conversație</p>
            <p className="text-sm text-gray-400 mt-1">Alege din lista din stânga sau creează o cerere nouă</p>
          </div>
        </div>
      );
    }

    const conv = selectedConversation;
    const liveConv = conversations.find(c => c.id === conv.id) || conv;
    const statusColor = getStatusColor(liveConv.status);

    return (
      <div className={`flex flex-col flex-1 bg-white ${!selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
        {/* Detail Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {getConversationIcon(liveConv)}
                <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                  {liveConv.subject}
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {liveConv.type === 'broadcast' ? 'Anunț de la administrație' : getTypeLabel(liveConv.type)}
              </p>
            </div>

            {/* Status badge */}
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
              {getStatusLabel(liveConv.status)}
            </span>

            {/* Action menu */}
            <div className="relative" ref={actionMenuRef}>
              <button
                onClick={() => setShowActionMenu(showActionMenu === liveConv.id ? null : liveConv.id)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>

              {showActionMenu === liveConv.id && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => handleArchive(liveConv.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Archive className="w-4 h-4 text-gray-400" />
                    Arhivează
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ticket data card */}
          {liveConv.type === 'ticket' && liveConv.ticketData && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs font-medium text-orange-700 mb-2">
                {TICKET_TYPES[liveConv.ticketType]?.label || 'Solicitare'}
              </p>
              <div className="space-y-1">
                {Object.entries(liveConv.ticketData).map(([key, value]) => {
                  if (!value && value !== 0) return null;
                  const fieldConfig = TICKET_TYPES[liveConv.ticketType]?.fields?.find(f => f.key === key);
                  return (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-orange-600">{fieldConfig?.label || key}:</span>
                      <span className="font-medium text-orange-900">{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Messages Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            </div>
          ) : (
            currentMessages.map(msg => {
              const isOwner = msg.authorRole === 'owner';
              const isSystem = msg.isSystemMessage;

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className={`px-4 py-2 rounded-lg text-sm max-w-md text-center ${
                      msg.actionType === 'approved' ? 'bg-green-100 text-green-700' :
                      msg.actionType === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      <p className="whitespace-pre-line">{msg.content}</p>
                      <p className="text-xs mt-1 opacity-70">{formatTimestamp(msg.createdAt)}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] sm:max-w-[70%] rounded-xl px-4 py-2.5 ${
                    isOwner
                      ? 'bg-emerald-600 text-white rounded-br-md'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                  }`}>
                    <p className={`text-xs font-medium mb-1 ${isOwner ? 'text-emerald-100' : 'text-gray-500'}`}>
                      {msg.authorName}
                    </p>
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isOwner ? 'text-emerald-200' : 'text-gray-400'}`}>
                      {formatTimestamp(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Box */}
        {liveConv.status !== 'closed' && (
          <div className="p-3 sm:p-4 border-t border-gray-200 flex-shrink-0 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                placeholder="Scrie un răspuns..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                disabled={sendingReply}
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim() || sendingReply}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {sendingReply ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // === MAIN RENDER ===

  return (
    <div className="px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 pb-20 lg:pb-2">
      <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style={{ height: 'calc(100vh - 160px)', minHeight: '500px' }}>
        {renderConversationList()}
        {renderConversationDetail()}
      </div>

      {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={showNewTicketModal}
        onClose={() => setShowNewTicketModal(false)}
        onSubmitTicket={handleSubmitTicket}
        onSendFreeMessage={handleSendFreeMessage}
        apartmentData={apartmentData}
        loading={ticketLoading}
      />
    </div>
  );
}
