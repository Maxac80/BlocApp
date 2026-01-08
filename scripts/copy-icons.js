#!/usr/bin/env node

/**
 * Copy Icons Script
 * Copiază iconițele corecte în public/ în funcție de REACT_APP_MODE
 *
 * Usage:
 * - REACT_APP_MODE=admin → icon-admin.png (albastru)
 * - REACT_APP_MODE=owner → icon-portal.png (verde)
 */

const fs = require('fs');
const path = require('path');

// Detectează modul din environment variable
const mode = process.env.REACT_APP_MODE || 'admin';

console.log(`\n🎨 Copy Icons Script`);
console.log(`📦 Mode: ${mode}`);

// Paths
const logoDir = path.join(__dirname, '..', 'Logo');
const publicDir = path.join(__dirname, '..', 'public');

// Determină care icon să folosim
const sourceIcon = mode === 'owner'
  ? path.join(logoDir, 'blocapp-icon-portal.png')  // VERDE pentru owner
  : path.join(logoDir, 'blocapp-icon-admin.png');   // ALBASTRU pentru admin

// Verifică dacă iconul există
if (!fs.existsSync(sourceIcon)) {
  console.error(`❌ ERROR: Icon source not found: ${sourceIcon}`);
  process.exit(1);
}

// Fișiere destinație
const targets = [
  { dest: path.join(publicDir, 'logo192.png'), desc: 'PWA Icon 192x192' },
  { dest: path.join(publicDir, 'logo512.png'), desc: 'PWA Icon 512x512' },
  { dest: path.join(publicDir, 'favicon.ico'), desc: 'Favicon', skip: true } // Favicon rămâne separat
];

console.log(`\n📋 Copying icons from: ${path.basename(sourceIcon)}`);

targets.forEach(({ dest, desc, skip }) => {
  if (skip) {
    console.log(`⏭️  Skipping: ${desc}`);
    return;
  }

  try {
    fs.copyFileSync(sourceIcon, dest);
    console.log(`✅ ${desc} → ${path.basename(dest)}`);
  } catch (error) {
    console.error(`❌ Failed to copy ${desc}:`, error.message);
    process.exit(1);
  }
});

console.log(`\n✨ Icons copied successfully for ${mode} mode!\n`);
