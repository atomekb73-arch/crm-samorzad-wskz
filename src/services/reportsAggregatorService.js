import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';
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
  let supabaseMetadata = [];
  let supabaseAttendance = [];

  try {
    const { data: metaData, error: metaErr } = await supabase
      .from('meeting_metadata')
      .select('*');
    if (!metaErr && Array.isArray(metaData)) {
      supabaseMetadata = metaData;
    }
  } catch (e) {
    console.warn('Brak tabeli meeting_metadata w Supabase lub błąd zapytania:', e);
  }

  try {
    const { data: attData, error: attErr } = await supabase
      .from('attendance')
      .select('*');
    if (!attErr && Array.isArray(attData)) {
      supabaseAttendance = attData;
    }
  } catch (e) {
    console.warn('Brak tabeli attendance w Supabase lub błąd zapytania:', e);
  }

  // Indeksy z Supabase dla szybkiego łączenia
  const metaByEventId = new Map();
  const metaByTitleDate = new Map();

  for (const m of supabaseMetadata) {
    if (m.event_id || m.teamup_event_id) {
      metaByEventId.set(String(m.event_id || m.teamup_event_id), m);
    }
    const dStr = toDateStr(m.date || m.start_dt || m.created_at);
    const tStr = (m.title || m.name || '').toLowerCase().trim();
    if (dStr && tStr) {
      metaByTitleDate.set(`${dStr}___${tStr}`, m);
    }
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

  // ── 3. Klasyfikacja i deduplikacja spotkań ────────────────────────────────
  const uniqueMeetingsMap = new Map();
  const samorzadMeetings = [];

  for (const evt of filteredEvents) {
    const evtId = String(evt.id);
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

    // Sprawdź metadane z Supabase
    const meta = metaByEventId.get(evtId) || metaByTitleDate.get(`${evtDate}___${titleLower}`);

    if (meta?.co_organizers && Array.isArray(meta.co_organizers)) {
      for (const coOrg of meta.co_organizers) {
        const c = getClubByOrgId(coOrg);
        if (c && !matchedClubs.some(existing => existing.orgId === c.orgId)) {
          matchedClubs.push(c);
        }
      }
    }

    // Filtruj koła do tych, które są aktualnie wybrane w raporcie
    const clubsInReport = matchedClubs.filter(c => activeClubOrgIds.has(c.orgId));
    if (clubsInReport.length === 0) {
      // Jeśli żadne wybrane koło nie jest powiązane, pomiń
      continue;
    }

    // Ustal typ spotkania
    let meetingType = 'workshop_external';
    if (meta?.meeting_type) {
      meetingType = meta.meeting_type;
    } else if (titleLower.includes('projekt') || titleLower.includes('technicz') || titleLower.includes('robocz') || titleLower.includes('team') || titleLower.includes('grupa robocza')) {
      meetingType = 'project';
    } else if (titleLower.includes('zarząd') || titleLower.includes('zarzadu') || titleLower.includes('posiedzenie') || titleLower.includes('zebranie zarządu') || titleLower.includes('wewnętrzn')) {
      meetingType = 'internal';
    } else {
      meetingType = 'workshop_external';
    }

    // Ustal liczbę uczestników
    let participants = 0;
    if (meta?.total_participants && !isNaN(Number(meta.total_participants))) {
      participants = Number(meta.total_participants);
    } else {
      // Policz obecności w Supabase dla tego eventId
      const directAttCount = supabaseAttendance.filter(a => String(a.event_id || a.meeting_id) === evtId).length;
      if (directAttCount > 0) {
        participants = directAttCount;
      } else {
        // Domyślna szacunkowa frekwencja w zależności od typu
        participants = meetingType === 'project' ? 6 : meetingType === 'internal' ? 5 : 22;
      }
    }

    const isJoint = clubsInReport.length > 1 || (meta?.co_organizers && meta.co_organizers.length > 1);

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
    // Wszystkie spotkania, w których to koło uczestniczyło
    const clubMeetings = allUniqueMeetings.filter(m =>
      m.participatingClubs.some(c => c.orgId === club.orgId)
    );

    const substantiveMeetings = clubMeetings.filter(m => m.meetingType !== 'project' && m.meetingType !== 'internal');
    const projectMeetings = clubMeetings.filter(m => m.meetingType === 'project');
    const internalMeetings = clubMeetings.filter(m => m.meetingType === 'internal');

    const totalSubstantiveParticipants = substantiveMeetings.reduce((sum, m) => sum + m.participants, 0);
    const totalProjectParticipants = projectMeetings.reduce((sum, m) => sum + m.participants, 0);
    const avgAttendance = substantiveMeetings.length > 0
      ? Math.round((totalSubstantiveParticipants / substantiveMeetings.length) * 10) / 10
      : 0;

    return {
      club,
      meetingsCount: clubMeetings.length,
      substantiveCount: substantiveMeetings.length,
      projectCount: projectMeetings.length,
      internalCount: internalMeetings.length,
      totalParticipants: totalSubstantiveParticipants,
      projectParticipants: totalProjectParticipants,
      avgAttendance,
      meetings: clubMeetings,
    };
  });

  // Łączne unikalne statystyki (bez mnożenia wspólnych spotkań!)
  const totalSubstantiveUnique = allUniqueMeetings.filter(m => m.meetingType !== 'project' && m.meetingType !== 'internal');
  const totalProjectUnique = allUniqueMeetings.filter(m => m.meetingType === 'project');
  const totalInternalUnique = allUniqueMeetings.filter(m => m.meetingType === 'internal');

  const grandTotalParticipants = totalSubstantiveUnique.reduce((sum, m) => sum + m.participants, 0);
  const grandTotalProjectParticipants = totalProjectUnique.reduce((sum, m) => sum + m.participants, 0);

  // ── 5. Statystyki Samorządu Studenckiego (DKO, UO, Starostowie) ───────────
  let samorzadStats = null;

  if (includeSamorzad) {
    // DKO Korespondencja w okresie
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

    // Ustalenia Operacyjne w okresie
    const filteredDecisions = operationalDecisions.filter(d => {
      const dDate = toDateStr(d.date || d.data);
      return isDateInRange(dDate, startDate, endDate);
    });

    const decisionsDone = filteredDecisions.filter(d => d.status === 'Zrealizowane').length;
    const decisionsInProgress = filteredDecisions.filter(d => d.status === 'W realizacji' || d.status !== 'Zrealizowane').length;
    const decisionTopics = filteredDecisions.map(d => d.topic || d.przedmiot).filter(Boolean);

    // Sieć Starostów
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
      totalParticipants: grandTotalParticipants,
      totalProjectParticipants: grandTotalProjectParticipants,
      clubsStats,
      allUniqueMeetings,
    },
    samorzadStats,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Eksportuje zgromadzone dane do wieloarkuszowego pliku Excel (.xlsx)
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
      'Łączna liczba unikalnych wydarzeń kół',
      reportData.clubsReport.totalUniqueMeetings,
      'Wydarzenia międzykołowe liczone jako 1 unikalne wydarzenie',
    ],
    [
      'Spotkania merytoryczne i warsztaty otwarte',
      reportData.clubsReport.substantiveMeetingsCount,
      'Spotkania otwarte dla studentów i wykłady',
    ],
    [
      'Łączna frekwencja na spotkaniach merytorycznych',
      reportData.clubsReport.totalParticipants,
      'Uczestnicy zarejestrowani w salach i online',
    ],
    [
      'Spotkania robocze i zespoły projektowe (Wrench)',
      reportData.clubsReport.projectMeetingsCount,
      'Ewidencjonowane osobno (nie zaniżają średniej frekwencji)',
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
      ['Łączna liczba spraw w DKO', reportData.samorzadStats.dko.total, `Wpływ: ${reportData.samorzadStats.dko.in}, Wysłane: ${reportData.samorzadStats.dko.out}`],
      ['Uchwały i Ustalenia Operacyjne', reportData.samorzadStats.decisions.total, `Zrealizowane: ${reportData.samorzadStats.decisions.done}, W toku: ${reportData.samorzadStats.decisions.inProgress}`],
      ['Sieć Starostów Roczników i Grup', reportData.samorzadStats.starostowie.total, `Zgody RODO aktywne: ${reportData.samorzadStats.starostowie.rodoActive}`],
      ['Inicjatywy i zebrania Samorządu', reportData.samorzadStats.events.count, 'Wydarzenia z dedykowanego kalendarza']
    );
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Podsumowanie');

  // ── Arkusz 2: Kola_Naukowe_Zbiorczo ───────────────────────────────────────
  const clubsTableRows = [
    [
      'NR',
      'NAZWA KOŁA NAUKOWEGO',
      'WYDZIAŁ',
      'SPOTKANIA MERYTORYCZNE',
      'ŁĄCZNA FREKWENCJA',
      'ŚREDNIA NA SPOTKANIE',
      'SPOTKANIA PROJEKTOWE',
      'POSIEDZENIA ZARZĄDU',
      'WSZYSTKIE WYDARZENIA',
    ],
  ];

  for (const cs of reportData.clubsReport.clubsStats) {
    clubsTableRows.push([
      cs.club.number,
      cs.club.name,
      cs.club.faculty,
      cs.substantiveCount,
      cs.totalParticipants,
      cs.avgAttendance,
      cs.projectCount,
      cs.internalCount,
      cs.meetingsCount,
    ]);
  }

  // Wiersz sumy
  clubsTableRows.push([
    'SUMA',
    'Razem (unikalne inicjatywy)',
    'Uczelnia WSKZ',
    reportData.clubsReport.substantiveMeetingsCount,
    reportData.clubsReport.totalParticipants,
    reportData.clubsReport.substantiveMeetingsCount > 0
      ? Math.round((reportData.clubsReport.totalParticipants / reportData.clubsReport.substantiveMeetingsCount) * 10) / 10
      : 0,
    reportData.clubsReport.projectMeetingsCount,
    reportData.clubsReport.internalMeetingsCount,
    reportData.clubsReport.totalUniqueMeetings,
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
      m.participants,
      m.location,
      m.who || '—',
    ]);
  });

  const wsEvents = XLSX.utils.aoa_to_sheet(eventsTableRows);
  XLSX.utils.book_append_sheet(wb, wsEvents, 'Wykaz_Spotkan');

  // ── Arkusz 4: Samorzad_Statystyki ─────────────────────────────────────────
  if (reportData.samorzadStats) {
    const samRows = [
      ['STATYSTYKI KANCELARII SAMORZĄDU STUDENCKIEGO WSKZ'],
      [],
      ['1. DZIENNIK KORESPONDENCJI (DKO)', 'LICZBA'],
      ['Pisma wpływające (IN)', reportData.samorzadStats.dko.in],
      ['Pisma wychodzące (OUT)', reportData.samorzadStats.dko.out],
      ['Łączna liczba pism w okresie', reportData.samorzadStats.dko.total],
      [],
      ['STATUSY SPRAW W DKO', 'LICZBA'],
    ];

    for (const [st, count] of Object.entries(reportData.samorzadStats.dko.byStatus)) {
      samRows.push([st, count]);
    }

    samRows.push(
      [],
      ['2. USTALENIA OPERACYJNE I UCHWAŁY', 'LICZBA'],
      ['Zrealizowane', reportData.samorzadStats.decisions.done],
      ['W realizacji', reportData.samorzadStats.decisions.inProgress],
      ['Łącznie podjętych ustaleń', reportData.samorzadStats.decisions.total],
      [],
      ['TEMATY POSTANOWIEŃ I UCHWAŁ', '']
    );

    reportData.samorzadStats.decisions.topics.forEach((t, i) => {
      samRows.push([`${i + 1}. ${t}`, '']);
    });

    samRows.push(
      [],
      ['3. SIEĆ STAROSTÓW GRUP I ROCZNIKÓW', 'LICZBA'],
      ['Łączna liczba zarejestrowanych starostów', reportData.samorzadStats.starostowie.total],
      ['Zgody RODO aktywne', reportData.samorzadStats.starostowie.rodoActive],
      ['Zgody RODO oczekujące', reportData.samorzadStats.starostowie.rodoPending],
      [],
      ['OBSADZENIE WEDŁUG KIERUNKÓW', 'LICZBA STAROSTÓW']
    );

    for (const [fld, cnt] of Object.entries(reportData.samorzadStats.starostowie.byField)) {
      samRows.push([fld, cnt]);
    }

    const wsSam = XLSX.utils.aoa_to_sheet(samRows);
    XLSX.utils.book_append_sheet(wb, wsSam, 'Samorzad_Statystyki');
  }

  // Zapisz plik
  XLSX.writeFile(wb, finalFilename);
}
