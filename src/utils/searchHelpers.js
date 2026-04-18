export const normalizeSearch = (text) => {
  if (text === null || text === undefined) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export const matchesSearch = (text, query) => {
  if (!query) return true;
  return normalizeSearch(text).includes(normalizeSearch(query));
};
