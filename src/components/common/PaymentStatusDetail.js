// src/components/common/PaymentStatusDetail.js
import React from 'react';
import { 
  CheckCircle, 
  Home, 
  AlertTriangle, 
  Clock,
  X
} from 'lucide-react';

const PaymentStatusDetail = ({ 
  paymentStatus,
  isPaid,
  isPartiallyPaid,
  paymentInfo,
  apartmentData 
}) => {

  if (!paymentStatus) {
    return <span className="text-gray-400 text-sm">—</span>;
  }

  // Debug logging (commented for production)
  // console.log('PaymentStatusDetail Debug:', {
  //   paymentStatus,
  //   isPaid,
  //   isPartiallyPaid,
  //   paymentInfo,
  //   apartmentData: apartmentData?.apartment
  // });

  // Calculează detaliile plății din paymentInfo
  const getPaymentBreakdown = () => {
    // Folosim noua structură de date din usePaymentSync
    if (!paymentInfo || !paymentInfo.hasPayments) {
      // console.log('No payment info or no payments for apartment:', apartmentData?.apartment);
      return null;
    }

    // Folosim datele agregate din totalsByCategory dacă sunt disponibile
    let totalIntretinere, totalRestante, totalPenalitati;
    
    if (paymentInfo.totalsByCategory) {
      totalIntretinere = paymentInfo.totalsByCategory.totalIntretinere || 0;
      totalRestante = paymentInfo.totalsByCategory.totalRestante || 0;
      totalPenalitati = paymentInfo.totalsByCategory.totalPenalitati || 0;
    } else if (paymentInfo.payments && paymentInfo.payments.length > 0) {
      // Fallback: calculăm din lista de plăți
      totalIntretinere = paymentInfo.payments.reduce((sum, p) => sum + (p.intretinere || 0), 0);
      totalRestante = paymentInfo.payments.reduce((sum, p) => sum + (p.restante || 0), 0);
      totalPenalitati = paymentInfo.payments.reduce((sum, p) => sum + (p.penalitati || 0), 0);
    } else {
      return null;
    }

    const totalPlatit = totalIntretinere + totalRestante + totalPenalitati;

    const breakdown = {
      intretinere: totalIntretinere,
      restante: totalRestante,
      penalitati: totalPenalitati,
      total: totalPlatit,
      paymentsCount: paymentInfo.paymentCount || 0,
      lastPayment: paymentInfo.payments?.[0] || null
    };
    
    // console.log('Payment breakdown calculated:', breakdown);
    return breakdown;
  };

  const paymentBreakdown = getPaymentBreakdown();

  // Iconițe pentru fiecare tip de plată
  const PaymentIcon = ({ type, amount }) => {
    if (amount <= 0) return null;

    const iconConfig = {
      intretinere: { 
        icon: Home, 
        color: 'text-blue-600 bg-blue-50', 
        name: 'Întreținere' 
      },
      restante: { 
        icon: Clock, 
        color: 'text-red-600 bg-red-50', 
        name: 'Restanțe' 
      },
      penalitati: { 
        icon: AlertTriangle, 
        color: 'text-orange-600 bg-orange-50', 
        name: 'Penalități' 
      }
    };

    const config = iconConfig[type];
    const Icon = config.icon;

    return (
      <div 
        className={`inline-flex items-center px-2 py-1 rounded-md ${config.color} mr-1 mb-1`}
      >
        <Icon className="w-3 h-3 mr-1" />
        <span className="text-xs font-medium">{amount.toFixed(0)}</span>
      </div>
    );
  };

  // Component principal pentru status
  const StatusContent = () => (
    <div className="relative">
      <div className="flex flex-col">
        {/* Status principal */}
        <div className={`flex items-center font-medium mb-1 ${
          isPaid ? 'text-green-600' : 
          isPartiallyPaid ? 'text-orange-600' : 
          'text-red-600'
        }`}>
          {isPaid && <CheckCircle className="w-4 h-4 mr-1" />}
          {isPartiallyPaid && <span className="w-4 h-4 mr-1 text-orange-500">◐</span>}
          {!isPaid && !isPartiallyPaid && <X className="w-4 h-4 mr-1" />}
          <span className="text-sm">{paymentStatus}</span>
        </div>

        {/* Detalii plată cu iconițe */}
        {paymentBreakdown && (isPaid || isPartiallyPaid) && (
          <div className="space-y-1">
            {/* Total plătit */}
            <div className="flex items-center text-xs text-gray-600 mb-1">
              Total: {paymentBreakdown.total.toFixed(2)} RON
            </div>
            
            {/* Breakdown pe categorii cu iconițe */}
            <div className="flex flex-wrap">
              <PaymentIcon 
                type="intretinere" 
                amount={paymentBreakdown.intretinere}
              />
              <PaymentIcon 
                type="restante" 
                amount={paymentBreakdown.restante}
              />
              <PaymentIcon 
                type="penalitati" 
                amount={paymentBreakdown.penalitati}
              />
            </div>

            {/* Info suplimentare */}
            {paymentBreakdown.paymentsCount > 1 && (
              <div className="text-xs text-gray-500">
                {paymentBreakdown.paymentsCount} plăți
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tooltip complex la mouseover */}
      {paymentBreakdown && (
        <div 
          className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 min-w-64"
          style={{ transform: 'translateX(-50%)' }}
        >
          <div className="text-sm font-semibold mb-2">Detalii Plăți</div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="flex items-center">
                <Home className="w-4 h-4 mr-2 text-blue-600" />
                Întreținere:
              </span>
              <span className="font-medium">{paymentBreakdown.intretinere.toFixed(2)} RON</span>
            </div>
            
            <div className="flex justify-between">
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-red-600" />
                Restanțe:
              </span>
              <span className="font-medium">{paymentBreakdown.restante.toFixed(2)} RON</span>
            </div>
            
            <div className="flex justify-between">
              <span className="flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
                Penalități:
              </span>
              <span className="font-medium">{paymentBreakdown.penalitati.toFixed(2)} RON</span>
            </div>
            
            <hr className="my-2" />
            
            <div className="flex justify-between font-semibold">
              <span>Total plătit:</span>
              <span className="text-green-600">{paymentBreakdown.total.toFixed(2)} RON</span>
            </div>
            
            {paymentBreakdown.lastPayment && (
              <>
                <hr className="my-2" />
                <div className="text-xs text-gray-500">
                  Ultima plată: {new Date(paymentBreakdown.lastPayment.timestamp || paymentInfo.lastPayment).toLocaleDateString('ro-RO')}
                  {paymentBreakdown.lastPayment.receiptNumber && (
                    <span className="ml-2">Chitanța: #{paymentBreakdown.lastPayment.receiptNumber}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative group">
      <StatusContent />
    </div>
  );
};

export default PaymentStatusDetail;