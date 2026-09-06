export function extractSheetId(input) {
  if (!input) return '';
  const str = String(input).trim();
  const match = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return str;
}

// ─── Obfuskacja ID arkusza Samorządu Studenckiego WSKZ (Base64) ─────────────
const OBFUSCATED_SHEET_KEY = "MTAtNml0ajd3WVZYMWFsWEpLdEVRTi1SaEtnR2xyaW0tdkNvM0t3TWFYN3c=";

export function decodeSheetKey(b64 = OBFUSCATED_SHEET_KEY) {
  try {
    if (typeof atob === 'function') {
      return atob(b64);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(b64, 'base64').toString('utf-8');
    }
  } catch (e) {
    console.warn('Błąd dekodowania klucza arkusza:', e);
  }
  return '';
}

const envSheetInput = import.meta.env?.VITE_GOOGLE_SHEET_ID || import.meta.env?.VITE_SHEETS_URL;
export const SHEET_ID = envSheetInput ? extractSheetId(envSheetInput) : decodeSheetKey(OBFUSCATED_SHEET_KEY);

// ─── Jednolity nadrzędny identyfikator źródła (Kancelaria_API_Public) ───────
export const PUBLIC_SHEET_GID = "79778458"; // Zakładka: Kancelaria_API_Public
export const MAIL_REGISTRY_TAB = 'Kancelaria_API_Public';

// Backward compatibility alias for GIDs
export const SAMORZAD_GIDS = {
  PUBLIC_API: PUBLIC_SHEET_GID,
  KORESPONDENCJA: PUBLIC_SHEET_GID,
  WADY_IT: PUBLIC_SHEET_GID,
  EWIDENCJA_KOL: PUBLIC_SHEET_GID,
  USTALENIA_OPERACYJNE: PUBLIC_SHEET_GID,
};

export const SAMORZAD_TABS = {
  PUBLIC_API: { gid: PUBLIC_SHEET_GID, name: 'Kancelaria_API_Public' },
};

// ─── Konfiguracja limitu czasu (Timeout: 8s) ──────────────────────────────────
export const DEFAULT_FETCH_TIMEOUT = 8000;
export const AUTHORIZED_INDEXES = new Set([]);

export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Przekroczono limit czasu odpowiedzi (${timeoutMs / 1000}s)`);
    }
    throw err;
  }
}

// ─── Formatowanie Daty (usuwanie artefaktów GViz Date(...) i formatowanie) ────
export const formatDate = (val) => {
  if (!val) return "—";
  const str = typeof val === 'object' && val !== null ? (val.f || val.v || '') : String(val);
  if (!str) return "—";
  if (typeof str === 'string' && str.includes('Date(')) {
    const p = str.match(/\d+/g);
    if (p && p.length >= 3) {
      return `${p[0]}-${String(Number(p[1]) + 1).padStart(2, '0')}-${String(p[2]).padStart(2, '0')}`;
    }
  }
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  return String(str).trim() || "—";
};

/**
 * Precyzyjny parser odpowiedzi z Google Visualization API (tq).
 * Odcina prefiks /*O_o* / google.visualization.Query.setResponse( oraz końcowe );
 */
export function parseGvizResponse(text) {
  if (!text || typeof text !== 'string') return { cols: [], rows: [] };
  if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
    throw new Error('Brak uprawnień publicznych do odczytu arkusza (Google zwróciło stronę logowania zamiast danych JSON). Ustaw w Google Drive: Udostępnij -> Każda osoba mająca link (Przeglądający).');
  }
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error('Nieprawidłowy format odpowiedzi z Google Visualization API.');
  }
  const jsonStr = text.substring(startIdx, endIdx + 1);
  const data = JSON.parse(jsonStr);
  if (data.status === 'ok' && data.table) {
    return data.table;
  }
  if (data.errors && data.errors.length > 0) {
    throw new Error(data.errors.map(e => e.detailed_message || e.message).join('; '));
  }
  return { cols: [], rows: [] };
}

/** Pobiera arkusz poprzez GViz API i zwraca { cols, rows } */
export async function fetchSheet(sheetTarget, sheetId = SHEET_ID, timeoutMs = DEFAULT_FETCH_TIMEOUT) {
  const cleanId = extractSheetId(sheetId) || SHEET_ID;
  if (!cleanId) return null;

  const gid = typeof sheetTarget === 'object' && sheetTarget !== null
    ? (sheetTarget.gid || PUBLIC_SHEET_GID)
    : (typeof sheetTarget === 'string' && /^\d+$/.test(sheetTarget.trim()) ? sheetTarget.trim() : PUBLIC_SHEET_GID);

  const url = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json&gid=${gid}`;

  try {
    const res = await fetchWithTimeout(url, {}, timeoutMs);
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Brak uprawnień publicznych do odczytu arkusza (HTTP ${res.status}). Ustaw w Google Drive: Udostępnij -> Każda osoba mająca link (Przeglądający).`);
      }
      throw new Error(`Błąd pobierania danych (HTTP ${res.status})`);
    }
    const text = await res.text();
    return parseGvizResponse(text);
  } catch (err) {
    console.warn(`Błąd fetchSheet (gid=${gid}):`, err);
    throw err;
  }
}

export async function testSheetConnection(sheetId, timeoutMs = 5000) {
  try {
    const cleanId = extractSheetId(sheetId) || SHEET_ID;
    if (!cleanId) return { ok: false, error: 'Brak ID arkusza' };
    const table = await fetchSheet({ gid: PUBLIC_SHEET_GID }, cleanId, timeoutMs);
    const rowCount = table?.rows?.length || 0;
    return {
      ok: true,
      rowCount,
      message: `Połączono pomyślnie z Kancelaria_API_Public! Znaleziono ${rowCount} wierszy (GID ${PUBLIC_SHEET_GID}).`,
    };
  } catch (err) {
    return { ok: false, error: err.message || 'Nie udało się połączyć z arkuszem' };
  }
}

function cellVal(cell) {
  if (!cell) return null;
  return cell.v !== undefined ? cell.v : null;
}

function cellStr(cell) {
  const v = cellVal(cell);
  return v != null ? String(v).trim() : '';
}

// ─── Jednolita Fasada Danych (Kancelaria_API_Public: GID 79778458) ───────────
/**
 * Pobiera i kategoryzuje zunifikowane rekordy kancelaryjne.
 * Schemat kolumn:
 * c[0] -> Kategoria: 'Korespondencja' | 'Ustalenia Operacyjne' | 'Zgłoszenia IT' | 'Koła i Organizacje' | 'Projekty i Kampanie'
 * c[1] -> Sygnatura (np. DK/2026/08/10, UST/2026/08/03, IT/2026/07/02)
 * c[2] -> Data (GViz Date(...) -> YYYY-MM-DD)
 * c[3] -> Przedmiot (opis sprawy / nazwa jednostki)
 * c[4] -> Status (np. W toku, Zatwierdzone, Eskalowane)
 * c[5] -> Jednostka (np. Dziekanat / Samorząd, Dział IT)
 */
export async function fetchPublicKancelariaData(sheetId = SHEET_ID) {
  const cleanId = extractSheetId(sheetId) || SHEET_ID;
  if (!cleanId) {
    return {
      ok: false,
      error: 'Brak ID arkusza',
      rows: [],
      correspondence: [],
      operationalAgreements: [],
      techIssues: [],
      studentClubs: [],
      projects: [],
    };
  }

  try {
    const table = await fetchSheet({ gid: PUBLIC_SHEET_GID }, cleanId);
    if (!table || !table.rows || table.rows.length === 0) {
      return {
        ok: true,
        rows: [],
        correspondence: [],
        operationalAgreements: [],
        techIssues: [],
        studentClubs: [],
        projects: [],
      };
    }

    const rawRows = table.rows.filter(r => r && r.c);
    const parsedRows = [];

    rawRows.forEach((row, idx) => {
      const c = row.c || [];
      const kategoria = cellStr(c[0]);
      const sygnatura = cellStr(c[1]);
      const rawDate = c[2]?.f || cellStr(c[2]);
      const data = formatDate(rawDate);
      const przedmiot = cellStr(c[3]);
      const status = cellStr(c[4]) || 'Zarejestrowane';
      const jednostka = cellStr(c[5]) || 'Kancelaria Samorządu Studenckiego WSKZ';

      // Pomiń wiersz nagłówka jeśli występuje
      const isHeader = /kategoria/i.test(kategoria) && /sygnatura/i.test(sygnatura);
      if (isHeader && idx === 0) return;

      // Wymagaj co najmniej kategorii lub sygnatury
      if (!kategoria && !sygnatura) return;

      parsedRows.push({
        id: sygnatura || `KANC_${idx + 1}`,
        sygnatura,
        kategoria,
        data,
        date: data,
        przedmiot,
        status,
        jednostka,
      });
    });

    // ── Rozdzielenie pobranego zbioru na kategorie ────────────────────────────

    // 1. Korespondencja
    const correspondence = parsedRows
      .filter(r => r.kategoria === 'Korespondencja' || /^DK\//i.test(r.sygnatura))
      .map(r => {
        const isOut = r.sygnatura.includes('/OUT') || /wychod/i.test(r.status);
        return {
          id: r.sygnatura || r.id,
          sygnatura: r.sygnatura,
          kategoria: 'Korespondencja',
          date: r.data,
          data: r.data,
          subject: r.przedmiot,
          przedmiot: r.przedmiot,
          status: r.status,
          jednostka: r.jednostka,
          sender: isOut ? 'Kancelaria Samorządu Studenckiego WSKZ' : r.jednostka,
          recipient: isOut ? r.jednostka : 'Kancelaria Samorządu Studenckiego WSKZ',
          direction: isOut ? 'OUT' : 'IN',
          statusUjednolicenia: r.status,
          weryfikacjaFormalna: 'Zatwierdzone',
          summary: r.przedmiot,
          notes: r.przedmiot,
          hash: `${r.sygnatura}_${r.data}`,
          fromSheet: 'Kancelaria_API_Public',
        };
      });

    // 2. Ustalenia Operacyjne
    const operationalAgreements = parsedRows
      .filter(r => r.kategoria === 'Ustalenia Operacyjne' || /^UST\//i.test(r.sygnatura))
      .map(r => ({
        id: r.sygnatura || r.id,
        sygnatura: r.sygnatura,
        kategoria: 'Ustalenia Operacyjne',
        date: r.data,
        data: r.data,
        topic: r.przedmiot,
        przedmiot: r.przedmiot,
        details: r.przedmiot,
        status: r.status,
        responsible: r.jednostka,
        jednostka: r.jednostka,
        fromSheet: 'Kancelaria_API_Public',
      }));

    // 3. Zgłoszenia IT
    const techIssues = parsedRows
      .filter(r => r.kategoria === 'Zgłoszenia IT' || /^IT\//i.test(r.sygnatura))
      .map(r => {
        const isCritical = /krytycz|eskalow/i.test(r.status);
        return {
          id: r.sygnatura || r.id,
          sygnatura: r.sygnatura,
          kategoria: 'Zgłoszenia IT',
          date: r.data,
          data: r.data,
          description: r.przedmiot,
          przedmiot: r.przedmiot,
          fieldAndSemester: 'Wszystkie kierunki',
          platformArea: r.jednostka || 'Platforma e-learningowa',
          status: r.status,
          reportedBy: 'Kancelaria Samorządu Studenckiego WSKZ',
          assignedTo: r.jednostka || 'Dział IT WSKZ',
          severity: isCritical ? 'Krytyczny' : 'Średni',
          ectsImpact: isCritical ? 'Krytyczny ECTS' : 'Standardowy',
          fromSheet: 'Kancelaria_API_Public',
        };
      });

    // 4. Koła i Organizacje
    const studentClubs = parsedRows
      .filter(r => r.kategoria === 'Koła i Organizacje' || /^KN\//i.test(r.sygnatura) || /^ORG\//i.test(r.sygnatura))
      .map((r, idx) => ({
        id: r.sygnatura || `club_${idx + 1}`,
        sygnatura: r.sygnatura,
        kategoria: 'Koła i Organizacje',
        name: r.przedmiot,
        przedmiot: r.przedmiot,
        shortName: r.sygnatura,
        leader: r.jednostka || 'Zarząd Koła',
        jednostka: r.jednostka,
        status: r.status || 'Aktywne',
        membersCount: 0,
        email: '',
        supervisor: 'Instytut / Katedra WSKZ',
        category: 'Koło Naukowe',
        fromSheet: 'Kancelaria_API_Public',
      }));

    // 5. Projekty i Kampanie
    const projects = parsedRows
      .filter(r => r.kategoria === 'Projekty i Kampanie' || /^PRJ\//i.test(r.sygnatura))
      .map(r => ({
        id: r.sygnatura || r.id,
        sygnatura: r.sygnatura,
        kategoria: 'Projekty i Kampanie',
        name: r.przedmiot,
        przedmiot: r.przedmiot,
        status: r.status,
        lead: r.jednostka,
        jednostka: r.jednostka,
        date: r.data,
        data: r.data,
        fromSheet: 'Kancelaria_API_Public',
      }));

    return {
      ok: true,
      rows: parsedRows,
      correspondence,
      operationalAgreements,
      techIssues,
      studentClubs,
      projects,
    };
  } catch (err) {
    console.warn('Błąd pobierania Kancelaria_API_Public:', err);
    return {
      ok: false,
      error: err.message || 'Błąd pobierania danych',
      rows: [],
      correspondence: [],
      operationalAgreements: [],
      techIssues: [],
      studentClubs: [],
      projects: [],
    };
  }
}

// ─── Główna funkcja zasilająca cały system ────────────────────────────────────
export async function fetchAllData(sheetId = SHEET_ID) {
  const res = await fetchPublicKancelariaData(sheetId);
  return {
    rows: res.rows || [],
    correspondence: res.correspondence || [],
    operationalAgreements: res.operationalAgreements || [],
    techIssues: res.techIssues || [],
    studentClubs: res.studentClubs || [],
    projects: res.projects || [],
    // Aliases for component compatibility
    mailLog: res.correspondence || [],
    itIssues: res.techIssues || [],
    decisions: res.operationalAgreements || [],
    clubs: res.studentClubs || [],
    members: [],
    quarantine: [],
    syncWarning: res.ok ? null : res.error,
  };
}

// Legacy helper compatibility functions
export function formatCorrespondenceForSheet(entries = []) {
  const headers = ['Kategoria', 'Sygnatura', 'Data', 'Przedmiot', 'Status', 'Jednostka'];
  const rows = entries.map(item => [
    item.kategoria || 'Korespondencja',
    item.sygnatura || item.id || '',
    item.date || item.data || '',
    item.subject || item.przedmiot || item.name || item.topic || '',
    item.status || 'Zarejestrowane',
    item.jednostka || item.recipient || item.responsible || item.leader || '',
  ]);
  const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
  return { headers, rows, tsv };
}

export async function fetchMailRegistryFromSheet(sheetId = SHEET_ID) {
  const res = await fetchPublicKancelariaData(sheetId);
  return { ok: res.ok, tabName: 'Kancelaria_API_Public', entries: res.correspondence };
}

export async function fetchItIssuesFromSheet(sheetId = SHEET_ID) {
  const res = await fetchPublicKancelariaData(sheetId);
  return { ok: res.ok, tabName: 'Kancelaria_API_Public', issues: res.techIssues };
}

export async function fetchClubsFromSheet(sheetId = SHEET_ID) {
  const res = await fetchPublicKancelariaData(sheetId);
  return { ok: res.ok, tabName: 'Kancelaria_API_Public', clubs: res.studentClubs };
}

export async function fetchOperationalDecisionsFromSheet(sheetId = SHEET_ID) {
  const res = await fetchPublicKancelariaData(sheetId);
  return { ok: res.ok, tabName: 'Kancelaria_API_Public', decisions: res.operationalAgreements };
}

export function parseDurationToMinutes(val) { return 0; }
export function parseAttendanceLine(rawLine) { return null; }
export async function fetchMeetingSheetAttendance(code) { return { ok: false, error: 'Brak danych spotkań' }; }


