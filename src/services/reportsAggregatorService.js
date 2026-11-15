import * as XLSX from 'xlsx';
import { supabase, getTenantSupabase } from './supabaseClient';
import { fetchTeamupEventsMulti } from './teamupService';
import {
  WSKZ_CLUBS,
  SAMORZAD_SUBCALENDAR_ID,
  EXCLUDED_SUBCALENDAR_IDS,
  getClubBySubcalendarId,
  getClubByOrgId,
  matchClubsForEvent,
} from '../config/wskzRegistry';

/**
 * Normalizuje ciąg znaków daty do formatu YYYY-MM-DD
 */
function toDateStr(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    const m = val.match(/^\d{4}-\d{2}-\d{2}/);
    if (m) return m[0];
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch {}
  return String(val).slice(0, 10);
}

/**
 * Sprawdza, czy data mieści się w przedziale [startDate, endDate]
 */
function isDateInRange(dateStr, startDate, endDate) {
  if (!dateStr) return false;
  const d = toDateStr(dateStr);
  if (!d) return false;
  if (startDate && d < startDate) return false;
  if (endDate && d > endDate) return false;
  return true;
}

/**
 * Wyciąga potencjalne kody spotkania z tytułu (np. [26/27] M01, [M01], (1/3), M262710)
 */
function extractMeetingCodesFromTitle(title) {
  if (!title) return [];
  const codes = new Set();
  
  // Wzorce w nawiasach kwadratowych [M01], [26/27] M01, [1/3]
  const bracketMatches = title.match(/\[(.*?)\]/g);
  if (bracketMatches) {
    bracketMatches.forEach(b => {
      const clean = b.slice(1, -1).trim();
      if (clean) {
        codes.add(clean);
        // Jeśli w nawiasie jest np. 26/27, sprawdź czy za nawiasem jest M01
        const after = title.slice(title.indexOf(b) + b.length).trim();
        const mAfter = after.match(/^M\d+/i);
        if (mAfter) {
          codes.add(`${clean} ${mAfter[0]}`);
          codes.add(mAfter[0]);
        }
      }
    });
  }

  // Wzorce w nawiasach okrągłych (1/3), (2/3)
  const parenMatches = title.match(/\((.*?)\)/g);
  if (parenMatches) {
    parenMatches.forEach(p => {
      const clean = p.slice(1, -1).trim();
      if (clean) codes.add(clean);
    });
  }

  // Kody spotkań typu M01, M02, M-SPR-1, M252625, M262710
  const mMatches = title.match(/\bM[-0-9a-zA-Z/]+\b/gi);
  if (mMatches) {
    mMatches.forEach(m => codes.add(m.trim()));
  }

  return Array.from(codes);
}

/**
 * Zwraca alternatywne nazwy i warianty identyfikatora organizacji dla dopasowań w Supabase
 */
function getOrgAliases(orgId) {
  if (!orgId) return [];
  const set = new Set([orgId.toLowerCase()]);
  if (orgId.includes('_')) set.add(orgId.replace(/_/g, '-').toLowerCase());
  if (orgId.includes('-')) set.add(orgId.replace(/-/g, '_').toLowerCase());

  if (orgId === 'psychoonkologia' || orgId.includes('psychoonkolog')) {
    set.add('psychoonkologia');
    set.add('skn_psychoonkologii');
    set.add('skn-psychoonkologii');
  }
  if (orgId === 'uzaleznienia' || orgId.includes('uzalezn')) {
    set.add('uzaleznienia');
    set.add('skn_uzaleznien');
    set.add('skn-uzaleznien');
  }
  if (orgId.includes('seksuolog')) {
    set.add('skn_seksuologii');
    set.add('skn-seksuologii');
  }
  return Array.from(set);
}

/**
 * Główny silnik agregujący dane dla raportu Władz Uczelni
 */
export async function generateUniversityReport({
  startDate = '2026-10-01',
  endDate = '2027-09-30',
  selectedOrgIds = null, // null oznacza wszystkie 14 kół
  includeSamorzad = true,
  correspondenceList = [],
  operationalDecisions = [],
  starostowieList = [],
}) {
  const activeClubs = selectedOrgIds && Array.isArray(selectedOrgIds) && selectedOrgIds.length > 0
    ? WSKZ_CLUBS.filter(c => selectedOrgIds.includes(c.orgId))
    : [...WSKZ_CLUBS];

  const activeClubOrgIds = new Set(activeClubs.map(c => c.orgId));
  const activeSubcalendarIds = activeClubs
    .map(c => c.subcalendarId)
    .filter(Boolean);

  if (includeSamorzad) {
    activeSubcalendarIds.push(SAMORZAD_SUBCALENDAR_ID);
  }

  // ── 1. Pobranie danych z Supabase (metadata + attendance) ───────────────────
  // Pobieramy zarówno zapytaniem ogólnym, jak i per-tenant w celu obsłużenia polityk RLS
  let supabaseMetadata = [];
  let supabaseAttendance = [];

  // Zapytanie globalne
  try {
    const { data: metaData, error: metaErr } = await supabase
      .from('meeting_metadata')
      .select('*');
    if (!metaErr && Array.isArray(metaData) && metaData.length > 0) {
      supabaseMetadata.push(...metaData);
    }
  } catch (e) {
    console.warn('Brak tabeli meeting_metadata w Supabase lub błąd zapytania globalnego:', e);
  }

  try {
    const { data: attData, error: attErr } = await supabase
      .from('attendance')
      .select('*');
    if (!attErr && Array.isArray(attData) && attData.length > 0) {
      supabaseAttendance.push(...attData);
    }
  } catch (e) {
    console.warn('Brak tabeli attendance w Supabase lub błąd zapytania globalnego:', e);
  }

  // Równoległe pobranie dla wszystkich kół naukowych z nagłówkiem x-organization-id
  // Zapewnia pobranie wpisów dla tabel chronionych przez RLS w Supabase
  const targetTenants = Array.from(new Set([
    ...WSKZ_CLUBS.flatMap(c => getOrgAliases(c.orgId)),
    'skn_seksuologii',
    'psychoonkologia',
    'uzaleznienia',
  ]));

  try {
    const tenantFetches = targetTenants.map(async (tenantId) => {
      try {
        const client = getTenantSupabase(tenantId);
        const [metaRes, attRes] = await Promise.all([
          client.from('meeting_metadata').select('*'),
          client.from('attendance').select('organization_id, meeting_code, meeting_date, index_number, role, activity_description'),
        ]);
        return {
          meta: metaRes?.data || [],
          att: attRes?.data || [],
        };
      } catch {
        return { meta: [], att: [] };
      }
    });

    const tenantResults = await Promise.all(tenantFetches);
    const seenMetaKeys = new Set(supabaseMetadata.map(m => `${m.organization_id || ''}_${m.meeting_key || m.id || ''}`));
    const seenAttKeys = new Set(supabaseAttendance.map(a => `${a.organization_id || ''}_${a.meeting_code || ''}_${a.meeting_date || ''}_${a.index_number || ''}`));

    for (const res of tenantResults) {
      for (const m of res.meta) {
        const k = `${m.organization_id || ''}_${m.meeting_key || m.id || ''}`;
        if (!seenMetaKeys.has(k)) {
          seenMetaKeys.add(k);
          supabaseMetadata.push(m);
        }
      }
      for (const a of res.att) {
        const k = `${a.organization_id || ''}_${a.meeting_code || ''}_${a.meeting_date || ''}_${a.index_number || ''}`;
        if (!seenAttKeys.has(k)) {
          seenAttKeys.add(k);
          supabaseAttendance.push(a);
        }
      }
    }
  } catch (err) {
    console.warn('Błąd wielokołowego pobierania danych z Supabase:', err);
  }

  // ── 2. Pobranie wydarzeń z kalendarza Teamup ──────────────────────────────
  let rawTeamupEvents = [];
  try {
    rawTeamupEvents = await fetchTeamupEventsMulti({
      startDate,
      endDate,
      subcalendarIds: activeSubcalendarIds,
    });
  } catch (err) {
    console.warn('Błąd podczas pobierania zdarzeń z Teamup:', err);
    rawTeamupEvents = [];
  }

  // Wyklucz zdarzenia wyłącznie z planów zajęć / techniczne
  const filteredEvents = rawTeamupEvents.filter(evt => {
    const subIds = Array.isArray(evt.subcalendar_ids)
      ? evt.subcalendar_ids
      : [evt.subcalendar_id].filter(Boolean);

    // Jeśli ma wyłącznie subcalendary wykluczone -> pomiń
    const onlyExcluded = subIds.length > 0 && subIds.every(id => EXCLUDED_SUBCALENDAR_IDS.includes(Number(id)));
    if (onlyExcluded) return false;

    // Sprawdź czy data mieści się w zakresie
    const evtDate = toDateStr(evt.start_dt || evt.startDate);
    return isDateInRange(evtDate, startDate, endDate);
  });

  // ── 3. Klasyfikacja i wielopoziomowe dopasowanie spotkań ───────────────────
  const uniqueMeetingsMap = new Map();
  const samorzadMeetings = [];

  for (const evt of filteredEvents) {
    const evtId = String(evt.id);
    const evtSubId = String(evt.subcalendar_id || (Array.isArray(evt.subcalendar_ids) ? evt.subcalendar_ids[0] : ''));
    const evtDate = toDateStr(evt.start_dt || evt.startDate);
    const evtTitle = String(evt.title || 'Spotkanie').trim();
    const titleLower = evtTitle.toLowerCase();

    // Sprawdź czy to wydarzenie Samorządu
    const subIds = Array.isArray(evt.subcalendar_ids)
      ? evt.subcalendar_ids
      : [evt.subcalendar_id].filter(Boolean);

    const isSamorzadEvent = subIds.map(Number).includes(SAMORZAD_SUBCALENDAR_ID) ||
      titleLower.includes('samorząd') ||
      titleLower.includes('kancelaria');

    if (isSamorzadEvent && includeSamorzad) {
      samorzadMeetings.push({
        id: evtId,
        title: evtTitle,
        date: evtDate,
        start_dt: evt.start_dt,
        end_dt: evt.end_dt,
        location: evt.location || 'Online',
        notes: evt.notes || '',
      });
    }

    // Dopasuj powiązane Koła Naukowe
    let matchedClubs = matchClubsForEvent(evt);

    // Filtruj koła do tych, które są aktualnie wybrane w raporcie
    const clubsInReport = matchedClubs.filter(c => activeClubOrgIds.has(c.orgId));
    if (clubsInReport.length === 0) {
      // Jeśli żadne wybrane koło nie jest powiązane, pomiń
      continue;
    }

    // Zbierz potencjalne aliasy organizacji i kody z tytułu
    const candidateOrgs = new Set();
    clubsInReport.forEach(c => {
      getOrgAliases(c.orgId).forEach(o => candidateOrgs.add(o));
    });
    const candidateCodes = extractMeetingCodesFromTitle(evtTitle);

    // ── WIELOPOZIOMOWE DOPASOWANIE DO METADANYCH I FREKWENCJI ───────────────
    let matchedMeta = null;
    let participants = 0;
    let matchedSource = 'none';

    // ── POZIOM 1 (po ID / kluczu):
    // meta.meeting_key == String(event.id), ${subcalendarId}_${event.id}, endsWith(event.id), lub pasuje do kodu z tytułu
    for (const m of supabaseMetadata) {
      const mKey = String(m.meeting_key || m.id || '').trim();
      const mCode = String(m.meeting_code || m.code || '').trim();
      if (!mKey && !mCode) continue;

      const isDirectIdMatch =
        mKey === evtId ||
        mKey === `${evtSubId}_${evtId}` ||
        (evtId && mKey.endsWith(evtId));

      const isCodeMatch = candidateCodes.some(c =>
        (mKey && (mKey.toLowerCase() === c.toLowerCase() || mKey.toLowerCase().includes(c.toLowerCase()))) ||
        (mCode && (mCode.toLowerCase() === c.toLowerCase() || mCode.toLowerCase().includes(c.toLowerCase())))
      );

      if (isDirectIdMatch || isCodeMatch) {
        matchedMeta = m;
        matchedSource = 'metadata_key';
        break;
      }
    }

    // ── POZIOM 2 (po dacie i organizacji):
    // Jeśli Poziom 1 nie trafił, dopasuj rekord z meeting_metadata dla tej samej organizacji i daty
    if (!matchedMeta) {
      const sameOrgDateMetas = supabaseMetadata.filter(m => {
        const mOrg = String(m.organization_id || '').toLowerCase();
        const mDate = toDateStr(m.meeting_date || m.date || m.start_dt || m.created_at);
        return candidateOrgs.has(mOrg) && mDate === evtDate;
      });

      if (sameOrgDateMetas.length === 1) {
        matchedMeta = sameOrgDateMetas[0];
        matchedSource = 'metadata_org_date';
      } else if (sameOrgDateMetas.length > 1) {
        const cleanEvtTitle = evtTitle.toLowerCase().replace(/\[.*?\]|\(.*?\)/g, '').replace(/[^a-z0-9]/g, ' ').trim();
        const found = sameOrgDateMetas.find(m => {
          const cleanMTitle = String(m.title || m.name || '').toLowerCase().replace(/\[.*?\]|\(.*?\)/g, '').replace(/[^a-z0-9]/g, ' ').trim();
          return cleanEvtTitle && cleanMTitle && (cleanEvtTitle.includes(cleanMTitle.slice(0, 15)) || cleanMTitle.includes(cleanEvtTitle.slice(0, 15)));
        });
        matchedMeta = found || sameOrgDateMetas[0];
        matchedSource = 'metadata_org_date';
      }
    }

    // Jeżeli znaleziono metadane i posiadają pole total_participants
    if (
      matchedMeta &&
      matchedMeta.total_participants !== undefined &&
      matchedMeta.total_participants !== null &&
      !isNaN(Number(matchedMeta.total_participants))
    ) {
      participants = Math.max(0, Number(matchedMeta.total_participants));
    } else {
      // ── POZIOM 3 (fallback z tabeli attendance):
      // Sprawdź attendance dla tego organization_id i meeting_date
      const matchingAttRows = supabaseAttendance.filter(a => {
        const aOrg = String(a.organization_id || '').toLowerCase();
        const aDate = toDateStr(a.meeting_date);
        return candidateOrgs.has(aOrg) && aDate === evtDate;
      });

      if (matchingAttRows.length > 0) {
        // a) Czy istnieje techniczny wpis metadanych [MEETING_META]
        const metaAtt = matchingAttRows.find(a =>
          String(a.meeting_code || '').includes('[MEETING_META]') ||
          String(a.activity_description || '').includes('"meeting_key"') ||
          String(a.activity_description || '').includes('"total_participants"')
        );

        let parsedCount = null;
        if (metaAtt && metaAtt.activity_description) {
          try {
            const parsed = JSON.parse(metaAtt.activity_description);
            if (parsed && (parsed.total_participants !== undefined || parsed.headcount !== undefined)) {
              parsedCount = Number(parsed.total_participants ?? parsed.headcount);
            }
          } catch {}
        }

        if (parsedCount !== null && !isNaN(parsedCount) && parsedCount >= 0) {
          participants = parsedCount;
          matchedSource = 'attendance_meta';
        } else {
          // b) Policz unikalne indeksy uczestników spotkania
          const validParticipantRows = matchingAttRows.filter(a => {
            const code = String(a.meeting_code || '');
            if (
              code.startsWith('[SETTINGS]') ||
              code.startsWith('[BOARD_TERM]') ||
              code.startsWith('[KORESPONDENCJA]') ||
              code.startsWith('[DOROBEK]') ||
              code.startsWith('[EMAIL_CONFIG]')
            ) {
              return false;
            }
            if (candidateCodes.length > 0) {
              const matchesAnyCode = candidateCodes.some(c => code.toLowerCase().includes(c.toLowerCase()));
              if (matchesAnyCode) return true;
            }
            return true;
          });

          const uniqueIndexes = new Set();
          validParticipantRows.forEach(a => {
            const idx = String(a.index_number || '').trim().toLowerCase();
            if (idx && !idx.startsWith('[settings]') && idx !== 'user_first_login_status' && idx !== 'weights') {
              uniqueIndexes.add(idx);
            }
          });

          if (uniqueIndexes.size > 0) {
            participants = uniqueIndexes.size;
            matchedSource = 'attendance_headcount';
          } else {
            // Brak uczestników w bazie -> 0 (brak danych), NIGDY 22 ani 6!
            participants = 0;
            matchedSource = 'none';
          }
        }
      } else {
        // Brak wpisu w bazie -> 0 (brak danych), NIGDY 22 ani 6!
        participants = 0;
        matchedSource = 'none';
      }
    }

    // Ustal typ spotkania
    let meetingType = 'workshop_external';
    if (matchedMeta?.meeting_type) {
      meetingType = matchedMeta.meeting_type;
    } else if (
      titleLower.includes('projekt') ||
      titleLower.includes('technicz') ||
      titleLower.includes('robocz') ||
      titleLower.includes('team') ||
      titleLower.includes('grupa robocza') ||
      evtTitle.includes('🛠️') ||
      evtTitle.includes('🔧') ||
      evtTitle.includes('🔒')
    ) {
      meetingType = 'project';
    } else if (
      titleLower.includes('zarząd') ||
      titleLower.includes('zarzadu') ||
      titleLower.includes('posiedzenie') ||
      titleLower.includes('zebranie zarządu') ||
      titleLower.includes('wewnętrzn')
    ) {
      meetingType = 'internal';
    } else {
      meetingType = 'workshop_external';
    }

    const isJoint = clubsInReport.length > 1 || (matchedMeta?.co_organizers && matchedMeta.co_organizers.length > 1);

    const processedMeeting = {
      id: evtId,
      title: evtTitle,
      date: evtDate,
      start_dt: evt.start_dt,
      end_dt: evt.end_dt,
      location: evt.location || 'Platforma Teams / Aula WSKZ',
      who: evt.who || '',
      notes: evt.notes || '',
      meetingType, // 'workshop_external' | 'project' | 'internal'
      participants,
      hasRealData: participants > 0,
      matchedSource,
      isJoint,
      participatingClubs: clubsInReport,
      allMatchedClubs: matchedClubs,
    };

    uniqueMeetingsMap.set(evtId, processedMeeting);
  }

  const allUniqueMeetings = Array.from(uniqueMeetingsMap.values()).sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
  );

  // ── 4. Statystyki Kół Naukowych (Zbiorcze i Per Koło) ──────────────────────
  const clubsStats = activeClubs.map(club => {
    const clubMeetings = allUniqueMeetings.filter(m =>
      m.participatingClubs.some(c => c.orgId === club.orgId)
    );

    const substantiveMeetings = clubMeetings.filter(m => m.meetingType !== 'project' && m.meetingType !== 'internal');
    const projectMeetings = clubMeetings.filter(m => m.meetingType === 'project');
    const internalMeetings = clubMeetings.filter(m => m.meetingType === 'internal');

    const totalSubstantiveParticipants = substantiveMeetings.reduce((sum, m) => sum + m.participants, 0);
    const totalProjectParticipants = projectMeetings.reduce((sum, m) => sum + m.participants, 0);
    const totalAllParticipants = totalSubstantiveParticipants + totalProjectParticipants;

    const avgAttendance = substantiveMeetings.length > 0
      ? Math.round((totalSubstantiveParticipants / substantiveMeetings.length) * 10) / 10
      : 0;

    return {
      club,
      meetingsCount: substantiveMeetings.length + projectMeetings.length, // RAZEM SPOTKAŃ = merytoryczne + projektowe
      allMeetingsCount: clubMeetings.length,
      substantiveCount: substantiveMeetings.length,
      projectCount: projectMeetings.length,
      internalCount: internalMeetings.length,
      totalParticipants: totalAllParticipants,
      substantiveParticipants: totalSubstantiveParticipants,
      projectParticipants: totalProjectParticipants,
      avgAttendance,
      meetings: clubMeetings,
    };
  });

  // Łączne unikalne statystyki (bez mnożenia wspólnych spotkań!)
  const totalSubstantiveUnique = allUniqueMeetings.filter(m => m.meetingType !== 'project' && m.meetingType !== 'internal');
  const totalProjectUnique = allUniqueMeetings.filter(m => m.meetingType === 'project');
  const totalInternalUnique = allUniqueMeetings.filter(m => m.meetingType === 'internal');

  const grandTotalParticipants = allUniqueMeetings.reduce((sum, m) => sum + m.participants, 0);
  const grandTotalSubstantiveParticipants = totalSubstantiveUnique.reduce((sum, m) => sum + m.participants, 0);
  const grandTotalProjectParticipants = totalProjectUnique.reduce((sum, m) => sum + m.participants, 0);

  // ── 5. Statystyki Samorządu Studenckiego (DKO, UO, Starostowie) ───────────
  let samorzadStats = null;

  if (includeSamorzad) {
    const filteredCorrespondence = correspondenceList.filter(item => {
      const itemDate = toDateStr(item.dataWplywu || item.data || item.date || item.dataWyslania);
      return isDateInRange(itemDate, startDate, endDate);
    });

    const dkoIn = filteredCorrespondence.filter(item => item.direction === 'IN' || item.typ === 'Wchodzące').length;
    const dkoOut = filteredCorrespondence.filter(item => item.direction === 'OUT' || item.typ === 'Wychodzące').length;

    const dkoStatusMap = {};
    for (const item of filteredCorrespondence) {
      const st = item.status || item.statusUjednolicenia || 'W toku';
      dkoStatusMap[st] = (dkoStatusMap[st] || 0) + 1;
    }

    const filteredDecisions = operationalDecisions.filter(d => {
      const dDate = toDateStr(d.date || d.data);
      return isDateInRange(dDate, startDate, endDate);
    });

    const decisionsDone = filteredDecisions.filter(d => d.status === 'Zrealizowane').length;
    const decisionsInProgress = filteredDecisions.filter(d => d.status === 'W realizacji' || d.status !== 'Zrealizowane').length;
    const decisionTopics = filteredDecisions.map(d => d.topic || d.przedmiot).filter(Boolean);

    const totalStarostowie = starostowieList.length;
    const fieldMap = {};
    let rodoActiveCount = 0;
    let rodoPendingCount = 0;

    for (const s of starostowieList) {
      const fld = s.field || 'Inne kierunki';
      fieldMap[fld] = (fieldMap[fld] || 0) + 1;
      if (s.rodoStatus === 'Zgoda aktywna') {
        rodoActiveCount++;
      } else {
        rodoPendingCount++;
      }
    }

    samorzadStats = {
      dko: {
        total: filteredCorrespondence.length,
        in: dkoIn,
        out: dkoOut,
        byStatus: dkoStatusMap,
      },
      decisions: {
        total: filteredDecisions.length,
        done: decisionsDone,
        inProgress: decisionsInProgress,
        topics: decisionTopics,
      },
      starostowie: {
        total: totalStarostowie,
        byField: fieldMap,
        rodoActive: rodoActiveCount,
        rodoPending: rodoPendingCount,
      },
      events: {
        count: samorzadMeetings.length,
        list: samorzadMeetings,
      },
    };
  }

  return {
    period: {
      startDate,
      endDate,
    },
    clubsReport: {
      activeClubsCount: activeClubs.length,
      totalUniqueMeetings: allUniqueMeetings.length,
      substantiveMeetingsCount: totalSubstantiveUnique.length,
      projectMeetingsCount: totalProjectUnique.length,
      internalMeetingsCount: totalInternalUnique.length,
      totalTogetherMeetings: totalSubstantiveUnique.length + totalProjectUnique.length,
      totalParticipants: grandTotalParticipants,
      substantiveParticipants: grandTotalSubstantiveParticipants,
      projectParticipants: grandTotalProjectParticipants,
      clubsStats,
      allUniqueMeetings,
    },
    samorzadStats,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Eksportuje zgromadzone dane do wieloarkuszowego pliku Excel (.xlsx)
 * z zachowaniem nowego układu kolumn (1. Koło, 2. Wydział, 3. Merytoryczne, 4. Projektowe, 5. Razem, 6. Średnia, 7. Łączna)
 */
export function exportReportToExcel(reportData, filename = null) {
  if (!reportData) return;

  const wb = XLSX.utils.book_new();
  const dateTag = new Date().toISOString().slice(0, 10);
  const finalFilename = filename || `Zestawienie_WSKZ_${dateTag}.xlsx`;

  // ── Arkusz 1: Podsumowanie (KPI) ──────────────────────────────────────────
  const summaryRows = [
    ['ZESTAWIENIE ZBIORCZE AKTYWNOŚCI STUDENCKIEJ WSKZ'],
    ['Dokument przygotowany dla: Władze Uczelni WSKZ (Prorektor ds. studenckich)'],
    [`Zakres raportu: ${reportData.period.startDate} do ${reportData.period.endDate}`],
    [`Data wygenerowania: ${new Date().toLocaleString('pl-PL')}`],
    [],
    ['METRYKA / WSKAŹNIK', 'WARTOŚĆ', 'UWAGI METODOLOGICZNE'],
    [
      'Liczba monitorowanych Kół Naukowych',
      reportData.clubsReport.activeClubsCount,
      'Zgodnie z centralnym rejestrem 14 Kół WSKZ',
    ],
    [
      'Spotkania merytoryczne i warsztaty otwarte',
      reportData.clubsReport.substantiveMeetingsCount,
      'Spotkania otwarte dla studentów i wykłady (deduplikowane)',
    ],
    [
      'Spotkania robocze i zespoły projektowe (Wrench)',
      reportData.clubsReport.projectMeetingsCount,
      'Ewidencjonowane osobno (nie zaniżają średniej frekwencji)',
    ],
    [
      'Łączna frekwencja z gośćmi',
      reportData.clubsReport.totalParticipants,
      'Rzeczywista liczba uczestników pobrana z bazy Supabase',
    ],
    [
      'Razem spotkań (merytoryczne + projektowe)',
      reportData.clubsReport.substantiveMeetingsCount + reportData.clubsReport.projectMeetingsCount,
      'Suma kluczowych inicjatyw studenckich',
    ],
    [
      'Posiedzenia wewnętrzne zarządów kół',
      reportData.clubsReport.internalMeetingsCount,
      'Organizacja wewnętrzna i planowanie kadencji',
    ],
  ];

  if (reportData.samorzadStats) {
    summaryRows.push(
      [],
      ['DZIAŁALNOŚĆ SAMORZĄDU STUDENCKIEGO (KANCELARIA)', '', ''],
      ['Sprawy DKO + Ustalenia Samorządu', reportData.samorzadStats.dko.total + reportData.samorzadStats.decisions.total, 'Łączna liczba spraw urzędowych i ustaleń'],
      ['Łączna liczba spraw w DKO', reportData.samorzadStats.dko.total, `Wpływ: ${reportData.samorzadStats.dko.in}, Wysłane: ${reportData.samorzadStats.dko.out}`],
      ['Uchwały i Ustalenia Operacyjne', reportData.samorzadStats.decisions.total, `Zrealizowane: ${reportData.samorzadStats.decisions.done}, W toku: ${reportData.samorzadStats.decisions.inProgress}`],
      ['Sieć Starostów Roczników i Grup', reportData.samorzadStats.starostowie.total, `Zgody RODO aktywne: ${reportData.samorzadStats.starostowie.rodoActive}`],
      ['Inicjatywy i zebrania Samorządu', reportData.samorzadStats.events.count, 'Wydarzenia z dedykowanego kalendarza Samorządu']
    );
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Podsumowanie');

  // ── Arkusz 2: Kola_Naukowe_Zbiorczo (Nowy układ 7 kolumn) ─────────────────
  const clubsTableRows = [
    [
      'NR',
      'KOŁO NAUKOWE',
      'WYDZIAŁ',
      'SPOTKANIA MERYTORYCZNE',
      'SPOTKANIA PROJEKTOWE',
      'RAZEM SPOTKAŃ',
      'ŚREDNIA FREKWENCJA',
      'ŁĄCZNA FREKWENCJA',
    ],
  ];

  for (const cs of reportData.clubsReport.clubsStats) {
    clubsTableRows.push([
      cs.club.number,
      cs.club.name,
      cs.club.faculty,
      cs.substantiveCount,
      cs.projectCount,
      cs.substantiveCount + cs.projectCount,
      `${cs.avgAttendance} os.`,
      `${cs.totalParticipants} os.`,
    ]);
  }

  // Wiersz sumy
  const totalSub = reportData.clubsReport.substantiveMeetingsCount;
  const totalProj = reportData.clubsReport.projectMeetingsCount;
  const totalAllTogether = totalSub + totalProj;
  const grandTotalPart = reportData.clubsReport.totalParticipants;
  const grandAvg = totalSub > 0
    ? Math.round((reportData.clubsReport.substantiveParticipants / totalSub) * 10) / 10
    : 0;

  clubsTableRows.push([
    'SUMA',
    'ŁĄCZNIE (Deduplikowane wydarzenia unikalne)',
    'Wszystkie wydziały WSKZ',
    totalSub,
    totalProj,
    totalAllTogether,
    `${grandAvg} os.`,
    `${grandTotalPart} os.`,
  ]);

  const wsClubs = XLSX.utils.aoa_to_sheet(clubsTableRows);
  XLSX.utils.book_append_sheet(wb, wsClubs, 'Kola_Naukowe_Zbiorczo');

  // ── Arkusz 3: Wykaz_Spotkan ───────────────────────────────────────────────
  const eventsTableRows = [
    [
      'LP',
      'DATA',
      'TYTUŁ SPOTKANIA / TEMAT',
      'TYP WYDARZENIA',
      'KOŁO NAUKOWE / ORGANIZATORZY',
      'WSPÓŁORGANIZACJA',
      'LICZBA UCZESTNIKÓW',
      'LOKALIZACJA',
      'PROWADZĄCY',
    ],
  ];

  reportData.clubsReport.allUniqueMeetings.forEach((m, idx) => {
    const typeLabel =
      m.meetingType === 'project'
        ? 'Projektowe / Techniczne (Wrench)'
        : m.meetingType === 'internal'
        ? 'Posiedzenie Zarządu'
        : 'Merytoryczne / Warsztat';

    const clubsList = m.participatingClubs.map(c => c.shortName).join(' + ');

    eventsTableRows.push([
      idx + 1,
      m.date,
      m.title,
      typeLabel,
      clubsList,
      m.isJoint ? 'TAK (międzykołowe)' : 'NIE',
      m.participants > 0 ? `${m.participants} os.` : '0 os. (brak danych)',
      m.location,
      m.who || '—',
    ]);
  });

  const wsEvents = XLSX.utils.aoa_to_sheet(eventsTableRows);
  XLSX.utils.book_append_sheet(wb, wsEvents, 'Wykaz_Spotkan');

  // ── Arkusz 4: Samorzad_Studencki ──────────────────────────────────────────
  if (reportData.samorzadStats) {
    const samorzadRows = [
      ['SPRAWOZDANIE Z DZIAŁALNOŚCI KANCELARII SAMORZĄDU STUDENCKIEGO WSKZ'],
      [`Okres: ${reportData.period.startDate} do ${reportData.period.endDate}`],
      [],
      ['KATEGORIA', 'LICZBA SPRAW / STAN', 'SZCZEGÓŁY'],
      ['Dziennik Korespondencji (DKO) - Razem', reportData.samorzadStats.dko.total, 'Wszystkie zarejestrowane sprawy'],
      ['Pisma wpływające (IN)', reportData.samorzadStats.dko.in, 'Wnioski studentów, pisma zewnętrzne'],
      ['Pisma wychodzące (OUT)', reportData.samorzadStats.dko.out, 'Oficjalne wystąpienia Kancelarii'],
      ['Ustalenia Operacyjne - Razem', reportData.samorzadStats.decisions.total, 'Uchwały i dyspozycje zarządu'],
      ['Ustalenia zrealizowane', reportData.samorzadStats.decisions.done, 'Wdrożone w życie'],
      ['Ustalenia w trakcie realizacji', reportData.samorzadStats.decisions.inProgress, 'Zadania w toku'],
      ['Sieć Starostów Roczników i Grup', reportData.samorzadStats.starostowie.total, 'Obsadzone funkcje starostów'],
      ['Starostowie ze zgodą RODO', reportData.samorzadStats.starostowie.rodoActive, 'Zgody aktywne (Privacy by Design)'],
      ['Starostowie - oczekuje na zgodę RODO', reportData.samorzadStats.starostowie.rodoPending, 'W trakcie procedowania'],
    ];

    const wsSamorzad = XLSX.utils.aoa_to_sheet(samorzadRows);
    XLSX.utils.book_append_sheet(wb, wsSamorzad, 'Samorzad_Studencki');
  }

  XLSX.writeFile(wb, finalFilename);
}
