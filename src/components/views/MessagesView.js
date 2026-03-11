/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Search, Filter, Plus, Send, ArrowLeft,
  CheckCircle, XCircle, Clock, Megaphone, Ticket, X,
  MoreVertical, Archive, ChevronDown, Building2, Users,
  AlertCircle, Loader2
} from 'lucide-react';
import { useMessaging } from '../../hooks/useMessaging';
import { getStatusLabel, getStatusColor, getTypeLabel, TICKET_TYPES } from '../../data/ticketTypes';
import NewConversationModal from '../modals/NewConversationModal';

/**
 * VIEW MESAJE - Admin App
 *
 * Layout split: lista conversații (stânga) + detaliu conversație (dreapta)
 * Mobile: full-screen list, tap → detail cu back button
 */
const MessagesView = ({
  association,
  blocks = [],
  stairs = [],
  apartments = [],
  currentUser,
  userRole,
  handleNavigation,
  preFilterApartmentId = null,
  onClearPreFilter
}) => {
  // Hook mesagerie
  const {
    conversations,
    currentMessages,
    loading,
    messagesLoading,
    subscribeToConversations,
    subscribeToMessages,
    sendMessage,
    approveTicket,
    rejectTicket,
    closeConversation,
    markAsRead,
    archiveConversation,
    getUnreadCount,
    createBroadcast
  } = useMessaging(association?.id);

  // State
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(null); // null = all
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterApartmentId, setFilterApartmentId] = useState(preFilterApartmentId);
  const [showApprovalModal, setShowApprovalModal] = useState(null); // 'approve' | 'reject' | null
  const [approvalNote, setApprovalNote] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const messagesEndRef = useRef(null);
  const actionMenuRef = useRef(null);

  const isReadOnlyRole = userRole === 'assoc_president' || userRole === 'assoc_censor';
  const canApprove = !isReadOnlyRole; // doar admin_asociatie și master pot aproba

  // Subscribe la conversații
  useEffect(() => {
    if (association?.id) {
      subscribeToConversations({
        type: filterType,
        status: filterStatus,
        apartmentId: filterApartmentId,
        searchTerm,
        showArchived
      });
    }
  }, [association?.id, filterType, filterStatus, filterApartmentId, searchTerm, showArchived, subscribeToConversations]);

  // Subscribe la mesaje când se selectează o conversație
  useEffect(() => {
    if (selectedConversation?.id) {
      subscribeToMessages(selectedConversation.id);
      // Mark as read
      if (currentUser?.uid) {
        markAsRead(selectedConversation.id, currentUser.uid);
      }
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

  // Pre-filter apartment from SetupView navigation and auto-open new message modal
  useEffect(() => {
    if (preFilterApartmentId) {
      setFilterApartmentId(preFilterApartmentId);
      setShowNewConversationModal(true);
    }
  }, [preFilterApartmentId]);

  // === HANDLERS ===

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    setReplyText('');
    setShowApprovalModal(null);
    setApprovalNote('');
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConversation) return;

    setSendingReply(true);
    const result = await sendMessage(selectedConversation.id, replyText.trim(), {
      id: currentUser?.uid,
      name: currentUser?.displayName || currentUser?.email || 'Admin',
      role: 'admin'
    });

    if (result.success) {
      setReplyText('');
    }
    setSendingReply(false);
  };

  const handleApprove = async () => {
    if (!selectedConversation) return;
    setApprovalLoading(true);

    const result = await approveTicket(
      selectedConversation.id,
      approvalNote,
      { id: currentUser?.uid, name: currentUser?.displayName || 'Admin' },
      async (action, conv) => {
        // Auto-action: UPDATE_APARTMENT_PERSONS
        if (action === 'UPDATE_APARTMENT_PERSONS' && conv.ticketData) {
          // This will be handled by the parent via callback or direct Firestore update
          console.log('Auto-action: Update apartment persons to', conv.ticketData.newCount);
        }
      }
    );

    if (result.success) {
      setShowApprovalModal(null);
      setApprovalNote('');
      // Refresh selected conversation
      const updated = conversations.find(c => c.id === selectedConversation.id);
      if (updated) setSelectedConversation(updated);
    }
    setApprovalLoading(false);
  };

  const handleReject = async () => {
    if (!selectedConversation || !approvalNote.trim()) return;
    setApprovalLoading(true);

    const result = await rejectTicket(
      selectedConversation.id,
      approvalNote,
      { id: currentUser?.uid, name: currentUser?.displayName || 'Admin' }
    );

    if (result.success) {
      setShowApprovalModal(null);
      setApprovalNote('');
      const updated = conversations.find(c => c.id === selectedConversation.id);
      if (updated) setSelectedConversation(updated);
    }
    setApprovalLoading(false);
  };

  const handleClose = async (convId) => {
    await closeConversation(convId);
    setShowActionMenu(null);
  };

  const handleArchive = async (convId) => {
    await archiveConversation(convId);
    setShowActionMenu(null);
    if (selectedConversation?.id === convId) {
      setSelectedConversation(null);
    }
  };

  // === HELPER FUNCTIONS ===

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
    return <MessageSquare className="w-4 h-4 text-blue-500" />;
  };

  const getApartmentLabel = (conv) => {
    if (conv.type === 'broadcast') return 'Toată asociația';
    if (conv.apartmentNumber) {
      let label = `Ap. ${conv.apartmentNumber}`;
      if (conv.blockName) label += ` • ${conv.blockName}`;
      if (conv.stairName) label += ` - ${conv.stairName}`;
      return label;
    }
    return '';
  };

  const unreadCount = getUnreadCount(currentUser?.uid);

  // === RENDER CONVERSATION LIST ===

  const renderConversationList = () => (
    <div className={`flex flex-col h-full bg-white ${selectedConversation ? 'hidden lg:flex' : 'flex'} lg:w-96 lg:border-r border-gray-200`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Mesaje</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowNewConversationModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Mesaj nou</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Caută conversații..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Type filter tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { value: null, label: 'Toate' },
            { value: 'ticket', label: 'Solicitări' },
            { value: 'message', label: 'Mesaje' },
            { value: 'broadcast', label: 'Anunțuri' }
          ].map(f => (
            <button
              key={f.value || 'all'}
              onClick={() => { setFilterType(f.value); if (f.value !== 'ticket') setFilterStatus(null); }}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                filterType === f.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* Archived toggle - right aligned */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`ml-auto px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1 ${
              showArchived
                ? 'border-gray-600 text-gray-700'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
            }`}
          >
            <Archive className="w-3 h-3" />
            Arhivate
          </button>
        </div>

        {/* Sub-filters row: status (for tickets) + active filter badges */}
        {(filterType === 'ticket' || filterApartmentId) && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2">
            {/* Status sub-filter for tickets */}
            {filterType === 'ticket' && (
              <>
                <span className="text-xs text-gray-400 mr-1">Status:</span>
                {[
                  { value: null, label: 'Toate' },
                  { value: 'pending_approval', label: 'În așteptare' },
                  { value: 'approved', label: 'Aprobate' },
                  { value: 'rejected', label: 'Respinse' }
                ].map(f => (
                  <button
                    key={f.value || 'all-status'}
                    onClick={() => setFilterStatus(f.value)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      filterStatus === f.value
                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </>
            )}

            {/* Apartment filter indicator */}
            {filterApartmentId && (
              <button
                onClick={() => setFilterApartmentId(null)}
                className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 border border-teal-200 flex items-center gap-1"
              >
                <Building2 className="w-3 h-3" />
                Filtrat pe apartament
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nu există conversații</p>
            <p className="text-sm text-gray-400 mt-1">
              {filterType || filterStatus || filterApartmentId
                ? 'Încearcă alte filtre'
                : 'Trimite un mesaj sau așteaptă solicitări de la locatari'}
            </p>
          </div>
        ) : (
          conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => handleSelectConversation(conv)}
              className={`w-full p-3 sm:p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              } ${isUnread(conv) ? 'bg-blue-50/50' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Icon + Unread dot */}
                <div className="relative flex-shrink-0 mt-0.5">
                  {getConversationIcon(conv)}
                  {isUnread(conv) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
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

                  {/* Apartment info */}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {getApartmentLabel(conv)}
                    {conv.createdByRole === 'owner' && conv.createdByName && ` • ${conv.createdByName}`}
                  </p>

                  {/* Status badge for tickets */}
                  {conv.type === 'ticket' && conv.status && (
                    <div className="mt-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(conv.status).bg} ${getStatusColor(conv.status).text}`}>
                        {getStatusLabel(conv.status)}
                      </span>
                      {conv.ticketType && (
                        <span className="ml-1.5 text-xs text-gray-400">
                          {TICKET_TYPES[conv.ticketType]?.label || conv.ticketType}
                        </span>
                      )}
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
            <p className="text-sm text-gray-400 mt-1">Alege din lista din stânga sau creează un mesaj nou</p>
          </div>
        </div>
      );
    }

    const conv = selectedConversation;
    // Refresh from real-time data
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
                {getApartmentLabel(liveConv)}
                {liveConv.createdByName && ` • ${liveConv.createdByName}`}
              </p>
            </div>

            {/* Status badge */}
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
              {getStatusLabel(liveConv.status)}
            </span>

            {/* Actions menu */}
            <div className="relative" ref={actionMenuRef}>
              <button
                onClick={() => setShowActionMenu(showActionMenu === conv.id ? null : conv.id)}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>

              {showActionMenu === conv.id && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  {liveConv.status !== 'closed' && (
                    <button
                      onClick={() => handleClose(conv.id)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4 text-gray-400" />
                      Închide conversația
                    </button>
                  )}
                  <button
                    onClick={() => handleArchive(conv.id)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4 text-gray-400" />
                    Arhivează
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ticket data card (for tickets) */}
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

              {/* Approval buttons */}
              {canApprove && liveConv.status === 'pending_approval' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-orange-200">
                  <button
                    onClick={() => { setShowApprovalModal('approve'); setApprovalNote(''); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aprobă
                  </button>
                  <button
                    onClick={() => { setShowApprovalModal('reject'); setApprovalNote(''); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Respinge
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messages Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            </div>
          ) : (
            currentMessages.map(msg => {
              const isAdmin = msg.authorRole === 'admin';
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
                <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] sm:max-w-[70%] rounded-xl px-4 py-2.5 ${
                    isAdmin
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                  }`}>
                    <p className={`text-xs font-medium mb-1 ${isAdmin ? 'text-blue-100' : 'text-gray-500'}`}>
                      {msg.authorName}
                    </p>
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isAdmin ? 'text-blue-200' : 'text-gray-400'}`}>
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
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                disabled={sendingReply}
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim() || sendingReply}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
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

        {/* Approval Modal Overlay */}
        {showApprovalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
              <h3 className={`text-lg font-semibold mb-3 ${
                showApprovalModal === 'approve' ? 'text-green-700' : 'text-red-700'
              }`}>
                {showApprovalModal === 'approve' ? '✅ Aprobă cererea' : '❌ Respinge cererea'}
              </h3>
              <textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder={showApprovalModal === 'approve'
                  ? 'Notă pentru locatar (opțional)...'
                  : 'Motivul respingerii (obligatoriu)...'
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                rows={3}
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowApprovalModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Anulează
                </button>
                <button
                  onClick={showApprovalModal === 'approve' ? handleApprove : handleReject}
                  disabled={approvalLoading || (showApprovalModal === 'reject' && !approvalNote.trim())}
                  className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${
                    showApprovalModal === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {approvalLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    showApprovalModal === 'approve' ? 'Confirmă aprobarea' : 'Confirmă respingerea'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // === MAIN RENDER ===

  return (
    <div className="px-3 sm:px-4 lg:px-6 pb-20 lg:pb-2">
      <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        {renderConversationList()}
        {renderConversationDetail()}
      </div>

      {/* New Conversation Modal */}
      {showNewConversationModal && (
        <NewConversationModal
          isOpen={showNewConversationModal}
          onClose={() => {
            setShowNewConversationModal(false);
            if (preFilterApartmentId && onClearPreFilter) {
              onClearPreFilter();
            }
          }}
          association={association}
          apartments={apartments}
          blocks={blocks}
          stairs={stairs}
          currentUser={currentUser}
          associationId={association?.id}
          preSelectedApartmentId={preFilterApartmentId}
        />
      )}
    </div>
  );
};

export default MessagesView;
