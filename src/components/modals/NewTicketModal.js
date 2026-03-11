/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  XCircle, ArrowLeft, ArrowRight, Send, Users, MessageSquare,
  CheckCircle, Loader2, Calendar, Clock
} from 'lucide-react';
import { TICKET_TYPES } from '../../data/ticketTypes';

/**
 * Modal Owner pentru creare ticket/solicitare
 *
 * Flow în 3 pași:
 * 1. Selectare tip solicitare (card grid)
 * 2. Completare formular dinamic
 * 3. Submit
 */
const NewTicketModal = ({
  isOpen,
  onClose,
  onSubmitTicket,
  onSendFreeMessage,
  apartmentData,
  loading
}) => {
  const [step, setStep] = useState(1); // 1=select type, 2=fill form
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({});
  const [freeSubject, setFreeSubject] = useState('');
  const [freeMessage, setFreeMessage] = useState('');

  // Reset la deschidere
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedType(null);
      setFormData({});
      setFreeSubject('');
      setFreeMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const ticketTypes = Object.entries(TICKET_TYPES);

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'Users': return <Users className="w-6 h-6" />;
      case 'MessageSquare': return <MessageSquare className="w-6 h-6" />;
      default: return <MessageSquare className="w-6 h-6" />;
    }
  };

  const handleSelectType = (typeKey) => {
    setSelectedType(typeKey);
    const config = TICKET_TYPES[typeKey];

    // Pre-fill display fields
    const initial = {};
    config.fields.forEach(field => {
      if (field.type === 'display') {
        if (field.key === 'currentCount') {
          initial[field.key] = apartmentData?.persons || 0;
        }
      } else {
        initial[field.key] = '';
      }
    });
    setFormData(initial);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedType) return;

    const config = TICKET_TYPES[selectedType];

    // For cerere_generala, use the free message flow
    if (selectedType === 'cerere_generala') {
      const subject = formData.subject || 'Cerere generală';
      const message = formData.message || '';
      if (!message.trim()) return;
      await onSendFreeMessage(subject, message);
    } else {
      await onSubmitTicket(selectedType, formData);
    }
  };

  const canSubmit = () => {
    if (!selectedType) return false;
    const config = TICKET_TYPES[selectedType];
    return config.fields
      .filter(f => f.required && f.type !== 'display')
      .every(f => formData[f.key]?.toString().trim());
  };

  const handleReset = () => {
    setStep(1);
    setSelectedType(null);
    setFormData({});
  };

  // Generate month options (current + next 6 months)
  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    const monthNames = [
      'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
      'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'
    ];

    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        value: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        label: `${monthNames[d.getMonth()].charAt(0).toUpperCase() + monthNames[d.getMonth()].slice(1)} ${d.getFullYear()}`
      });
    }
    return months;
  };

  const renderField = (field) => {
    switch (field.type) {
      case 'display':
        return (
          <div key={field.key} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
            <p className="text-lg font-semibold text-gray-900">{formData[field.key]}</p>
          </div>
        );

      case 'number':
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              min={field.min || 0}
              max={field.max || 99}
              value={formData[field.key] || ''}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder={`Introdu ${field.label.toLowerCase()}`}
            />
          </div>
        );

      case 'month_selector':
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formData[field.key] || ''}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="">Selectează luna...</option>
                {getMonthOptions().map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'text':
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={formData[field.key] || ''}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder={`Introdu ${field.label.toLowerCase()}`}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={formData[field.key] || ''}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              rows={field.rows || 3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
              placeholder={`Scrie ${field.label.toLowerCase()}...`}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-3 sm:p-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button onClick={handleReset} className="p-1 rounded-lg hover:bg-emerald-400 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h3 className="text-base sm:text-lg font-semibold">
                {step === 1 ? 'Cerere nouă' : TICKET_TYPES[selectedType]?.label || 'Cerere'}
              </h3>
              <p className="text-xs text-emerald-100">
                {step === 1 ? 'Alege tipul solicitării' : 'Completează detaliile'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-emerald-200 transition-colors">
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {step === 1 ? (
            /* Step 1: Type selection */
            <div className="space-y-3">
              {ticketTypes.map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleSelectType(key)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                    {getIcon(config.icon)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{config.label}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{config.description}</p>
                    {config.requiresApproval && (
                      <span className="inline-flex items-center mt-1.5 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        Necesită aprobare
                      </span>
                    )}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0 ml-auto" />
                </button>
              ))}
            </div>
          ) : (
            /* Step 2: Dynamic form */
            <div className="space-y-4">
              {TICKET_TYPES[selectedType]?.requiresApproval && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Această solicitare necesită aprobarea administrației
                  </p>
                </div>
              )}

              {TICKET_TYPES[selectedType]?.fields.map(field => renderField(field))}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="p-3 sm:p-4 border-t bg-gray-50 flex justify-end gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Anulează
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit() || loading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Trimite solicitarea
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default NewTicketModal;
