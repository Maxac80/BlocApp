import React from 'react';

const MaintenanceSummary = ({
  tabContent, // Conținutul care va fi afișat
}) => {
// Afișăm întotdeauna conținutul - navigarea se face prin dropdown din header

return (
  <div className="mb-6">
    <div className="bg-white rounded-xl shadow-lg">
      {/* Afișăm conținutul direct fără tab-uri pentru luni */}
      {tabContent}
    </div>
  </div>
);
};

export default MaintenanceSummary;