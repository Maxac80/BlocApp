import React, { useState } from 'react';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  // State pentru formular - ELIMINAT organizationName
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'admin_asociatie'
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Șterge eroarea când utilizatorul tastează
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login
        await login(formData.email, formData.password);
      } else {
        // Register - FĂRĂ organizationName
        if (!formData.name) {
          throw new Error('Completează numele tău');
        }
        
        await register(formData.email, formData.password, {
          name: formData.name,
          role: formData.role
          // ❌ ELIMINAT: organizationName
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      
      // Mesaje de eroare prietenoase în română
      switch (error.code) {
        case 'auth/user-not-found':
          setError('Nu există cont cu acest email');
          break;
        case 'auth/wrong-password':
          setError('Parolă incorectă');
          break;
        case 'auth/email-already-in-use':
          setError('Există deja un cont cu acest email');
          break;
        case 'auth/weak-password':
          setError('Parola trebuie să aibă cel puțin 6 caractere');
          break;
        case 'auth/invalid-email':
          setError('Email invalid');
          break;
        default:
          setError(error.message || 'A apărut o eroare. Încearcă din nou.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header cu logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo-admin.png"
              alt="BlocApp Logo"
              className="h-24 object-contain"
            />
          </div>
          <p className="text-gray-600">
            {isLogin ? 'Conectează-te la contul tău' : 'Creează-ți cont personal'}
          </p>
        </div>

        {/* Card cu formularul */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Tab-uri Login/Register */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md transition-all font-medium ${
                isLogin
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Conectare
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md transition-all font-medium ${
                !isLogin
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Înregistrare
            </button>
          </div>

          {/* Mesaj de eroare */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Formularul */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nume (doar la register) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numele tău *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="ex: Ion Popescu"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@exemplu.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            {/* Parola */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parola *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Minim 6 caractere"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            {/* Rolul (ascuns) */}
            {!isLogin && (
              <input
                type="hidden"
                name="role"
                value={formData.role}
              />
            )}

            {/* Butonul de submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isLogin ? 'Conectare...' : 'Înregistrare...'}
                </span>
              ) : (
                isLogin ? 'Conectează-te' : 'Creează cont'
              )}
            </button>
          </form>

          {/* Info suplimentare pentru register */}
          {!isLogin && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                🎉 După înregistrare vei putea:
              </h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Crea și gestiona asociația ta</li>
                <li>• Adăuga apartamente nelimitate</li>
                <li>• Genera tabele de întreținere</li>
                <li>• Exporta PDF-uri</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          BlocApp SaaS &copy; 2025 - Gestionarea întreținerii blocului
        </div>
      </div>
    </div>
  );
}