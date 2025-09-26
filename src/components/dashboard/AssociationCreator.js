// src/components/dashboard/AssociationCreator.js
import React from 'react';
import { Building2, Plus } from 'lucide-react';

const AssociationCreator = ({
  newAssociation,
  setNewAssociation,
  handleAddAssociation
}) => {
  return (
    <div className="bg-blue-50 border border-blue-200 p-8 rounded-xl mb-8">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-10 h-10 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-blue-800 mb-2">🏢 Creează Asociația</h3>
        <p className="text-blue-700 max-w-md mx-auto">
          Completează detaliile asociației tale de proprietari pentru a continua.
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
              value={newAssociation.address}
              onChange={(e) => setNewAssociation({...newAssociation, address: e.target.value})}
              placeholder="Adresa completă (ex: Strada Primăverii 12, Sector 1) *"
              className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              value={newAssociation.bankAccount}
              onChange={(e) => setNewAssociation({...newAssociation, bankAccount: e.target.value})}
              placeholder="Cont bancar (opțional)"
              className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <input
              value={newAssociation.administrator}
              onChange={(e) => setNewAssociation({...newAssociation, administrator: e.target.value})}
              placeholder="Administrator (opțional)"
              className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              value={newAssociation.president}
              onChange={(e) => setNewAssociation({...newAssociation, president: e.target.value})}
              placeholder="Președinte (opțional)"
              className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <input
              value={newAssociation.censor}
              onChange={(e) => setNewAssociation({...newAssociation, censor: e.target.value})}
              placeholder="Cenzor (opțional)"
              className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex justify-center pt-4">
            <button 
              onClick={handleAddAssociation}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 flex items-center disabled:bg-gray-400 text-lg font-medium"
              disabled={!newAssociation.name || !newAssociation.address}
            >
              <Plus className="w-5 h-5 mr-2" />
              Creează Asociația
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-blue-600">
              * Câmpurile marcate sunt obligatorii. Restul pot fi completate mai târziu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssociationCreator;