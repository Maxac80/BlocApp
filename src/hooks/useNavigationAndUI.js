// hooks/useNavigationAndUI.js
import { useState, useEffect, useCallback } from 'react';

export const useNavigationAndUI = () => {
  // Navigation state
  const [currentView, setCurrentView] = useState("dashboard");
  
  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  
  // Maintenance view state
  const [activeMaintenanceTab, setActiveMaintenanceTab] = useState("simple");
  
  // Modal states
  const [showInitialBalances, setShowInitialBalances] = useState(false);
  const [showAdjustBalances, setShowAdjustBalances] = useState(false);
  const [showExpenseConfig, setShowExpenseConfig] = useState(false);
  const [adjustModalData, setAdjustModalData] = useState([]);
  const [selectedExpenseForConfig, setSelectedExpenseForConfig] = useState(null);
  
  // Form states
  const [newAssociation, setNewAssociation] = useState({ 
    name: "", 
    address: "", 
    bankAccount: "", 
    administrator: "", 
    president: "", 
    censor: "" 
  });
  const [newBlock, setNewBlock] = useState({ name: "" });
  const [newStair, setNewStair] = useState({ name: "", blockId: "" });
  const [newApartment, setNewApartment] = useState({ 
    number: "", 
    persons: "", 
    stairId: "", 
    owner: "", 
    surface: "", 
    apartmentType: "", 
    heatingSource: "" 
  });
  
  // Editing states
  const [expandedBlocks, setExpandedBlocks] = useState({});
  const [expandedStairs, setExpandedStairs] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [showAddForm, setShowAddForm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Legacy editing states (pentru compatibilitate)
  const [editingApartment, setEditingApartment] = useState(null);
  const [editingApartmentData, setEditingApartmentData] = useState({});

  // Navigation functions
  const handleNavigation = (view) => {
    setCurrentView(view);
    setSidebarOpen(false); // Închide sidebar-ul pe mobile după selectare
  };

  // Auto-expand logic pentru entități puține
// Funcție optimizată pentru auto-expand
const autoExpandEntities = useCallback((blocks, stairs, associationId) => {
  if (!associationId || !blocks.length) return;
  
  const associationBlocks = blocks.filter(block => block.associationId === associationId);
  
  // Auto-expand doar dacă nu sunt deja expanded
  if (associationBlocks.length <= 3 && associationBlocks.length > 0) {
    setExpandedBlocks(prev => {
      const needsUpdate = associationBlocks.some(block => !prev[block.id]);
      if (!needsUpdate) return prev;
      
      const updated = { ...prev };
      associationBlocks.forEach(block => {
        updated[block.id] = true;
      });
      return updated;
    });

    const associationStairs = stairs.filter(stair => 
      associationBlocks.some(block => block.id === stair.blockId)
    );
    
    if (associationStairs.length <= 5) {
      setExpandedStairs(prev => {
        const needsUpdate = associationStairs.some(stair => !prev[stair.id]);
        if (!needsUpdate) return prev;
        
        const updated = { ...prev };
        associationStairs.forEach(stair => {
          updated[stair.id] = true;
        });
        return updated;
      });
    }
  }
}, []); // DEPENDENȚE GOALE

  // Form reset functions
  const resetNewAssociation = () => {
    setNewAssociation({ 
      name: "", 
      address: "", 
      bankAccount: "", 
      administrator: "", 
      president: "", 
      censor: "" 
    });
  };

  const resetNewBlock = () => {
    setNewBlock({ name: "" });
  };

  const resetNewStair = () => {
    setNewStair({ name: "", blockId: "" });
  };

  const resetNewApartment = (keepStairId = false) => {
    setNewApartment({ 
      number: "", 
      persons: "", 
      stairId: keepStairId ? newApartment.stairId : "",
      owner: "", 
      surface: "", 
      apartmentType: "", 
      heatingSource: "" 
    });
  };

  // Modal management functions
  const openModal = (modalType, data = null) => {
    switch (modalType) {
      case 'initialBalances':
        setShowInitialBalances(true);
        break;
      case 'adjustBalances':
        setShowAdjustBalances(true);
        if (data) setAdjustModalData(data);
        break;
      case 'expenseConfig':
        setShowExpenseConfig(true);
        if (data) setSelectedExpenseForConfig(data);
        break;
    }
  };

  const closeModal = (modalType) => {
    switch (modalType) {
      case 'initialBalances':
        setShowInitialBalances(false);
        break;
      case 'adjustBalances':
        setShowAdjustBalances(false);
        setAdjustModalData([]);
        break;
      case 'expenseConfig':
        setShowExpenseConfig(false);
        setSelectedExpenseForConfig(null);
        break;
    }
  };

  const closeAllModals = () => {
    setShowInitialBalances(false);
    setShowAdjustBalances(false);
    setShowExpenseConfig(false);
    setAdjustModalData([]);
    setSelectedExpenseForConfig(null);
  };

  // Editing functions
  const startEditing = (type, id, data = {}) => {
    setEditingItem({ type, id });
    setEditingData(data);
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditingData({});
  };

  const startAddingForm = (type, parentId = null) => {
    setShowAddForm({ type, parentId });
  };

  const cancelAddingForm = () => {
    setShowAddForm(null);
  };

  // Legacy apartment editing functions
  const startEditingApartment = (apartment) => {
    setEditingApartment(apartment.id);
    setEditingApartmentData({
      owner: apartment.owner,
      persons: apartment.persons.toString(),
      apartmentType: apartment.apartmentType || "",
      surface: apartment.surface?.toString() || "",
      heatingSource: apartment.heatingSource || ""
    });
  };

  const cancelApartmentEdit = () => {
    setEditingApartment(null);
    setEditingApartmentData({});
  };

  return {
    // Navigation state
    currentView,
    setCurrentView,
    handleNavigation,
    
    // UI state
    sidebarOpen,
    setSidebarOpen,
    sidebarExpanded,
    setSidebarExpanded,
    activeMaintenanceTab,
    setActiveMaintenanceTab,
    
    // Modal state
    showInitialBalances,
    setShowInitialBalances,
    showAdjustBalances,
    setShowAdjustBalances,
    showExpenseConfig,
    setShowExpenseConfig,
    adjustModalData,
    setAdjustModalData,
    selectedExpenseForConfig,
    setSelectedExpenseForConfig,
    
    // Form state
    newAssociation,
    setNewAssociation,
    newBlock,
    setNewBlock,
    newStair,
    setNewStair,
    newApartment,
    setNewApartment,
    
    // Editing state
    expandedBlocks,
    setExpandedBlocks,
    expandedStairs,
    setExpandedStairs,
    editingItem,
    setEditingItem,
    editingData,
    setEditingData,
    showAddForm,
    setShowAddForm,
    searchTerm,
    setSearchTerm,
    editingApartment,
    setEditingApartment,
    editingApartmentData,
    setEditingApartmentData,
    
    // Functions
    autoExpandEntities,
    resetNewAssociation,
    resetNewBlock,
    resetNewStair,
    resetNewApartment,
    openModal,
    closeModal,
    closeAllModals,
    startEditing,
    cancelEditing,
    startAddingForm,
    cancelAddingForm,
    startEditingApartment,
    cancelApartmentEdit,
  };
};