import React from 'react';
import {Building2, Plus } from 'lucide-react';
import { AddressForm } from '../forms';

const AssociationView = ({
  association,
  newAssociation,
  setNewAssociation,
  handleAddAssociation,
  updateAssociation,
  blocks,
  stairs,
  getAssociationApartments,
  handleNavigation
}) => {
return (
  <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4">
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🏢 Date Asociație</h2>
        <p className="text-gray-600 text-sm mt-1">Informații complete pentru înregistrarea legală</p>
      </div>

        {!association && (
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

        {association && (
          <div className="space-y-6">
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
                <AddressForm
                  value={{
                    judet: association?.sediu_judet || "",
                    oras: association?.sediu_oras || "", 
                    strada: association?.sediu_strada || "",
                    numar: association?.sediu_numar || ""
                  }}
                  onChange={(newAddress) => {
                    if (association) {
                      updateAssociation({ 
                        sediu_judet: newAddress.judet,
                        sediu_oras: newAddress.oras,
                        sediu_strada: newAddress.strada,
                        sediu_numar: newAddress.numar,
                        address: `${newAddress.strada} ${newAddress.numar}, ${newAddress.oras}, ${newAddress.judet}`.trim()
                      });
                    }
                  }}
                  required={true}
                />
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
                      value={association?.email || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ email: e.target.value });
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
                      value={association?.phone || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ phone: e.target.value });
                        }
                      }}
                      placeholder="ex: 0212345678"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
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
                      value={association?.administrator || ""}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cont bancar principal *</label>
                    <input
                      value={association?.bankAccount || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ bankAccount: e.target.value });
                        }
                      }}
                      placeholder="RO49 AAAA 1B31..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Banca *</label>
                    <input
                      value={association?.bank || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ bank: e.target.value });
                        }
                      }}
                      placeholder="ex: BCR, BRD, ING Bank"
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