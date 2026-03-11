import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import OwnerPortalApp from './OwnerPortalApp';
import { MasterApp } from './components/master';
import { AuthProviderEnhanced } from './context/AuthContextEnhanced';
import reportWebVitals from './reportWebVitals';

// Detectează modul: admin (default), owner, sau master
// Setează REACT_APP_MODE=owner pentru portal proprietari
// Setează REACT_APP_MODE=master pentru master portal (owner BlocApp)
const appMode = process.env.REACT_APP_MODE;

// Setează titlul paginii bazat pe mod
const appTitles = {
  owner: 'BlocApp Locatari',
  master: 'BlocApp Master',
  default: 'BlocApp Administratori'
};
document.title = appTitles[appMode] || appTitles.default;

// Setează favicon-ul bazat pe mod
const faviconSuffix = { owner: '-locatari', master: '-master' };
const suffix = faviconSuffix[appMode] || '';
const faviconPng = document.querySelector('link[rel="icon"]');
const faviconIco = document.querySelector('link[rel="shortcut icon"]');
if (faviconPng) faviconPng.href = `${process.env.PUBLIC_URL}/favicon${suffix}.png`;
if (faviconIco) faviconIco.href = `${process.env.PUBLIC_URL}/favicon${suffix}.ico`;

// Selectează componenta bazat pe mod
const getAppComponent = () => {
  switch (appMode) {
    case 'owner':
      return <OwnerPortalApp />;
    case 'master':
      return (
        <AuthProviderEnhanced>
          <MasterApp />
        </AuthProviderEnhanced>
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
