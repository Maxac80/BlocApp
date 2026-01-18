#!/usr/bin/env node

/**
 * Copy Icons Script
 * Copiaza iconitele corecte in public/ in functie de REACT_APP_MODE
 *
 * Usage:
 * - REACT_APP_MODE=admin (sau fara) → iconite albastre (default)
 * - REACT_APP_MODE=owner → iconite verzi (portal)
 *
 * Fisiere sursa (deja create in public/):
 * - Admin: logo192.png, logo512.png, favicon.ico (albastre - DEFAULT)
 * - Portal: logo192-portal.png, logo512-portal.png, favicon-portal.ico (verzi)
 */

const fs = require('fs');
const path = require('path');

// Detecteaza modul din environment variable
const mode = process.env.REACT_APP_MODE || 'admin';

console.log('\n========================================');
console.log('  Copy Icons Script');
console.log('========================================');
console.log('Mode: ' + mode);

const publicDir = path.join(__dirname, '..', 'public');

if (mode === 'owner') {
  // Portal mode - copiaza iconitele verzi peste cele default
  console.log('\nSetting up Portal (green) icons...\n');

  const iconMappings = [
    { from: 'logo192-portal.png', to: 'logo192.png' },
    { from: 'logo512-portal.png', to: 'logo512.png' },
    { from: 'favicon-portal.ico', to: 'favicon.ico' }
  ];

  iconMappings.forEach(({ from, to }) => {
    const sourcePath = path.join(publicDir, from);
    const destPath = path.join(publicDir, to);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log('  [OK] Copied ' + from + ' -> ' + to);
    } else {
      console.log('  [WARN] Source not found: ' + from);
    }
  });

  // Update manifest.json pentru Portal
  const manifestPath = path.join(publicDir, 'manifest.json');
  const manifest = {
    "short_name": "BlocApp",
    "name": "BlocApp - Portal Proprietari",
    "icons": [
      {
        "src": "favicon.ico",
        "sizes": "64x64 32x32 24x24 16x16",
        "type": "image/x-icon"
      },
      {
        "src": "logo192.png",
        "type": "image/png",
        "sizes": "192x192"
      },
      {
        "src": "logo512.png",
        "type": "image/png",
        "sizes": "512x512"
      }
    ],
    "start_url": ".",
    "display": "standalone",
    "theme_color": "#10B981",
    "background_color": "#ECFDF5"
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('  [OK] Updated manifest.json for Portal\n');

} else {
  // Admin mode - iconitele albastre sunt deja default
  console.log('\nUsing Admin (blue) icons (default)...\n');

  // Asigura-te ca manifest.json este pentru Admin
  const manifestPath = path.join(publicDir, 'manifest.json');
  const manifest = {
    "short_name": "BlocApp",
    "name": "BlocApp - Management Asociatii de Proprietari",
    "icons": [
      {
        "src": "favicon.ico",
        "sizes": "64x64 32x32 24x24 16x16",
        "type": "image/x-icon"
      },
      {
        "src": "logo192.png",
        "type": "image/png",
        "sizes": "192x192"
      },
      {
        "src": "logo512.png",
        "type": "image/png",
        "sizes": "512x512"
      }
    ],
    "start_url": ".",
    "display": "standalone",
    "theme_color": "#3B82F6",
    "background_color": "#EFF6FF"
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('  [OK] manifest.json set for Admin\n');
}

console.log('Icons setup complete for ' + mode + ' mode!');
console.log('========================================\n');
