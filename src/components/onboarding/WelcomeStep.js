import React, { useState, useEffect } from 'react';
import { CheckCircle, Star, Users, TrendingUp, Shield, Zap } from 'lucide-react';

/**
 * 👋 WELCOME STEP - PRIMUL PAS DIN ONBOARDING
 * 
 * Features:
 * - Animații de bun venit
 * - Highlight beneficii BlocApp
 * - Statistici impressive
 * - Call-to-action motivant
 * - Preview funcționalități
 */
export default function WelcomeStep({ 
  stepData, 
  onUpdateData, 
  currentUser, 
  userProfile 
}) {
  const [animationStep, setAnimationStep] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // 🎬 ANIMAȚII SECVENȚIALE LA ÎNCĂRCARE
  useEffect(() => {
    const animationSequence = [
      () => setAnimationStep(1), // Logo și titlu
      () => setAnimationStep(2), // Beneficii
      () => setAnimationStep(3), // Statistici
      () => setAnimationStep(4), // Call-to-action
    ];

    animationSequence.forEach((animation, index) => {
      setTimeout(animation, (index + 1) * 600);
    });

    // Marchează ca ready după animații
    setTimeout(() => setIsReady(true), 3000);
  }, []);

  // 📊 STATISTICI IMPRESSIVE
  const stats = [
    { icon: Users, number: '1,500+', label: 'Administratori activi', color: 'text-blue-600' },
    { icon: TrendingUp, number: '50,000+', label: 'Apartamente gestionate', color: 'text-green-600' },
    { icon: CheckCircle, number: '99.9%', label: 'Uptime garantat', color: 'text-purple-600' },
    { icon: Shield, number: '100%', label: 'Date securizate', color: 'text-red-600' }
  ];

  // 🎯 BENEFICII CHEIE
  const benefits = [
    {
      icon: Zap,
      title: 'Automatizare completă',
      description: 'Calculezi întreținerea în secunde, nu ore',
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      icon: Shield,
      title: 'Securitate maximă',
      description: 'Datele tale sunt protejate conform GDPR',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: Users,
      title: 'Portal pentru proprietari',
      description: 'Transparență totală și plăți online',
      color: 'bg-green-100 text-green-600'
    },
    {
      icon: TrendingUp,
      title: 'Rapoarte profesionale',
      description: '50+ tipuri de rapoarte pentru orice situație',
      color: 'bg-purple-100 text-purple-600'
    }
  ];

  // 📝 UPDATE DATA PENTRU TRACKING
  useEffect(() => {
    if (isReady && !stepData.welcomeViewed) {
      onUpdateData({
        ...stepData,
        welcomeViewed: true,
        viewedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`
      });
    }
  }, [isReady, stepData, onUpdateData]);

  return (
    <div className="max-w-4xl mx-auto">
      
      {/* 🎉 HEADER PRINCIPAL CU ANIMAȚIE */}
      <div className={`text-center mb-12 transition-all duration-1000 ${
        animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-xl">
            <span className="text-white text-4xl font-bold">B</span>
          </div>
          {animationStep >= 2 && (
            <div className="absolute -top-2 -right-2 animate-bounce">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          )}
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Bine ai venit în BlocApp, {userProfile?.name || currentUser?.displayName || 'Administrator'}! 👋
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Ești pe punctul de a transforma modul în care administrezi asociațiile de proprietari. 
          Să configurăm totul pentru tine în câțiva pași simpli.
        </p>
      </div>

      {/* 🏆 BENEFICII GRID CU ANIMAȚII */}
      <div className={`grid md:grid-cols-2 gap-6 mb-12 transition-all duration-1000 delay-300 ${
        animationStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        {benefits.map((benefit, index) => (
          <div 
            key={index}
            className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 ${
              animationStep >= 2 ? 'animate-fade-in-up' : ''
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start">
              <div className={`${benefit.color} p-3 rounded-lg mr-4 flex-shrink-0`}>
                <benefit.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 📊 STATISTICI IMPRESSIVE */}
      <div className={`mb-12 transition-all duration-1000 delay-600 ${
        animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold text-center mb-8">
            Alătură-te unei comunități în creștere rapidă
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className={`text-center transition-all duration-500 ${
                  animationStep >= 3 ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${600 + index * 150}ms` }}
              >
                <div className="bg-white bg-opacity-20 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-2xl font-bold mb-1">{stat.number}</div>
                <div className="text-blue-100 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🎯 CE VEI PUTEA FACE */}
      <div className={`mb-12 transition-all duration-1000 delay-900 ${
        animationStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Ce vei putea face cu BlocApp
        </h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: '1',
              title: 'Configurează asociația',
              description: 'Adaugă datele juridice, blocurile și apartamentele',
              icon: '🏢'
            },
            {
              step: '2', 
              title: 'Calculează întreținerea',
              description: 'Generat automat pe baza consumurilor și cheltuielilor',
              icon: '🧮'
            },
            {
              step: '3',
              title: 'Publică și încasează',
              description: 'Proprietarii plătesc online și tu urmărești totul',
              icon: '💳'
            }
          ].map((item, index) => (
            <div 
              key={index}
              className="text-center p-6"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">{item.icon}</span>
              </div>
              <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                {item.step}
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
              <p className="text-gray-600 text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 🚀 CALL TO ACTION */}
      <div className={`text-center transition-all duration-1000 delay-1200 ${
        animationStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 border border-green-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Gata să începem? 🚀
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Îți va lua doar 5-10 minute pentru a configura totul. 
            La final, vei avea o aplicație completă pentru administrarea eficientă.
          </p>
          
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
              <span>5 pași simpli</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
              <span>Progres salvat automat</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
              <span>Poți omite pașii opționali</span>
            </div>
          </div>
        </div>
      </div>

      {/* 💡 TIP PENTRU CONTINUARE */}
      {isReady && (
        <div className="mt-8 text-center animate-pulse">
          <p className="text-gray-500 text-sm">
            💡 Apasă "Următorul" pentru a începe configurarea profilului tău
          </p>
        </div>
      )}

      {/* 🎨 CSS ANIMAȚII CUSTOM */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}