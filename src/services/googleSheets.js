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

// ─── Produkcyjny Endpoint Google Apps Script (SSOT) ──────────────────────────
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyx5x4zaa0WTSX_JwrmAfCk0RUWwnuzDqzG5Dzf5l8zt11wHFt0zVugeMv8BPuUP0PyEA/exec";
export const FALLBACK_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyeHYakuXo9EK0iswEr3YMRDVTcAZakFQ_x7OW66KsFHo5jZJjfeXy73voAmEPun-Kk2g/exec";

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

import { formatTableDate } from '../utils/dateUtils';

// ─── Formatowanie Daty (usuwanie artefaktów GViz Date(...) i formatowanie YYYY-MM-DD) ────
export const formatDate = (val) => {
  if (!val) return "—";
  const raw = typeof val === 'object' && val !== null && !(val instanceof Date)
    ? (val.f || val.v || '')
    : val;
  return formatTableDate(raw);
};

// ─── Sanityzacja Statusów (Standard Urzędowo-Dyplomatyczny) ──────────────────
export const sanitizeStatus = (status) => {
  if (!status) return 'Zarejestrowane';
  const str = String(status).trim();
  if (/odbijanie\s+odpowiedzialno[sś]ci/i.test(str)) {
    return 'Przekazano wg właściwości';
  }
  return str;
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
    const data = await fetchAllKancelariaData();
    return {
      ok: true,
      rowCount: (data.correspondence?.length || 0) + (data.techIssues?.length || 0),
      message: `Połączono pomyślnie z backendem Google Apps Script (SSOT)! Liczba pism: ${data.stats?.totalPism || 0}, zgłoszeń technicznych: ${data.stats?.totalZgloszen || 0}.`,
    };
  } catch (err) {
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
    } catch (gvizErr) {
      return { ok: false, error: err.message || gvizErr.message || 'Nie udało się połączyć z backendem' };
    }
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
      const rawStatus = cellStr(c[4]);
      const status = sanitizeStatus(rawStatus);
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
          dataWplywu: r.data,
          dataWyslania: '',
          subject: r.przedmiot,
          przedmiot: r.przedmiot,
          status: sanitizeStatus(r.status),
          jednostka: r.jednostka,
          sender: isOut ? 'Kancelaria Samorządu Studenckiego WSKZ' : r.jednostka,
          recipient: isOut ? r.jednostka : 'Kancelaria Samorządu Studenckiego WSKZ',
          direction: isOut ? 'OUT' : 'IN',
          statusUjednolicenia: sanitizeStatus(r.status),
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
        status: sanitizeStatus(r.status),
        responsible: r.jednostka,
        jednostka: r.jednostka,
        fromSheet: 'Kancelaria_API_Public',
      }));

    // 3. Zgłoszenia IT
    const techIssues = parsedRows
      .filter(r => r.kategoria === 'Zgłoszenia IT' || /^IT\//i.test(r.sygnatura))
      .map(r => {
        const isCritical = /krytycz|eskalow/i.test(r.status);
        const rawJednostka = r.jednostka && r.jednostka !== 'Kancelaria Samorządu Studenckiego WSKZ' ? r.jednostka : '';
        let fieldAndSemester = rawJednostka || 'Wszystkie kierunki';
        let platformArea = 'Platforma e-learningowa';

        if (rawJednostka.includes(' / ')) {
          const parts = rawJednostka.split(' / ').map(p => p.trim());
          if (parts.length >= 2) {
            if (/platforma|dziekanat|testy|poczta|moodle|teams|system|serwer|baza/i.test(parts[1])) {
              fieldAndSemester = parts[0];
              platformArea = parts[1];
            } else if (/platforma|dziekanat|testy|poczta|moodle|teams|system|serwer|baza/i.test(parts[0])) {
              platformArea = parts[0];
              fieldAndSemester = parts[1];
            } else {
              fieldAndSemester = parts[0];
              platformArea = parts[1];
            }
          }
        } else if (/platforma|dziekanat|testy|poczta|moodle|teams|system|serwer/i.test(rawJednostka)) {
          platformArea = rawJednostka;
          fieldAndSemester = 'Wszystkie kierunki';
        }

        return {
          id: r.sygnatura || r.id,
          sygnatura: r.sygnatura,
          kategoria: 'Zgłoszenia IT',
          date: r.data,
          data: r.data,
          description: r.przedmiot,
          przedmiot: r.przedmiot,
          fieldAndSemester,
          platformArea,
          jednostka: r.jednostka,
          status: sanitizeStatus(r.status),
          reportedBy: 'Kancelaria Samorządu Studenckiego WSKZ',
          assignedTo: platformArea || 'Dział IT WSKZ',
          severity: isCritical ? 'Krytyczny' : 'Średni',
          ectsImpact: isCritical ? 'Wpływ na tok studiów' : 'Standardowy',
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

// ─── Oficjalny wsad korespondencji Samorządu na rok akademicki 2026/2027 ─────
export const OFFICIAL_2026_2027_CORRESPONDENCE = [
  {
    sygnatura: "DK/2026/10/01",
    dataWplywu: "2026-10-01 12:11",
    typ: "Wchodzące",
    nadawca: "dr Bogna Bartosz (Prorektor ds. Studenckich)",
    odbiorca: "Samorząd Studencki",
    przedmiot: "Organizacja asysty i opieki nad studentami I roku podczas Immatrykulacji",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/10/02",
    dataWplywu: "2026-10-01 12:41",
    typ: "Wchodzące",
    nadawca: "dr Bogna Bartosz (Prorektor ds. Studenckich)",
    odbiorca: "Agnieszka Rusnarczyk, Agnieszka Pietr",
    przedmiot: "Przekazanie wykazu kontaktowego studentów biorących udział w Immatrykulacji",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/10/03",
    dataWplywu: "2026-10-06 14:05",
    typ: "Wchodzące",
    nadawca: "Szymon Szumigała (Psychologia, alb. 15716)",
    odbiorca: "Prorektor ds. Studenckich, Samorząd",
    przedmiot: "Wniosek o interwencję: status studenta na urlopie dziekańskim, zaświadczenie ZUS oraz mLegitymacja",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/04",
    dataWplywu: "2026-10-07 16:18",
    typ: "Wchodzące",
    nadawca: "dr Krzysztof Siuda (Prodziekan W. Psychologii)",
    odbiorca: "Agnieszka Rusnarczyk / DW: dr B. Bartosz",
    przedmiot: "Wyjaśnienie kryteriów formalnych przy opiniowaniu wniosków o urlop dziekański",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/05",
    dataWplywu: "2026-10-07 21:07",
    typ: "Wchodzące",
    nadawca: "dr Sylwia Zakrzewska (Prodziekan WPBik)",
    odbiorca: "Agnieszka Rusnarczyk",
    przedmiot: "Uzgodnienia dotyczące opracowania Informatora Studenckiego dla trybu hybrydowego",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/06",
    dataWplywu: "2026-10-08 17:50",
    typ: "Wchodzące",
    nadawca: "dr Łukasz Cymbaluk (Prodziekan WAZI)",
    odbiorca: "Samorząd Studencki",
    przedmiot: "Złożenie oświadczenia o zgodzie na kandydowanie na Starostę Roku (III rok Zarządzania)",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/10/07",
    dataWplywu: "2026-10-10 17:06",
    typ: "Wchodzące",
    nadawca: "Agnieszka Rusnarczyk",
    odbiorca: "Samorząd Studencki",
    przedmiot: "Formalne zgłoszenie kandydatury na Przewodniczącą Samorządu Studenckiego (kadencja 2026–2028)",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/10/08",
    dataWplywu: "2026-10-10 19:11",
    typ: "Wchodzące",
    nadawca: "dr Aneta Kazanecka",
    odbiorca: "Samorząd Studencki",
    przedmiot: "Udostępnienie projektu: Informator dla Społeczności Studenckiej Wydziału Psychologii",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/09",
    dataWplywu: "2026-10-14 13:13",
    typ: "Wchodzące",
    nadawca: "Katarzyna Tuzikiewicz-Pokorska",
    odbiorca: "Samorząd Studencki",
    przedmiot: "Zapytanie dotyczące interpretacji zasad obowiązkowej obecności na modułach zjazdowych",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/10",
    dataWplywu: "2026-10-14 14:30",
    typ: "Wchodzące",
    nadawca: "dr Łukasz Cymbaluk (Prodziekan WAZI)",
    odbiorca: "Agnieszka Rusnarczyk",
    przedmiot: "Wdrożenie procedury wyłaniania starostów grup w instytutach WAZI",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/10/11",
    dataWplywu: "2026-10-16 20:01",
    typ: "Wchodzące",
    nadawca: "Błażej Skakuj (Psychologia)",
    odbiorca: "Samorząd Studencki",
    przedmiot: "Zgłoszenie gotowości do podjęcia działalności w strukturach Samorządu Studenckiego",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/12",
    dataWplywu: "2026-10-16 21:44",
    typ: "Wchodzące",
    nadawca: "Szymon Manikowski (Prawo / Psychologia, alb. 35172)",
    odbiorca: "Samorząd Studencki",
    przedmiot: "Oficjalny wniosek o przyjęcie do struktur Samorządu Studenckiego WSKZ",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/13",
    dataWplywu: "2026-10-17 15:19",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Przewodnicząca RSS)",
    odbiorca: "Władze Uczelni, Dziekani, Dyrektorzy Instytutów",
    przedmiot: "Urzędowe powiadomienie o jednogłośnym wyborze Przewodniczącej Samorządu na kadencję 2026–2028",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/10/14",
    dataWplywu: "2026-10-18 17:10",
    typ: "Wchodzące",
    nadawca: "Klaudia Pięta (Administracja)",
    odbiorca: "Samorząd Studencki",
    przedmiot: "Wniosek o weryfikację rozbieżności godzinowych w harmonogramach grup ADM_AP 5-1 i 5-2",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/15",
    dataWplywu: "2026-10-19 12:06",
    typ: "Wchodzące",
    nadawca: "dr Łukasz Cymbaluk (Prodziekan WAZI)",
    odbiorca: "Agnieszka Rusnarczyk",
    przedmiot: "Przekazanie podpisanego oświadczenia kandydatki na Starostę Roku (Administracja)",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/10/16",
    dataWplywu: "2026-10-20 14:53",
    typ: "Wchodzące",
    nadawca: "dr Łukasz Cymbaluk (Prodziekan WAZI)",
    odbiorca: "Społeczność Akademicka, Samorząd",
    przedmiot: "Komunikat Dziekański o wydziałowym spotkaniu informacyjnym ws. prac etapowych",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/10/17",
    dataWplywu: "2026-10-20 17:28",
    typ: "Wchodzące",
    nadawca: "dr Łukasz Cymbaluk (Prodziekan WAZI)",
    odbiorca: "Agnieszka Rusnarczyk",
    przedmiot: "Przekazanie oświadczeń starostów grup kierunku Zarządzanie (ZR1-5, ZR1-6)",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/10/18",
    dataWplywu: "2026-10-21 07:50",
    typ: "Wchodzące",
    nadawca: "Wojciech Korczyk (Administracja, alb. 5289)",
    odbiorca: "Prodziekan ds. jakości / DW: RPS, Samorząd",
    przedmiot: "Wniosek o dostosowanie formy egzaminu dyplomowego ze względów zdrowotnych (tryb zdalny)",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/19",
    dataWplywu: "2026-10-25 18:24",
    typ: "Wchodzące",
    nadawca: "dr Łukasz Cymbaluk (Prodziekan WAZI)",
    odbiorca: "Agnieszka Rusnarczyk",
    przedmiot: "Przekazanie formularza zgody na pełnienie funkcji Starosty (III rok Administracji)",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/10/20",
    dataWplywu: "2026-10-26 12:52",
    typ: "Wchodzące",
    nadawca: "dr Łukasz Cymbaluk (Prodziekan WAZI)",
    odbiorca: "Agnieszka Rusnarczyk",
    przedmiot: "Przekazanie skanów oświadczeń starostów grup 5.1 oraz 5.2",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/10/21",
    dataWplywu: "2026-10-27 12:17",
    typ: "Wchodzące",
    nadawca: "dr Katarzyna Majchrzak / dr Ł. Cymbaluk",
    odbiorca: "Samorząd Studencki",
    przedmiot: "Zgłoszenie wyboru starosty grupy ADM_TiR 5-1",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/10/22",
    dataWplywu: "2026-10-27 13:39",
    typ: "Wchodzące",
    nadawca: "Magdalena Maj / dr Ł. Cymbaluk",
    odbiorca: "Samorząd Studencki",
    przedmiot: "Przekazanie deklaracji objęcia funkcji starosty grupy ADM 1-4",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/10/23",
    dataWplywu: "2026-10-27 19:12",
    typ: "Wchodzące",
    nadawca: "Weronika Ciok (alb. 45837), Angelina Tarnowska (alb. 48951)",
    odbiorca: "Samorząd Studencki",
    przedmiot: "Wniosek o ujednolicenie przydziału do wspólnej grupy zjazdowej z przyczyn logistycznych",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/24",
    dataWplywu: "2026-10-27 19:44",
    typ: "Wchodzące",
    nadawca: "Wiktoria Maj",
    odbiorca: "Samorząd Studencki",
    przedmiot: "Wniosek o interwencję Samorządu ws. braku precyzyjnych wytycznych do prac etapowych i testów",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/25",
    dataWplywu: "2026-10-28 07:50",
    typ: "Wchodzące",
    nadawca: "Oliwia Błońska (w imieniu III sem. Administracji)",
    odbiorca: "Prodziekan ds. jakości, Samorząd, Dziekanat",
    przedmiot: "Petycja zbiorowa studentów III semestru ws. trybu zaliczeń, prac etapowych i limitów czasowych",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/26",
    dataWplywu: "2026-10-28 18:04",
    typ: "Wchodzące",
    nadawca: "Izabela Nowakowska (PSB_PZ 4-1, alb. 23815)",
    odbiorca: "Dział Obsługi Studenta / DW: Samorząd",
    przedmiot: "Zgłoszenie trudności w usprawiedliwieniu nieobecności na zjeździe na podstawie druku ZUS",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/27",
    dataWplywu: "2026-10-30 13:01",
    typ: "Wchodzące",
    nadawca: "Aleksandra Gadalińska",
    odbiorca: "Samorząd Studencki",
    przedmiot: "Zawiadomienie o wyborze na starostę grupy PS_PS 6-1 (Psychologia sądowa)",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/11/01",
    dataWplywu: "2026-11-03 17:18",
    typ: "Wchodzące",
    nadawca: "dr Łukasz Cymbaluk (Prodziekan WAZI)",
    odbiorca: "Agnieszka Rusnarczyk",
    przedmiot: "Przekazanie adresów biur dziekanatów, papieru firmowego oraz zaproszenia na panel KN GeoPolitica",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/11/02",
    dataWplywu: "2026-11-04 07:45",
    typ: "Wchodzące",
    nadawca: "Krystian Wyszomirski",
    odbiorca: "Samorząd Studencki",
    przedmiot: "Propozycje rozwiązań organizacyjnych i usprawnień komunikacyjnych na wydziale",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/11/03",
    dataWplywu: "2026-11-04 13:22",
    typ: "Wchodzące",
    nadawca: "dr Aneta Kazanecka (Prorektor ds. Studenckich)",
    odbiorca: "Władze wydziałowe, Samorząd Studencki",
    przedmiot: "Zaproszenie na posiedzenie Kolegium ds. Studenckich w Sky Tower (9 listopada)",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/11/04",
    dataWplywu: "2026-11-05 11:24",
    typ: "Wchodzące",
    nadawca: "dr Magdalena El Ghamari (Prodziekan WPBik)",
    odbiorca: "Tomasz Bratkowski (Sekretarz RSS)",
    przedmiot: "Dystrybucja zaproszenia na anglojęzyczne studia Peacebuilding ze zniżką studencką",
    status: "Zatwierdzone"
  },
  {
    sygnatura: "DK/2026/10/28",
    dataWplywu: "2026-10-01 12:27",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Zastępczyni Przewodniczącej)",
    odbiorca: "dr Bogna Bartosz (Prorektor ds. Studenckich)",
    przedmiot: "Potwierdzenie gotowości Samorządu do asysty organizacyjnej podczas Immatrykulacji",
    status: "Zakończone"
  },
  {
    sygnatura: "DK/2026/10/29",
    dataWplywu: "2026-10-05 21:45",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Zastępczyni Przewodniczącej)",
    odbiorca: "dr Bogna Bartosz (Prorektor ds. Studenckich)",
    przedmiot: "Wniosek o zarządzenie wyborów Starostów Roku wraz ze wzorem formularza zgody i plakatem",
    status: "Zakończone"
  },
  {
    sygnatura: "DK/2026/10/30",
    dataWplywu: "2026-10-05 21:48",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Zastępczyni Przewodniczącej)",
    odbiorca: "dr Bogna Bartosz (Prorektor ds. Studenckich)",
    przedmiot: "Przekazanie wniosku studenta (Sz. Szumigała) ws. uprawnień na urlopie i mLegitymacji",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/31",
    dataWplywu: "2026-10-07 07:06",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Zastępczyni Przewodniczącej)",
    odbiorca: "dr Bogna Bartosz (Prorektor ds. Studenckich)",
    przedmiot: "Wystąpienie Samorządu o zmianę terminu zjazdu stacjonarnego z 2-3 stycznia 2027 r. (kwestie ekonomiczne)",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/32",
    dataWplywu: "2026-10-07 07:25",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Zastępczyni Przewodniczącej)",
    odbiorca: "Joanna Lauer (Studentka psychologii)",
    przedmiot: "Wyjaśnienie struktury organów samorządowych, trybu reprezentacji oraz bieżących priorytetów",
    status: "Zakończone"
  },
  {
    sygnatura: "DK/2026/10/33",
    dataWplywu: "2026-10-07 07:49",
    typ: "Wychodzące",
    nadawca: "Tomasz Bratkowski (Sekretarz RSS)",
    odbiorca: "Małgorzata Leszczyńska / DW: dr M. El Ghamari",
    przedmiot: "Potwierdzenie rejestracji wykładu prof. L. Hajdariego w kalendarzu wydarzeń studenckich",
    status: "Zakończone"
  },
  {
    sygnatura: "DK/2026/10/34",
    dataWplywu: "2026-10-07 07:54",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Zastępczyni Przewodniczącej)",
    odbiorca: "dr Krzysztof Siuda (Prodziekan W. Psychologii)",
    przedmiot: "Przekazanie wniosku o urlop dziekański studentki (A. Mikołajczyk) z prośbą o wsparcie",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/35",
    dataWplywu: "2026-10-07 08:03",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Zastępczyni Przewodniczącej)",
    odbiorca: "Prodziekani: dr S. Zakrzewska, dr Ł. Cymbaluk, dr K. Siuda",
    przedmiot: "Zapytanie dotyczące oficjalnego harmonogramu organizacji roku 2026/2027 dla studiów hybrydowych",
    status: "Zakończone"
  },
  {
    sygnatura: "DK/2026/10/36",
    dataWplywu: "2026-10-07 08:07",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Zastępczyni Przewodniczącej)",
    odbiorca: "Prodziekani: dr S. Zakrzewska, dr K. Siuda, dr Ł. Cymbaluk",
    przedmiot: "Zgłoszenie składu zespołu roboczego ds. opracowania Informatora Studenckiego (Wrocław / Hybryda)",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/37",
    dataWplywu: "2026-10-07 14:06",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Zastępczyni Przewodniczącej)",
    odbiorca: "Aleksandra Lipińska (Psychologia)",
    przedmiot: "Pouczenie o ścieżce formalnej składania wniosków o indywidualną zmianę grupy zajęciowej",
    status: "Zakończone"
  },
  {
    sygnatura: "DK/2026/10/38",
    dataWplywu: "2026-10-12 15:58",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Zastępczyni Przewodniczącej)",
    odbiorca: "Ireneusz Pawlik (alb. 30645)",
    przedmiot: "Pouczenie proceduralne dotyczące różnicy między mandatem Starosty Roku a Starosty Grupy",
    status: "Zakończone"
  },
  {
    sygnatura: "DK/2026/10/39",
    dataWplywu: "2026-10-12 17:59",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Zastępczyni Przewodniczącej)",
    odbiorca: "dr Krzysztof Siuda (Prodziekan W. Psychologii)",
    przedmiot: "Zawiadomienie o rezygnacji kandydata z ubiegania się o funkcję Starosty Roku Psychologii",
    status: "Zakończone"
  },
  {
    sygnatura: "DK/2026/10/40",
    dataWplywu: "2026-10-13 12:33",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Zastępczyni Przewodniczącej)",
    odbiorca: "Błażej Skakuj",
    przedmiot: "Informacja o kalendarzu wyborczym oraz terminie rekrutacji uzupełniającej do Samorządu",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/41",
    dataWplywu: "2026-10-13 12:35",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Zastępczyni Przewodniczącej)",
    odbiorca: "Szymon Szumigała / DW: dr B. Bartosz",
    przedmiot: "Wskazanie jednostki właściwej (Dziekanat) do procedowania przedłużenia legitymacji",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/42",
    dataWplywu: "2026-10-20 13:16",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Przewodnicząca RSS)",
    odbiorca: "Szymon Manikowski (alb. 35172)",
    przedmiot: "Zaproszenie na spotkanie rekrutacyjne online dotyczące działalności w strukturach Samorządu",
    status: "W toku"
  },
  {
    sygnatura: "DK/2026/10/43",
    dataWplywu: "2026-10-21 09:42",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Przewodnicząca RSS)",
    odbiorca: "dr Sylwia Zakrzewska (Prodziekan WPBik)",
    przedmiot: "Zadeklarowanie współpracy wydziałowej, pozyskanie przedstawiciela studentów Prawa i dyżur na Koszarowej",
    status: "Zakończone"
  },
  {
    sygnatura: "DK/2026/10/44",
    dataWplywu: "2026-10-21 15:46",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Przewodnicząca RSS)",
    odbiorca: "dr Kamil Stępniak (Dziekan) / DW: dr A. Kazanecka, dr B. Bartosz",
    przedmiot: "Oficjalne sprawozdanie z przebiegu procedury wyborczej i kalendarza wyborów Starostów Roku",
    status: "Zakończone"
  },
  {
    sygnatura: "DK/2026/10/45",
    dataWplywu: "2026-10-23 12:44",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Przewodnicząca RSS)",
    odbiorca: "dr Bogna Bartosz / DW: dr A. Kazanecka, dr K. Stępniak, A. Piguła",
    przedmiot: "Złożenie oświadczenia o rezygnacji z funkcji Przewodniczącej Samorządu Studenckiego",
    status: "Wycofane"
  },
  {
    sygnatura: "DK/2026/10/46",
    dataWplywu: "2026-10-24 07:32",
    typ: "Wychodzące",
    nadawca: "Agnieszka Rusnarczyk (Przewodnicząca RSS)",
    odbiorca: "dr Bogna Bartosz / DW: dr A. Kazanecka, dr K. Stępniak, A. Piguła",
    przedmiot: "Oficjalny wniosek o wycofanie rezygnacji z funkcji Przewodniczącej Samorządu Studenckiego",
    status: "Zatwierdzone"
  }
];

// ─── Pamięć podręczna w sesji (przyspiesza przeglądanie i nawigację) ─────────
let _kancelariaCache = null;
let _kancelariaCacheTime = 0;
const KANCELARIA_CACHE_TTL = 30000; // 30 sekund pamięci podręcznej

export function invalidateKancelariaCache() {
  _kancelariaCache = null;
  _kancelariaCacheTime = 0;
}

// ─── Pobieranie danych SSOT z backendu Google Apps Script ─────────────────────
export async function fetchAllKancelariaData(forceRefresh = false) {
  if (!forceRefresh && _kancelariaCache && (Date.now() - _kancelariaCacheTime < KANCELARIA_CACHE_TTL)) {
    return _kancelariaCache;
  }

  let res = await fetch(`${APPS_SCRIPT_URL}?action=pobierz_dane`);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  let json = await res.json();

  if ((!json || json.status !== "success") && FALLBACK_APPS_SCRIPT_URL) {
    try {
      const fbRes = await fetch(`${FALLBACK_APPS_SCRIPT_URL}?action=pobierz_dane`);
      if (fbRes.ok) {
        const fbJson = await fbRes.json();
        if (fbJson && fbJson.status === "success") {
          json = fbJson;
        }
      }
    } catch (e) {
      console.warn("Fallback Apps Script GET failed:", e);
    }
  }

  if (json && json.status === "success") {
    const cloudKorespondencja = Array.isArray(json.korespondencja) ? json.korespondencja : [];
    const seenSygnatury = new Set(cloudKorespondencja.map(it => String(it?.sygnatura || it?.id || '').trim()));
    const missingSeed = OFFICIAL_2026_2027_CORRESPONDENCE.filter(it => !seenSygnatury.has(it.sygnatura));
    const rawKorespondencja = [...cloudKorespondencja, ...missingSeed];
    const rawZgloszenia = Array.isArray(json.zgloszenia) ? json.zgloszenia : [];
    const rawUstalenia = Array.isArray(json.ustalenia) ? json.ustalenia : [];
    const rawKola = Array.isArray(json.kola) ? json.kola : [];
    const rawFasada = Array.isArray(json.fasada) ? json.fasada : [];

    // Normalizacja Korespondencji
    let storedBodies = {};
    try {
      if (typeof localStorage !== 'undefined') {
        storedBodies = JSON.parse(localStorage.getItem('kanc_letter_bodies_v1') || '{}');
      }
    } catch (_) {
      storedBodies = {};
    }

    const correspondence = rawKorespondencja.map((item, idx) => {
      const id = item.sygnatura || item.id || `DK/${idx + 1}`;
      const isOut = item.typ === 'Wychodzące' || item.direction === 'OUT' || /wychod/i.test(item.typ || item.status || '');
      const rawItemDate = item.dataWplywu || item.data || item.date || item.dataWyslania;
      const date = formatDate(rawItemDate);
      const status = sanitizeStatus(item.status || 'W toku');

      const rawSubject = String(item.przedmiot || item.subject || '').trim();
      let cleanSubject = rawSubject;
      let extractedBody = item.tresc || item.summary || item.streszczenie || storedBodies[id] || '';

      // Zabezpieczenie przed pełną treścią pisma nadpisaną w kolumnie Przedmiot
      if (/^Szanowni Państwo/i.test(rawSubject) || (rawSubject.length > 160 && rawSubject.includes('\n'))) {
        if (!extractedBody) extractedBody = rawSubject;
        const matchSprawie = rawSubject.match(/zwracamy się w sprawie:\s*([^\n]+?)(?:\.\s*\n|\.$|$)/i);
        if (matchSprawie && matchSprawie[1]) {
          cleanSubject = matchSprawie[1].trim();
        } else {
          const firstLine = rawSubject.split('\n').map(l => l.trim()).find(l => l && !/^Szanowni Państwo/i.test(l));
          cleanSubject = firstLine ? firstLine.slice(0, 140) : rawSubject.slice(0, 120);
        }
      }

      return {
        ...item,
        id,
        sygnatura: id,
        date,
        data: date,
        dataWyslania: item.dataWyslania || '',
        dataWplywu: item.dataWplywu || item.data || item.date || date,
        typ: isOut ? 'Wychodzące' : 'Wchodzące',
        direction: isOut ? 'OUT' : 'IN',
        sender: item.nadawca || item.sender || (isOut ? 'Kancelaria Samorządu Studenckiego WSKZ' : 'Dziekanat / Samorząd'),
        nadawca: item.nadawca || item.sender || (isOut ? 'Kancelaria Samorządu Studenckiego WSKZ' : 'Dziekanat / Samorząd'),
        recipient: item.odbiorca || item.recipient || (isOut ? 'Dziekanat / Samorząd' : 'Kancelaria Samorządu Studenckiego WSKZ'),
        odbiorca: item.odbiorca || item.recipient || (isOut ? 'Dziekanat / Samorząd' : 'Kancelaria Samorządu Studenckiego WSKZ'),
        subject: cleanSubject,
        przedmiot: cleanSubject,
        tresc: extractedBody || cleanSubject,
        summary: extractedBody || cleanSubject,
        autor: item.autor || item.sporzadzil || item.utworzonePrzez || item.przygotowal || '',
        status,
        statusUjednolicenia: status,
        weryfikacjaFormalna: item.weryfikacjaFormalna || 'Zatwierdzone',
        lokalizacjaDrive: item.lokalizacjaDrive || '',
        sourceCitation: item.sourceCitation || item.cytat || '',
        notes: item.notes || item.notatki || '',
        hash: `${id}_${date}`,
      };
    }).sort((a, b) => {
      const dA = String(a.dataWplywu || a.date || '');
      const dB = String(b.dataWplywu || b.date || '');
      if (dA !== dB) return dA.localeCompare(dB, 'pl', { numeric: true });
      return String(a.sygnatura || '').localeCompare(String(b.sygnatura || ''), 'pl', { numeric: true });
    });

    // Normalizacja Zgłoszeń Technicznych
    const techIssues = rawZgloszenia.map((item, idx) => {
      const id = item.idZgloszenia || item.sygnatura || item.id || `IT-2026-${String(idx + 1).padStart(3, '0')}`;
      const date = formatDate(item.data || item.date);
      const status = sanitizeStatus(item.status || 'Oczekuje');
      const isCritical = /krytycz|eskalow|tok studiów/i.test(item.ectsImpact || item.severity || item.status || '');
      return {
        ...item,
        id,
        idZgloszenia: id,
        sygnatura: id,
        date,
        data: date,
        fieldAndSemester: item.kierunek || item.fieldAndSemester || 'Wszystkie kierunki',
        kierunek: item.kierunek || item.fieldAndSemester || 'Wszystkie kierunki',
        platformArea: item.obszar || item.platformArea || 'Platforma e-learningowa',
        obszar: item.obszar || item.platformArea || 'Platforma e-learningowa',
        description: item.opis || item.description || item.przedmiot || '',
        opis: item.opis || item.description || item.przedmiot || '',
        status,
        odpowiedzIT: item.odpowiedzIT || item.notes || '',
        severity: isCritical ? 'Krytyczny' : (item.severity || 'Średni'),
        ectsImpact: isCritical ? 'Wpływ na tok studiów' : (item.ectsImpact || 'Standardowy'),
        reportedBy: item.reportedBy || item.zglaszajacy || 'Kancelaria Samorządu Studenckiego WSKZ',
        assignedTo: item.assignedTo || item.obszar || 'Dział IT WSKZ',
      };
    });

    // Normalizacja Ustaleń Operacyjnych
    const operationalAgreements = rawUstalenia.map((item, idx) => {
      const id = item.sygnatura || item.id || `UST/${idx + 1}`;
      const date = formatDate(item.data || item.date);
      const status = sanitizeStatus(item.status || 'W toku');
      return {
        ...item,
        id,
        sygnatura: id,
        date,
        data: date,
        topic: item.przedmiot || item.temat || item.topic || '',
        przedmiot: item.przedmiot || item.temat || item.topic || '',
        details: item.details || item.szczegoly || item.przedmiot || '',
        status,
        responsible: item.jednostka || item.odpowiedzialny || item.responsible || 'Kancelaria Samorządu Studenckiego WSKZ',
        jednostka: item.jednostka || item.odpowiedzialny || item.responsible || 'Kancelaria Samorządu Studenckiego WSKZ',
      };
    });

    // Normalizacja Kół i Organizacji
    const studentClubs = rawKola.map((item, idx) => {
      const id = item.sygnatura || item.id || `KN/${idx + 1}`;
      return {
        ...item,
        id,
        sygnatura: id,
        name: item.nazwa || item.name || item.przedmiot || '',
        nazwa: item.nazwa || item.name || item.przedmiot || '',
        leader: item.lider || item.leader || item.jednostka || 'Zarząd Koła',
        lider: item.lider || item.leader || item.jednostka || 'Zarząd Koła',
        status: item.status || 'Aktywne',
      };
    });

    const finalResult = {
      fasada: rawFasada,
      correspondence,
      techIssues,
      operationalAgreements,
      studentClubs,
      stats: {
        totalPism: json.totalPism !== undefined ? json.totalPism : correspondence.length,
        totalZgloszen: json.totalZgloszen !== undefined ? json.totalZgloszen : techIssues.length,
      }
    };
    _kancelariaCache = finalResult;
    _kancelariaCacheTime = Date.now();
    return finalResult;
  }
  throw new Error(json.message || "Błąd pobierania danych z backendu");
}

// ─── Zapis danych do bazy (Atomowy POST z ominięciem CORS) ───────────────────
export async function sendToBackend(payload) {
  invalidateKancelariaCache();
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    let result = await response.json();
    if (result.status !== "success" && FALLBACK_APPS_SCRIPT_URL && payload?.action !== "generuj_pismo_drive") {
      try {
        const fbResponse = await fetch(FALLBACK_APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
        const fbResult = await fbResponse.json();
        if (fbResult && fbResult.status === "success") {
          return fbResult;
        }
      } catch (e) {
        console.warn("Fallback Apps Script POST failed:", e);
      }
    }
    if (result.status !== "success") {
      throw new Error(result.message || "Błąd zapisu w Google Apps Script");
    }
    return result;
  } catch (error) {
    console.error("Krytyczny błąd zapisu do chmury:", error);
    throw error;
  }
}

// ─── Główna funkcja zasilająca cały system (SSOT) ────────────────────────────
export async function fetchAllData(sheetId = SHEET_ID, forceRefresh = false) {
  try {
    const res = await fetchAllKancelariaData(forceRefresh);
    return {
      rows: res.fasada || [],
      correspondence: res.correspondence || [],
      operationalAgreements: res.operationalAgreements || [],
      techIssues: res.techIssues || [],
      studentClubs: res.studentClubs || [],
      projects: [],
      // Aliases for component compatibility
      mailLog: res.correspondence || [],
      itIssues: res.techIssues || [],
      decisions: res.operationalAgreements || [],
      clubs: res.studentClubs || [],
      members: [],
      quarantine: [],
      stats: res.stats || { totalPism: 0, totalZgloszen: 0 },
      syncWarning: null,
    };
  } catch (backendError) {
    console.warn('Backend Apps Script error, fallback to Sheet GVIZ:', backendError);
    const res = await fetchPublicKancelariaData(sheetId);
    return {
      rows: res.rows || [],
      correspondence: res.correspondence || [],
      operationalAgreements: res.operationalAgreements || [],
      techIssues: res.techIssues || [],
      studentClubs: res.studentClubs || [],
      projects: res.projects || [],
      mailLog: res.correspondence || [],
      itIssues: res.techIssues || [],
      decisions: res.operationalAgreements || [],
      clubs: res.studentClubs || [],
      members: [],
      quarantine: [],
      stats: { totalPism: res.correspondence?.length || 0, totalZgloszen: res.techIssues?.length || 0 },
      syncWarning: res.ok ? null : (res.error || backendError.message),
    };
  }
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


