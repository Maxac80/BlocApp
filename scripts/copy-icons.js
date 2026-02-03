#!/usr/bin/env node

/**
 * Copy Icons Script
 * Copiaza iconitele corecte in public/ in functie de REACT_APP_MODE
 *
 * Usage:
 * - REACT_APP_MODE=admin (sau fara) → iconite albastre (default)
 * - REACT_APP_MODE=owner → iconite verzi (portal)
 * - REACT_APP_MODE=master → iconite violet/dark (master portal)
 *
 * Fisiere sursa (deja create in public/):
 * - Admin: logo192.png, logo512.png, favicon.png (albastre - DEFAULT)
 * - Portal: logo192-locatari.png, logo512-locatari.png, favicon-locatari.png (verzi)
 * - Master: logo192-master.png, logo512-master.png, favicon-master.png (violet/dark)
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
    { from: 'logo192-locatari.png', to: 'logo192.png' },
    { from: 'logo512-locatari.png', to: 'logo512.png' },
    { from: 'favicon-locatari.png', to: 'favicon.png' },
    { from: 'favicon-locatari.ico', to: 'favicon.ico' }
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
    "name": "BlocApp Locatari",
    "icons": [
      {
        "src": "favicon.png",
        "sizes": "64x64 32x32 24x24 16x16",
        "type": "image/png"
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
    "background_color": "#FFFFFF"
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('  [OK] Updated manifest.json for Portal\n');

} else if (mode === 'master') {
  // Master mode - copiaza iconitele violet/dark pentru master portal
  console.log('\nSetting up Master (dark/violet) icons...\n');

  const iconMappings = [
    { from: 'logo192-master.png', to: 'logo192.png' },
    { from: 'logo512-master.png', to: 'logo512.png' },
    { from: 'favicon-master.png', to: 'favicon.png' },
    { from: 'favicon-master.ico', to: 'favicon.ico' }
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

  // Update manifest.json pentru Master
  const manifestPath = path.join(publicDir, 'manifest.json');
  const manifest = {
    "short_name": "BlocApp",
    "name": "BlocApp Master",
    "icons": [
      {
        "src": "favicon.png",
        "sizes": "64x64 32x32 24x24 16x16",
        "type": "image/png"
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
    "theme_color": "#7C3AED",
    "background_color": "#FFFFFF"
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('  [OK] Updated manifest.json for Master\n');

} else {
  // Admin mode - iconitele albastre sunt deja default
  console.log('\nUsing Admin (blue) icons (default)...\n');

  // Asigura-te ca manifest.json este pentru Admin
  const manifestPath = path.join(publicDir, 'manifest.json');
  const manifest = {
    "short_name": "BlocApp",
    "name": "BlocApp Administratori",
    "icons": [
      {
        "src": "favicon.png",
        "sizes": "64x64 32x32 24x24 16x16",
        "type": "image/png"
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
    "background_color": "#FFFFFF"
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('  [OK] manifest.json set for Admin\n');
}

// --- OG Image & Meta Tags ---
console.log('Setting up OG metadata...\n');

let ogConfig;
if (mode === 'owner') {
  ogConfig = {
    ogImage: 'og-image-locatari.png',
    title: 'BlocApp Locatari',
    description: 'Vezi întreținerea, plătește online, transmite indexuri.',
    imageUrl: 'https://locatari.blocapp.ro/og-image.png',
    themeColor: '#10B981'
  };
} else if (mode === 'master') {
  ogConfig = {
    ogImage: 'og-image-master.png',
    title: 'BlocApp Master',
    description: 'Master Portal - Gestionare utilizatori, billing și statistici.',
    imageUrl: 'https://master.blocapp.ro/og-image.png',
    themeColor: '#7C3AED'
  };
} else {
  ogConfig = {
    ogImage: 'og-image-admin.png',
    title: 'BlocApp Administratori',
    description: 'Calcul întreținere automat, gestiune cheltuieli, încasări.',
    imageUrl: 'https://administratori.blocapp.ro/og-image.png',
    themeColor: '#3B82F6'
  };
}

// Copy correct OG image as og-image.png
const ogSource = path.join(publicDir, ogConfig.ogImage);
const ogDest = path.join(publicDir, 'og-image.png');
if (fs.existsSync(ogSource)) {
  fs.copyFileSync(ogSource, ogDest);
  console.log('  [OK] Copied ' + ogConfig.ogImage + ' -> og-image.png');
} else {
  console.log('  [WARN] OG image not found: ' + ogConfig.ogImage);
}

// Update index.html meta tags
const indexPath = path.join(publicDir, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Replace title
indexHtml = indexHtml.replace(/<title>.*?<\/title>/, '<title>' + ogConfig.title + '</title>');

// Replace meta description
indexHtml = indexHtml.replace(
  /(<meta\s[\s\S]*?name="description"\s[\s\S]*?content=").*?(")/,
  '$1' + ogConfig.description + '$2'
);

// Replace theme-color
indexHtml = indexHtml.replace(
  /(<meta\s+name="theme-color"\s+content=").*?(")/,
  '$1' + ogConfig.themeColor + '$2'
);

// Replace og:title
indexHtml = indexHtml.replace(
  /(<meta\s+property="og:title"\s+content=").*?(")/,
  '$1' + ogConfig.title + '$2'
);

// Replace og:description
indexHtml = indexHtml.replace(
  /(<meta\s+property="og:description"\s+content=").*?(")/,
  '$1' + ogConfig.description + '$2'
);

// Replace og:image
indexHtml = indexHtml.replace(
  /(<meta\s+property="og:image"\s+content=").*?(")/,
  '$1' + ogConfig.imageUrl + '$2'
);

fs.writeFileSync(indexPath, indexHtml);
console.log('  [OK] Updated index.html meta tags');
console.log('    Title: ' + ogConfig.title);
console.log('    Description: ' + ogConfig.description);
console.log('    OG Image: ' + ogConfig.imageUrl + '\n');

console.log('Setup complete for ' + mode + ' mode!');
console.log('========================================\n');
