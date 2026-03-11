/**
 * Tipuri de solicitări predefinite pentru sistemul de mesagerie
 *
 * Fiecare tip definește:
 * - label: numele afișat
 * - icon: numele iconului din lucide-react
 * - description: descriere scurtă
 * - fields: câmpuri pentru formularul de creare
 * - requiresApproval: dacă necesită aprobare admin
 * - autoAction: acțiune automată la aprobare (sau null)
 */

export const TICKET_TYPES = {
  modificare_nr_persoane: {
    label: 'Modificare număr persoane',
    icon: 'Users',
    description: 'Solicitare modificare număr de persoane declarate',
    fields: [
      { key: 'currentCount', label: 'Număr actual persoane', type: 'display' },
      { key: 'newCount', label: 'Număr nou persoane', type: 'number', min: 0, max: 20, required: true },
      { key: 'effectiveMonth', label: 'Începând cu luna', type: 'month_selector', required: true },
      { key: 'reason', label: 'Motiv (opțional)', type: 'textarea', required: false }
    ],
    requiresApproval: true,
    autoAction: 'UPDATE_APARTMENT_PERSONS'
  },

  cerere_generala: {
    label: 'Cerere generală',
    icon: 'MessageSquare',
    description: 'Mesaj sau cerere către administrație',
    fields: [
      { key: 'subject', label: 'Subiect', type: 'text', required: true },
      { key: 'message', label: 'Mesaj', type: 'textarea', required: true, rows: 4 }
    ],
    requiresApproval: false,
    autoAction: null
  }
};

/**
 * Returnează label-ul românesc pentru un status de conversație
 */
export const getStatusLabel = (status) => {
  const labels = {
    open: 'Deschis',
    pending_approval: 'În așteptare',
    approved: 'Aprobat',
    rejected: 'Respins',
    closed: 'Închis'
  };
  return labels[status] || status;
};

/**
 * Returnează culoarea CSS pentru un status
 */
export const getStatusColor = (status) => {
  const colors = {
    open: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    approved: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    closed: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' }
  };
  return colors[status] || colors.open;
};

/**
 * Returnează label-ul românesc pentru tipul de conversație
 */
export const getTypeLabel = (type) => {
  const labels = {
    ticket: 'Solicitare',
    message: 'Mesaj',
    broadcast: 'Anunț'
  };
  return labels[type] || type;
};
