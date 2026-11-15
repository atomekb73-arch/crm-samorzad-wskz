import * as XLSX from 'xlsx';
import {
  fetchAllGlobalRows,
  fetchAllTenantRows,
} from './supabaseClient.js';
import { fetchTeamupEventsMulti } from './teamupService.js';
import {
  WSKZ_ORGANIZATIONS,
  SAMORZAD_SUBCALENDAR_ID,
  getWskzOrgById,
  getWskzOrgBySubcalendarId,
  isSubcalendarExcluded,
} from '../config/wskzRegistry.js';
import { getAutoMeetingType } from '../utils/meetingTypes.js';

const YEAR_PREFIX_RE = /^\[?\d{2}\/\d{2}\]?/;
const SYSTEM_PREFIX_RE = /^\[(?:SETTINGS|DOROBEK|BOARD_TERM|KORESPONDENCJA|MEETING_META|EMAIL_CONFIG|ACCESS_USER|DOKUMENT|OPIEKUN)\]/i;

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
 * Normalizuje tytuł spotkania do porównywania i deduplikacji wydarzeń wspólnych
 */
function normalizeTitle(title = '') {
  return String(title || '')
    .toLowerCase()
    .replace(/^\[.*?\]\s*/, '')
    .replace(/\b(spotkanie|zebranie|warsztat|journal club)\b/gi, '')
    .replace(/[^a-z0-9ąćęłńóśźż]/gi, '')
    .trim();
}

/**
 * Wyznacza prefiks roku akademickiego (np. "26/27") na podstawie daty YYYY-MM-DD
 */
function getAcademicYearShort(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '26/27';
  const m = /^(\d{4})-(\d{2})/.exec(dateStr);
  if (!m) return '26/27';
  const year = Number(m[1]);
  const month = Number(m[2]);
  const startYear = month >= 9 ? year : year - 1;
  return `${String(startYear).slice(-2)}/${String(startYear + 1).slice(-2)}`;
}

/**
 * Wyciąga stabilny identyfikator uczestnika (numer indeksu lub znormalizowane imię/nazwisko z activity_description)
 */
function extractAttendeeIdentifier(row) {
  const directIdx = String(row?.index_number || '').trim();
  if (directIdx) return directIdx.toUpperCase();

  const rawDesc = String(row?.activity_description || '').trim();
  if (!rawDesc) return '';

  if (rawDesc.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawDesc);
      const fromJson =
        parsed.index_number ||
        parsed.nr_indeksu ||
        parsed.nrIndeksu ||
        parsed.student_index ||
        parsed.fullName ||
        parsed.full_name ||
        parsed.name ||
        parsed.imie_nazwisko ||
        '';
      const cleanJson = String(fromJson).trim();
      if (cleanJson) return cleanJson.toLowerCase();
    } catch {}
  }

  return rawDesc.toLowerCase();
}

/**
 * Główny silnik raportowy (zunifikowany 1:1 z MultiHub interClubReportService)
 * łączący Teamup API + Supabase (meeting_metadata, attendance) oraz statystyki Samorządu.
 */
export async function generateUniversityReport({
  startDate = '2026-10-01',
  endDate = '2026-10-30',
  selectedOrgIds = null,
  includeSamorzad = true,
  correspondenceList = [],
  operationalDecisions = [],
  starostowieList = [],
} = {}) {
  const orgIdsFilter = Array.isArray(selectedOrgIds) && selectedOrgIds.length > 0
    ? new Set(selectedOrgIds.map((id) => String(id).toLowerCase().trim()))
    : null;

  const targetOrgs = orgIdsFilter
    ? WSKZ_ORGANIZATIONS.filter((o) => orgIdsFilter.has(o.orgId.toLowerCase()))
    : WSKZ_ORGANIZATIONS;

  const selectedOrgsList = targetOrgs.length > 0 ? targetOrgs : WSKZ_ORGANIZATIONS;
  const activeOrgIds = selectedOrgsList.map((o) => o.orgId);

  const selectedSubcalendarIds = selectedOrgsList
    .map((o) => o.subcalendarId)
    .filter((id) => id && !isSubcalendarExcluded(id));
  const selectedSubcalendarSet = new Set(selectedSubcalendarIds.map(String));

  // ── 1. Jedno zbiorcze zapytanie do Teamup API (bez subcalendarId[] w URL) ──
  const allTeamupEvents = await fetchTeamupEventsMulti({
    startDate,
    endDate,
  });

  // Wydarzenia z podkalendarza Samorządu Studenckiego
  const samorzadMeetings = [];
  const rawClubEvents = [];
  const seenEventIds = new Set();

  for (const evt of allTeamupEvents) {
    const rawDate = evt.date || (evt.start_dt ? evt.start_dt.split('T')[0] : '');
    if (!isDateInRange(rawDate, startDate, endDate)) continue;

    const allSubs = Array.isArray(evt.subcalendar_ids) && evt.subcalendar_ids.length > 0
      ? evt.subcalendar_ids.map(String)
      : (evt.subcalendar_id ? [String(evt.subcalendar_id)] : []);

    if (allSubs.includes(String(SAMORZAD_SUBCALENDAR_ID))) {
      samorzadMeetings.push({
        id: evt.id,
        title: evt.title || 'Wydarzenie Samorządu',
        date: rawDate,
        location: evt.location || 'Online',
        who: evt.who || 'Samorząd Studencki',
      });
    }

    if (allSubs.length === 0 || allSubs.every((s) => isSubcalendarExcluded(s))) {
      continue;
    }

    if (selectedSubcalendarSet.size > 0 && !allSubs.some((s) => selectedSubcalendarSet.has(s))) {
      continue;
    }

    const eid = evt.id ? String(evt.id) : '';
    if (eid && seenEventIds.has(eid)) continue;
    if (eid) seenEventIds.add(eid);

    rawClubEvents.push(evt);
  }

  // Chronologiczne sortowanie (nie nadajemy syntetycznych kodów M01..M99 z okna daty,
  // ponieważ powodowałyby kolizje z historycznym prefiksem [YY/YY] M01 w innych miesiącach lub przy widoku 14 kół)
  const sortedTeamupEvents = [...rawClubEvents]
    .sort((a, b) => new Date(a.start_dt || a.startDate || 0) - new Date(b.start_dt || b.startDate || 0))
    .map((evt) => {
      const rawDate = evt.date || (evt.start_dt ? evt.start_dt.split('T')[0] : '');
      const startObj = evt.start_dt ? new Date(evt.start_dt) : null;
      const formattedDate = startObj && !Number.isNaN(startObj.getTime())
        ? startObj.toLocaleString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : rawDate;

      return {
        ...evt,
        date: rawDate,
        formattedDate,
        code: evt.code || '',
      };
    });

  // Zbierz ewentualnych współorganizatorów spoza aktualnego filtra, aby odczytać ich wspólne metadane/obecności
  const relatedOrgIdsSet = new Set(activeOrgIds);
  for (const evt of sortedTeamupEvents) {
    const subIds = Array.isArray(evt.subcalendar_ids) && evt.subcalendar_ids.length > 0
      ? evt.subcalendar_ids
      : [evt.subcalendar_id];
    for (const sid of subIds) {
      const org = getWskzOrgBySubcalendarId(sid);
      if (org?.orgId) relatedOrgIdsSet.add(org.orgId);
    }
  }
  const orgsToQuery = Array.from(relatedOrgIdsSet);

  // ── 2. Pobieranie metadanych spotkań (meeting_metadata global + tenant + fallback [MEETING_META]) ──
  const metadataMap = {}; // klucz: `${orgId}__${meeting_key}`

  const [globalMetaRes, tenantMetaResults, globalAttRes, tenantAttResults] = await Promise.all([
    fetchAllGlobalRows('meeting_metadata', { select: '*' }).catch(() => ({ data: [], error: null })),
    Promise.allSettled(
      orgsToQuery.map(async (orgId) => ({
        orgId,
        res: await fetchAllTenantRows('meeting_metadata', orgId, { select: '*' }),
      }))
    ),
    fetchAllGlobalRows('attendance', {
      select: 'organization_id, meeting_code, meeting_date, index_number, role, activity_description',
    }).catch(() => ({ data: [], error: null })),
    Promise.allSettled(
      orgsToQuery.map(async (orgId) => ({
        orgId,
        res: await fetchAllTenantRows('attendance', orgId, {
          select: 'organization_id, meeting_code, meeting_date, index_number, role, activity_description',
        }),
      }))
    ),
  ]);

  const registerMetaRow = (row, fallbackOrgId = '') => {
    if (!row || !row.meeting_key) return;
    const orgId = String(row.organization_id || fallbackOrgId || '').trim().toLowerCase();
    const mk = String(row.meeting_key).trim();
    if (!orgId || !mk) return;
    metadataMap[`${orgId}__${mk}`] = { ...row, organization_id: orgId, meeting_key: mk };
  };

  if (Array.isArray(globalMetaRes?.data)) {
    globalMetaRes.data.forEach((row) => registerMetaRow(row));
  }
  tenantMetaResults.forEach((settled) => {
    if (settled.status !== 'fulfilled') return;
    const { orgId, res } = settled.value;
    if (Array.isArray(res?.data)) {
      res.data.forEach((row) => registerMetaRow(row, orgId));
    }
  });

  // ── 3. Wielopoziomowe indeksowanie obecności (attendanceCountMap) z paginacją (>1000 wierszy) ──
  const attendanceCountMap = {};
  const uniqueAttendees = {};

  const addAttendeeKey = (key, idx) => {
    if (!key || !idx) return;
    if (!uniqueAttendees[key]) uniqueAttendees[key] = new Set();
    uniqueAttendees[key].add(idx);
  };

  const processAttendanceRows = (rows, fallbackOrgId = '') => {
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      const rawCode = String(row.meeting_code || '').trim();
      const org = String(row.organization_id || fallbackOrgId || '').trim().toLowerCase();
      if (!rawCode || !org) continue;

      // Fallback chmurowy metadanych zapisanych jako [MEETING_META] w tabeli attendance
      if (rawCode.toUpperCase().startsWith('[MEETING_META]')) {
        try {
          const parsed = JSON.parse(row.activity_description || '{}');
          if (parsed && parsed.meeting_key && !metadataMap[`${org}__${parsed.meeting_key}`]) {
            registerMetaRow({ ...parsed, organization_id: org }, org);
          }
        } catch {}
        continue;
      }

      // Wyklucz rekordy techniczne / systemowe / [OPIEKUN]
      if (SYSTEM_PREFIX_RE.test(rawCode)) continue;

      const idx = extractAttendeeIdentifier(row);
      if (!idx) continue;

      const code = rawCode.toUpperCase();
      const cleanCode = code.replace(/^\[.*?\]\s*/, '').trim();
      const meetingDate = row.meeting_date ? String(row.meeting_date).trim().slice(0, 10) : '';

      if (meetingDate) {
        addAttendeeKey(`${org}__DATE__${meetingDate}`, idx);
        if (cleanCode) {
          addAttendeeKey(`${org}__CODE_DATE__${cleanCode}__${meetingDate}`, idx);
        }
        addAttendeeKey(`${org}__CODE_DATE__${code}__${meetingDate}`, idx);
      }

      if (YEAR_PREFIX_RE.test(code)) {
        addAttendeeKey(`${org}__FULLCODE__${code}`, idx);
        addAttendeeKey(`${org}__FULLCODE__${code.replace(/\s+/g, '')}`, idx);
      }
    }
  };

  if (Array.isArray(globalAttRes?.data)) {
    processAttendanceRows(globalAttRes.data);
  }
  tenantAttResults.forEach((settled) => {
    if (settled.status !== 'fulfilled') return;
    const { orgId, res } = settled.value;
    if (Array.isArray(res?.data)) {
      processAttendanceRows(res.data, orgId);
    }
  });

  Object.entries(uniqueAttendees).forEach(([k, set]) => {
    attendanceCountMap[k] = set.size;
  });

  // ── 4. Deduplikacja międzykołowa i klasyfikacja spotkań ────────────────────
  const eventsByDedupKey = new Map();
  const internalMeetings = [];

  for (const evt of sortedTeamupEvents) {
    const rawDate = evt.date || (evt.start_dt ? evt.start_dt.split('T')[0] : '');
    if (!rawDate) continue;

    // Główny organizator po subcalendar_id (z fallbackiem do pierwszego niewykluczonego subcalendar_ids)
    const subIds = Array.isArray(evt.subcalendar_ids) && evt.subcalendar_ids.length > 0
      ? evt.subcalendar_ids
      : [evt.subcalendar_id];

    let primaryOrg = getWskzOrgBySubcalendarId(evt.subcalendar_id);
    if (!primaryOrg) {
      for (const sid of subIds) {
        const candidateOrg = getWskzOrgBySubcalendarId(sid);
        if (candidateOrg) {
          primaryOrg = candidateOrg;
          break;
        }
      }
    }
    if (!primaryOrg) continue;
    const primaryOrgId = primaryOrg.orgId;

    // Współorganizatorzy z Teamup subcalendar_ids
    const coOrgsFromTeamup = subIds
      .map((sid) => getWskzOrgBySubcalendarId(sid))
      .filter((o) => o && o.orgId !== primaryOrgId)
      .map((o) => o.orgId);

    // Szukamy metadanych zarówno pod primaryOrgId, jak i pod współorganizatorami z Teamup
    // (np. wydarzenie współdzielone zapisane pod orgId współorganizatora w meeting_metadata)
    const metaOrgsToSearch = Array.from(new Set([primaryOrgId, ...coOrgsFromTeamup]));
    let matchedMeta = null;

    for (const searchOrg of metaOrgsToSearch) {
      const strippedEvtCode = evt.code ? String(evt.code).replace(/^\[.*?\]\s*/, '').trim() : '';
      const metaCandidateKeys = [
        `${searchOrg}__${evt.id}`,
        evt.code ? `${searchOrg}__${evt.code}` : null,
        strippedEvtCode ? `${searchOrg}__${strippedEvtCode}` : null,
        `${searchOrg}__${rawDate}`,
      ].filter(Boolean);

      for (const mk of metaCandidateKeys) {
        const candidate = metadataMap[mk];
        if (!candidate) continue;
        if (
          mk !== `${searchOrg}__${evt.id}` &&
          candidate.meeting_date &&
          String(candidate.meeting_date).slice(0, 10) !== rawDate
        ) {
          continue;
        }
        matchedMeta = candidate;
        break;
      }
      if (matchedMeta) break;
    }

    const coOrgsFromMeta = Array.isArray(matchedMeta?.co_organizers) ? matchedMeta.co_organizers : [];
    const allCoOrgIds = Array.from(new Set([...coOrgsFromTeamup, ...coOrgsFromMeta]))
      .map((id) => String(id).toLowerCase().trim())
      .filter((id) => id && id !== primaryOrgId && getWskzOrgById(id));

    // Klasyfikacja: internal (pomijane w A i B) vs project (Tabela B) vs substantive (Tabela A)
    const metaPayload = matchedMeta?.custom_payload && typeof matchedMeta.custom_payload === 'object'
      ? matchedMeta.custom_payload
      : {};
    const explicitlyExcludedFromDenominator =
      metaPayload.includeInFrequency === false ||
      metaPayload.countsInFrequency === false ||
      metaPayload.includeInDenominator === false ||
      metaPayload.countsTowardsDenominator === false ||
      metaPayload.wliczajDoFrekwencji === false;

    const detectedType = matchedMeta?.meeting_type || getAutoMeetingType(evt);
    const detectedTypeLower = String(detectedType || '').toLowerCase();
    const titleLower = String(evt.title || '').toLowerCase();

    const isInternalType = ['internal', 'board', 'zarząd', 'zarzad', 'wewnętrzne', 'wewnetrzne'].includes(detectedTypeLower);
    if (isInternalType) {
      internalMeetings.push({
        id: evt.id,
        title: evt.title,
        date: rawDate,
        primaryOrg,
        coOrgIds: allCoOrgIds,
        meetingType: 'internal',
      });
      continue;
    }

    const isProjectType = ['project', 'projektowe', 'techniczne', 'robocze'].includes(detectedTypeLower);
    const isProjectTitle =
      titleLower.includes('🔒') ||
      titleLower.includes('spotkanie robocze') ||
      titleLower.includes('robocz') ||
      titleLower.includes('zamkni') ||
      titleLower.includes('grupa projektowa') ||
      titleLower.includes('grupy projektowej') ||
      titleLower.includes('zespół projektowy') ||
      titleLower.includes('zespołu projektowego') ||
      (titleLower.includes('projekt') &&
        (titleLower.includes('grup') || titleLower.includes('zesp') || titleLower.includes('techniczn')));

    const isProject = isProjectType || isProjectTitle || explicitlyExcludedFromDenominator;
    const reportCategory = isProject ? 'project' : 'substantive';

    // Frekwencja pojedynczego spotkania: wyłącznie dla [primaryOrgId, ...allCoOrgIds] (zapobiega przeciekom z innych kół tego samego dnia)
    const rawCode = String(evt.code || '').trim().toUpperCase();
    const cleanCode = rawCode.replace(/^\[.*?\]\s*/, '').trim();
    const evtHasYearPrefix = YEAR_PREFIX_RE.test(rawCode);
    const checkOrgs = Array.from(new Set([primaryOrgId, ...allCoOrgIds]));

    let uniqueAttendanceCount = 0;
    for (const orgToCheck of checkOrgs) {
      if (cleanCode && rawDate) {
        const c1 = attendanceCountMap[`${orgToCheck}__CODE_DATE__${cleanCode}__${rawDate}`] || 0;
        const c2 = rawCode ? (attendanceCountMap[`${orgToCheck}__CODE_DATE__${rawCode}__${rawDate}`] || 0) : 0;
        if (Math.max(c1, c2) > uniqueAttendanceCount) uniqueAttendanceCount = Math.max(c1, c2);
      }
      if (evtHasYearPrefix) {
        const c3 = attendanceCountMap[`${orgToCheck}__FULLCODE__${rawCode}`] || 0;
        const c4 = attendanceCountMap[`${orgToCheck}__FULLCODE__${rawCode.replace(/\s+/g, '')}`] || 0;
        if (Math.max(c3, c4) > uniqueAttendanceCount) uniqueAttendanceCount = Math.max(c3, c4);
      }
    }

    if (uniqueAttendanceCount === 0 && rawDate) {
      for (const orgToCheck of checkOrgs) {
        const cDate = attendanceCountMap[`${orgToCheck}__DATE__${rawDate}`] || 0;
        if (cDate > uniqueAttendanceCount) uniqueAttendanceCount = cDate;
      }
    }

    const manualTotal = matchedMeta && Number(matchedMeta.total_participants) > 0
      ? Number(matchedMeta.total_participants)
      : 0;

    const evtAttendeesCount =
      evt.total_participants ||
      evt.totalParticipants ||
      evt.attendeesCount ||
      (Array.isArray(evt.attendees) ? evt.attendees.length : 0) ||
      (Array.isArray(evt.participantRecords) ? evt.participantRecords.length : 0) ||
      (Array.isArray(evt.listaObecnosci) ? evt.listaObecnosci.length : 0);

    const totalParticipants = Math.max(uniqueAttendanceCount, manualTotal, Number(evtAttendeesCount) || 0);

    // Deduplikacja po dacie i znormalizowanym tytule (lub ID Teamup)
    const dedupKey = `${rawDate}___${normalizeTitle(evt.title) || evt.id}`;

    if (!eventsByDedupKey.has(dedupKey)) {
      eventsByDedupKey.set(dedupKey, {
        id: evt.id,
        code: evt.code,
        title: evt.title || 'Spotkanie',
        date: rawDate,
        formattedDate: evt.formattedDate,
        speaker: evt.who || metaPayload.speaker || 'Zarząd Koła / Zaproszony Prelegent',
        who: evt.who || metaPayload.speaker || '',
        location: evt.location || 'Online (Google Meet)',
        primaryOrg,
        coOrgIds: allCoOrgIds,
        coOrgs: allCoOrgIds.map((id) => getWskzOrgById(id)).filter(Boolean),
        reportCategory,
        meetingType: isProject ? 'project' : 'substantive',
        totalParticipants,
        participants: totalParticipants,
        isJointEvent: allCoOrgIds.length > 0,
        isJoint: allCoOrgIds.length > 0,
        participatingClubs: [primaryOrg, ...allCoOrgIds.map((id) => getWskzOrgById(id)).filter(Boolean)],
        rawEvent: evt,
      });
    } else {
      const existing = eventsByDedupKey.get(dedupKey);
      const mergedCoOrgs = Array.from(new Set([...existing.coOrgIds, ...allCoOrgIds, primaryOrgId]))
        .filter((id) => id !== existing.primaryOrg.orgId);

      existing.coOrgIds = mergedCoOrgs;
      existing.coOrgs = mergedCoOrgs.map((id) => getWskzOrgById(id)).filter(Boolean);
      existing.isJointEvent = mergedCoOrgs.length > 0;
      existing.isJoint = mergedCoOrgs.length > 0;
      existing.participatingClubs = [existing.primaryOrg, ...existing.coOrgs];
      if (totalParticipants > existing.totalParticipants) {
        existing.totalParticipants = totalParticipants;
        existing.participants = totalParticipants;
      }
    }
  }

  const allProcessedEvents = Array.from(eventsByDedupKey.values()).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Rozdzielenie na Tabelę A (merytoryczne) i Tabelę B (projektowe)
  const substantiveMeetings = allProcessedEvents.filter((e) => e.reportCategory === 'substantive');
  const projectMeetings = allProcessedEvents.filter((e) => e.reportCategory === 'project');

  const substantiveTotalAttendees = substantiveMeetings.reduce(
    (sum, m) => sum + (Number(m.totalParticipants) || 0),
    0
  );
  const substantiveAvgAttendees = substantiveMeetings.length > 0
    ? Math.round(substantiveTotalAttendees / substantiveMeetings.length)
    : 0;

  const projectTotalAttendees = projectMeetings.reduce(
    (sum, m) => sum + (Number(m.totalParticipants) || 0),
    0
  );
  const projectAvgAttendees = projectMeetings.length > 0
    ? Math.round(projectTotalAttendees / projectMeetings.length)
    : 0;

  const totalAllAttendees = substantiveTotalAttendees + projectTotalAttendees;
  const totalAllMeetingsCount = substantiveMeetings.length + projectMeetings.length;
  const totalAllAvgAttendees = totalAllMeetingsCount > 0
    ? Math.round(totalAllAttendees / totalAllMeetingsCount)
    : 0;

  const jointEventsCount = allProcessedEvents.filter((e) => e.isJointEvent).length;

  // ── 5. Statystyki per Koło (Tabela C: Merytoryczne, Frekwencja meryt.+proj., Projektowe, Wspólne) ──
  const byOrgStats = selectedOrgsList.map((org, idx) => {
    const orgId = org.orgId;
    const orgSubstantive = substantiveMeetings.filter(
      (m) => m.primaryOrg.orgId === orgId || m.coOrgIds.includes(orgId)
    );
    const orgProject = projectMeetings.filter(
      (m) => m.primaryOrg.orgId === orgId || m.coOrgIds.includes(orgId)
    );
    const orgJoint = allProcessedEvents.filter(
      (m) => (m.primaryOrg.orgId === orgId && m.isJointEvent) || m.coOrgIds.includes(orgId)
    );

    const orgSubstantiveAttendees = orgSubstantive.reduce(
      (sum, m) => sum + (Number(m.totalParticipants) || 0),
      0
    );
    const orgProjectAttendees = orgProject.reduce(
      (sum, m) => sum + (Number(m.totalParticipants) || 0),
      0
    );
    const orgCombinedAttendees = orgSubstantiveAttendees + orgProjectAttendees;

    return {
      lp: idx + 1,
      org,
      club: org,
      substantiveCount: orgSubstantive.length,
      substantiveAttendees: orgSubstantiveAttendees,
      projectCount: orgProject.length,
      projectAttendees: orgProjectAttendees,
      totalAttendees: orgCombinedAttendees,
      totalParticipants: orgCombinedAttendees,
      jointCount: orgJoint.length,
      totalActivities: orgSubstantive.length + orgProject.length,
      avgAttendance: orgSubstantive.length > 0
        ? Math.round((orgSubstantiveAttendees / orgSubstantive.length) * 10) / 10
        : 0,
    };
  });

  // ── 6. Statystyki Samorządu Studenckiego (DKO, UO, Starostowie) ───────────
  let samorzadStats = null;

  if (includeSamorzad) {
    const filteredCorrespondence = correspondenceList.filter((item) => {
      const itemDate = toDateStr(item.dataWplywu || item.data || item.date || item.dataWyslania);
      return isDateInRange(itemDate, startDate, endDate);
    });

    const dkoIn = filteredCorrespondence.filter((item) => item.direction === 'IN' || item.typ === 'Wchodzące').length;
    const dkoOut = filteredCorrespondence.filter((item) => item.direction === 'OUT' || item.typ === 'Wychodzące').length;

    const dkoStatusMap = {};
    for (const item of filteredCorrespondence) {
      const st = item.status || item.statusUjednolicenia || 'W toku';
      dkoStatusMap[st] = (dkoStatusMap[st] || 0) + 1;
    }

    const filteredDecisions = operationalDecisions.filter((d) => {
      const dDate = toDateStr(d.date || d.data);
      return isDateInRange(dDate, startDate, endDate);
    });

    const decisionsDone = filteredDecisions.filter((d) => d.status === 'Zrealizowane').length;
    const decisionsInProgress = filteredDecisions.filter((d) => d.status !== 'Zrealizowane').length;
    const decisionTopics = filteredDecisions.map((d) => d.topic || d.przedmiot).filter(Boolean);

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
      selectedOrgs: selectedOrgsList,
      allProcessedEvents,
      substantiveMeetings,
      projectMeetings,
      internalMeetings,
      summaryStats: {
        totalEvents: allProcessedEvents.length,
        substantiveEventsCount: substantiveMeetings.length,
        substantiveTotalAttendees,
        substantiveAvgAttendees,
        projectEventsCount: projectMeetings.length,
        projectTotalAttendees,
        projectAvgAttendees,
        totalAllAttendees,
        totalAllAvgAttendees,
        jointEventsCount,
      },
      byOrgStats,
      // Pola kompatybilnościowe
      activeClubsCount: selectedOrgsList.length,
      totalUniqueMeetings: allProcessedEvents.length,
      substantiveMeetingsCount: substantiveMeetings.length,
      projectMeetingsCount: projectMeetings.length,
      internalMeetingsCount: internalMeetings.length,
      totalTogetherMeetings: allProcessedEvents.length,
      totalParticipants: totalAllAttendees,
      substantiveParticipants: substantiveTotalAttendees,
      projectParticipants: projectTotalAttendees,
      clubsStats: byOrgStats,
      allUniqueMeetings: allProcessedEvents,
    },
    samorzadStats,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Eksportuje zunifikowane zestawienie do wieloarkuszowego pliku Excel (.xlsx)
 */
export function exportReportToExcel(reportData, filename = null) {
  if (!reportData) return;

  const wb = XLSX.utils.book_new();
  const dateTag = new Date().toISOString().slice(0, 10);
  const finalFilename = filename || `Zestawienie_WSKZ_${dateTag}.xlsx`;

  const cr = reportData.clubsReport || {};
  const stats = cr.summaryStats || {};
  const subMeetings = cr.substantiveMeetings || [];
  const projMeetings = cr.projectMeetings || [];
  const byOrgStats = cr.byOrgStats || [];

  // ── Arkusz 1: Podsumowanie (KPI) ──────────────────────────────────────────
  const summaryRows = [
    ['ZESTAWIENIE ZBIORCZE AKTYWNOŚCI STUDENCKIEJ WSKZ'],
    ['Dokument przygotowany dla: Władze Uczelni WSKZ (Prorektor ds. studenckich)'],
    [`Zakres raportu: ${reportData.period.startDate} do ${reportData.period.endDate}`],
    [`Data wygenerowania: ${new Date().toLocaleString('pl-PL')}`],
    [],
    ['METRYKA / WSKAŹNIK', 'WARTOŚĆ', 'UWAGI METODOLOGICZNE'],
    ['Liczba monitorowanych Kół Naukowych', (cr.selectedOrgs || []).length, 'Zgodnie z centralnym rejestrem Kół Naukowych WSKZ'],
    ['Spotkania merytoryczne i warsztaty otwarte (Tabela A)', stats.substantiveEventsCount ?? subMeetings.length, 'Wykłady, prelekcje, warsztaty (deduplikowane)'],
    ['Spotkania zespołów projektowych i robocze (Tabela B)', stats.projectEventsCount ?? projMeetings.length, 'Zespoły robocze i zamknięte grupy projektowe'],
    ['Łącznie unikalnych wydarzeń', stats.totalEvents ?? cr.totalUniqueMeetings ?? 0, `W tym ${stats.jointEventsCount || 0} międzykołowych`],
    ['Łączna frekwencja z gośćmi (merytoryczne + projektowe)', stats.totalAllAttendees ?? 0, `Średnio ${stats.totalAllAvgAttendees || 0} os./spotkanie`],
  ];

  if (reportData.samorzadStats) {
    summaryRows.push(
      [],
      ['DZIAŁALNOŚĆ SAMORZĄDU STUDENCKIEGO (KANCELARIA)', '', ''],
      ['Sprawy DKO + Ustalenia Samorządu', reportData.samorzadStats.dko.total + reportData.samorzadStats.decisions.total, 'Łączna liczba spraw urzędowych i ustaleń'],
      ['Dziennik Korespondencji (DKO)', reportData.samorzadStats.dko.total, `Wpływ: ${reportData.samorzadStats.dko.in}, Wysłane: ${reportData.samorzadStats.dko.out}`],
      ['Ustalenia Operacyjne / Uchwały', reportData.samorzadStats.decisions.total, `Zrealizowane: ${reportData.samorzadStats.decisions.done}, W toku: ${reportData.samorzadStats.decisions.inProgress}`],
      ['Sieć Starostów Roczników i Grup', reportData.samorzadStats.starostowie.total, `Zgody RODO aktywne: ${reportData.samorzadStats.starostowie.rodoActive}`],
      ['Inicjatywy Samorządu (Teamup)', reportData.samorzadStats.events.count, 'Wydarzenia z kalendarza Samorządu']
    );
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Podsumowanie');

  // ── Arkusz 2: A_Spotkania_Merytoryczne ────────────────────────────────────
  const substantiveRows = [
    ['LP.', 'DATA', 'KOŁO WIODĄCE', 'WSPÓŁORGANIZATORZY', 'TEMAT / TYTUŁ SPOTKANIA', 'PRELEGENT / PROWADZĄCY', 'FREKWENCJA'],
  ];
  subMeetings.forEach((m, idx) => {
    substantiveRows.push([
      idx + 1,
      m.date,
      m.primaryOrg?.shortName || m.primaryOrg?.name || '—',
      m.coOrgs?.length ? m.coOrgs.map((c) => c.shortName).join(', ') : '—',
      m.title,
      m.speaker || 'Zarząd Koła / Zaproszony Prelegent',
      m.totalParticipants > 0 ? m.totalParticipants : 0,
    ]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(substantiveRows), 'A_Merytoryczne');

  // ── Arkusz 3: B_Spotkania_Projektowe ──────────────────────────────────────
  const projectRows = [
    ['LP.', 'DATA', 'KOŁO WIODĄCE', 'WSPÓŁORGANIZATORZY', 'TEMAT / CEL PRAC PROJEKTOWYCH', 'KOORDYNATOR / PRELEGENT', 'FREKWENCJA'],
  ];
  projMeetings.forEach((m, idx) => {
    projectRows.push([
      idx + 1,
      m.date,
      m.primaryOrg?.shortName || m.primaryOrg?.name || '—',
      m.coOrgs?.length ? m.coOrgs.map((c) => c.shortName).join(', ') : '—',
      m.title,
      m.speaker || 'Koordynator Projektu / Zarząd',
      m.totalParticipants > 0 ? m.totalParticipants : 0,
    ]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(projectRows), 'B_Projektowe');

  // ── Arkusz 4: C_Kola_Naukowe_Zbiorczo ─────────────────────────────────────
  const clubsTableRows = [
    ['LP.', 'KOD', 'NAZWA KOŁA NAUKOWEGO', 'MERYTORYCZNE', 'FREKWENCJA (MERYT.+PROJ.)', 'PROJEKTOWE', 'WSPÓLNE'],
  ];
  byOrgStats.forEach((row) => {
    clubsTableRows.push([
      row.lp,
      row.org?.code || row.org?.orgId,
      row.org?.name,
      row.substantiveCount,
      `${row.totalAttendees} os.`,
      row.projectCount,
      row.jointCount,
    ]);
  });
  clubsTableRows.push([
    'SUMA',
    '',
    'SUMA ŁĄCZNA (wydarzenia deduplikowane)',
    stats.substantiveEventsCount ?? subMeetings.length,
    `${stats.totalAllAttendees ?? 0} os.`,
    stats.projectEventsCount ?? projMeetings.length,
    stats.jointEventsCount ?? 0,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clubsTableRows), 'C_Zbiorcza_Kol');

  // ── Arkusz 5: D_Samorzad_Studencki ────────────────────────────────────────
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
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(samorzadRows), 'D_Samorzad_Studencki');
  }

  XLSX.writeFile(wb, finalFilename);
}
