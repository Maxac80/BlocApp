import React, { useState, useEffect } from 'react';
import { Settings, Bell, Globe, Clock, Shield, Mail, MessageSquare } from 'lucide-react';

/**
 * ⚙️ SETTINGS STEP - CONFIGURARE PREFERINȚE ȘI SETĂRI
 */
export default function SettingsStep({ stepData, onUpdateData }) {
  const [settings, setSettings] = useState({
    language: 'ro',
    timezone: 'Europe/Bucharest',
    dateFormat: 'dd/MM/yyyy',
    currency: 'RON',
    notifications: {
      email: {
        maintenanceUpdates: true,
        paymentReminders: true,
        systemUpdates: true,
        securityAlerts: true,
        newMessages: true
      },
      sms: {
        urgentAlerts: true,
        paymentDue: false,
        securityAlerts: true
      },
      push: {
        realTimeUpdates: true,
        dailySummary: false,
        weeklyReports: true
      }
    },
    privacy: {
      shareDataWithAssociations: true,
      allowMarketingEmails: false,
      twoFactorAuth: false
    },
    ...stepData
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onUpdateData(settings);
    }, 300); // Debounce pentru a evita actualizări prea frecvente
    
    return () => clearTimeout(timeoutId);
  }, [settings, onUpdateData]);

  const handleSettingChange = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let target = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        target = target[keys[i]];
      }
      
      target[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      
      {/* SETĂRI GENERALE */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
          <Globe className="w-5 h-5 mr-2" />
          Setări generale
        </h4>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Limba aplicației
            </label>
            <select
              value={settings.language}
              onChange={(e) => handleSettingChange('language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="ro">Română</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fus orar
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => handleSettingChange('timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Europe/Bucharest">România (GMT+2/+3)</option>
              <option value="Europe/London">Londra (GMT+0/+1)</option>
              <option value="Europe/Berlin">Berlin (GMT+1/+2)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format dată
            </label>
            <select
              value={settings.dateFormat}
              onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="dd/MM/yyyy">31/12/2024</option>
              <option value="MM/dd/yyyy">12/31/2024</option>
              <option value="yyyy-MM-dd">2024-12-31</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monedă
            </label>
            <select
              value={settings.currency}
              onChange={(e) => handleSettingChange('currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="RON">Lei (RON)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">Dolari (USD)</option>
            </select>
          </div>
        </div>
      </div>

      {/* NOTIFICĂRI EMAIL */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
          <Mail className="w-5 h-5 mr-2" />
          Notificări email
        </h4>
        
        <div className="space-y-4">
          {[
            { key: 'maintenanceUpdates', label: 'Actualizări întreținere', desc: 'Când se publică liste noi de întreținere' },
            { key: 'paymentReminders', label: 'Reminder plăți', desc: 'Înainte de scadența plăților' },
            { key: 'systemUpdates', label: 'Actualizări sistem', desc: 'Funcționalități noi și îmbunătățiri' },
            { key: 'securityAlerts', label: 'Alerte securitate', desc: 'Login-uri suspecte și schimbări importante' },
            { key: 'newMessages', label: 'Mesaje noi', desc: 'Când primești mesaje de la proprietari' }
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.email[item.key]}
                onChange={(e) => handleSettingChange(`notifications.email.${item.key}`, e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* NOTIFICĂRI SMS */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2" />
          Notificări SMS
        </h4>
        
        <div className="space-y-4">
          {[
            { key: 'urgentAlerts', label: 'Alerte urgente', desc: 'Situații urgente care necesită atenție imediată' },
            { key: 'paymentDue', label: 'Scadențe plăți', desc: 'Cu o zi înainte de scadența plăților' },
            { key: 'securityAlerts', label: 'Alerte securitate', desc: 'Acces din dispozitive noi' }
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.sms[item.key]}
                onChange={(e) => handleSettingChange(`notifications.sms.${item.key}`, e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* SECURITATE ȘI PRIVACY */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Securitate și confidențialitate
        </h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Partajare date cu asociații</p>
              <p className="text-sm text-gray-600">Permite asociațiilor să vadă datele tale de contact</p>
            </div>
            <input
              type="checkbox"
              checked={settings.privacy.shareDataWithAssociations}
              onChange={(e) => handleSettingChange('privacy.shareDataWithAssociations', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Email-uri marketing</p>
              <p className="text-sm text-gray-600">Primește oferte și promoții speciale</p>
            </div>
            <input
              type="checkbox"
              checked={settings.privacy.allowMarketingEmails}
              onChange={(e) => handleSettingChange('privacy.allowMarketingEmails', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Autentificare cu doi factori (2FA)</p>
              <p className="text-sm text-gray-600">Securitate suplimentară pentru contul tău</p>
            </div>
            <input
              type="checkbox"
              checked={settings.privacy.twoFactorAuth}
              onChange={(e) => handleSettingChange('privacy.twoFactorAuth', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* INFO */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3">💡 Despre aceste setări</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Poți modifica orice setare mai târziu din profil</li>
          <li>• Setările se salvează automat în timp real</li>
          <li>• Pentru SMS-uri se aplică tarife standard</li>
          <li>• 2FA îți protejează contul împotriva accesului neautorizat</li>
        </ul>
      </div>
    </div>
  );
}