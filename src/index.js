import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import OwnerPortalApp from './OwnerPortalApp';
import reportWebVitals from './reportWebVitals';

// Detectează modul: admin (default) sau owner
// Setează REACT_APP_MODE=owner pentru portal proprietari
const isOwnerMode = process.env.REACT_APP_MODE === 'owner';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {isOwnerMode ? <OwnerPortalApp /> : <App />}
  </React.StrictMode>
);

// Hide splash screen after React renders
const splash = document.getElementById('splash-screen');
if (splash) {
  // Small delay to ensure React has painted
  setTimeout(() => {
    splash.style.transition = 'opacity 0.3s ease-out';
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 300);
  }, 100);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
