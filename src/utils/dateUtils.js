/**
 * Uniwersalny helper formatowania dat w tabelach CRM Samorządu WSKZ
 * Przekształca surowe stringi JS, timestampy i obiekty Date na zunifikowany format YYYY-MM-DD
 */
export function formatTableDate(rawDate) {
  if (!rawDate) return "—";
  
  // Jeśli to już czysty string YYYY-MM-DD
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
    return rawDate.trim();
  }

  // Obsługa formatu GViz Date(YYYY,M,D)
  if (typeof rawDate === 'string' && rawDate.includes('Date(')) {
    const p = rawDate.match(/\d+/g);
    if (p && p.length >= 3) {
      return `${p[0]}-${String(Number(p[1]) + 1).padStart(2, '0')}-${String(p[2]).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(rawDate);
  if (isNaN(parsed.getTime())) {
    return String(rawDate).slice(0, 10);
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  // Format docelowy: YYYY-MM-DD (np. 2026-06-23)
  return `${year}-${month}-${day}`;
}
