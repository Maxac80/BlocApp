import React, { useState, useEffect } from 'react';
import { judeteRomania, getOraseByJudet } from '../../data/counties';

const AddressForm = ({ 
  value = { judet: "", oras: "", strada: "", numar: "" },
  onChange,
  required = false,
  disabled = false 
}) => {
  const [selectedJudet, setSelectedJudet] = useState(value.judet || "");
  const [selectedOras, setSelectedOras] = useState(value.oras || "");
  const [strada, setStrada] = useState(value.strada || "");
  const [numar, setNumar] = useState(value.numar || "");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setSelectedJudet(value.judet || "");
    setSelectedOras(value.oras || "");
    setStrada(value.strada || "");
    setNumar(value.numar || "");
  }, [value]);

  const validateAddress = (judet, oras, strada, numar) => {
    const errors = {};
    if (required) {
      if (!judet) errors.judet = "Selectează județul";
      if (!oras) errors.oras = "Selectează orașul/sectorul";
      if (!strada || strada.trim().length < 3) errors.strada = "Strada trebuie să aibă minim 3 caractere";
      if (!numar || numar.trim().length === 0) errors.numar = "Numărul este obligatoriu pentru sediul social";
    }
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const updateParent = (newValue) => {
    if (onChange) {
      onChange(newValue);
    }
    
    if (required) {
      const validation = validateAddress(newValue.judet, newValue.oras, newValue.strada, newValue.numar);
      setErrors(validation.errors);
    }
  };

  const handleJudetChange = (judetCod) => {
    setSelectedJudet(judetCod);
    setSelectedOras("");
    updateParent({ judet: judetCod, oras: "", strada, numar });
  };

  const handleOrasChange = (oras) => {
    setSelectedOras(oras);
    updateParent({ judet: selectedJudet, oras, strada, numar });
  };

  const handleStradaChange = (newStrada) => {
    setStrada(newStrada);
    updateParent({ judet: selectedJudet, oras: selectedOras, strada: newStrada, numar });
  };

  const handleNumarChange = (newNumar) => {
    setNumar(newNumar);
    updateParent({ judet: selectedJudet, oras: selectedOras, strada, numar: newNumar });
  };

  const oraseDisponibile = getOraseByJudet(selectedJudet);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Județ {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedJudet}
            onChange={(e) => handleJudetChange(e.target.value)}
            disabled={disabled}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
              errors.judet ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          >
            <option value="">Selectează județul</option>
            {judeteRomania.map(judet => (
              <option key={judet.cod} value={judet.cod}>
                {judet.nume} ({judet.auto})
              </option>
            ))}
          </select>
          {errors.judet && <p className="text-red-500 text-sm mt-1">{errors.judet}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {selectedJudet === "B" ? "Sector" : "Oraș"} {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedOras}
            onChange={(e) => handleOrasChange(e.target.value)}
            disabled={disabled || !selectedJudet}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
              errors.oras ? 'border-red-500' : 'border-gray-300'
            } ${disabled || !selectedJudet ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          >
            <option value="">
              {selectedJudet ? 
                (selectedJudet === "B" ? "Selectează sectorul" : "Selectează orașul") : 
                "Selectează mai întâi județul"
              }
            </option>
            {oraseDisponibile.map(oras => (
              <option key={oras} value={oras}>{oras}</option>
            ))}
          </select>
          {errors.oras && <p className="text-red-500 text-sm mt-1">{errors.oras}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Strada {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={strada}
            onChange={(e) => handleStradaChange(e.target.value)}
            disabled={disabled}
            placeholder="ex: Strada Primăverii"
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
              errors.strada ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
          {errors.strada && <p className="text-red-500 text-sm mt-1">{errors.strada}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Număr {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={numar}
            onChange={(e) => handleNumarChange(e.target.value)}
            disabled={disabled}
            placeholder="ex: 12, 15A, 23-25"
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
              errors.numar ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
          {errors.numar && <p className="text-red-500 text-sm mt-1">{errors.numar}</p>}
        </div>
      </div>

      {(strada || selectedOras || selectedJudet) && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <div className="text-sm text-blue-800"><strong>Adresa completă:</strong></div>
          <div className="text-blue-700 mt-1">
            {[
              strada && numar ? `${strada} ${numar}` : strada,
              selectedOras,
              selectedJudet && judeteRomania.find(j => j.cod === selectedJudet)?.nume
            ].filter(Boolean).join(", ")}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressForm;