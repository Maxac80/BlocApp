import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, CheckCircle, Bell, Wallet } from 'lucide-react';

/**
 * Modal Plată Online pentru Owner Portal
 *
 * Formular cu checkboxuri separate pentru întreținere și penalități.
 * Penalitățile se încasează separat (chitanță separată).
 * Suma e editabilă per categorie, pre-completată cu totalul.
 *
 * La click "Plătește" → mesaj "În dezvoltare" + "Notifică-mă" (plata nu e încă implementată)
 */
export default function OwnerPaymentModal({
  show,
  onClose,
  apartmentNumber,
  intretinereTotal = 0,
  restante = 0,
  currentMaintenance = 0,
  penalitati = 0
}) {
  // Checkboxuri
  const [payIntretinere, setPayIntretinere] = useState(true);
  const [payPenalitati, setPayPenalitati] = useState(true);

  // Sume editabile
  const [intretinereAmount, setIntretinereAmount] = useState('');
  const [penalitatiAmount, setPenalitatiAmount] = useState('');

  // Pas: 'form' sau 'developing'
  const [step, setStep] = useState('form');

  // Confirmare notificare
  const [showNotifyConfirm, setShowNotifyConfirm] = useState(false);

  // Pre-completează sumele la deschidere
  useEffect(() => {
    if (show) {
      setIntretinereAmount(intretinereTotal > 0 ? intretinereTotal.toFixed(2) : '');
      setPenalitatiAmount(penalitati > 0 ? penalitati.toFixed(2) : '');
      setPayIntretinere(intretinereTotal > 0);
      setPayPenalitati(penalitati > 0);
      setStep('form');
      setShowNotifyConfirm(false);
    }
  }, [show, intretinereTotal, penalitati]);

  if (!show) return null;

  // Parse sume
  const parsedIntretinere = payIntretinere ? (parseFloat(intretinereAmount) || 0) : 0;
  const parsedPenalitati = payPenalitati ? (parseFloat(penalitatiAmount) || 0) : 0;
  const totalPayment = parsedIntretinere + parsedPenalitati;

  // Validări
  const intretinereValid = !payIntretinere || (parsedIntretinere > 0 && parsedIntretinere <= intretinereTotal);
  const penalitatiValid = !payPenalitati || (parsedPenalitati > 0 && parsedPenalitati <= penalitati);
  const canPay = totalPayment > 0 && intretinereValid && penalitatiValid;

  // Handler toggle checkbox
  const handleToggleIntretinere = () => {
    const next = !payIntretinere;
    setPayIntretinere(next);
    if (next) setIntretinereAmount(intretinereTotal.toFixed(2));
  };

  const handleTogglePenalitati = () => {
    const next = !payPenalitati;
    setPayPenalitati(next);
    if (next) setPenalitatiAmount(penalitati.toFixed(2));
  };

  // Handler input sumă
  const handleIntretinereChange = (e) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setIntretinereAmount(val);
    }
  };

  const handlePenalitatiChange = (e) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setPenalitatiAmount(val);
    }
  };

  // Blur: validare max
  const handleIntretinereBlur = () => {
    const val = parseFloat(intretinereAmount) || 0;
    if (val > intretinereTotal) {
      setIntretinereAmount(intretinereTotal.toFixed(2));
    }
  };

  const handlePenalitatiBlur = () => {
    const val = parseFloat(penalitatiAmount) || 0;
    if (val > penalitati) {
      setPenalitatiAmount(penalitati.toFixed(2));
    }
  };

  const handlePay = () => {
    setStep('developing');
  };

  const handleNotify = () => {
    setStep('form');
    setShowNotifyConfirm(true);
  };

  const handleClose = () => {
    setShowNotifyConfirm(false);
    setStep('form');
    onClose();
  };

  const fmt = (n) => parseFloat(n).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Modal confirmare notificare
  if (showNotifyConfirm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Înregistrat cu succes!</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            Vei primi o notificare când funcționalitatea de plată online devine disponibilă.
          </p>
          <button
            onClick={handleClose}
            className="w-full bg-emerald-600 text-white py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium hover:bg-emerald-700 transition-colors"
          >
            Perfect, mulțumesc!
          </button>
        </div>
      </div>
    );
  }

  // Ecran "În dezvoltare" (după click Plătește)
  if (step === 'developing') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-6 text-white text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold">Plată Online</h3>
            <p className="text-emerald-100 mt-1 text-sm sm:text-base">Ap. {apartmentNumber}</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-start">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm sm:text-base font-medium text-amber-800">În dezvoltare</p>
                  <p className="text-xs sm:text-sm text-amber-700 mt-1">
                    Funcționalitatea de plată online va fi disponibilă în curând.
                    Poți fi notificat când devine activă.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm sm:text-base text-gray-600">Sumă selectată:</span>
                <span className="text-xl sm:text-2xl font-bold text-gray-900">{fmt(totalPayment)} lei</span>
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 space-y-0.5">
                {parsedIntretinere > 0 && <p>Întreținere: {fmt(parsedIntretinere)} lei</p>}
                {parsedPenalitati > 0 && <p>Penalități: {fmt(parsedPenalitati)} lei</p>}
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
              <p className="text-xs sm:text-sm font-medium text-gray-700">Metode disponibile în curând:</p>
              <div className="flex items-center p-2.5 sm:p-3 bg-gray-100 rounded-lg opacity-60">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mr-2 sm:mr-3" />
                <span className="text-sm sm:text-base text-gray-500">Card bancar (Visa, Mastercard)</span>
              </div>
              <div className="flex items-center p-2.5 sm:p-3 bg-gray-100 rounded-lg opacity-60">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mr-2 sm:mr-3" />
                <span className="text-sm sm:text-base text-gray-500">Transfer bancar</span>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex gap-2 sm:gap-3">
            <button
              onClick={handleNotify}
              className="flex-1 bg-emerald-600 text-white py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Notifică-mă
            </button>
            <button
              onClick={handleClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium hover:bg-gray-200 transition-colors"
            >
              Închide
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Formular principal
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-6 text-white text-center flex-shrink-0">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <CreditCard className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold">Plată Online</h3>
          <p className="text-emerald-100 mt-1 text-sm sm:text-base">Ap. {apartmentNumber}</p>
        </div>

        {/* Content - scrollabil */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <p className="text-sm sm:text-base font-medium text-gray-700 mb-3 sm:mb-4">Ce vrei să plătești?</p>

          {/* Card Întreținere */}
          {intretinereTotal > 0 && (
            <div className={`rounded-xl border-2 p-3 sm:p-4 mb-3 sm:mb-4 transition-colors ${
              payIntretinere ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'
            }`}>
              {/* Toggle */}
              <label className="flex items-center justify-between cursor-pointer mb-2 sm:mb-3">
                <span className="text-sm sm:text-base font-semibold text-gray-900">Întreținere</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={payIntretinere}
                  onClick={handleToggleIntretinere}
                  className={`relative w-10 h-5 sm:w-11 sm:h-6 rounded-full transition-colors ${
                    payIntretinere ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 sm:top-0.5 left-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full shadow transition-transform ${
                    payIntretinere ? 'translate-x-5 sm:translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </label>

              {/* Breakdown */}
              <div className={`text-xs sm:text-sm space-y-1 mb-2 sm:mb-3 ${payIntretinere ? 'text-gray-600' : 'text-gray-400'}`}>
                {restante > 0 && (
                  <div className="flex justify-between">
                    <span>Restanțe:</span>
                    <span className="font-medium">{fmt(restante)} lei</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Întreținere curentă:</span>
                  <span className="font-medium">{fmt(currentMaintenance)} lei</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-200">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">{fmt(intretinereTotal)} lei</span>
                </div>
              </div>

              {/* Input sumă */}
              <div className="flex items-center gap-2">
                <label className={`text-xs sm:text-sm ${payIntretinere ? 'text-gray-700' : 'text-gray-400'}`}>
                  Sumă:
                </label>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={payIntretinere ? intretinereAmount : ''}
                    onChange={handleIntretinereChange}
                    onBlur={handleIntretinereBlur}
                    disabled={!payIntretinere}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 text-sm sm:text-base rounded-lg border text-right pr-10 ${
                      payIntretinere
                        ? (intretinereValid ? 'border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' : 'border-red-400 bg-red-50')
                        : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                    }`}
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm ${payIntretinere ? 'text-gray-500' : 'text-gray-400'}`}>
                    lei
                  </span>
                </div>
              </div>
              {payIntretinere && !intretinereValid && parsedIntretinere > intretinereTotal && (
                <p className="text-[10px] sm:text-xs text-red-500 mt-1 text-right">
                  Suma maximă: {fmt(intretinereTotal)} lei
                </p>
              )}
            </div>
          )}

          {/* Card Penalități — doar dacă sunt > 0 */}
          {penalitati > 0 && (
            <div className={`rounded-xl border-2 p-3 sm:p-4 mb-3 sm:mb-4 transition-colors ${
              payPenalitati ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'
            }`}>
              {/* Toggle */}
              <label className="flex items-center justify-between cursor-pointer mb-2 sm:mb-3">
                <span className="text-sm sm:text-base font-semibold text-gray-900">Penalități</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={payPenalitati}
                  onClick={handleTogglePenalitati}
                  className={`relative w-10 h-5 sm:w-11 sm:h-6 rounded-full transition-colors ${
                    payPenalitati ? 'bg-orange-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 sm:top-0.5 left-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full shadow transition-transform ${
                    payPenalitati ? 'translate-x-5 sm:translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </label>

              {/* Total */}
              <div className={`text-xs sm:text-sm mb-2 sm:mb-3 ${payPenalitati ? 'text-gray-600' : 'text-gray-400'}`}>
                <div className="flex justify-between">
                  <span className="font-medium">Total penalități:</span>
                  <span className="font-bold">{fmt(penalitati)} lei</span>
                </div>
              </div>

              {/* Input sumă */}
              <div className="flex items-center gap-2">
                <label className={`text-xs sm:text-sm ${payPenalitati ? 'text-gray-700' : 'text-gray-400'}`}>
                  Sumă:
                </label>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={payPenalitati ? penalitatiAmount : ''}
                    onChange={handlePenalitatiChange}
                    onBlur={handlePenalitatiBlur}
                    disabled={!payPenalitati}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 text-sm sm:text-base rounded-lg border text-right pr-10 ${
                      payPenalitati
                        ? (penalitatiValid ? 'border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500' : 'border-red-400 bg-red-50')
                        : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                    }`}
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm ${payPenalitati ? 'text-gray-500' : 'text-gray-400'}`}>
                    lei
                  </span>
                </div>
              </div>
              {payPenalitati && !penalitatiValid && parsedPenalitati > penalitati && (
                <p className="text-[10px] sm:text-xs text-red-500 mt-1 text-right">
                  Suma maximă: {fmt(penalitati)} lei
                </p>
              )}
            </div>
          )}

          {/* Total de plată */}
          <div className="border-t border-gray-200 pt-3 sm:pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base font-medium text-gray-700">Total de plată:</span>
              <span className="text-lg sm:text-xl font-bold text-gray-900">{fmt(totalPayment)} lei</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-shrink-0 space-y-2 sm:space-y-3">
          <button
            onClick={handlePay}
            disabled={!canPay}
            className={`w-full py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium transition-colors flex items-center justify-center ${
              canPay
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            {canPay ? `Plătește ${fmt(totalPayment)} lei` : 'Selectează ce vrei să plătești'}
          </button>
          <button
            onClick={handleClose}
            className="w-full bg-gray-100 text-gray-700 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium hover:bg-gray-200 transition-colors"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}
