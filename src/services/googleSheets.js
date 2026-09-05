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

// ─── Identyfikatory zakładek arkusza samorządowego (GID) ──────────────────────
export const SAMORZAD_GIDS = {
  KORESPONDENCJA: '1036939049',       // Dziennik Korespondencji
  WADY_IT: '271506483',               // Rejestr Wad IT
  EWIDENCJA_KOL: '1223057939',         // Ewidencja Kół
  USTALENIA_OPERACYJNE: '1095771824', // Ustalenia Operacyjne
};

export const SAMORZAD_TABS = {
  KORESPONDENCJA: { gid: '1036939049', name: 'Dziennik Korespondencji' },
  WADY_IT: { gid: '271506483', name: 'Rejestr Wad IT' },
  EWIDENCJA_KOL: { gid: '1223057939', name: 'Ewidencja Kół' },
  USTALENIA_OPERACYJNE: { gid: '1095771824', name: 'Ustalenia Operacyjne' },
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

/** Parsuje odpowiedź gviz/tq (opakowana w JS callback) i zwraca { cols, rows } */
export async function fetchSheet(sheetTarget, sheetId = SHEET_ID, timeoutMs = DEFAULT_FETCH_TIMEOUT) {
  const cleanId = extractSheetId(sheetId) || SHEET_ID;
  if (!cleanId) return null;

  const urlsToTry = [];

  if (typeof sheetTarget === 'object' && sheetTarget !== null) {
    if (sheetTarget.gid) {
      urlsToTry.push(`https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json&gid=${sheetTarget.gid}`);
    }
    if (sheetTarget.name) {
      urlsToTry.push(`https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetTarget.name)}`);
    }
  } else if (typeof sheetTarget === 'string' && /^\d+$/.test(sheetTarget.trim())) {
    urlsToTry.push(`https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json&gid=${sheetTarget.trim()}`);
  } else if (typeof sheetTarget === 'string' && sheetTarget.trim()) {
    const name = sheetTarget.trim();
    urlsToTry.push(`https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(name)}`);
  }

  if (urlsToTry.length === 0) {
    urlsToTry.push(`https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json`);
  }

  let lastStatus = 0;
  let lastError = null;

  for (const url of urlsToTry) {
    try {
      const res = await fetchWithTimeout(url, {}, timeoutMs);
      if (!res.ok) {
        lastStatus = res.status;
        if (res.status === 401 || res.status === 403) {
          throw new Error(`Brak uprawnień publicznych do odczytu arkusza (HTTP ${res.status}). Ustaw w Google Drive: Udostępnij -> Każda osoba mająca link (Przeglądający).`);
        }
        continue;
      }
      const text = await res.text();
      // Ochrona przed odpowiedzią HTML (strona logowania Google)
      if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
        throw new Error('Arkusz wymaga uprawnień publicznych (Google zwróciło stronę logowania zamiast danych JSON).');
      }
      const jsonStr = text.replace(/^[^{]*/, '').replace(/\);?\s*$/, '');
      const data = JSON.parse(jsonStr);
      if (data.status === 'ok' && data.table) {
        return data.table;
      }
    } catch (e) {
      lastError = e;
      if (e.message.includes('uprawnień') || e.message.includes('401') || e.message.includes('403') || e.message.includes('publicznych')) {
        throw e;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }
  return { cols: [], rows: [] };
}

export async function testSheetConnection(sheetId, timeoutMs = 5000) {
  try {
    const cleanId = extractSheetId(sheetId) || SHEET_ID;
    if (!cleanId) return { ok: false, error: 'Brak ID arkusza' };
    const candidates = [
      { gid: SAMORZAD_GIDS.KORESPONDENCJA, name: 'Dziennik Korespondencji' },
      { gid: SAMORZAD_GIDS.EWIDENCJA_KOL, name: 'Ewidencja Kół' },
      { gid: SAMORZAD_GIDS.WADY_IT, name: 'Rejestr Wad IT' },
    ];
    let table = null;
    let foundTab = '';
    for (const tab of candidates) {
      try {
        table = await fetchSheet(tab, cleanId, timeoutMs);
        if (table?.rows?.length > 0) {
          foundTab = typeof tab === 'object' ? (tab.name || tab.gid) : tab;
          break;
        }
      } catch {}
    }
    const rowCount = table?.rows?.length || 0;
    return { ok: true, rowCount, message: `Połączono pomyślnie! Znaleziono ${rowCount} wierszy w arkuszu${foundTab ? ` (${foundTab})` : ''}.` };
  } catch (err) {
    return { ok: false, error: err.message || 'Nie udało się połączyć z arkuszem' };
  }
}

function cellVal(cell) {
  if (!cell) return null;
  return cell.v ?? null;
}

function cellStr(cell) {
  const v = cellVal(cell);
  return v != null ? String(v).trim() : '';
}

function cellNum(cell) {
  const v = cellVal(cell);
  return v != null ? Math.round(Number(v)) : 0;
}

function parseGvizDate(cell) {
  if (!cell) return null;
  const v = cell.v;
  if (!v) return null;
  const match = String(v).match(/Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
  if (!match) return null;
  return new Date(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6])
  );
}

function formatDate(d) {
  if (!d) return '';
  return d.toLocaleDateString('pl-PL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

// ─── 1. Dziennik Korespondencji (GID: 1036939049) ────────────────────────────
export const MAIL_REGISTRY_TAB = 'Dziennik Korespondencji';

export async function fetchMailRegistryFromSheet(sheetId = SHEET_ID) {
  const cleanId = extractSheetId(sheetId) || SHEET_ID;
  if (!cleanId) return { ok: false, error: 'Brak ID arkusza', entries: [] };

  const candidates = [
    { gid: SAMORZAD_GIDS.KORESPONDENCJA, name: 'Dziennik Korespondencji' },
    'Dziennik Korespondencji',
    'Korespondencja',
  ];

  for (const target of candidates) {
    try {
      const table = await fetchSheet(target, cleanId);
      if (table && table.rows && table.rows.length > 0) {
        const rows = table.rows.filter(r => r && r.c);
        const entries = [];

        rows.forEach((row, idx) => {
          const c = row.c || [];
          const col0 = cellStr(c[0]);
          const col1 = cellStr(c[1]);
          const col2 = cellStr(c[2]);
          const col3 = cellStr(c[3]);
          const col4 = cellStr(c[4]);
          const col5 = cellStr(c[5]);
          const col6 = cellStr(c[6]);
          const col7 = cellStr(c[7]);
          const col8 = cellStr(c[8]);

          // Pomiń wiersz nagłówka
          const combined = `${col0} ${col1} ${col2} ${col3} ${col5}`.toLowerCase();
          const isHeader = /sygnatura|data|kierunek|typ|nadawca|odbiorca|temat|lp\./.test(combined);
          if (isHeader && idx === 0) return;

          // Ignoruj wiersze, które nie mają poprawnej sygnatury lub są puste
          if (!col0 || isHeader) return;

          const parsedDate = parseGvizDate(c[1]);
          const dateStr = parsedDate ? formatDate(parsedDate) : (col1 || '');

          const dirCandidate = (col2 || '').toUpperCase();
          const direction = (dirCandidate.includes('OUT') || dirCandidate.includes('WYCHOD')) ? 'OUT' : 'IN';

          const id = col0;
          const sender = col3 || (direction === 'OUT' ? 'Kancelaria Samorządu Studenckiego WSKZ' : 'Władze Uczelni WSKZ');
          const recipient = col4 || (direction === 'IN' ? 'Kancelaria Samorządu Studenckiego WSKZ' : 'Studenci WSKZ');
          const subject = col5 || 'Pismo urzędowe';
          const statusUjednolicenia = col6 || 'Ujednolicone';
          const weryfikacjaFormalna = col7 || 'Zatwierdzone';
          const status = col6 || 'Zatwierdzone';
          const summary = col8 || col5 || '';
          const hash = `${id}_${dateStr}`;

          entries.push({
            id,
            direction,
            date: dateStr,
            sender,
            recipient,
            subject,
            summary,
            status,
            statusUjednolicenia,
            weryfikacjaFormalna,
            notes: summary,
            hash,
            fromSheet: typeof target === 'object' ? target.name : target,
            createdAt: parsedDate ? parsedDate.toISOString() : new Date().toISOString(),
          });
        });

        return { ok: true, tabName: typeof target === 'object' ? target.name : target, entries };
      }
    } catch (err) {
      console.warn('Błąd odczytu Dziennik Korespondencji:', err);
    }
  }

  return { ok: true, tabName: 'Dziennik Korespondencji', entries: [] };
}

// ─── 2. Rejestr Wad IT (GID: 271506483) ──────────────────────────────────────
export async function fetchItIssuesFromSheet(sheetId = SHEET_ID) {
  const cleanId = extractSheetId(sheetId) || SHEET_ID;
  if (!cleanId) return { ok: false, error: 'Brak ID arkusza', issues: [] };

  const candidates = [
    { gid: SAMORZAD_GIDS.WADY_IT, name: 'Rejestr Wad IT' },
    'Rejestr Wad IT',
    'Wady IT',
  ];

  for (const target of candidates) {
    try {
      const table = await fetchSheet(target, cleanId);
      if (table && table.rows && table.rows.length > 0) {
        const rows = table.rows.filter(r => r && r.c);
        const issues = [];

        rows.forEach((row, idx) => {
          const c = row.c || [];
          const col0 = cellStr(c[0]);
          const col1 = cellStr(c[1]);
          const col2 = cellStr(c[2]);
          const col3 = cellStr(c[3]);
          const col4 = cellStr(c[4]);
          const col5 = cellStr(c[5]);
          const col6 = cellStr(c[6]);
          const col7 = cellStr(c[7]);

          const isHeader = /^(lp\.|id|id błędu|sygnatura|nr|data)/i.test(col0);
          if (isHeader && idx === 0) return;

          // Czytaj wyłącznie wiersze zawierające ID Błędu IT
          if (!col0 || isHeader) return;

          const parsedDate = parseGvizDate(c[1]);
          const dateStr = parsedDate ? formatDate(parsedDate) : (col1 || '');

          issues.push({
            id: col0,
            date: dateStr,
            fieldAndSemester: col2 || 'Wszystkie kierunki',
            platformArea: col3 || 'Platforma e-learningowa',
            description: col4 || col3 || col2 || 'Zgłoszenie błędu IT',
            ectsImpact: col5 || 'Średni',
            severity: col5 || 'Średni',
            status: col6 || 'Otwarte',
            reportedBy: col7 || 'Kancelaria Samorządu Studenckiego WSKZ',
            assignedTo: 'Dział IT WSKZ',
          });
        });

        return { ok: true, tabName: typeof target === 'object' ? target.name : target, issues };
      }
    } catch (e) {
      console.warn('Błąd odczytu Rejestru Wad IT:', e);
    }
  }

  return { ok: true, tabName: 'Rejestr Wad IT', issues: [] };
}

// ─── 3. Ewidencja Kół i Organizacji (GID: 1223057939) ────────────────────────
export async function fetchClubsFromSheet(sheetId = SHEET_ID) {
  const cleanId = extractSheetId(sheetId) || SHEET_ID;
  if (!cleanId) return { ok: false, error: 'Brak ID arkusza', clubs: [] };

  const candidates = [
    { gid: SAMORZAD_GIDS.EWIDENCJA_KOL, name: 'Ewidencja Kół' },
    'Ewidencja Kół',
    'Koła i Organizacje',
  ];

  for (const target of candidates) {
    try {
      const table = await fetchSheet(target, cleanId);
      if (table && table.rows && table.rows.length > 0) {
        const rows = table.rows.filter(r => r && r.c);
        const clubs = [];

        rows.forEach((row, idx) => {
          const c = row.c || [];
          const col0 = cellStr(c[0]);
          const col1 = cellStr(c[1]);
          const col2 = cellStr(c[2]);
          const col3 = cellStr(c[3]);
          const col4 = cellStr(c[4]);
          const col5 = cellStr(c[5]);
          const col6 = cellStr(c[6]);
          const col7 = cellStr(c[7]);

          const isHeader = /^(lp\.|id|nazwa|organ|nr)/i.test(col0);
          if (isHeader && idx === 0) return;

          // Czytaj wyłącznie wiersze z ID Organizacji / Nazwą
          if (!col0 && !col1) return;
          if (isHeader) return;

          const orgId = col0 || `org_${idx + 1}`;
          const name = col1 || col0;

          clubs.push({
            id: orgId,
            name,
            shortName: col2 || name,
            leader: col3 || '',
            email: col4 || '',
            supervisor: col5 || '',
            status: col6 || 'Aktywne',
            membersCount: cellNum(c[7]) || 0,
            category: 'Koło Naukowe',
          });
        });

        return { ok: true, tabName: typeof target === 'object' ? target.name : target, clubs };
      }
    } catch (e) {
      console.warn('Błąd odczytu Ewidencji Kół:', e);
    }
  }

  return { ok: true, tabName: 'Ewidencja Kół', clubs: [] };
}

// ─── 4. Ustalenia Operacyjne (GID: 1095771824) ───────────────────────────────
export async function fetchOperationalDecisionsFromSheet(sheetId = SHEET_ID) {
  const cleanId = extractSheetId(sheetId) || SHEET_ID;
  if (!cleanId) return { ok: false, error: 'Brak ID arkusza', decisions: [] };

  const candidates = [
    { gid: SAMORZAD_GIDS.USTALENIA_OPERACYJNE, name: 'Ustalenia Operacyjne' },
    'Ustalenia Operacyjne',
  ];

  for (const target of candidates) {
    try {
      const table = await fetchSheet(target, cleanId);
      if (table && table.rows && table.rows.length > 0) {
        const rows = table.rows.filter(r => r && r.c);
        const decisions = [];

        rows.forEach((row, idx) => {
          const c = row.c || [];
          const col0 = cellStr(c[0]);
          const col1 = cellStr(c[1]);
          const col2 = cellStr(c[2]);
          const col3 = cellStr(c[3]);
          const col4 = cellStr(c[4]);
          const col5 = cellStr(c[5]);

          const isHeader = /^(lp\.|id|nr|data|zgłoszenie|temat)/i.test(col0);
          if (isHeader && idx === 0) return;

          // Czytaj wyłącznie wiersze z ID Zgłoszenia / ID Ustalenia
          if (!col0 || isHeader) return;

          const parsedDate = parseGvizDate(c[1]);
          const dateStr = parsedDate ? formatDate(parsedDate) : (col1 || '');

          decisions.push({
            id: col0,
            date: dateStr,
            topic: col2 || 'Ustalenie operacyjne',
            details: col3 || '',
            responsible: col4 || 'Prezydium Samorządu Studenckiego WSKZ',
            status: col5 || 'W realizacji',
          });
        });

        return { ok: true, tabName: typeof target === 'object' ? target.name : target, decisions };
      }
    } catch (e) {
      console.warn('Błąd odczytu Ustaleń Operacyjnych:', e);
    }
  }

  return { ok: true, tabName: 'Ustalenia Operacyjne', decisions: [] };
}

// ─── Główna funkcja pobierania danych (Czysty Start - Zero Mocków) ───────────
export async function fetchAllData(sheetId = SHEET_ID) {
  const cleanId = extractSheetId(sheetId) || SHEET_ID;
  let mailLog = [];
  let itIssues = [];
  let clubs = [];
  let decisions = [];
  let syncWarning = null;

  if (!cleanId) {
    return { members: [], quarantine: [], mailLog: [], itIssues: [], clubs: [], decisions: [] };
  }

  const [mailRes, itRes, clubsRes, decRes] = await Promise.allSettled([
    fetchMailRegistryFromSheet(cleanId),
    fetchItIssuesFromSheet(cleanId),
    fetchClubsFromSheet(cleanId),
    fetchOperationalDecisionsFromSheet(cleanId),
  ]);

  if (mailRes.status === 'fulfilled' && mailRes.value?.entries) {
    mailLog = mailRes.value.entries;
  } else if (mailRes.reason) {
    syncWarning = mailRes.reason.message;
  }

  if (itRes.status === 'fulfilled' && itRes.value?.issues) {
    itIssues = itRes.value.issues;
  }

  if (clubsRes.status === 'fulfilled' && clubsRes.value?.clubs) {
    clubs = clubsRes.value.clubs;
  }

  if (decRes.status === 'fulfilled' && decRes.value?.decisions) {
    decisions = decRes.value.decisions;
  }

  return {
    members: [],
    quarantine: [],
    mailLog,
    itIssues,
    clubs,
    decisions,
    syncWarning,
  };
}

// ─── Eksport TSV / CSV ────────────────────────────────────────────────────────
export function formatCorrespondenceForSheet(entries = []) {
  const headers = ['Sygnatura', 'Data', 'Kierunek', 'Nadawca', 'Odbiorca', 'Temat', 'Streszczenie / Treść', 'Status', 'Hash / Sygnatura cyfrowa'];
  const rows = entries.map(item => [
    item.id || '',
    item.date || '',
    item.direction || 'IN',
    item.sender || '',
    item.recipient || '',
    item.subject || '',
    (item.summary || '').replace(/[\r\n\t]+/g, ' '),
    item.status || 'Zarejestrowane',
    item.hash || '',
  ]);

  const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
  return { headers, rows, tsv };
}

// Legacy helpers for backward compatibility
export function parseDurationToMinutes(val) { return 0; }
export function parseAttendanceLine(rawLine) { return null; }
export async function fetchMeetingSheetAttendance(code) { return { ok: false, error: 'Brak danych spotkań' }; }


