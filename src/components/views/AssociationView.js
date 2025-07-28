import React from 'react';
import {Building2, Plus, User, Globe, CreditCard } from 'lucide-react';
import { AddressForm } from '../forms';
import { judeteRomania } from '../../data/counties';

const AssociationView = ({
  association,
  newAssociation,
  setNewAssociation,
  handleAddAssociation,
  updateAssociation,
  blocks,
  stairs,
  getAssociationApartments,
  handleNavigation,
  userProfile
}) => {
return (
  <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4">
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🏢 Date Asociație</h2>
        <p className="text-gray-600 text-sm mt-1">Informații complete pentru înregistrarea legală</p>
      </div>

        {/* Condiție principală: Dacă nu există asociație și utilizatorul nu a trecut prin onboarding */}
        {!association && !userProfile?.metadata?.onboardingCompleted && (
          <div className="bg-blue-50 border border-blue-200 p-8 rounded-xl mb-8">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-blue-800 mb-2">🎉 Bun venit în BlocApp!</h3>
              <p className="text-blue-700 max-w-md mx-auto">
                Pentru a începe, trebuie să creezi prima ta asociație de proprietari.
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    value={newAssociation.name}
                    onChange={(e) => setNewAssociation({...newAssociation, name: e.target.value})}
                    placeholder="Numele asociației (ex: Asociația Primăverii 12) *"
                    className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <input
                    value={newAssociation.cui || ""}
                    onChange={(e) => setNewAssociation({...newAssociation, cui: e.target.value})}
                    placeholder="CUI/CIF (ex: 12345678) *"
                    className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex justify-center pt-4">
                  <button 
                    onClick={handleAddAssociation}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 flex items-center disabled:bg-gray-400 text-lg font-medium"
                    disabled={!newAssociation.name}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Creează Asociația
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dacă utilizatorul a trecut prin onboarding dar nu are asociație */}
        {!association && userProfile?.metadata?.onboardingCompleted && (
          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl mb-8">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              🔄 Se încarcă datele asociației...
            </h3>
            <p className="text-yellow-700 mb-4">
              Asociația ta a fost creată în timpul configurării inițiale. Dacă nu se încarcă în câteva secunde, încearcă să reîmprospătezi pagina.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 font-medium"
            >
              🔄 Reîmprospătează Pagina
            </button>
          </div>
        )}

        {association && (
          <div className="space-y-6">
            {/* Notificare pentru date precompletate din wizard */}
            {association.source === 'onboarding' && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-6">
                <p className="text-green-800 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Datele asociației au fost precompletate din configurarea inițială. Poți completa sau modifica orice informație.
                </p>
              </div>
            )}
            
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 bg-blue-50 border-b border-blue-100">
                <h3 className="text-xl font-semibold text-blue-800">📋 Date de Identificare</h3>
                <p className="text-blue-600 text-sm mt-1">Informații obligatorii pentru înregistrarea legală</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Numele asociației *</label>
                    <input
                      value={association?.name || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ name: e.target.value });
                        }
                      }}
                      placeholder="ex: Asociația Primăverii 12"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CUI/CIF *</label>
                    <input
                      value={association?.cui || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ cui: e.target.value });
                        }
                      }}
                      placeholder="ex: 12345678"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Numărul de înregistrare la Primărie *</label>
                    <input
                      value={association?.registrationNumber || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ registrationNumber: e.target.value });
                        }
                      }}
                      placeholder="ex: 123/2024"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data înființării legale *</label>
                    <input
                      type="date"
                      value={association?.legalFoundingDate || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ legalFoundingDate: e.target.value });
                        }
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 bg-green-50 border-b border-green-100">
                <h3 className="text-xl font-semibold text-green-800">📍 Sediul Social</h3>
                <p className="text-green-600 text-sm mt-1">Adresa juridică oficială a asociației</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Strada *</label>
                    <input
                      type="text"
                      value={association?.sediu_strada || association?.address?.street || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ 
                            sediu_strada: e.target.value,
                            address: { ...association.address, street: e.target.value }
                          });
                        }
                      }}
                      placeholder="ex: Strada Primăverii"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Numărul *</label>
                    <input
                      type="text"
                      value={association?.sediu_numar || association?.address?.number || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ 
                            sediu_numar: e.target.value,
                            address: { ...association.address, number: e.target.value }
                          });
                        }
                      }}
                      placeholder="123A"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cod poștal</label>
                    <input
                      type="text"
                      value={association?.address?.zipCode || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ 
                            address: { ...association.address, zipCode: e.target.value }
                          });
                        }
                      }}
                      placeholder="123456"
                      maxLength="6"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Orașul *</label>
                    <input
                      type="text"
                      value={association?.sediu_oras || association?.address?.city || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ 
                            sediu_oras: e.target.value,
                            address: { ...association.address, city: e.target.value }
                          });
                        }
                      }}
                      placeholder="București"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Județul *</label>
                    <select
                      value={association?.sediu_judet || association?.address?.county || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ 
                            sediu_judet: e.target.value,
                            address: { ...association.address, county: e.target.value }
                          });
                        }
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Selectează județul</option>
                      {judeteRomania.map(county => (
                        <option key={county.cod} value={county.nume}>
                          {county.nume}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 bg-purple-50 border-b border-purple-100">
                <h3 className="text-xl font-semibold text-purple-800">📞 Contact și Program</h3>
                <p className="text-purple-600 text-sm mt-1">Informații de contact și program de funcționare</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email asociație *</label>
                    <input
                      type="email"
                      value={association?.email || association?.contact?.email || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ 
                            email: e.target.value,
                            contact: { ...association.contact, email: e.target.value }
                          });
                        }
                      }}
                      placeholder="ex: contact@asociatiaprimaverii.ro"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefon asociație</label>
                    <input
                      type="tel"
                      value={association?.phone || association?.contact?.phone || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ 
                            phone: e.target.value,
                            contact: { ...association.contact, phone: e.target.value }
                          });
                        }
                      }}
                      placeholder="ex: 0212345678"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website (opțional)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="url"
                        value={association?.contact?.website || ""}
                        onChange={(e) => {
                          if (association) {
                            updateAssociation({ 
                              contact: { ...association.contact, website: e.target.value }
                            });
                          }
                        }}
                        placeholder="https://www.asociatiaprimaverii.ro"
                        className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Orarul încasărilor *</label>
                  <textarea
                    value={association?.collectionSchedule || ""}
                    onChange={(e) => {
                      if (association) {
                        updateAssociation({ collectionSchedule: e.target.value });
                      }
                    }}
                    placeholder={`ex:\nLuni: 09:00 - 17:00\nMarți: 09:00 - 17:00\nMiercuri: 09:00 - 17:00\nJoi: 09:00 - 17:00\nVineri: 09:00 - 17:00\nSâmbătă: 09:00 - 12:00`}
                    rows={6}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 bg-cyan-50 border-b border-cyan-100">
                <h3 className="text-xl font-semibold text-cyan-800">👤 Administrator Asociație</h3>
                <p className="text-cyan-600 text-sm mt-1">Informații administrator responsabil</p>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {/* Avatar Administrator */}
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-cyan-200 mr-4">
                      {association?.adminProfile?.avatarURL ? (
                        <img 
                          src={association.adminProfile.avatarURL} 
                          alt="Avatar administrator" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <User className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {association?.adminProfile?.firstName && association?.adminProfile?.lastName
                          ? `${association.adminProfile.firstName} ${association.adminProfile.lastName}`
                          : association?.administrator || 'Administrator'
                        }
                      </h4>
                      <p className="text-gray-600">
                        {association?.adminProfile?.companyName || 'Companie nespecificată'}
                      </p>
                      {association?.adminProfile?.phone && (
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {association.adminProfile.phone}
                        </p>
                      )}
                      {association?.adminProfile?.email && (
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {association.adminProfile.email}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleNavigation('profile')}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Editează Profil
                  </button>
                </div>
                
                {/* Informații rapide */}
                {(association?.adminProfile?.position || association?.adminProfile?.experience || association?.adminProfile?.licenseNumber) && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {association?.adminProfile?.position && (
                        <div>
                          <span className="text-gray-500">Funcția:</span>
                          <p className="font-medium">{association.adminProfile.position}</p>
                        </div>
                      )}
                      {association?.adminProfile?.experience && (
                        <div>
                          <span className="text-gray-500">Experiența:</span>
                          <p className="font-medium">{association.adminProfile.experience} ani</p>
                        </div>
                      )}
                      {association?.adminProfile?.licenseNumber && (
                        <div>
                          <span className="text-gray-500">Nr. licență:</span>
                          <p className="font-medium">{association.adminProfile.licenseNumber}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 bg-orange-50 border-b border-orange-100">
                <h3 className="text-xl font-semibold text-orange-800">👥 Persoane Responsabile</h3>
                <p className="text-orange-600 text-sm mt-1">Conducerea asociației de proprietari</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Președinte</label>
                    <input
                      value={association?.president || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ president: e.target.value });
                        }
                      }}
                      placeholder="Numele președintelui"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Administrator</label>
                    <input
                      value={association?.administrator || 
                             (association?.adminProfile?.firstName && association?.adminProfile?.lastName 
                              ? `${association.adminProfile.firstName} ${association.adminProfile.lastName}` 
                              : "")}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ administrator: e.target.value });
                        }
                      }}
                      placeholder="Numele administratorului"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cenzor</label>
                    <input
                      value={association?.censor || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ censor: e.target.value });
                        }
                      }}
                      placeholder="Numele cenzorului"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 bg-indigo-50 border-b border-indigo-100">
                <h3 className="text-xl font-semibold text-indigo-800">🏦 Date Financiare</h3>
                <p className="text-indigo-600 text-sm mt-1">Conturi bancare și informații financiare</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Banca *</label>
                    <input
                      value={association?.bank || association?.bankAccountData?.bank || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ 
                            bank: e.target.value,
                            bankAccountData: { ...association.bankAccountData, bank: e.target.value }
                          });
                        }
                      }}
                      placeholder="ex: BCR, BRD, ING Bank"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IBAN *</label>
                    <input
                      value={association?.bankAccount || association?.bankAccountData?.iban || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ 
                            bankAccount: e.target.value,
                            bankAccountData: { ...association.bankAccountData, iban: e.target.value }
                          });
                        }
                      }}
                      placeholder="RO49 AAAA 1B31..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Numele contului</label>
                    <input
                      value={association?.bankAccountData?.accountName || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ 
                            bankAccountData: { ...association.bankAccountData, accountName: e.target.value }
                          });
                        }
                      }}
                      placeholder="Asociația de Proprietari..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cont fond de rulment</label>
                  <input
                    value={association?.workingFundAccount || ""}
                    onChange={(e) => {
                      if (association) {
                        updateAssociation({ workingFundAccount: e.target.value });
                      }
                    }}
                    placeholder="RO49 AAAA 1B31... (opțional - dacă aveți cont separat)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="font-medium text-gray-800 mb-3">📊 Statistici Asociație</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {blocks.filter(b => b.associationId === association?.id).length}
                  </div>
                  <div className="text-gray-600">Blocuri</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {stairs.filter(s => blocks.some(b => b.id === s.blockId && b.associationId === association?.id)).length}
                  </div>
                  <div className="text-gray-600">Scări</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {getAssociationApartments().length}
                  </div>
                  <div className="text-gray-600">Apartamente</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">
                    {getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0)}
                  </div>
                  <div className="text-gray-600">Persoane</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssociationView;