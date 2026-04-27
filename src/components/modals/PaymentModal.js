/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Coins,
  Zap,
  Receipt,
  AlertCircle,
  CheckCircle,
  HandCoins,
  FileText,
  Lock
} from 'lucide-react';
import { generateDetailedReceipt } from '../../utils/receiptGenerator';

const fmt = (n) => `${Number(n || 0).toFixed(2)} lei`;

const PaymentModal = ({
  showPaymentModal,
  setShowPaymentModal,
  currentMonth,
  selectedApartment,
  onSavePayment
}) => {
  const [paymentData, setPaymentData] = useState({
    restante: '',
    intretinere: '',
    penalitati: ''
  });
  const [fixedAmount, setFixedAmount] = useState('');
  const [generatePdf, setGeneratePdf] = useState(true);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'warn', text }

  // Reset la deschidere
  useEffect(() => {
    if (showPaymentModal && selectedApartment) {
      setPaymentData({ restante: '', intretinere: '', penalitati: '' });
      setFixedAmount('');
      setErrors({});
      setFeedback(null);
      setGeneratePdf(true);
    }
  }, [showPaymentModal, selectedApartment]);

  // Auto-clear feedback după 4s
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const restanteMax = Number(selectedApartment?.restante) || 0;
  const intretinereMax = Number(selectedApartment?.intretinere) || 0;
  const penalitatiMax = Number(selectedApartment?.penalitati) || 0;
  const totalDatorat = Number(selectedApartment?.totalDatorat) || 0;
  const initialBalance = selectedApartment?.initialBalance;

  const handleInputChange = (field, value) => {
    if (value !== '' && !/^\d*[.,]?\d*$/.test(value)) return;
    const normalizedValue = value.replace(',', '.');
    const numericValue = parseFloat(normalizedValue) || 0;

    let maxAmount = 0;
    if (field === 'restante') maxAmount = restanteMax;
    if (field === 'intretinere') maxAmount = intretinereMax;
    if (field === 'penalitati') maxAmount = penalitatiMax;

    if (numericValue <= maxAmount || normalizedValue === '') {
      setPaymentData((prev) => ({ ...prev, [field]: normalizedValue }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleIntegralPayment = (field, amount) => {
    setPaymentData((prev) => ({ ...prev, [field]: amount.toString() }));
  };

  const handleFixedAmountChange = (value) => {
    if (value !== '' && !/^\d*[.,]?\d*$/.test(value)) return;
    setFixedAmount(value.replace(',', '.'));
  };

  const distributeFixedAmount = () => {
    const amount = parseFloat(fixedAmount) || 0;
    if (amount <= 0) return;

    let remaining = amount;
    const newPaymentData = { restante: '', intretinere: '', penalitati: '' };

    if (remaining > 0 && restanteMax > 0) {
      const pay = Math.min(remaining, restanteMax);
      newPaymentData.restante = pay.toString();
      remaining -= pay;
    }
    if (remaining > 0 && intretinereMax > 0) {
      const pay = Math.min(remaining, intretinereMax);
      newPaymentData.intretinere = pay.toString();
      remaining -= pay;
    }
    if (remaining > 0 && penalitatiMax > 0) {
      const pay = Math.min(remaining, penalitatiMax);
      newPaymentData.penalitati = pay.toString();
      remaining -= pay;
    }

    setPaymentData(newPaymentData);
    setErrors({});

    if (remaining > 0) {
      setFeedback({
        type: 'warn',
        text: `Suma depășește totalul cu ${remaining.toFixed(2)} lei. Distribuită integral pe categoriile disponibile.`
      });
    }
  };

  const totalIncasat = useMemo(() => {
    const r = parseFloat(paymentData.restante) || 0;
    const i = parseFloat(paymentData.intretinere) || 0;
    const p = parseFloat(paymentData.penalitati) || 0;
    return r + i + p;
  }, [paymentData]);

  const restRamas = Math.max(0, totalDatorat - totalIncasat);

  const remainingBreakdown = useMemo(() => {
    const r = parseFloat(paymentData.restante) || 0;
    const i = parseFloat(paymentData.intretinere) || 0;
    const p = parseFloat(paymentData.penalitati) || 0;
    return {
      restante: Math.max(0, restanteMax - r),
      intretinere: Math.max(0, intretinereMax - i),
      penalitati: Math.max(0, penalitatiMax - p)
    };
  }, [paymentData, restanteMax, intretinereMax, penalitatiMax]);

  if (!showPaymentModal || !selectedApartment) return null;

  const isRestanteFullyPaid = (parseFloat(paymentData.restante) || 0) >= restanteMax;

  const progressPct = totalDatorat > 0 ? Math.min(100, (totalIncasat / totalDatorat) * 100) : 0;

  const validate = () => {
    const next = {};
    if (totalIncasat <= 0) {
      next._global = 'Introduceți o sumă pentru încasare.';
    }
    const restantePaid = parseFloat(paymentData.restante) || 0;
    const intretinerePaid = parseFloat(paymentData.intretinere) || 0;
    const penalitatiPaid = parseFloat(paymentData.penalitati) || 0;

    if (restantePaid > restanteMax) next.restante = 'Depășește restanțele datorate.';
    if (intretinerePaid > intretinereMax) next.intretinere = 'Depășește întreținerea curentă.';
    if (penalitatiPaid > penalitatiMax) next.penalitati = 'Depășește penalitățile.';
    if (intretinerePaid > 0 && restantePaid < restanteMax) {
      next.intretinere = 'Acoperiți întâi restanțele.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      setFeedback({ type: 'error', text: 'Verificați câmpurile marcate.' });
      return;
    }

    const restantePaid = parseFloat(paymentData.restante) || 0;
    const intretinerePaid = parseFloat(paymentData.intretinere) || 0;
    const penalitatiPaid = parseFloat(paymentData.penalitati) || 0;

    const payment = {
      apartmentId: selectedApartment.apartmentId,
      restante: restantePaid,
      intretinere: intretinerePaid,
      penalitati: penalitatiPaid,
      total: totalIncasat,
      timestamp: new Date().toISOString(),
      month: currentMonth
    };

    if (generatePdf) {
      try {
        const apartmentData = {
          apartmentNumber: selectedApartment.apartmentNumber,
          owner: selectedApartment.owner,
          totalDatorat,
          restante: restanteMax,
          intretinere: intretinereMax,
          penalitati: penalitatiMax,
          initialBalance
        };
        const associationData = {
          name: selectedApartment.associationName || 'Asociația Proprietarilor',
          address: selectedApartment.associationAddress || ''
        };
        generateDetailedReceipt(payment, apartmentData, associationData);
      } catch (error) {
        console.error('Eroare la generarea chitanței:', error);
      }
    }

    onSavePayment(payment);
    setShowPaymentModal(false);
  };

  const ownerInitial = (selectedApartment.owner || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md md:max-w-lg max-h-[95vh] flex flex-col">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 sm:px-6 py-4 rounded-t-2xl flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg flex-shrink-0">
              {ownerInitial}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                Încasare Ap. {selectedApartment.apartmentNumber}
              </h3>
              <p className="text-sm text-white/90 truncate">{selectedApartment.owner}</p>
              <p className="text-xs text-white/75">{currentMonth}</p>
            </div>
          </div>
          <button
            onClick={() => setShowPaymentModal(false)}
            className="text-white/80 hover:text-white p-1 -m-1"
            aria-label="Închide"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Conținut scrollabil */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {/* Situația curentă */}
          <section>
            <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-gray-500" />
              Situația curentă
            </h4>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-1.5 text-sm">
              {restanteMax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Restanțe</span>
                  <span className="font-semibold text-red-600">{fmt(restanteMax)}</span>
                </div>
              )}
              {initialBalance?.restante > 0 && (
                <div className="flex justify-between text-xs pl-3 text-gray-500">
                  <span>↳ din care anterior BlocApp</span>
                  <span>{fmt(initialBalance.restante)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Întreținere curentă</span>
                <span className="font-semibold text-blue-600">{fmt(intretinereMax)}</span>
              </div>
              {penalitatiMax > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Penalități</span>
                    <span className="font-semibold text-orange-600">{fmt(penalitatiMax)}</span>
                  </div>
                  {initialBalance?.penalitati > 0 && (
                    <div className="flex justify-between text-xs pl-3 text-gray-500">
                      <span>↳ din care anterior BlocApp</span>
                      <span>{fmt(initialBalance.penalitati)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="border-t border-gray-200 pt-1.5 mt-1.5 flex justify-between font-bold">
                <span>Total datorat</span>
                <span className="text-gray-900">{fmt(totalDatorat)}</span>
              </div>
            </div>
          </section>

          {/* Distribuție automată */}
          <section>
            <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-500" />
              Distribuție automată
            </h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">Suma adusă de proprietar</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fixedAmount}
                    onChange={(e) => handleFixedAmountChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="0.00"
                  />
                </div>
                <button
                  onClick={distributeFixedAmount}
                  disabled={!fixedAmount || parseFloat(fixedAmount) <= 0}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Distribuie
                </button>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Ordine: restanțe → întreținere → penalități
              </p>
            </div>
          </section>

          {/* Înregistrare manuală */}
          <section>
            <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-1.5">
              <HandCoins className="w-4 h-4 text-gray-500" />
              Înregistrare manuală
            </h4>
            <div className="space-y-3">
              {restanteMax > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Restanțe</label>
                    <button
                      type="button"
                      onClick={() => handleIntegralPayment('restante', restanteMax)}
                      className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded hover:bg-red-100"
                    >
                      Integral {fmt(restanteMax)}
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={paymentData.restante}
                    onChange={(e) => handleInputChange('restante', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-right text-sm focus:outline-none focus:ring-2 ${
                      errors.restante ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-green-400'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.restante && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.restante}
                    </p>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    Întreținere
                    {restanteMax > 0 && !isRestanteFullyPaid && (
                      <Lock className="w-3 h-3 text-gray-400" />
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleIntegralPayment('intretinere', intretinereMax)}
                    disabled={restanteMax > 0 && !isRestanteFullyPaid}
                    className={`text-xs px-2 py-0.5 rounded ${
                      restanteMax > 0 && !isRestanteFullyPaid
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    Integral {fmt(intretinereMax)}
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={paymentData.intretinere}
                  onChange={(e) => handleInputChange('intretinere', e.target.value)}
                  disabled={restanteMax > 0 && !isRestanteFullyPaid}
                  className={`w-full px-3 py-2 border rounded-lg text-right text-sm focus:outline-none focus:ring-2 ${
                    errors.intretinere ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-green-400'
                  } ${restanteMax > 0 && !isRestanteFullyPaid ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  placeholder="0.00"
                />
                {errors.intretinere && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.intretinere}
                  </p>
                )}
                {restanteMax > 0 && !isRestanteFullyPaid && !errors.intretinere && (
                  <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Acoperiți întâi restanțele
                  </p>
                )}
              </div>

              {penalitatiMax > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Penalități</label>
                    <button
                      type="button"
                      onClick={() => handleIntegralPayment('penalitati', penalitatiMax)}
                      className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded hover:bg-orange-100"
                    >
                      Integral {fmt(penalitatiMax)}
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={paymentData.penalitati}
                    onChange={(e) => handleInputChange('penalitati', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-right text-sm focus:outline-none focus:ring-2 ${
                      errors.penalitati ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-green-400'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.penalitati && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.penalitati}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Rest detaliat dacă nu e plată completă */}
          {totalIncasat > 0 && restRamas > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700 mb-1.5">După această încasare mai rămâne:</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {remainingBreakdown.restante > 0 && (
                  <div>
                    <span className="text-gray-500">Restanțe</span>
                    <div className="font-semibold text-red-600">{fmt(remainingBreakdown.restante)}</div>
                  </div>
                )}
                {remainingBreakdown.intretinere > 0 && (
                  <div>
                    <span className="text-gray-500">Întreținere</span>
                    <div className="font-semibold text-blue-600">{fmt(remainingBreakdown.intretinere)}</div>
                  </div>
                )}
                {remainingBreakdown.penalitati > 0 && (
                  <div>
                    <span className="text-gray-500">Penalități</span>
                    <div className="font-semibold text-orange-600">{fmt(remainingBreakdown.penalitati)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feedback non-blocking */}
          {feedback && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                feedback.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : feedback.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}
          {errors._global && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errors._global}</span>
            </div>
          )}
        </div>

        {/* Footer sticky cu progres + acțiuni */}
        <div className="border-t border-gray-200 bg-gray-50 px-4 sm:px-6 pt-3 pb-3 sm:pb-4 rounded-b-2xl">
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-gray-600">Total încasat</span>
              <span className="text-base font-bold text-green-700 tabular-nums">{fmt(totalIncasat)}</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  progressPct >= 99.99 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-baseline justify-between mt-1 text-xs">
              <span className="text-gray-500">{Math.round(progressPct)}% din total datorat</span>
              <span className={restRamas > 0.01 ? 'text-orange-600 font-medium' : 'text-green-600 font-medium'}>
                {restRamas > 0.01 ? `Rest: ${fmt(restRamas)}` : '✓ Încasare completă'}
              </span>
            </div>
          </div>

          {/* Checkbox PDF */}
          <label className="flex items-center gap-2 mb-3 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={generatePdf}
              onChange={(e) => setGeneratePdf(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-400"
            />
            <FileText className="w-4 h-4 text-gray-500" />
            Generează chitanța PDF
          </label>

          {/* Butoane */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Anulează
            </button>
            <button
              onClick={handleSave}
              disabled={totalIncasat <= 0}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Salvează încasarea
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
