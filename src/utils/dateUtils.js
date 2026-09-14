/**
 * Słownik polskich nazw miesięcy do precyzyjnego parsowania nagłówków webmaila
 */
export const POLISH_MONTHS = {
  'stycznia': 1, 'styczeń': 1, 'sty': 1,
  'lutego': 2, 'luty': 2, 'lut': 2,
  'marca': 3, 'marzec': 3, 'mar': 3,
  'kwietnia': 4, 'kwiecień': 4, 'kwi': 4,
  'maja': 5, 'maj': 5,
  'czerwca': 6, 'czerwiec': 6, 'cze': 6,
  'lipca': 7, 'lipiec': 7, 'lip': 7,
  'sierpnia': 8, 'sierpień': 8, 'sie': 8,
  'września': 9, 'wrzesień': 9, 'wrz': 9,
  'października': 10, 'październik': 10, 'paź': 10,
  'listopada': 11, 'listopad': 11, 'lis': 11,
  'grudnia': 12, 'grudzień': 12, 'gru': 12,
};

/**
 * Zwraca aktualny moment lokalnego czasu w formacie wymaganym przez input type="datetime-local" (YYYY-MM-DDTHH:mm)
 */
export function getCurrentLocalDateTimeString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Zamienia format inputa HTML 'YYYY-MM-DDTHH:mm' na czysty 'YYYY-MM-DD HH:mm' dla backendu bez konwersji stref
 */
export function normalizeDateTimeForBackend(val) {
  if (!val) return "";
  return String(val).replace("T", " ").trim();
}

export function prepareDateTimeForPayload(val) {
  return normalizeDateTimeForBackend(val);
}

/**
 * Inicjalizuje pole <input type="datetime-local"> wartością YYYY-MM-DDTHH:mm bez przesunięcia UTC
 */
export function formatForDateTimeInput(raw) {
  if (!raw) return "";
  const str = String(raw).trim();
  if (!str || str === "—") return "";

  // 1. Jeśli to string "YYYY-MM-DD HH:mm" lub "YYYY-MM-DDTHH:mm"
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(str)) {
    return str.slice(0, 16).replace(" ", "T");
  }

  // 2. Jeśli to sama data "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return `${str}T12:00`;
  }

  // 3. Sprawdź formaty zaawansowane (np. polskie daty)
  const parsed = parseToDateTimeLocalString(str);
  if (parsed) {
    return parsed;
  }

  // 4. Fallback gdyby przyszła pełna data z JS Date
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const pad = (n) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const h = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${y}-${m}-${day}T${h}:${min}`;
  }

  return "";
}

/**
 * Uniwersalny parser do formatu input type="datetime-local" (YYYY-MM-DDTHH:mm)
 * Obsługuje formaty polskie (np. "12 marca 2026 14:30", "Pt 16:54"), standardowe "13.09.2026 16:54" i ISO.
 */
export function parseToDateTimeLocalString(raw) {
  if (!raw) return "";
  const str = String(raw).trim();
  if (!str || str === "—") return "";

  // 1. Direct YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm or pure YYYY-MM-DD
  const isoLocalMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (isoLocalMatch && isoLocalMatch[1] && isoLocalMatch[2] && isoLocalMatch[3]) {
    const hours = isoLocalMatch[4] || '12';
    const minutes = isoLocalMatch[5] || '00';
    return `${isoLocalMatch[1]}-${isoLocalMatch[2]}-${isoLocalMatch[3]}T${hours}:${minutes}`;
  }

  // 2. DD.MM.YYYY HH:mm or DD/MM/YYYY HH:mm or DD-MM-YYYY HH:mm
  const dmyMatch = str.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    const hours = (dmyMatch[4] || '12').padStart(2, '0');
    const minutes = (dmyMatch[5] || '00').padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // 3. Polish named date: np. "12 marca 2026 14:30" lub "12 marca 2026 r., 14:30"
  const plNamedMatch = str.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})(?:(?:\s*r\.?)?[,\s]+(\d{1,2}):(\d{2}))?/i);
  if (plNamedMatch) {
    const day = plNamedMatch[1].padStart(2, '0');
    const mName = plNamedMatch[2].toLowerCase();
    const mNum = POLISH_MONTHS[mName];
    if (mNum) {
      const month = String(mNum).padStart(2, '0');
      const year = plNamedMatch[3];
      const hours = (plNamedMatch[4] || '12').padStart(2, '0');
      const minutes = (plNamedMatch[5] || '00').padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
  }

  // 4. Krótki czas z dniem tygodnia np. "Pt 16:54" lub samo "16:54"
  const timeOnlyMatch = str.match(/(?:(?:pn|wt|śr|czw|pt|sob|nd|pon|wto|sro|czw|pia|sob|nie)\.?\s*)?(\d{1,2}):(\d{2})/i);
  if (timeOnlyMatch && !str.match(/\d{4}/)) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = timeOnlyMatch[1].padStart(2, '0');
    const minutes = timeOnlyMatch[2].padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // 5. Fallback standardowego JS Date
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  return "";
}

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

  const dtLocal = parseToDateTimeLocalString(rawDate);
  if (dtLocal) {
    return dtLocal.split('T')[0];
  }

  const parsed = new Date(rawDate);
  if (isNaN(parsed.getTime())) {
    return String(rawDate).slice(0, 10);
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Zwraca rozdzielony obiekt { date: 'YYYY-MM-DD', time: 'HH:mm' } dla czytelnego renderingu w tabeli
 */
export function formatTableDateTime(rawDate) {
  if (!rawDate) return { date: "—", time: "" };
  const str = String(rawDate).trim();
  if (!str || str === "—") return { date: "—", time: "" };

  const dtLocal = parseToDateTimeLocalString(str);
  if (dtLocal) {
    const [d, t] = dtLocal.split('T');
    return { date: d, time: t || "" };
  }

  return { date: formatTableDate(str), time: "" };
}

/**
 * Zwraca precyzyjny znacznik czasu (milisekundy) z uwzględnieniem godziny i minuty dla idealnego sortowania
 */
export function parseDateToTimestamp(raw) {
  if (!raw) return 0;
  const str = String(raw).trim();
  if (!str || str === "—") return 0;

  const dtLocal = parseToDateTimeLocalString(str);
  if (dtLocal) {
    const t = new Date(dtLocal).getTime();
    if (!isNaN(t)) return t;
  }

  const t2 = new Date(str).getTime();
  if (!isNaN(t2)) return t2;

  const dOnly = formatTableDate(str);
  if (dOnly && dOnly !== "—") {
    const t3 = new Date(dOnly).getTime();
    if (!isNaN(t3)) return t3;
  }

  return 0;
}
