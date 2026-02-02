import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import OwnerPortalApp from './OwnerPortalApp';
import { MasterApp } from './components/master';
import { AuthProvider } from './context/AuthContext';
import reportWebVitals from './reportWebVitals';

// Detectează modul: admin (default), owner, sau master
// Setează REACT_APP_MODE=owner pentru portal proprietari
// Setează REACT_APP_MODE=master pentru master portal (owner BlocApp)
const appMode = process.env.REACT_APP_MODE;

// Selectează componenta bazat pe mod
const getAppComponent = () => {
  switch (appMode) {
    case 'owner':
      return <OwnerPortalApp />;
    case 'master':
      return (
        <AuthProvider>
          <MasterApp />
        </AuthProvider>
      );
    default:
      return <App />;
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {getAppComponent()}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
