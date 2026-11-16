import { supabase } from './supabaseClient.js';

export const ORG_ID = 'samorzad_wskz';
const LOCAL_STORAGE_DOCS_KEY = 'crm_samorzad_official_documents';
const LOCAL_STORAGE_PROTOCOLS_KEY = 'crm_samorzad_meeting_protocols';

export const SAMORZAD_DOCUMENT_CATEGORIES = [
  'Wszystkie',
  'Uchwały Zarządu',
  'Uchwały Rady Samorządu',
  'Protokoły z Posiedzeń',
  'Regulaminy i Statuty',
  'Zarządzenia Przewodniczącego',
  'Wnioski i Petycje',
];

export const SAMORZAD_BODY_TYPES = [
  { id: 'all', label: 'Wszystkie organy' },
  { id: 'zarzad', label: 'Zarząd / Prezydium' },
  { id: 'rada_samorzadu', label: 'Rada Samorządu' },
  { id: 'komisja_stypendialna', label: 'Komisja Stypendialna' },
  { id: 'komisja_dydaktyczna', label: 'Komisja Dydaktyczna' },
  { id: 'komisja_rewizyjna', label: 'Komisja Rewizyjna' },
];

export const SAMORZAD_DOCUMENT_STATUSES = [
  { id: 'all', label: 'Wszystkie statusy' },
  { id: 'obowiazujacy', label: 'Obowiązujący' },
  { id: 'w_przygotowaniu', label: 'W przygotowaniu / Projekt' },
  { id: 'do_zatwierdzenia', label: 'Do zatwierdzenia' },
  { id: 'uchylony', label: 'Uchylony / Zastąpiony' },
];

export const DEFAULT_OFFICIAL_DOCUMENTS = [
  {
    id: 'doc_ss_01',
    organization_id: ORG_ID,
    academic_year: '2026/2027',
    code: 'STATUT/SS_WSKZ/2026',
    title: 'Statut Samorządu Studenckiego Wyższej Szkoły Kształcenia Zawodowego',
    category: 'Regulaminy i Statuty',
    body_type: 'rada_samorzadu',
    document_date: '2026-10-01',
    status: 'obowiazujacy',
    is_public: true,
    file_url: 'https://drive.google.com/file/d/1dwE1WhkZPD0V8ervQJkwx2VIDgLxRiHW/view',
    description: 'Najwyższy akt prawa wewnątrzuczelnianego studentów WSKZ określający ustrój, organy, ordynację wyborczą oraz zasady reprezentowania studentów.',
  },
  {
    id: 'doc_ss_02',
    organization_id: ORG_ID,
    academic_year: '2026/2027',
    code: 'REG/SS_WSKZ/SKN/01/2026',
    title: 'Regulamin Rejestracji, Funkcjonowania i Dofinansowania Kół Naukowych WSKZ',
    category: 'Regulaminy i Statuty',
    body_type: 'zarzad',
    document_date: '2026-10-05',
    status: 'obowiazujacy',
    is_public: true,
    file_url: 'https://docs.google.com/spreadsheets/d/1official_skn_registry_wskz/preview',
    description: 'Zasady prowadzenia ewidencji 14 Studenckich Kół Naukowych WSKZ, procedury sprawozdawcze oraz kryteria przyznawania środków grantowych.',
  },
  {
    id: 'doc_ss_03',
    organization_id: ORG_ID,
    academic_year: '2026/2027',
    code: 'UCHWAŁA/SS_WSKZ/ZS/01/2026',
    title: 'Uchwała Zarządu Samorządu w sprawie powołania Prezydium i podziału zadań na kadencję 2026-2028',
    category: 'Uchwały Zarządu',
    body_type: 'zarzad',
    document_date: '2026-10-08',
    status: 'obowiazujacy',
    is_public: true,
    file_url: '',
    description: 'Uchwała określająca zakres obowiązków Przewodniczącej Agnieszki Rusnarczyk, Zastępcy Aleksandry Żerdzińskiej oraz Sekretarza Tomasza Bratkowskiego.',
  },
  {
    id: 'doc_ss_04',
    organization_id: ORG_ID,
    academic_year: '2026/2027',
    code: 'UCHWAŁA/SS_WSKZ/RS/01/2026',
    title: 'Uchwała Rady Samorządu w sprawie zatwierdzenia ramowego planu pracy na rok akad. 2026/2027',
    category: 'Uchwały Rady Samorządu',
    body_type: 'rada_samorzadu',
    document_date: '2026-10-14',
    status: 'obowiazujacy',
    is_public: true,
    file_url: '',
    description: 'Przyjęcie kalendarza posiedzeń statutowych, powołanie Komisji Dydaktycznej oraz ram programowych Dni Adaptacyjnych dla studentów I roku.',
  },
  {
    id: 'doc_ss_05',
    organization_id: ORG_ID,
    academic_year: '2026/2027',
    code: 'ZARZ/SS_WSKZ/PRZEW/01/2026',
    title: 'Zarządzenie Przewodniczącego w sprawie powołania Pełnomocnika ds. Praw Studenta WSKZ',
    category: 'Zarządzenia Przewodniczącego',
    body_type: 'zarzad',
    document_date: '2026-10-20',
    status: 'obowiazujacy',
    is_public: true,
    file_url: '',
    description: 'Powołanie dyżurów doradczych i procedury interwencyjnej dla studentów w sprawach stypendialnych, regulaminowych i dydaktycznych.',
  },
  {
    id: 'doc_ss_06',
    organization_id: ORG_ID,
    academic_year: '2026/2027',
    code: 'WNIOSEK/SS_WSKZ/OFIC/01/2026',
    title: 'Wniosek do Władz Uczelni o wsparcie infrastrukturalne przestrzeni Coworkingowej dla kół naukowych',
    category: 'Wnioski i Petycje',
    body_type: 'zarzad',
    document_date: '2026-10-28',
    status: 'obowiazujacy',
    is_public: false,
    file_url: '',
    description: 'Oficjalne wystąpienie Kancelarii Samorządu do Prorektor ds. studenckich w sprawie adaptacji sali seminaryjnej na potrzeby spotkań projektowych.',
  },
];

export const KNOWN_STUDENT_GOV_MEMBERS = [
  { id: 'rusnarczyk', name: 'Agnieszka Rusnarczyk', role: 'Przewodnicząca RSS' },
  { id: 'zerdzinska', name: 'Aleksandra Żerdzińska', role: 'Zastępca Przewodniczącej' },
  { id: 'bratkowski', name: 'Tomasz Bratkowski', role: 'Sekretarz RSS / Protokolant' },
  { id: 'skakuj', name: 'Błażej Skakuj', role: 'Członek Zarządu' },
  { id: 'manikowski', name: 'Szymon Manikowski', role: 'Członek Zarządu' },
  { id: 'pietr', name: 'Agnieszka Pietr', role: 'Przewodnicząca Komisji Rewizyjnej' },
  { id: 'moszninska', name: 'Magdalena Mosznińska', role: 'Rada Samorządu' },
  { id: 'skapski', name: 'Antoni Skąpski', role: 'Rada Samorządu' },
];

/**
 * Inteligentny parser tekstu obecności (z protokołu lub CSV/Google Meet)
 */
export function parseAttendanceText(rawText) {
  if (!rawText || !rawText.trim()) return [];
  let text = String(rawText);

  // 1. Jeśli jest sekcja nieobecności, odcinamy wszystko po słowie "Nieobecności" / "Nieobecni"
  const absenceIndex = text.search(/nieobecno[śs][ćc]i|nieobecn[yi]/i);
  if (absenceIndex !== -1) {
    text = text.slice(0, absenceIndex);
  }

  // 2. Jeśli jest nagłówek obecnych, bierzemy tekst po nim
  const presenceMatch = text.match(/(?:uczestnicy(?:\s+zebrania|\s+posiedzenia)?\s*\([^)]*obecn[^)]*\)|obecn[yi]\s*:?)/i);
  if (presenceMatch && presenceMatch.index !== -1) {
    text = text.slice(presenceMatch.index + presenceMatch[0].length);
  }

  const detectedMembers = [];
  const detectedNamesSet = new Set();

  // 3. Sprawdzamy wystąpienia znanych członków Samorządu
  for (const member of KNOWN_STUDENT_GOV_MEMBERS) {
    const regex = new RegExp(`\\b${member.name.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(text)) {
      detectedMembers.push({
        name: member.name,
        role: member.role,
        present: true,
      });
      detectedNamesSet.add(member.name.toLowerCase());
    }
  }

  // 4. Szukamy dodatkowych osób / gości linijka po linijce
  const lines = text.split(/[\r\n,;•]+/).map((l) => l.trim()).filter(Boolean);
  for (const rawLine of lines) {
    let cleaned = rawLine.replace(/^\s*\d+[\.\)]\s*/, '');
    cleaned = cleaned.replace(/\([^)]*\)/g, '');
    cleaned = cleaned.replace(/\b\d{1,2}:\d{2}\b/g, '');
    cleaned = cleaned.replace(/\b\d+\s*(?:hr|godz|min|h)\b/gi, '');
    cleaned = cleaned.replace(/[0-9]/g, '');
    cleaned = cleaned.trim();

    const words = cleaned.split(/\s+/).filter((w) => w.length >= 2);
    if (words.length >= 2 && words.length <= 4) {
      const candidateName = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const lower = candidateName.toLowerCase();
      const isHeaderWord = /uczestnic|obecn|posiedzen|zarz[aą]d|samorz[aą]d|protoko[lł]|porz[aą]dek|otwarcie/i.test(candidateName);
      if (!isHeaderWord && !detectedNamesSet.has(lower)) {
        const matchedKnown = KNOWN_STUDENT_GOV_MEMBERS.find((m) => m.name.toLowerCase() === lower);
        if (matchedKnown) {
          detectedMembers.push({
            name: matchedKnown.name,
            role: matchedKnown.role,
            present: true,
          });
        } else {
          detectedMembers.push({
            name: candidateName,
            role: 'Uczestnik / Gość',
            present: true,
          });
        }
        detectedNamesSet.add(lower);
      }
    }
  }

  return detectedMembers;
}

export const DEFAULT_MEETING_PROTOCOLS = [
  {
    id: 'prot_ss_04',
    organization_id: ORG_ID,
    academic_year: '2026/2027',
    protocol_number: 'PROT/SS_WSKZ/ZS/04/2026',
    meeting_code: 'P04',
    meeting_date: '2026-11-02',
    meeting_time: '18:00 - 19:30',
    location: 'Biuro Samorządu WSKZ / Google Meet',
    body_type: 'zarzad',
    title: 'Protokół z IV Posiedzenia Zarządu Samorządu Studenckiego WSKZ',
    chairperson: 'Agnieszka Rusnarczyk (Przewodnicząca RSS)',
    recorder: 'Tomasz Bratkowski (Sekretarz RSS)',
    attendees_count: 4,
    agenda: '1. Otwarcie posiedzenia i stwierdzenie kworum.\n2. Podsumowanie działalności kół naukowych w październiku 2026.\n3. Ustalenia dotyczące Dnia Studenta i wydatków budżetowych.\n4. Wolne wnioski.',
    discussion_content: 'Zarząd obradował w składzie 4 osób. Przedyskutowano raporty z MultiHuba, frekwencję na prelekcjach oraz korespondencję wychodzącą. Przyjęto ustalenia dotyczące harmonogramu zebrań.',
    resolutions_summary: 'Zatwierdzenie planu spotkań merytorycznych kół na listopad 2026 oraz harmonogramu dyżurów.',
    drive_folder_url: 'https://drive.google.com/drive/folders/1Zy3ebtmyqOTG6pvo_XFM9jb8KEbT8S8I',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1Zy3ebtmyqOTG6pvo_XFM9jb8KEbT8S8I',
    original_file_url: 'https://drive.google.com/file/d/1dwE1WhkZPD0V8ervQJkwx2VIDgLxRiHW/view',
    originalFileUrl: 'https://drive.google.com/file/d/1dwE1WhkZPD0V8ervQJkwx2VIDgLxRiHW/view',
    drive_url: 'https://drive.google.com/drive/folders/1Zy3ebtmyqOTG6pvo_XFM9jb8KEbT8S8I',
    attendees_list: [
      { name: 'Agnieszka Rusnarczyk', role: 'Przewodnicząca RSS', present: true },
      { name: 'Aleksandra Żerdzińska', role: 'Zastępca Przewodniczącej', present: true },
      { name: 'Tomasz Bratkowski', role: 'Sekretarz RSS', present: true },
      { name: 'Błażej Skakuj', role: 'Członek Zarządu', present: true },
    ],
  },
  {
    id: 'prot_ss_01',
    organization_id: ORG_ID,
    academic_year: '2026/2027',
    protocol_number: 'PROT/SS_WSKZ/ZS/01/2026',
    meeting_code: 'P01',
    meeting_date: '2026-10-08',
    meeting_time: '18:00 - 19:45',
    location: 'Biuro Samorządu WSKZ / Google Meet',
    body_type: 'zarzad',
    title: 'Protokół z I Posiedzenia Zarządu Samorządu Studenckiego WSKZ',
    chairperson: 'Agnieszka Rusnarczyk (Przewodnicząca RSS)',
    recorder: 'Tomasz Bratkowski (Sekretarz RSS)',
    attendees_count: 4,
    agenda: '1. Otwarcie posiedzenia i stwierdzenie kworum.\n2. Przyjęcie regulaminu pracy Prezydium.\n3. Omówienie harmonogramu zebrań kół naukowych na semestr zimowy.\n4. Sprawy bieżące i wolne wnioski.',
    discussion_content: 'Zarząd obradował w składzie 4 członków Zarządu. Przedyskutowano wnioski studentów dotyczące legitymacji i dostępu do biblioteki. Jednogłośnie podjęto uchwałę ZS/01/2026.',
    resolutions_summary: 'Podjęto Uchwałę nr 01/2026 ws. podziału zadań w Prezydium.',
    drive_folder_url: 'https://drive.google.com/drive/folders/1Zy3ebtmyqOTG6pvo_XFM9jb8KEbT8S8I',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1Zy3ebtmyqOTG6pvo_XFM9jb8KEbT8S8I',
    original_file_url: 'https://drive.google.com/file/d/1dwE1WhkZPD0V8ervQJkwx2VIDgLxRiHW/view',
    originalFileUrl: 'https://drive.google.com/file/d/1dwE1WhkZPD0V8ervQJkwx2VIDgLxRiHW/view',
    drive_url: 'https://drive.google.com/drive/folders/1Zy3ebtmyqOTG6pvo_XFM9jb8KEbT8S8I',
    attendees_list: [
      { name: 'Agnieszka Rusnarczyk', role: 'Przewodnicząca RSS', present: true },
      { name: 'Aleksandra Żerdzińska', role: 'Zastępca Przewodniczącej', present: true },
      { name: 'Tomasz Bratkowski', role: 'Sekretarz RSS', present: true },
      { name: 'Błażej Skakuj', role: 'Członek Zarządu', present: true },
    ],
  },
];

/**
 * Wyciąga Google Drive File ID z dowolnego formatu linku (PDF, Docs, Sheets, drive.google.com/file/d/...)
 */
export function extractGoogleDriveFileId(url) {
  if (!url) return null;
  const str = String(url).trim();
  const fileMatch = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const docMatch = str.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return docMatch[1];
  const sheetMatch = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) return sheetMatch[1];
  const idMatch = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  const directMatch = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (directMatch) return directMatch[1];
  return null;
}

/**
 * Wyciąga ID folderu Google Drive (/folders/...)
 */
export function extractGoogleDriveFolderId(url) {
  if (!url) return null;
  const str = String(url).trim();
  const folderMatch = str.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  return null;
}

/**
 * Generuje zunifikowaną sygnaturę aktu dla Samorządu Studenckiego
 */
export function generateDocumentSignature({
  category,
  bodyType = 'zarzad',
  orgTag = 'SS_WSKZ',
  currentYear = new Date().getFullYear(),
  existingDocuments = [],
  editingDocId = null,
}) {
  let prefix = 'UCHWAŁA';
  let bodyCode = bodyType === 'rada_samorzadu' ? 'RS' : 'ZS';

  switch (category) {
    case 'Uchwały Rady Samorządu':
      prefix = 'UCHWAŁA';
      bodyCode = 'RS';
      break;
    case 'Uchwały Zarządu':
      prefix = 'UCHWAŁA';
      bodyCode = 'ZS';
      break;
    case 'Protokoły z Posiedzeń':
      prefix = 'PROT';
      bodyCode = bodyType === 'rada_samorzadu' ? 'RS' : 'ZS';
      break;
    case 'Regulaminy i Statuty':
      prefix = 'REG';
      bodyCode = 'USTROJ';
      break;
    case 'Zarządzenia Przewodniczącego':
      prefix = 'ZARZ';
      bodyCode = 'PRZEW';
      break;
    case 'Wnioski i Petycje':
      prefix = 'WNIOSEK';
      bodyCode = 'OFIC';
      break;
    default:
      prefix = 'AKT';
      bodyCode = 'SS';
  }

  const yearDocs = existingDocuments.filter((d) => {
    if (d.id === editingDocId) return false;
    const docDate = d.document_date || d.date;
    const docYear = docDate ? docDate.slice(0, 4) : String(currentYear);
    return d.category === category && docYear === String(currentYear);
  });

  const nextSeq = String(yearDocs.length + 1).padStart(2, '0');
  let proposedCode = `${prefix}/${orgTag}/${bodyCode}/${nextSeq}/${currentYear}`;

  let counter = yearDocs.length + 1;
  while (existingDocuments.some((d) => d.code === proposedCode && d.id !== editingDocId)) {
    counter++;
    proposedCode = `${prefix}/${orgTag}/${bodyCode}/${String(counter).padStart(2, '0')}/${currentYear}`;
  }

  return proposedCode;
}

/**
 * Wielokryterialne wyszukiwanie i filtrowanie aktów prawnych
 */
export function filterStudentGovDocuments({
  documents = [],
  selectedCategory = 'Wszystkie',
  selectedBodyType = 'all',
  selectedStatus = 'all',
  academicYear = null,
  searchQuery = '',
}) {
  const normalizedQuery = (searchQuery || '').toLowerCase().trim();
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return documents.filter((doc) => {
    if (academicYear && doc.academic_year && doc.academic_year !== academicYear) {
      return false;
    }
    if (selectedCategory !== 'Wszystkie' && doc.category !== selectedCategory) {
      return false;
    }
    if (selectedBodyType !== 'all' && (doc.body_type || doc.bodyType) !== selectedBodyType) {
      return false;
    }
    if (selectedStatus !== 'all' && doc.status !== selectedStatus) {
      return false;
    }
    if (queryTokens.length === 0) return true;

    const searchableString = [
      doc.code,
      doc.title,
      doc.description,
      doc.category,
      doc.chairperson,
      doc.author,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return queryTokens.every((token) => searchableString.includes(token));
  });
}

/**
 * Główny serwis wymiany danych z Supabase + pamięcią lokalną
 */
export const studentGovDocsService = {
  // Pobieranie dokumentów / aktów
  async getDocuments(academicYear = null) {
    try {
      let query = supabase
        .from('official_documents')
        .select('*')
        .eq('organization_id', ORG_ID)
        .order('document_date', { ascending: false });

      if (academicYear) {
        query = query.eq('academic_year', academicYear);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        const enriched = data.map((d) =>
          d.code && d.code.includes('STATUT')
            ? { ...d, file_url: 'https://drive.google.com/file/d/1dwE1WhkZPD0V8ervQJkwx2VIDgLxRiHW/view' }
            : d
        );
        try {
          localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(enriched));
        } catch {}
        return enriched;
      }
    } catch (err) {
      console.warn('[studentGovDocsService] Supabase getDocuments fallback:', err);
    }

    try {
      const local = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((d) =>
            d.code && d.code.includes('STATUT')
              ? { ...d, file_url: 'https://drive.google.com/file/d/1dwE1WhkZPD0V8ervQJkwx2VIDgLxRiHW/view' }
              : d
          );
        }
      }
    } catch {}

    return DEFAULT_OFFICIAL_DOCUMENTS;
  },

  // Zapis / aktualizacja aktu
  async saveDocument(doc) {
    const rawDate = doc.document_date || doc.date || new Date().toISOString().slice(0, 10);
    const payload = {
      organization_id: ORG_ID,
      academic_year: doc.academic_year || doc.academicYear || '2026/2027',
      code: String(doc.code || '').trim(),
      title: String(doc.title || '').trim(),
      category: doc.category || 'Uchwały Zarządu',
      body_type: doc.body_type || doc.bodyType || 'zarzad',
      document_date: rawDate,
      effective_date: doc.effective_date || rawDate,
      status: doc.status || 'obowiazujacy',
      description: doc.description || '',
      file_url: doc.file_url || doc.fileUrl || doc.driveUrl || '',
      storage_path: doc.storage_path || doc.storagePath || null,
      is_public: Boolean(doc.is_public ?? doc.isPublic ?? false),
      updated_at: new Date().toISOString(),
    };

    let saved = null;
    try {
      if (doc.id && !String(doc.id).startsWith('doc_ss_')) {
        const { data, error } = await supabase
          .from('official_documents')
          .update(payload)
          .eq('id', doc.id)
          .select()
          .single();
        if (!error && data) saved = data;
      } else {
        const { data, error } = await supabase
          .from('official_documents')
          .insert([payload])
          .select()
          .single();
        if (!error && data) saved = data;
      }
    } catch (e) {
      console.warn('[studentGovDocsService] Błąd zapisu do Supabase, używam zapisu lokalnego:', e);
    }

    const fallbackDoc = saved || {
      ...payload,
      id: doc.id || `doc_local_${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    try {
      const current = await this.getDocuments();
      const existingIdx = current.findIndex((d) => d.id === fallbackDoc.id || d.code === fallbackDoc.code);
      let updatedList;
      if (existingIdx >= 0) {
        updatedList = [...current];
        updatedList[existingIdx] = fallbackDoc;
      } else {
        updatedList = [fallbackDoc, ...current];
      }
      localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(updatedList));
    } catch {}

    return fallbackDoc;
  },

  // Usunięcie dokumentu
  async deleteDocument(id) {
    try {
      await supabase
        .from('official_documents')
        .delete()
        .eq('id', id)
        .eq('organization_id', ORG_ID);
    } catch (err) {
      console.warn('[studentGovDocsService] Błąd usuwania z Supabase:', err);
    }

    try {
      const current = await this.getDocuments();
      const next = current.filter((d) => d.id !== id);
      localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(next));
    } catch {}

    return true;
  },

  // Pobieranie protokołów posiedzeń
  async getProtocols(academicYear = null) {
    const normalizeProt = (p) => {
      const isFolder = p.drive_url && p.drive_url.includes('/folders/');
      const rawList = Array.isArray(p.attendees_list) && p.attendees_list.length > 0
        ? p.attendees_list
        : [
            { name: 'Agnieszka Rusnarczyk', role: 'Przewodnicząca RSS', present: true },
            { name: 'Aleksandra Żerdzińska', role: 'Zastępca Przewodniczącej', present: true },
            { name: 'Tomasz Bratkowski', role: 'Sekretarz RSS', present: true },
            { name: 'Błażej Skakuj', role: 'Członek Zarządu', present: true },
          ];
      const activeList = rawList.filter((a) => a && a.present !== false);
      const count = Number(p.attendees_count ?? activeList.length);

      return {
        ...p,
        drive_folder_url: p.drive_folder_url || p.driveFolderUrl || (isFolder ? p.drive_url : ''),
        driveFolderUrl: p.driveFolderUrl || p.drive_folder_url || (isFolder ? p.drive_url : ''),
        original_file_url: p.original_file_url || p.originalFileUrl || p.file_url || p.fileUrl || (!isFolder ? p.drive_url : ''),
        originalFileUrl: p.originalFileUrl || p.original_file_url || p.fileUrl || p.file_url || (!isFolder ? p.drive_url : ''),
        attendees_list: rawList,
        attendees_count: count > 0 ? count : activeList.length,
      };
    };

    try {
      let query = supabase
        .from('meeting_protocols')
        .select('*')
        .eq('organization_id', ORG_ID)
        .order('meeting_date', { ascending: false });

      if (academicYear) {
        query = query.eq('academic_year', academicYear);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        let list = data.map(normalizeProt);
        if (!list.some((p) => p.protocol_number === 'PROT/SS_WSKZ/ZS/04/2026')) {
          list = [DEFAULT_MEETING_PROTOCOLS[0], ...list];
        }
        try {
          localStorage.setItem(LOCAL_STORAGE_PROTOCOLS_KEY, JSON.stringify(list));
        } catch {}
        return list;
      }
    } catch (err) {
      console.warn('[studentGovDocsService] Supabase getProtocols fallback:', err);
    }

    try {
      const local = localStorage.getItem(LOCAL_STORAGE_PROTOCOLS_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let list = parsed.map(normalizeProt);
          if (!list.some((p) => p.protocol_number === 'PROT/SS_WSKZ/ZS/04/2026')) {
            list = [DEFAULT_MEETING_PROTOCOLS[0], ...list];
          }
          return list;
        }
      }
    } catch {}

    return DEFAULT_MEETING_PROTOCOLS.map(normalizeProt);
  },

  // Zapis protokołu posiedzenia
  async saveProtocol(protocol) {
    const rawDate = protocol.meeting_date || protocol.date || new Date().toISOString().slice(0, 10);
    const driveFolderUrl = (protocol.drive_folder_url || protocol.driveFolderUrl || '').trim();
    const originalFileUrl = (protocol.original_file_url || protocol.originalFileUrl || protocol.file_url || protocol.fileUrl || '').trim();

    const payload = {
      organization_id: ORG_ID,
      academic_year: protocol.academic_year || protocol.academicYear || '2026/2027',
      protocol_number: String(protocol.protocol_number || protocol.protocolNumber || '').trim(),
      meeting_id: protocol.meeting_id || protocol.meetingId || null,
      meeting_code: protocol.meeting_code || protocol.meetingCode || 'P01',
      meeting_date: rawDate,
      meeting_time: protocol.meeting_time || protocol.meetingTime || '18:00 - 20:00',
      location: protocol.location || 'Biuro Samorządu WSKZ / Google Meet',
      body_type: protocol.body_type || protocol.bodyType || 'zarzad',
      title: String(protocol.title || '').trim(),
      chairperson: protocol.chairperson || 'Przewodnicząca RSS',
      recorder: protocol.recorder || 'Sekretarz RSS',
      attendees_count: Number(protocol.attendees_count ?? (Array.isArray(protocol.attendees_list) ? protocol.attendees_list.length : 0)),
      agenda: protocol.agenda || '',
      discussion_content: protocol.discussion_content || protocol.discussionContent || '',
      resolutions_summary: protocol.resolutions_summary || protocol.resolutionsSummary || '',
      attendees_list: Array.isArray(protocol.attendees_list) ? protocol.attendees_list : [],
      drive_folder_url: driveFolderUrl,
      driveFolderUrl: driveFolderUrl,
      original_file_url: originalFileUrl,
      originalFileUrl: originalFileUrl,
      drive_url: originalFileUrl || driveFolderUrl || protocol.drive_url || '',
      storage_path: protocol.storage_path || null,
      updated_at: new Date().toISOString(),
    };

    let saved = null;
    try {
      const supabasePayload = {
        organization_id: payload.organization_id,
        academic_year: payload.academic_year,
        protocol_number: payload.protocol_number,
        meeting_id: payload.meeting_id,
        meeting_code: payload.meeting_code,
        meeting_date: payload.meeting_date,
        meeting_time: payload.meeting_time,
        location: payload.location,
        body_type: payload.body_type,
        title: payload.title,
        chairperson: payload.chairperson,
        recorder: payload.recorder,
        attendees_count: payload.attendees_count,
        agenda: payload.agenda,
        discussion_content: payload.discussion_content,
        resolutions_summary: payload.resolutions_summary,
        attendees_list: payload.attendees_list,
        drive_url: payload.drive_url,
        updated_at: payload.updated_at,
      };

      if (protocol.id && !String(protocol.id).startsWith('prot_ss_')) {
        const { data, error } = await supabase
          .from('meeting_protocols')
          .update(supabasePayload)
          .eq('id', protocol.id)
          .select()
          .single();
        if (!error && data) saved = data;
      } else {
        const { data, error } = await supabase
          .from('meeting_protocols')
          .insert([supabasePayload])
          .select()
          .single();
        if (!error && data) saved = data;
      }
    } catch (e) {
      console.warn('[studentGovDocsService] Błąd zapisu protokołu do Supabase:', e);
    }

    const fallbackProt = {
      ...(saved || {}),
      ...payload,
      id: (saved && saved.id) || protocol.id || `prot_local_${Date.now()}`,
      created_at: (saved && saved.created_at) || protocol.created_at || new Date().toISOString(),
    };

    try {
      const current = await this.getProtocols();
      const existingIdx = current.findIndex((p) => p.id === fallbackProt.id || p.protocol_number === fallbackProt.protocol_number);
      let nextList;
      if (existingIdx >= 0) {
        nextList = [...current];
        nextList[existingIdx] = fallbackProt;
      } else {
        nextList = [fallbackProt, ...current];
      }
      localStorage.setItem(LOCAL_STORAGE_PROTOCOLS_KEY, JSON.stringify(nextList));
    } catch {}

    return fallbackProt;
  },

  // Usunięcie protokołu
  async deleteProtocol(id) {
    try {
      await supabase
        .from('meeting_protocols')
        .delete()
        .eq('id', id)
        .eq('organization_id', ORG_ID);
    } catch (err) {
      console.warn('[studentGovDocsService] Błąd usuwania protokołu z Supabase:', err);
    }

    try {
      const current = await this.getProtocols();
      const next = current.filter((p) => p.id !== id);
      localStorage.setItem(LOCAL_STORAGE_PROTOCOLS_KEY, JSON.stringify(next));
    } catch {}

    return true;
  },
};
