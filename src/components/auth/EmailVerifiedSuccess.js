import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, ArrowRight, Loader2, X } from 'lucide-react';
import { applyActionCode } from 'firebase/auth';
import { auth } from '../../firebase';
import PasswordReset from './PasswordReset';

/**
 * 🎉 PAGINĂ ACȚIUNI EMAIL (Verificare & Resetare Parolă)
 *
 * Handler pentru link-urile din email-uri Firebase:
 * - mode=verifyEmail → Verificare email
 * - mode=resetPassword → Resetare parolă
 *
 * Features:
 * - Verifică emailul folosind oobCode din URL
 * - Resetare parolă cu formular pentru parolă nouă
 * - Broadcast către alte tab-uri că emailul a fost verificat
 * - Detectează dacă există alt tab deschis și oferă opțiunea de a închide
 */
export default function EmailVerifiedSuccess() {
  // Folosim window.location în loc de react-router
  const searchParams = new URLSearchParams(window.location.search);
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  // 🎣 Toate hook-urile trebuie declarate ÎNAINTE de orice return condiționat
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [otherTabDetected, setOtherTabDetected] = useState(false);
  const channelRef = useRef(null);

  // 📡 Inițializare BroadcastChannel pentru comunicare între tab-uri
  useEffect(() => {
    // Nu inițializăm BroadcastChannel pentru resetare parolă
    if (mode === 'resetPassword') return;

    if (typeof BroadcastChannel !== 'undefined') {
      channelRef.current = new BroadcastChannel('blocapp-email-verification');

      // Ascultăm pentru răspuns de la alte tab-uri
      channelRef.current.onmessage = (event) => {
        if (event.data.type === 'TAB_ACKNOWLEDGED') {
          setOtherTabDetected(true);
        }
      };

      // Trimitem un ping pentru a detecta dacă există alte tab-uri
      channelRef.current.postMessage({ type: 'PING_TABS' });
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [mode]);

  useEffect(() => {
    // Nu verificăm email pentru resetare parolă
    if (mode === 'resetPassword') return;

    const verifyEmail = async () => {
      // Verificare email (mode=verifyEmail)
      if (mode === 'verifyEmail' && oobCode) {
        try {
          // Aplică codul de verificare
          await applyActionCode(auth, oobCode);
          setStatus('success');

          // Reîmprospătează token-ul pentru a reflecta emailVerified
          if (auth.currentUser) {
            await auth.currentUser.reload();

            // 📡 Broadcast către alte tab-uri că emailul a fost verificat
            if (channelRef.current) {
              channelRef.current.postMessage({
                type: 'EMAIL_VERIFIED',
                email: auth.currentUser.email
              });
              // Tab-ul original va primi acest mesaj și va face redirect automat
            }
          }
        } catch (error) {
          console.error('Email verification error:', error);
          setStatus('error');

          if (error.code === 'auth/invalid-action-code') {
            setErrorMessage('Link-ul de verificare a expirat sau a fost deja folosit.');
          } else if (error.code === 'auth/expired-action-code') {
            setErrorMessage('Link-ul de verificare a expirat. Te rugăm să soliciți unul nou.');
          } else {
            setErrorMessage('A apărut o eroare la verificarea emailului.');
          }
        }
      } else {
        // Dacă nu e un link valid, afișăm succes (poate e redirect după verificare)
        setStatus('success');
      }
    };

    verifyEmail();
  }, [mode, oobCode]);

  // 🔐 Dacă e resetare parolă, afișăm componenta dedicată (DUPĂ toate hook-urile)
  if (mode === 'resetPassword') {
    return <PasswordReset oobCode={oobCode} />;
  }

  // Loading state
  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 sm:w-14 sm:h-14 text-blue-600 animate-spin mx-auto mb-3" />
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Se verifică...</h1>
          <p className="text-gray-600 text-sm">Te rugăm să aștepți câteva secunde.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 max-w-md w-full text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl sm:text-3xl">❌</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Verificare eșuată</h1>
          <p className="text-gray-600 text-sm mb-4">{errorMessage}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-blue-600 text-white py-2 sm:py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Înapoi la autentificare
          </button>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 max-w-md w-full">

        {/* Header cu logo */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="w-48 sm:w-64 mx-auto mb-3">
            <img
              src="/logo-admin.png"
              alt="BlocApp"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>

        {/* Success icon animat */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
          </div>
        </div>

        {/* Mesaj succes */}
        <div className="text-center mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
            Email verificat cu succes!
          </h1>
          <p className="text-gray-600 text-sm">
            Contul tău BlocApp este acum activ. Poți începe să administrezi asociația ta de proprietari.
          </p>
        </div>

        {/* Beneficii */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Acum poți:</p>
          <ul className="space-y-1.5">
            <li className="flex items-center text-xs text-gray-600">
              <span className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mr-1.5 flex-shrink-0">
                <CheckCircle className="w-2.5 h-2.5 text-green-500" />
              </span>
              Crea și gestiona asociații de proprietari
            </li>
            <li className="flex items-center text-xs text-gray-600">
              <span className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mr-1.5 flex-shrink-0">
                <CheckCircle className="w-2.5 h-2.5 text-green-500" />
              </span>
              Calcula liste de întreținere automat
            </li>
            <li className="flex items-center text-xs text-gray-600">
              <span className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mr-1.5 flex-shrink-0">
                <CheckCircle className="w-2.5 h-2.5 text-green-500" />
              </span>
              Invita proprietari în portal
            </li>
          </ul>
        </div>

        {/* Mesaj special când există alt tab deschis */}
        {otherTabDetected && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5" />
              </div>
              <div className="ml-2">
                <p className="text-xs font-medium text-blue-900">
                  Tab-ul original a fost actualizat automat!
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Poți închide acest tab și continua în fereastra originală.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Butoane */}
        <div className="space-y-2">
          {otherTabDetected && (
            <button
              onClick={() => window.close()}
              className="w-full bg-gray-100 text-gray-700 py-2 sm:py-2.5 px-4 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all flex items-center justify-center"
            >
              <X className="w-4 h-4 mr-1.5" />
              Închide acest tab
            </button>
          )}

          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2.5 sm:py-3 px-4 rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center"
          >
            {otherTabDetected ? 'Sau continuă aici' : 'Continuă spre aplicație'}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] sm:text-xs text-gray-500 mt-4">
          © {new Date().getFullYear()} BlocApp. Toate drepturile rezervate.
        </p>
      </div>
    </div>
  );
}
