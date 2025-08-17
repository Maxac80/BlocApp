import React, { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';
import { generateDetailedReceipt } from '../../utils/receiptGenerator';

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

  // Resetează datele când se deschide modalul
  useEffect(() => {
    if (showPaymentModal && selectedApartment) {
      setPaymentData({
        restante: '',
        intretinere: '',
        penalitati: ''
      });
      setFixedAmount('');
    }
  }, [showPaymentModal, selectedApartment]);

  if (!showPaymentModal || !selectedApartment) return null;

  const handleInputChange = (field, value) => {
    // Validare input numeric
    if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
      const normalizedValue = value.replace(',', '.');
      const numericValue = parseFloat(normalizedValue) || 0;
      
      // Validare maximum pentru fiecare câmp
      let maxAmount = 0;
      if (field === 'restante') maxAmount = selectedApartment.restante;
      if (field === 'intretinere') maxAmount = selectedApartment.intretinere;
      if (field === 'penalitati') maxAmount = selectedApartment.penalitati;
      
      // Nu permite valori mai mari decât maximul
      if (numericValue <= maxAmount || normalizedValue === '') {
        setPaymentData(prev => ({
          ...prev,
          [field]: normalizedValue
        }));
      }
    }
  };

  const handleIntegralPayment = (field, amount) => {
    setPaymentData(prev => ({
      ...prev,
      [field]: amount.toString()
    }));
  };

  const handleFixedAmountChange = (value) => {
    if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
      const normalizedValue = value.replace(',', '.');
      setFixedAmount(normalizedValue);
    }
  };

  const distributeFixedAmount = () => {
    const amount = parseFloat(fixedAmount) || 0;
    if (amount <= 0) return;

    let remaining = amount;
    const newPaymentData = { restante: '', intretinere: '', penalitati: '' };

    // 1. Întâi restanțele
    if (remaining > 0 && selectedApartment.restante > 0) {
      const restantePayment = Math.min(remaining, selectedApartment.restante);
      newPaymentData.restante = restantePayment.toString();
      remaining -= restantePayment;
    }

    // 2. Apoi întreținerea
    if (remaining > 0 && selectedApartment.intretinere > 0) {
      const intretinerePayment = Math.min(remaining, selectedApartment.intretinere);
      newPaymentData.intretinere = intretinerePayment.toString();
      remaining -= intretinerePayment;
    }

    // 3. În final penalitățile
    if (remaining > 0 && selectedApartment.penalitati > 0) {
      const penalitatiPayment = Math.min(remaining, selectedApartment.penalitati);
      newPaymentData.penalitati = penalitatiPayment.toString();
      remaining -= penalitatiPayment;
    }

    setPaymentData(newPaymentData);
    
    if (remaining > 0) {
      alert(`⚠️ Suma depășește totalul datorat cu ${remaining.toFixed(2)} lei. A fost distribuită integral pe categoriile disponibile.`);
    }
  };

  const calculateTotal = () => {
    const restante = parseFloat(paymentData.restante) || 0;
    const intretinere = parseFloat(paymentData.intretinere) || 0;
    const penalitati = parseFloat(paymentData.penalitati) || 0;
    return restante + intretinere + penalitati;
  };

  const calculateRemaining = () => {
    const totalIncasat = calculateTotal();
    const restRamas = selectedApartment.totalDatorat - totalIncasat;
    return Math.max(0, restRamas); // Nu poate fi negativ
  };

  const getRemainingBreakdown = () => {
    const restantePaid = parseFloat(paymentData.restante) || 0;
    const intretinerePaid = parseFloat(paymentData.intretinere) || 0;
    const penalitatiPaid = parseFloat(paymentData.penalitati) || 0;

    const restanteRemaining = Math.max(0, selectedApartment.restante - restantePaid);
    const intretinereRemaining = Math.max(0, selectedApartment.intretinere - intretinerePaid);
    const penalitatiRemaining = Math.max(0, selectedApartment.penalitati - penalitatiPaid);

    return {
      restante: restanteRemaining,
      intretinere: intretinereRemaining,
      penalitati: penalitatiRemaining
    };
  };

  const isRestanteFullyPaid = () => {
    const paidRestante = parseFloat(paymentData.restante) || 0;
    return paidRestante >= selectedApartment.restante;
  };

  const handleSave = () => {
    const totalIncasat = calculateTotal();
    
    if (totalIncasat <= 0) {
      alert('⚠️ Introduceți o sumă pentru încasare!');
      return;
    }

    // Validări
    const restantePaid = parseFloat(paymentData.restante) || 0;
    const intretinerePaid = parseFloat(paymentData.intretinere) || 0;
    const penalitatiPaid = parseFloat(paymentData.penalitati) || 0;

    if (restantePaid > selectedApartment.restante) {
      alert('⚠️ Nu puteți încasa mai mult decât restanțele!');
      return;
    }

    if (intretinerePaid > selectedApartment.intretinere && intretinerePaid > 0) {
      alert('⚠️ Nu puteți încasa mai mult decât întreținerea curentă!');
      return;
    }

    if (penalitatiPaid > selectedApartment.penalitati) {
      alert('⚠️ Nu puteți încasa mai mult decât penalitățile!');
      return;
    }

    // Verifică ordinea obligatorie - întreținerea doar după restanțe
    if (intretinerePaid > 0 && restantePaid < selectedApartment.restante) {
      alert('⚠️ Nu puteți încasa întreținerea fără să acoperiți întâi restanțele!');
      return;
    }

    // Salvează plata
    const payment = {
      apartmentId: selectedApartment.apartmentId,
      restante: restantePaid,
      intretinere: intretinerePaid,
      penalitati: penalitatiPaid,
      total: totalIncasat,
      timestamp: new Date().toISOString(),
      month: currentMonth
    };

    // Întreabă utilizatorul dacă dorește chitanță
    const generateReceipt = window.confirm(
      `✅ Plată înregistrată: ${totalIncasat.toFixed(2)} lei pentru Ap. ${selectedApartment.apartmentNumber}\n\n` +
      `Doriți să generați chitanța PDF?`
    );

    if (generateReceipt) {
      try {
        // Pregătește datele pentru chitanță
        const apartmentData = {
          apartmentNumber: selectedApartment.apartmentNumber,
          owner: selectedApartment.owner,
          totalDatorat: selectedApartment.totalDatorat,
          restante: selectedApartment.restante,
          intretinere: selectedApartment.intretinere,
          penalitati: selectedApartment.penalitati,
          initialBalance: selectedApartment.initialBalance
        };

        const associationData = {
          name: selectedApartment.associationName || "Asociația Proprietarilor",
          address: selectedApartment.associationAddress || ""
        };

        // Generează chitanța
        const result = generateDetailedReceipt(payment, apartmentData, associationData);
        
        if (result.success) {
          alert(`✅ Chitanța a fost generată: ${result.fileName}`);
        } else {
          alert(`❌ Eroare la generarea chitanței: ${result.error}`);
        }
      } catch (error) {
        console.error('Eroare la generarea chitanței:', error);
        alert('❌ Eroare la generarea chitanței. Verificați consola pentru detalii.');
      }
    } else {
      alert(`✅ Plată înregistrată: ${totalIncasat.toFixed(2)} lei pentru Ap. ${selectedApartment.apartmentNumber}`);
    }

    onSavePayment(payment);
    setShowPaymentModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[95vh] flex flex-col">
        <div className="p-6 bg-green-50 border-b flex items-center justify-between">
          <h3 className="text-xl font-semibold">
            💰 Înregistrare Încasare - Ap. {selectedApartment.apartmentNumber}
          </h3>
          <button
            onClick={() => setShowPaymentModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Proprietar */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-800">{selectedApartment.owner}</p>
            <p className="text-sm text-gray-600">{currentMonth}</p>
          </div>

          {/* Situația curentă */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">📊 SITUAȚIA CURENTĂ:</h4>
            <div className="space-y-2 text-sm">
              {/* Afișează breakdown-ul restanțelor dacă există solduri inițiale */}
              {selectedApartment.initialBalance && (selectedApartment.initialBalance.restante > 0) && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="flex justify-between mb-1">
                    <span className="text-yellow-800">✓ Restanțe anterioare (până în {new Date().toLocaleDateString('ro-RO', {month: 'long', year: 'numeric'})}):</span>
                    <span className="font-semibold text-yellow-700">
                      {selectedApartment.initialBalance.restante.toFixed(2)} lei
                    </span>
                  </div>
                  {(selectedApartment.restante - selectedApartment.initialBalance.restante) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-yellow-800">✓ Restanțe post-BlocApp:</span>
                      <span className="font-semibold text-yellow-700">
                        {(selectedApartment.restante - selectedApartment.initialBalance.restante).toFixed(2)} lei
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Total restanțe (dacă nu există breakdown sau există restanțe suplimentare) */}
              {selectedApartment.restante > 0 && (
                <div className="flex justify-between">
                  <span>
                    {selectedApartment.initialBalance?.restante > 0 ? 'Total restanțe:' : 'Restanțe:'}
                  </span>
                  <span className="font-semibold text-red-600">
                    {selectedApartment.restante.toFixed(2)} lei
                  </span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span>Întreținere curentă:</span>
                <span className="font-semibold text-blue-600">
                  {selectedApartment.intretinere.toFixed(2)} lei
                </span>
              </div>
              
              {selectedApartment.restante > 0 && (
                <div className="flex justify-between">
                  <span>Total întreținere:</span>
                  <span className="font-semibold text-purple-600">
                    {(selectedApartment.restante + selectedApartment.intretinere).toFixed(2)} lei
                  </span>
                </div>
              )}
              
              {/* Afișează breakdown-ul penalităților dacă există solduri inițiale */}
              {selectedApartment.initialBalance && (selectedApartment.initialBalance.penalitati > 0) && (
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="flex justify-between mb-1">
                    <span className="text-orange-800">✓ Penalități anterioare:</span>
                    <span className="font-semibold text-orange-700">
                      {selectedApartment.initialBalance.penalitati.toFixed(2)} lei
                    </span>
                  </div>
                  {(selectedApartment.penalitati - selectedApartment.initialBalance.penalitati) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-orange-800">✓ Penalități post-BlocApp:</span>
                      <span className="font-semibold text-orange-700">
                        {(selectedApartment.penalitati - selectedApartment.initialBalance.penalitati).toFixed(2)} lei
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {selectedApartment.penalitati > 0 && (
                <div className="flex justify-between">
                  <span>
                    {selectedApartment.initialBalance?.penalitati > 0 ? 'Total penalități:' : 'Penalități:'}
                  </span>
                  <span className="font-semibold text-orange-600">
                    {selectedApartment.penalitati.toFixed(2)} lei
                  </span>
                </div>
              )}
              
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Total datorat:</span>
                <span className="text-gray-800">
                  {selectedApartment.totalDatorat.toFixed(2)} lei
                </span>
              </div>
            </div>
          </div>

          {/* Distribu

ie automată sumă fixă */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">🚀 DISTRIBUȚIE AUTOMATĂ:</h4>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Suma totală adusă de proprietar:
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fixedAmount}
                    onChange={(e) => handleFixedAmountChange(e.target.value)}
                    className="w-full p-2 border rounded-lg text-right"
                    placeholder="Ex: 300,00"
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
              <p className="text-xs text-blue-600 mt-2">
                💡 Suma va fi distribuită automat: restanțe → întreținere → penalități
              </p>
            </div>
          </div>

          {/* Înregistrare plăți */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">💸 SAU ÎNREGISTRARE MANUALĂ:</h4>
            
            {/* Restanțe - afișat doar dacă > 0 */}
            {selectedApartment.restante > 0 && (
              <div className="mb-4 p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium text-gray-700">1. Restanțe:</label>
                  <button
                    onClick={() => handleIntegralPayment('restante', selectedApartment.restante)}
                    className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                  >
                    Integral
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={paymentData.restante}
                  onChange={(e) => handleInputChange('restante', e.target.value)}
                  className="w-full p-2 border rounded-lg text-right"
                  placeholder="0,00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max: {selectedApartment.restante.toFixed(2)} lei
                </p>
              </div>
            )}

            {/* Întreținere curentă - afișat întotdeauna (este suma principală) */}
            <div className="mb-4 p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-gray-700">
                  {selectedApartment.restante > 0 ? '2.' : '1.'} Întreținere curentă:
                </label>
                <button
                  onClick={() => handleIntegralPayment('intretinere', selectedApartment.intretinere)}
                  disabled={selectedApartment.restante > 0 && !isRestanteFullyPaid()}
                  className={`text-xs px-2 py-1 rounded ${
                    (selectedApartment.restante === 0 || isRestanteFullyPaid())
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Integral
                </button>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={paymentData.intretinere}
                onChange={(e) => handleInputChange('intretinere', e.target.value)}
                disabled={selectedApartment.restante > 0 && !isRestanteFullyPaid()}
                className={`w-full p-2 border rounded-lg text-right ${
                  (selectedApartment.restante > 0 && !isRestanteFullyPaid()) ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="0,00"
              />
              <p className="text-xs text-gray-500 mt-1">
                {(selectedApartment.restante > 0 && !isRestanteFullyPaid()) ? (
                  <span className="text-orange-600">🔒 Acoperiți întâi restanțele</span>
                ) : (
                  `Max: ${selectedApartment.intretinere.toFixed(2)} lei`
                )}
              </p>
            </div>

            {/* Penalități - afișat doar dacă > 0 */}
            {selectedApartment.penalitati > 0 && (
              <div className="mb-4 p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium text-gray-700">
                    {selectedApartment.restante > 0 ? '3.' : '2.'} Penalități:
                  </label>
                  <button
                    onClick={() => handleIntegralPayment('penalitati', selectedApartment.penalitati)}
                    className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200"
                  >
                    Integral
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={paymentData.penalitati}
                  onChange={(e) => handleInputChange('penalitati', e.target.value)}
                  className="w-full p-2 border rounded-lg text-right"
                  placeholder="0,00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max: {selectedApartment.penalitati.toFixed(2)} lei
                </p>
              </div>
            )}
          </div>

          {/* Total încasat și rest de plată */}
          <div className="space-y-3">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex justify-between items-center font-bold text-lg">
                <span>TOTAL ÎNCASAT:</span>
                <span className="text-green-600">{calculateTotal().toFixed(2)} lei</span>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg ${calculateRemaining() > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50'}`}>
              <div className="flex justify-between items-center font-bold text-lg mb-2">
                <span>REST DE PLATĂ:</span>
                <span className={calculateRemaining() > 0 ? 'text-orange-600' : 'text-blue-600'}>
                  {calculateRemaining().toFixed(2)} lei
                </span>
              </div>
              
              {calculateRemaining() === 0 ? (
                <p className="text-sm text-blue-600 text-center">✅ Plată completă!</p>
              ) : (
                <div className="text-sm space-y-1">
                  <p className="font-medium text-gray-700 mb-1">Detaliu rest:</p>
                  {(() => {
                    const remaining = getRemainingBreakdown();
                    return (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {remaining.restante > 0 && (
                          <div className="text-red-600">
                            Restanțe: {remaining.restante.toFixed(2)}
                          </div>
                        )}
                        {remaining.intretinere > 0 && (
                          <div className="text-blue-600">
                            Întreținere: {remaining.intretinere.toFixed(2)}
                          </div>
                        )}
                        {remaining.penalitati > 0 && (
                          <div className="text-orange-600">
                            Penalități: {remaining.penalitati.toFixed(2)}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Warning pentru ordine - doar dacă există restanțe */}
          {selectedApartment.restante > 0 && !isRestanteFullyPaid() && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Întreținerea se poate plăti doar după acoperirea completă a restanțelor
              </p>
            </div>
          )}
        </div>
        </div>
        
        <div className="p-6 bg-gray-50 border-t flex justify-between">
          <button
            onClick={() => setShowPaymentModal(false)}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
          >
            Anulează
          </button>

          <button
            onClick={handleSave}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Salvează Plata
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;