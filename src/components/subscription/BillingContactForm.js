/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

/**
 * 📋 BILLING CONTACT FORM
 *
 * Formular pentru datele de facturare ale utilizatorului.
 * Suportă atât persoane fizice cât și persoane juridice (firme).
 *
 * Folosit în SubscriptionSettings pentru a colecta datele necesare
 * pentru generarea facturilor.
 */

/**
 * Lista județelor din România
 */
const COUNTIES = [
  'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani',
  'Brăila', 'Brașov', 'București', 'Buzău', 'Călărași', 'Caraș-Severin',
  'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu',
  'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș',
  'Mehedinți', 'Mureș', 'Neamț', 'Olt', 'Prahova', 'Sălaj', 'Satu Mare',
  'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vâlcea', 'Vaslui', 'Vrancea'
];

/**
 * Validare CUI
 */
const validateCUI = (cui) => {
  if (!cui) return false;
  // Eliminăm RO de la început dacă există
  const cleanCUI = cui.replace(/^RO/i, '').trim();
  // CUI trebuie să fie numeric și să aibă între 2 și 10 cifre
  return /^\d{2,10}$/.test(cleanCUI);
};

/**
 * Validare email
 */
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Validare telefon
 */
const validatePhone = (phone) => {
  if (!phone) return true; // Opțional
  const cleanPhone = phone.replace(/[\s\-\.]/g, '');
  return /^(\+40|0)[0-9]{9}$/.test(cleanPhone);
};

/**
 * Input field component
 */
const FormField = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  icon: Icon,
  required = false,
  error,
  disabled = false
}) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border rounded-lg
          text-gray-900 placeholder-gray-400
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`}
      />
    </div>
    {error && (
      <p className="text-sm text-red-600 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {error}
      </p>
    )}
  </div>
);

/**
 * Select field component
 */
const SelectField = ({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  error,
  disabled = false
}) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full px-3 py-2 border rounded-lg
        text-gray-900
        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        disabled:bg-gray-100 disabled:cursor-not-allowed
        ${error ? 'border-red-300' : 'border-gray-300'}`}
    >
      <option value="">{placeholder || 'Selectează...'}</option>
      {options.map((opt) => (
        <option key={opt.value || opt} value={opt.value || opt}>
          {opt.label || opt}
        </option>
      ))}
    </select>
    {error && (
      <p className="text-sm text-red-600 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {error}
      </p>
    )}
  </div>
);

/**
 * Componenta principală BillingContactForm
 */
const BillingContactForm = ({
  initialData = {},
  onSave,
  loading = false,
  disabled = false
}) => {
  // State pentru tipul de facturare
  const [billingType, setBillingType] = useState(initialData.type || 'person');

  // State pentru datele formularului
  const [formData, setFormData] = useState({
    // Persoană fizică
    name: initialData.name || '',
    email: initialData.email || '',
    phone: initialData.phone || '',

    // Companie
    companyName: initialData.companyName || '',
    cui: initialData.cui || '',
    regCom: initialData.regCom || '',

    // Adresă
    street: initialData.address?.street || '',
    city: initialData.address?.city || '',
    county: initialData.address?.county || '',
    zipCode: initialData.address?.zipCode || ''
  });

  // State pentru erori
  const [errors, setErrors] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Reset success message after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // Handler pentru schimbarea tipului
  const handleTypeChange = (type) => {
    setBillingType(type);
    setErrors({});
  };

  // Handler pentru input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Validare formular
  const validate = () => {
    const newErrors = {};

    // Email obligatoriu
    if (!formData.email) {
      newErrors.email = 'Email-ul este obligatoriu';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email invalid';
    }

    // Telefon opțional dar valid
    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Număr de telefon invalid';
    }

    if (billingType === 'person') {
      // Persoană fizică
      if (!formData.name) {
        newErrors.name = 'Numele este obligatoriu';
      }
    } else {
      // Companie
      if (!formData.companyName) {
        newErrors.companyName = 'Numele companiei este obligatoriu';
      }
      if (!formData.cui) {
        newErrors.cui = 'CUI-ul este obligatoriu';
      } else if (!validateCUI(formData.cui)) {
        newErrors.cui = 'CUI invalid';
      }
    }

    // Adresă obligatorie
    if (!formData.street) {
      newErrors.street = 'Strada este obligatorie';
    }
    if (!formData.city) {
      newErrors.city = 'Orașul este obligatoriu';
    }
    if (!formData.county) {
      newErrors.county = 'Județul este obligatoriu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler pentru salvare
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    const billingContact = {
      type: billingType,
      name: billingType === 'person' ? formData.name : formData.companyName,
      email: formData.email,
      phone: formData.phone || null,
      companyName: billingType === 'company' ? formData.companyName : null,
      cui: billingType === 'company' ? formData.cui : null,
      regCom: billingType === 'company' ? formData.regCom : null,
      address: {
        street: formData.street,
        city: formData.city,
        county: formData.county,
        zipCode: formData.zipCode || null
      }
    };

    try {
      await onSave?.(billingContact);
      setSaveSuccess(true);
    } catch (err) {
      console.error('Error saving billing contact:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tip facturare */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Tip facturare
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => handleTypeChange('person')}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors
              ${billingType === 'person'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <User className="w-5 h-5" />
            <span className="font-medium">Persoană fizică</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('company')}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors
              ${billingType === 'company'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Building2 className="w-5 h-5" />
            <span className="font-medium">Persoană juridică</span>
          </button>
        </div>
      </div>

      {/* Date persoană/companie */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          {billingType === 'person' ? (
            <>
              <User className="w-4 h-4 text-gray-500" />
              Date persoană
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4 text-gray-500" />
              Date companie
            </>
          )}
        </h3>

        {billingType === 'person' ? (
          <FormField
            label="Nume complet"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ex: Ion Popescu"
            icon={User}
            required
            error={errors.name}
            disabled={disabled}
          />
        ) : (
          <>
            <FormField
              label="Denumire companie"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Ex: S.C. Exemplu S.R.L."
              icon={Building2}
              required
              error={errors.companyName}
              disabled={disabled}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="CUI"
                name="cui"
                value={formData.cui}
                onChange={handleChange}
                placeholder="Ex: RO12345678"
                icon={FileText}
                required
                error={errors.cui}
                disabled={disabled}
              />

              <FormField
                label="Reg. Com."
                name="regCom"
                value={formData.regCom}
                onChange={handleChange}
                placeholder="Ex: J40/1234/2020"
                icon={FileText}
                disabled={disabled}
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="email@exemplu.ro"
            icon={Mail}
            required
            error={errors.email}
            disabled={disabled}
          />

          <FormField
            label="Telefon"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="0722 123 456"
            icon={Phone}
            error={errors.phone}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Adresă */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          Adresă facturare
        </h3>

        <FormField
          label="Stradă, număr, bloc, apartament"
          name="street"
          value={formData.street}
          onChange={handleChange}
          placeholder="Ex: Str. Exemplu nr. 10, bl. A1, ap. 5"
          icon={MapPin}
          required
          error={errors.street}
          disabled={disabled}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            label="Oraș"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="Ex: București"
            required
            error={errors.city}
            disabled={disabled}
          />

          <SelectField
            label="Județ"
            name="county"
            value={formData.county}
            onChange={handleChange}
            options={COUNTIES}
            placeholder="Selectează județul"
            required
            error={errors.county}
            disabled={disabled}
          />

          <FormField
            label="Cod poștal"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
            placeholder="Ex: 010101"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Submit button */}
      <div className="flex items-center justify-between pt-4 border-t">
        {saveSuccess && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Datele au fost salvate</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || disabled}
          className="ml-auto flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg
            font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Salvează datele
        </button>
      </div>
    </form>
  );
};

/**
 * Versiune read-only pentru afișare
 */
export const BillingContactDisplay = ({ billingContact }) => {
  if (!billingContact) {
    return (
      <div className="text-gray-500 text-sm italic">
        Nu există date de facturare configurate
      </div>
    );
  }

  const isCompany = billingContact.type === 'company';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isCompany ? (
          <Building2 className="w-5 h-5 text-gray-400" />
        ) : (
          <User className="w-5 h-5 text-gray-400" />
        )}
        <span className="font-medium text-gray-900">
          {billingContact.name || billingContact.companyName}
        </span>
      </div>

      {isCompany && billingContact.cui && (
        <div className="text-sm text-gray-600">
          CUI: {billingContact.cui}
          {billingContact.regCom && ` | Reg. Com.: ${billingContact.regCom}`}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Mail className="w-4 h-4" />
        {billingContact.email}
      </div>

      {billingContact.phone && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="w-4 h-4" />
          {billingContact.phone}
        </div>
      )}

      {billingContact.address && (
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 mt-0.5" />
          <div>
            {billingContact.address.street}
            <br />
            {billingContact.address.city}, {billingContact.address.county}
            {billingContact.address.zipCode && `, ${billingContact.address.zipCode}`}
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingContactForm;
