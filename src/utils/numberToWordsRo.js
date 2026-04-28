/**
 * Convertor sume în litere românești pentru chitanțe.
 * Suport: 0 — 999.999,99 lei (acoperă realist toate scenariile asociație)
 * Returnează: "una sută douăzeci și trei lei și patruzeci și cinci de bani"
 */

const UNITS_M = ['', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă'];
const UNITS_F = ['', 'una', 'două', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă'];
const TENS_TEEN = ['zece', 'unsprezece', 'doisprezece', 'treisprezece', 'paisprezece', 'cincisprezece', 'șaisprezece', 'șaptesprezece', 'optsprezece', 'nouăsprezece'];
const TENS = ['', '', 'douăzeci', 'treizeci', 'patruzeci', 'cincizeci', 'șaizeci', 'șaptezeci', 'optzeci', 'nouăzeci'];

const HUNDREDS = (digit) => {
  if (digit === 0) return '';
  if (digit === 1) return 'o sută';
  if (digit === 2) return 'două sute';
  return `${UNITS_M[digit]} sute`;
};

const tripletToWords = (n, feminine = false) => {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const units = feminine ? UNITS_F : UNITS_M;
  const parts = [];
  if (h > 0) parts.push(HUNDREDS(h));
  if (t === 1) {
    parts.push(TENS_TEEN[u]);
  } else if (t > 1) {
    if (u > 0) parts.push(`${TENS[t]} și ${units[u]}`);
    else parts.push(TENS[t]);
  } else if (u > 0) {
    parts.push(units[u]);
  }
  return parts.join(' ');
};

const integerToWords = (n) => {
  if (n === 0) return 'zero';
  if (n < 0) return `minus ${integerToWords(-n)}`;
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const parts = [];
  if (thousands > 0) {
    if (thousands === 1) parts.push('o mie');
    else if (thousands === 2) parts.push('două mii');
    else if (thousands < 20) parts.push(`${tripletToWords(thousands, true)} mii`);
    else parts.push(`${tripletToWords(thousands, true)} de mii`);
  }
  if (rest > 0) parts.push(tripletToWords(rest, false));
  return parts.join(' ');
};

/**
 * Determină dacă numărul cere "de" înainte de substantiv (lei/bani) în română.
 * Regulă: numerele care se termină în 1-19 NU iau "de"; restul (terminate în 0 ≥100, sau 20-99) iau "de".
 */
const requiresDe = (n) => {
  if (n < 20) return false;
  const lastTwo = n % 100;
  if (lastTwo === 0) return n >= 100;
  return lastTwo >= 20;
};

/**
 * Convertește o sumă în lei (cu 2 zecimale) în litere românești.
 * @param {number} amount - suma (ex: 123.45)
 * @returns {string} ex: "o sută douăzeci și trei de lei și patruzeci și cinci de bani"
 */
export const numberToWordsRo = (amount) => {
  const safe = Number(amount) || 0;
  const lei = Math.floor(Math.abs(safe));
  const bani = Math.round((Math.abs(safe) - lei) * 100);
  const sign = safe < 0 ? 'minus ' : '';
  const leiLabel = lei === 1 ? 'leu' : 'lei';
  const baniLabel = bani === 1 ? 'ban' : 'bani';
  const leiDe = requiresDe(lei) ? 'de ' : '';
  const baniDe = requiresDe(bani) ? 'de ' : '';
  const leiWords = lei === 0 ? 'zero' : integerToWords(lei);
  if (bani === 0) {
    return `${sign}${leiWords} ${leiDe}${leiLabel}`;
  }
  const baniWords = integerToWords(bani);
  return `${sign}${leiWords} ${leiDe}${leiLabel} și ${baniWords} ${baniDe}${baniLabel}`;
};
