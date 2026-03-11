/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XCircle, Send, Megaphone, MessageSquare, Building2, Loader2 } from 'lucide-react';
import { useMessaging } from '../../hooks/useMessaging';

/**
 * Modal Admin pentru creare conversație nouă
 *
 * Două moduri:
 * 1. Mesaj către un apartament specific (selectare apartament din dropdown)
 * 2. Broadcast către toată asociația
 */
const NewConversationModal = ({
  isOpen,
  onClose,
  association,
  apartments = [],
  blocks = [],
  stairs = [],
  currentUser,
  associationId,
  preSelectedApartmentId = null
}) => {
  const { createConversation, createBroadcast } = useMessaging(associationId);

  const [mode, setMode] = useState('apartment'); // 'apartment' | 'broadcast'
  const [selectedApartmentId, setSelectedApartmentId] = useState(preSelectedApartmentId || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  // Build apartment options grouped by block/stair
  const apartmentOptions = apartments
    .sort((a, b) => {
      const blockA = a.block || '';
      const blockB = b.block || '';
      if (blockA !== blockB) return blockA.localeCompare(blockB);
      const stairA = a.stair || '';
      const stairB = b.stair || '';
      if (stairA !== stairB) return stairA.localeCompare(stairB);
      return (a.number || 0) - (b.number || 0);
    })
    .map(apt => ({
      id: apt.id,
      label: `Ap. ${apt.number} - ${apt.owner || 'Nealocat'}`,
      sublabel: `${apt.block || ''} ${apt.stair ? '- ' + apt.stair : ''}`.trim(),
      number: apt.number,
      blockName: apt.block || blocks.find(b => b.id === apt.blocId)?.name || '',
      stairName: apt.stair || stairs.find(s => s.id === apt.stairId)?.name || '',
      stairId: apt.stairId,
      blocId: apt.blocId
    }));

  const selectedApt = apartmentOptions.find(a => a.id === selectedApartmentId);

  const canSubmit = subject.trim() && message.trim() && (
    mode === 'broadcast' || selectedApartmentId
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSending(true);
    try {
      const adminName = currentUser?.displayName || currentUser?.email || 'Admin';

      if (mode === 'broadcast') {
        const result = await createBroadcast(
          subject.trim(),
          message.trim(),
          { id: currentUser?.uid, name: adminName }
        );
        if (result.success) {
          onClose();
        } else {
          alert('Eroare: ' + result.error);
        }
      } else {
        const result = await createConversation({
          type: 'message',
          apartmentId: selectedApartmentId,
          apartmentNumber: selectedApt?.number || null,
          blockName: selectedApt?.blockName || null,
          stairName: selectedApt?.stairName || null,
          subject: subject.trim(),
          content: message.trim(),
          ticketType: null,
          ticketData: null,
          createdBy: currentUser?.uid,
          createdByName: adminName,
          createdByRole: 'admin'
        });
        if (result.success) {
          onClose();
        } else {
          alert('Eroare: ' + result.error);
        }
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
      alert('Eroare: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 sm:p-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-white bg-opacity-20 rounded-lg p-1.5">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold">Mesaj nou</h3>
              <p className="text-xs text-blue-100">{association?.name || 'Asociație'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-200 transition-colors">
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('apartment')}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-left ${
                mode === 'apartment'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <Building2 className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Către apartament</p>
                <p className="text-xs opacity-70">Un apartament specific</p>
              </div>
            </button>
            <button
              onClick={() => setMode('broadcast')}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-left ${
                mode === 'broadcast'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <Megaphone className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Anunț</p>
                <p className="text-xs opacity-70">Toată asociația</p>
              </div>
            </button>
          </div>

          {/* Apartment selector (only for apartment mode) */}
          {mode === 'apartment' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apartament</label>
              <select
                value={selectedApartmentId}
                onChange={(e) => setSelectedApartmentId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Selectează apartamentul...</option>
                {apartmentOptions.map(apt => (
                  <option key={apt.id} value={apt.id}>
                    {apt.label} {apt.sublabel ? `(${apt.sublabel})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subiect</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={mode === 'broadcast' ? 'ex: Anunț important - întrerupere apă' : 'ex: Clarificare situație plăți'}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Scrie mesajul..."
              rows={5}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {mode === 'broadcast' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs text-purple-700">
                <Megaphone className="w-3.5 h-3.5 inline mr-1" />
                Acest mesaj va fi vizibil tuturor locatarilor din asociație.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t bg-gray-50 flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || sending}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'broadcast'
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                {mode === 'broadcast' ? 'Trimite anunțul' : 'Trimite mesajul'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NewConversationModal;
