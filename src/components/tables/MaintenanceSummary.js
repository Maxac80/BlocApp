import React from 'react';

const MaintenanceSummary = ({
  tabContent, // Conținutul care va fi afișat
}) => {
// Afișăm întotdeauna conținutul - navigarea se face prin dropdown din header

return (
  <div>
    {/* Afișăm conținutul direct fără tab-uri pentru luni */}
    {tabContent}
  </div>
);
};

export default MaintenanceSummary;