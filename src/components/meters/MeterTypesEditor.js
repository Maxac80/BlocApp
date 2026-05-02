import React, { useState } from 'react';
import { Activity, Plus, Trash2, MoreVertical, Edit } from 'lucide-react';

export default function MeterTypesEditor({
  indexTypes = [],
  consumptionUnit = 'mc',
  disabled = false,
  onChange,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const handleAdd = () => {
    if (!newName.trim()) {
      alert('Introduceți numele contorului');
      return;
    }
    const newType = {
      id: `index_${Date.now()}`,
      name: newName.trim(),
      unit: consumptionUnit,
    };
    onChange([...indexTypes, newType]);
    setNewName('');
    setShowAddForm(false);
  };

  const handleCancelAdd = () => {
    setNewName('');
    setShowAddForm(false);
  };

  const handleDelete = (id) => {
    onChange(indexTypes.filter((t) => t.id !== id));
    setOpenDropdownId(null);
  };

  const handleStartEdit = (type) => {
    setEditingId(type.id);
    setEditingName(type.name);
    setOpenDropdownId(null);
  };

  const handleSaveEdit = () => {
    if (!editingName.trim()) {
      alert('Introduceți numele contorului');
      return;
    }
    onChange(
      indexTypes.map((t) =>
        t.id === editingId ? { ...t, name: editingName.trim() } : t
      )
    );
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs sm:text-sm font-semibold text-green-900 flex items-center gap-1.5">
          <Activity className="w-4 h-4" /> Tipuri de contoare
        </h4>
        {!showAddForm && !disabled && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded transition-colors"
            title="Adaugă contor nou"
          >
            <Plus className="w-3 h-3" />
            Adaugă contor
          </button>
        )}
      </div>

      {indexTypes.length === 0 && !showAddForm && (
        <div className="text-xs text-gray-600 italic py-2">
          Niciun tip de contor configurat. Adaugă unul pentru a putea introduce indecși (ex: „Apa Rece Baie", „Apa Caldă Bucătărie").
        </div>
      )}

      {indexTypes.length > 0 && (
        <div className="space-y-1.5">
          {indexTypes.map((indexType) => (
            <div
              key={indexType.id}
              className="flex items-center justify-between p-2 bg-white border rounded-md"
            >
              {editingId === indexType.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Activity className="w-3.5 h-3.5 text-green-600" />
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-green-500 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    autoFocus
                  />
                  <span className="text-xs text-gray-500">({indexType.unit})</span>
                  <div className="flex gap-1">
                    <button
                      onClick={handleSaveEdit}
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                    >
                      Salvează
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-400 transition-colors"
                    >
                      Anulează
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-sm font-medium">{indexType.name}</span>
                    <span className="text-xs text-gray-500">({indexType.unit})</span>
                  </div>
                  {!disabled && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenDropdownId(openDropdownId === indexType.id ? null : indexType.id)
                        }
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        title="Opțiuni"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                      {openDropdownId === indexType.id && (
                        <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                          <button
                            onClick={() => handleStartEdit(indexType)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Editează
                          </button>
                          <button
                            onClick={() => handleDelete(indexType.id)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors rounded-b-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Șterge
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <div className="bg-white border-2 border-green-300 rounded-md p-2 mt-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nume contor (ex: Apa Rece Baie)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') handleCancelAdd();
              }}
              className="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              autoFocus
            />
            <button
              onClick={handleAdd}
              className="px-2 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
            >
              Adaugă
            </button>
            <button
              onClick={handleCancelAdd}
              className="px-2 py-1.5 bg-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-400 transition-colors"
            >
              Anulează
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
