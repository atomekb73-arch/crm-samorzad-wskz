import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  CalendarDays,
  Wrench,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  X,
  Settings,
  ChevronDown,
  Building2,
  FileText,
  FolderKanban,
  Microscope,
} from 'lucide-react';
import ManagementTab from './components/ManagementTab';
import QuarantineTab from './components/QuarantineTab';
import MeetingsTab   from './components/MeetingsTab';
import DocumentsRepositoryTab from './components/DocumentsRepositoryTab';
import ResearchTab   from './components/ResearchTab';
import ReportsTab    from './components/ReportsTab';
import ToolsTab      from './components/ToolsTab';
import SettingsTab   from './components/SettingsTab';
import Navbar        from './components/Navbar';
import SettingsModal from './components/SettingsModal';
import ProfileMenu   from './components/ProfileMenu';
import ErrorBoundary from './components/ErrorBoundary';
import LoginScreen from './components/LoginScreen';
import DashboardTab from './components/DashboardTab';
import CorrespondenceTab from './components/CorrespondenceTab';
import ItIssuesTab from './components/ItIssuesTab';
import OperationalDecisionsTab from './components/OperationalDecisionsTab';
import OrganizationsTab from './components/OrganizationsTab';
import AccessControlTab from './components/AccessControlTab';
import { useAuth } from './context/AuthContext';
import { useOrg } from './context/OrgContext';
import { useAcademicYear } from './context/AcademicYearContext';
import { fetchAllData, AUTHORIZED_INDEXES } from './services/googleSheets';
import { fetchTeamupEvents, fetchTeamupSubcalendars, DEFAULT_SUBCALENDAR_ID } from './services/teamupService';
import { getRecordKey } from './utils/helpers';
import { getAcademicYearKey } from './utils/academicYear';
import { getCanonicalMeetingsForOrg, filterLegitimateMeetings } from './utils/canonicalMeetings';
import {
  createOrgSnapshot,
  getBlacklistedMembers,
  addMemberToBlacklist,
  isMemberBlacklisted,
  getMeetingsTrash,
  getCustomMeetings,
  getMeetingOverrides,
  getCorrespondenceLog,
  setOrgStorage,
} from './utils/storage';

// ── Hard Reset pamięci podręcznej do czystego startu Kancelarii Samorządu ──
const APP_CLEAN_VERSION = 'samorzad_clean_slate_v1';
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem('kanc_crm_clean_version') !== APP_CLEAN_VERSION) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('kanc_crm_clean_version', APP_CLEAN_VERSION);
    }
  } catch (e) {
    console.warn('Błąd czyszczenia pamięci podręcznej:', e);
  }
}

export default function App() {
  const { user, isAuthenticated } = useAuth();
  const { currentOrg, organizations, switchOrg, getStorageKey } = useOrg();
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return sessionStorage.getItem('crm_samorzad_active_tab') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const setActiveTab = useCallback((tab) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem('crm_samorzad_active_tab', tab);
    } catch {}
  }, []);

  const [membersSubTab, setMembersSubTabState] = useState(() => {
    try {
      return sessionStorage.getItem('crm_psychoonkologia_members_subtab') || 'management';
    } catch {
      return 'management';
    }
  });
  const setMembersSubTab = useCallback((subTab) => {
    setMembersSubTabState(subTab);
    try {
      sessionStorage.setItem('crm_psychoonkologia_members_subtab', subTab);
    } catch {}
  }, []);

  const [documentationSubTab, setDocumentationSubTabState] = useState(() => {
    try {
      return sessionStorage.getItem('crm_psychoonkologia_doc_subtab') || 'reports';
    } catch {
      return 'reports';
    }
  });
  const setDocumentationSubTab = useCallback((subTab) => {
    setDocumentationSubTabState(subTab);
    try {
      sessionStorage.setItem('crm_psychoonkologia_doc_subtab', subTab);
    } catch {}
  }, []);

  const [settingsToolsSubTab, setSettingsToolsSubTabState] = useState(() => {
    try {
      return sessionStorage.getItem('crm_psychoonkologia_settings_subtab') || 'settings';
    } catch {
      return 'settings';
    }
  });
  const setSettingsToolsSubTab = useCallback((subTab) => {
    setSettingsToolsSubTabState(subTab);
    try {
      sessionStorage.setItem('crm_psychoonkologia_settings_subtab', subTab);
    } catch {}
  }, []);

  // ── Kancelaria Samorządu Master Data State ─────────────────────────────
  const [correspondence, setCorrespondence] = useState(() => {
    try {
      const stored = localStorage.getItem('kanc_correspondence');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [itIssues, setItIssues] = useState(() => {
    try {
      const stored = localStorage.getItem('kanc_it_issues');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [decisions, setDecisions] = useState(() => {
    try {
      const stored = localStorage.getItem('kanc_decisions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [orgsList, setOrgsList] = useState(() => {
    try {
      const stored = localStorage.getItem('kanc_organizations');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [selectedCorrespondenceItem, setSelectedCorrespondenceItem] = useState(null);

  // Master Data State for Koło / Members
  const [members, setMembers]       = useState([]);
  const [quarantine, setQuarantine] = useState([]);
  const [archivedQuarantine, setArchivedQuarantine] = useState([]);
  const [approvedKeys, setApprovedKeys] = useState([]);
  const [archivedRowIds, setArchivedRowIds] = useState(new Set());
  const [resignedKeys, setResignedKeys] = useState([]);

  // Teamup Meetings State & Academic Year Filter
  const [meetings, setMeetings]     = useState([]);
  const [subcalendars, setSubcalendars] = useState([
    { id: DEFAULT_SUBCALENDAR_ID || '15520558', name: 'Samorząd Studentów WSKZ' },
  ]);
  const [selectedSubcalendar, setSelectedSubcalendar] = useState(DEFAULT_SUBCALENDAR_ID || '15520558');

  // Persistent Academic Year via AcademicYearContext
  const {
    academicYear,
    setAcademicYear,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    getRangeForYear,
  } = useAcademicYear();

  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [reportsTarget, setReportsTarget] = useState({ member: null, docType: 'membership' });

  const handleNavigateToReports = useCallback((member, docType = 'membership') => {
    setReportsTarget({ member, docType });
    setActiveTab('documentation');
    setDocumentationSubTab('reports');
  }, [setActiveTab, setDocumentationSubTab]);

  const handleAddCorrespondence = useCallback((entry) => {
    setCorrespondence(prev => {
      const updated = [entry, ...prev];
      try {
        localStorage.setItem('kanc_correspondence', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setToastMessage(`Zarejestrowano pismo ${entry.id}`);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const handleAddItIssue = useCallback((issue) => {
    setItIssues(prev => {
      const updated = [issue, ...prev];
      try {
        localStorage.setItem('kanc_it_issues', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setToastMessage(`Zgłoszono anomalię IT ${issue.id}`);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const handleAddDecision = useCallback((decision) => {
    setDecisions(prev => {
      const updated = [decision, ...prev];
      try {
        localStorage.setItem('kanc_decisions', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setToastMessage(`Zapisano ustalenie ${decision.id}`);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const handleAddOrganization = useCallback((org) => {
    setOrgsList(prev => {
      const updated = [org, ...prev];
      try {
        localStorage.setItem('kanc_organizations', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setToastMessage(`Zarejestrowano organizację ${org.name}`);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [lastSync, setLastSync]     = useState(null);

  const mergeMeetingWithLocalStorage = useCallback((m) => {
    if (!m) return m;
    const keys = [
      getStorageKey(`crm_attendance_${m.id}`),
      getStorageKey(`crm_attendance_${m.date}`),
      m.code ? getStorageKey(`crm_attendance_${m.code}`) : null,
    ].filter(Boolean);

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed)) {
              const confirmed = parsed
                .filter(p => p.manualApproved && p.member?.index)
                .map(p => p.member.index);
              return {
                ...m,
                attendees: confirmed.length > 0 ? confirmed : m.attendees,
                participantRecords: parsed,
              };
            } else if (parsed.confirmedIndexes || parsed.attendees) {
              const confirmed = parsed.confirmedIndexes || (
                Array.isArray(parsed.attendees)
                  ? parsed.attendees.filter(p => p.manualApproved && p.member?.index).map(p => p.member.index)
                  : []
              );
              return {
                ...m,
                attendees: confirmed.length > 0 ? confirmed : m.attendees,
                participantRecords: Array.isArray(parsed.attendees) ? parsed.attendees : [],
              };
            }
          }
        }
      } catch {}
    }
    return m;
  }, [getStorageKey]);

  // ── Fetch Teamup Meetings ──────────────────────────────────────────────────
  const loadMeetings = useCallback(async (
    subId = selectedSubcalendar,
    yr = academicYear,
    cStart = customStartDate,
    cEnd = customEndDate
  ) => {
    setLoadingMeetings(true);
    try {
      const { startDate, endDate, yearPrefix } = getRangeForYear(yr, cStart, cEnd);
      const effectiveSubId = DEFAULT_SUBCALENDAR_ID || '15520558';
      const fetchedMeetings = await fetchTeamupEvents({
        startDate,
        endDate,
        subcalendarId: effectiveSubId,
        yearPrefix,
      });

      let legitimateMeetings = [];
      if (fetchedMeetings && fetchedMeetings.length > 0) {
        legitimateMeetings = filterLegitimateMeetings(fetchedMeetings, currentOrg.id);
      } else {
        legitimateMeetings = getCanonicalMeetingsForOrg(currentOrg.id);
      }

      const trash = getMeetingsTrash(currentOrg.id);
      const trashIds = new Set(trash.map(t => String(t.id || t.code || t.date).trim()));
      const customMeetings = getCustomMeetings(currentOrg.id);
      const overrides = getMeetingOverrides(currentOrg.id);

      // Scal ze spotkaniami dodanymi ręcznie
      const allMeetings = [...legitimateMeetings];
      customMeetings.forEach(cm => {
        if (!allMeetings.some(m => m.id === cm.id || (m.code && cm.code && m.code === cm.code))) {
          allMeetings.push(cm);
        }
      });

      // Odfiltruj Kosz i nałóż nadpisania kodów/danych
      const finalMeetings = allMeetings
        .filter(m => !trashIds.has(String(m.id).trim()) && !trashIds.has(String(m.code).trim()))
        .map(m => {
          const ov = overrides[m.id] || overrides[m.code];
          return ov ? { ...m, ...ov, code: ov.code || m.code } : m;
        });

      const mergedMeetings = finalMeetings.map(mergeMeetingWithLocalStorage);
      setMeetings(mergedMeetings);
    } catch (err) {
      console.error('Błąd pobierania spotkań:', err);
      const fallback = getCanonicalMeetingsForOrg(currentOrg.id);
      const trash = getMeetingsTrash(currentOrg.id);
      const trashIds = new Set(trash.map(t => String(t.id || t.code || t.date).trim()));
      const customMeetings = getCustomMeetings(currentOrg.id);
      const overrides = getMeetingOverrides(currentOrg.id);

      const allFallback = [...fallback];
      customMeetings.forEach(cm => {
        if (!allFallback.some(m => m.id === cm.id || (m.code && cm.code && m.code === cm.code))) {
          allFallback.push(cm);
        }
      });

      const finalFallback = allFallback
        .filter(m => !trashIds.has(String(m.id).trim()) && !trashIds.has(String(m.code).trim()))
        .map(m => {
          const ov = overrides[m.id] || overrides[m.code];
          return ov ? { ...m, ...ov, code: ov.code || m.code } : m;
        });

      setMeetings(finalFallback.map(mergeMeetingWithLocalStorage));
    } finally {
      setLoadingMeetings(false);
    }
  }, [selectedSubcalendar, academicYear, customStartDate, customEndDate, currentOrg, getRangeForYear, mergeMeetingWithLocalStorage]);

  // ── Fetch All Live Data & Categorize by Approved/Archived/Resigned Keys ───
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sheetsData, subcals] = await Promise.all([
        fetchAllData(currentOrg.sheetId),
        fetchTeamupSubcalendars(),
      ]);

      if (subcals && subcals.length > 0) {
        const onlyPsycho = subcals.filter(s => String(s.id) === (DEFAULT_SUBCALENDAR_ID || '15520558'));
        setSubcalendars(onlyPsycho.length > 0 ? onlyPsycho : [{ id: DEFAULT_SUBCALENDAR_ID || '15520558', name: 'Koła Naukowe > 07 🎗️ SKN Psychoonkologii' }]);
      }

      // Read custom overrides & persistent row IDs from localStorage with org prefix
      const customOverrides = JSON.parse(localStorage.getItem(getStorageKey('crm_custom_overrides')) || '{}');
      const currentApprovedKeys = new Set(JSON.parse(localStorage.getItem(getStorageKey('crm_approved_keys')) || '[]'));
      const currentArchivedRowIds = new Set(JSON.parse(localStorage.getItem(getStorageKey('crm_archived_row_ids')) || '[]'));
      const currentResignedKeys = new Set(JSON.parse(localStorage.getItem(getStorageKey('crm_resigned_keys')) || '[]'));
      const blacklist = getBlacklistedMembers(currentOrg?.id || 'default');

      const applyOverride = (item) => {
        const override =
          (item.id && customOverrides[item.id]) ||
          (item.memberKey && customOverrides[item.memberKey]);

        if (!override) return item;
        return { ...item, ...override };
      };

      // Process members from sheet or fallback to empty array
      const rawMembers = (sheetsData.members && sheetsData.members.length > 0)
        ? sheetsData.members
        : [];
      const processedMembers = rawMembers.map((m) => {
        const overridden = applyOverride(m);
        const isBlacklisted = isMemberBlacklisted(overridden, blacklist) || isMemberBlacklisted(m, blacklist);
        const isArchived = isBlacklisted || currentArchivedRowIds.has(m.id) || overridden.isArchived || overridden.status === 'archived';
        const isResigned = currentResignedKeys.has(m.id) || currentResignedKeys.has(overridden.memberKey) || overridden.status === 'resigned';

        return {
          ...overridden,
          status: isArchived ? 'archived' : (isResigned ? 'resigned' : (overridden.status || 'active')),
          isArchived: !!isArchived,
          isBlacklisted: !!isBlacklisted,
        };
      });

      const uniquePendingQuarantine = [];
      const approvedFromQuarantine = [];
      const archivedList = [];

      // Extract archived members to archivedList
      processedMembers.forEach(m => {
        if (m.isArchived) {
          archivedList.push(m);
        }
      });

      sheetsData.quarantine.forEach(q => {
        const overridden = applyOverride(q);
        const isBlacklisted = isMemberBlacklisted(overridden, blacklist) || isMemberBlacklisted(q, blacklist);
        const isArchived = isBlacklisted || currentArchivedRowIds.has(q.id) || overridden.isArchived || overridden.status === 'archived';
        const isApproved = currentApprovedKeys.has(q.id) || currentApprovedKeys.has(q.memberKey);

        if (isArchived) {
          archivedList.push({ ...overridden, status: 'archived', isArchived: true, isBlacklisted: !!isBlacklisted });
        } else if (isApproved) {
          const isResigned = currentResignedKeys.has(q.id) || currentResignedKeys.has(q.memberKey) || overridden.status === 'resigned';
          approvedFromQuarantine.push({
            ...overridden,
            status: isResigned ? 'resigned' : 'active',
            isArchived: false,
          });
        } else {
          uniquePendingQuarantine.push(overridden);
        }
      });

      setMembers([...processedMembers, ...approvedFromQuarantine]);
      setQuarantine(uniquePendingQuarantine);
      setArchivedQuarantine(archivedList);

      // Sync correspondence log from Dziennik Korespondencji (Google Sheets)
      if (Array.isArray(sheetsData.mailLog)) {
        setCorrespondence(sheetsData.mailLog);
        try {
          localStorage.setItem('kanc_correspondence', JSON.stringify(sheetsData.mailLog));
        } catch {}
      }

      // Sync IT issues from Rejestr Wad IT
      if (Array.isArray(sheetsData.itIssues)) {
        setItIssues(sheetsData.itIssues);
        try {
          localStorage.setItem('kanc_it_issues', JSON.stringify(sheetsData.itIssues));
        } catch {}
      }

      // Sync student organizations from Ewidencja Kół
      if (Array.isArray(sheetsData.clubs)) {
        setOrgsList(sheetsData.clubs);
        try {
          localStorage.setItem('kanc_organizations', JSON.stringify(sheetsData.clubs));
        } catch {}
      }

      // Sync operational decisions from Ustalenia Operacyjne
      if (Array.isArray(sheetsData.decisions)) {
        setDecisions(sheetsData.decisions);
        try {
          localStorage.setItem('kanc_decisions', JSON.stringify(sheetsData.decisions));
        } catch {}
      }

      if (sheetsData?.syncWarning) {
        setError(`Ostrzeżenie arkusza: ${sheetsData.syncWarning}`);
      }

      await loadMeetings();

      setLastSync(new Date());

      // Auto-snapshot: Save local snapshot after successful sync (max 5 rotated per org)
      try {
        if (currentOrg?.id) {
          createOrgSnapshot(currentOrg.id, 'Automatyczna migawka po synchronizacji');
        }
      } catch {}
    } catch (err) {
      console.warn('Sync error:', err);
      setError('Nie udało się pobrać danych z Arkusza Samorządu. Sprawdź połączenie lub uprawnienia do arkusza.');
      setMembers(prev => prev || []);
      try {
        await loadMeetings();
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [currentOrg, loadMeetings, getStorageKey]);

  useEffect(() => {
    // Auto-switch subcalendar and re-load when switching active organization
    try {
      setApprovedKeys(JSON.parse(localStorage.getItem(getStorageKey('crm_approved_keys'))) || []);
      setArchivedRowIds(new Set(JSON.parse(localStorage.getItem(getStorageKey('crm_archived_row_ids'))) || []));
      setResignedKeys(JSON.parse(localStorage.getItem(getStorageKey('crm_resigned_keys'))) || []);
      if (currentOrg?.subcalendarId) {
        setSelectedSubcalendar(currentOrg.subcalendarId);
      }
    } catch {}
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg.id]);

  // ── Member Edit & Overrides Persistence Handler ─────────────────────────
  function handleSaveMember(updatedMember) {
    const key = updatedMember.memberKey || updatedMember.id;

    // Save to localStorage under crm_custom_overrides with org prefix
    const currentOverrides = JSON.parse(localStorage.getItem(getStorageKey('crm_custom_overrides')) || '{}');
    currentOverrides[key] = {
      fullName: updatedMember.fullName,
      firstName: updatedMember.firstName,
      lastName: updatedMember.lastName,
      email: updatedMember.email,
      index: updatedMember.index,
      field: updatedMember.field,
      year: updatedMember.year,
      status: updatedMember.status,
      mailingConsent: updatedMember.mailingConsent,
      zgodaNaMailing: updatedMember.zgodaNaMailing || (updatedMember.mailingConsent ? 'Zgoda na mailing' : 'Brak zgody'),
      consent: updatedMember.mailingConsent,
      zgoda: updatedMember.mailingConsent,
      consentStatus: updatedMember.mailingConsent ? 'Zgody OK' : 'Brak zgody',
    };
    localStorage.setItem(getStorageKey('crm_custom_overrides'), JSON.stringify(currentOverrides));

    // Update in React state
    setMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
    setQuarantine(prev => prev.map(q => q.id === updatedMember.id ? updatedMember : q));
    setArchivedQuarantine(prev => prev.map(a => a.id === updatedMember.id ? updatedMember : a));

    // Show Toast Notification
    setToastMessage(`Pomyślnie zaktualizowano dane studenta: ${updatedMember.fullName}`);
    setTimeout(() => setToastMessage(null), 4000);
  }

  const handleSubcalendarChange = (_newSubId) => {
    setSelectedSubcalendar(DEFAULT_SUBCALENDAR_ID || '15520558');
    loadMeetings(DEFAULT_SUBCALENDAR_ID || '15520558', academicYear, customStartDate, customEndDate);
  };

  const handleAcademicYearChange = (newYr) => {
    setAcademicYear(newYr);
    loadMeetings(selectedSubcalendar, newYr, customStartDate, customEndDate);
  };

  const handleCustomDateChange = (newStart, newEnd) => {
    setCustomStartDate(newStart);
    setCustomEndDate(newEnd);
    loadMeetings(selectedSubcalendar, 'custom', newStart, newEnd);
  };

  // ── Member Status Toggle / Setter (Aktywni vs Goście vs Rezygnacja) ────────
  function handleToggleStatus(id, explicitStatus = null) {
    const member = members.find(m => m.id === id);
    if (!member) return;
    const key = member.memberKey || member.id;

    let targetStatus;
    if (explicitStatus) {
      targetStatus = explicitStatus;
    } else {
      const isCurrentlyResigned = resignedKeys.includes(key) || member.status === 'resigned' || member.status === 'inactive';
      targetStatus = isCurrentlyResigned ? 'active' : 'resigned';
    }

    let updatedKeys;
    if (targetStatus === 'active' || targetStatus === 'guest') {
      updatedKeys = resignedKeys.filter(k => k !== key);
    } else {
      updatedKeys = Array.from(new Set([...resignedKeys, key]));
    }

    setResignedKeys(updatedKeys);
    localStorage.setItem(getStorageKey('crm_resigned_keys'), JSON.stringify(updatedKeys));

    // Save custom override for status
    const currentOverrides = JSON.parse(localStorage.getItem(getStorageKey('crm_custom_overrides')) || '{}');
    currentOverrides[key] = {
      ...(currentOverrides[key] || {}),
      status: targetStatus,
    };
    localStorage.setItem(getStorageKey('crm_custom_overrides'), JSON.stringify(currentOverrides));

    setMembers(prev =>
      prev.map(m =>
        m.id === id
          ? { ...m, status: targetStatus }
          : m
      )
    );

    const statusLabelMap = {
      active: 'Aktywny',
      guest: 'Gość (Wolny słuchacz)',
      resigned: 'Nieaktywny (Rezygnacja)',
    };
    setToastMessage(`Zmieniono status studenta ${member.fullName || member.firstName} na: ${statusLabelMap[targetStatus] || targetStatus}`);
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Revert Member Back to Quarantine (Cofnięcie zatwierdzenia) ────────────
  function handleRevertToQuarantine(id) {
    const member = members.find(m => m.id === id);
    if (!member) return;
    const key = member.memberKey;

    const updatedApprovedKeys = approvedKeys.filter(k => k !== key);
    setApprovedKeys(updatedApprovedKeys);
    localStorage.setItem(getStorageKey('crm_approved_keys'), JSON.stringify(updatedApprovedKeys));

    setMembers(prev => prev.filter(m => m.id !== id));
    setQuarantine(prev => [member, ...prev]);
  }

  // ── Move Member to Archive (Duplikat / Usunięcie z Zarządzania po ROW ID) ──
  function handleArchiveMember(memberOrId, reason = 'duplicate') {
    const member = typeof memberOrId === 'object' && memberOrId !== null
      ? memberOrId
      : (members.find(m => m.id === memberOrId) || quarantine.find(q => q.id === memberOrId));

    if (!member || !member.id) return;
    const rowId = member.id;

    // 1. Zapisz na stałej czarnej liście (crm_psychoonkologia_${orgId}_blacklist_members)
    addMemberToBlacklist(currentOrg?.id || 'default', {
      ...member,
      archiveReason: reason,
    });

    // 2. Zapisz w localStorage crm_archived_row_ids
    const existing = JSON.parse(localStorage.getItem(getStorageKey('crm_archived_row_ids')) || '[]');
    if (!existing.includes(rowId)) {
      existing.push(rowId);
    }
    localStorage.setItem(getStorageKey('crm_archived_row_ids'), JSON.stringify(existing));
    setArchivedRowIds(existing);

    // Zapisz nadpisanie wyłącznie dla tego wiersza oraz klucza
    const currentOverrides = JSON.parse(localStorage.getItem(getStorageKey('crm_custom_overrides')) || '{}');
    currentOverrides[rowId] = {
      ...(currentOverrides[rowId] || {}),
      isArchived: true,
      status: 'archived',
      archiveReason: reason,
      isBlacklisted: true,
    };
    if (member.memberKey) {
      currentOverrides[member.memberKey] = {
        ...(currentOverrides[member.memberKey] || {}),
        isArchived: true,
        status: 'archived',
        archiveReason: reason,
        isBlacklisted: true,
      };
    }
    localStorage.setItem(getStorageKey('crm_custom_overrides'), JSON.stringify(currentOverrides));

    // 3. Zaktualizuj stan w React - przenieś do archiwum
    setMembers(prev =>
      prev.map(m =>
        m.id === rowId || (member.memberKey && m.memberKey === member.memberKey)
          ? { ...m, status: 'archived', isArchived: true, archiveReason: reason, isBlacklisted: true }
          : m
      )
    );

    setArchivedQuarantine(prev => [
      { ...member, status: 'archived', isArchived: true, archiveReason: reason, isBlacklisted: true },
      ...prev.filter(a => a.id !== rowId),
    ]);

    setQuarantine(prev => prev.filter(q => q.id !== rowId));

    // Powiadomienie Toast
    setToastMessage(`Przeniesiono do Archiwum i dodano na czarną listę (${member.fullName || member.firstName}).`);
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Bulk Mark Graduates as Former Members (Przenieś absolwentów do Byłych) ────
  function handleBulkMarkGraduates(memberIds) {
    if (!memberIds || !memberIds.length) return;
    const targetMembers = members.filter(m => memberIds.includes(m.id));
    const keysToAdd = targetMembers.map(m => m.id);

    const currentResignedKeys = JSON.parse(localStorage.getItem(getStorageKey('crm_resigned_keys')) || '[]');
    const newResignedKeys = Array.from(new Set([...currentResignedKeys, ...keysToAdd]));
    setResignedKeys(newResignedKeys);
    localStorage.setItem(getStorageKey('crm_resigned_keys'), JSON.stringify(newResignedKeys));

    setMembers(prev =>
      prev.map(m =>
        memberIds.includes(m.id) ? { ...m, status: 'resigned' } : m
      )
    );

    setToastMessage(`Oznaczono ${memberIds.length} absolwentów jako byłych członków koła.`);
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Bulk Archive Graduates (Przenieś absolwentów do Archiwum po ROW ID) ───────
  function handleBulkArchiveGraduates(memberIds) {
    if (!memberIds || !memberIds.length) return;
    const targetMembers = members.filter(m => memberIds.includes(m.id));

    const currentArchivedRowIds = JSON.parse(localStorage.getItem(getStorageKey('crm_archived_row_ids')) || '[]');
    const newArchivedRowIds = Array.from(new Set([...currentArchivedRowIds, ...memberIds]));
    setArchivedRowIds(newArchivedRowIds);
    localStorage.setItem(getStorageKey('crm_archived_row_ids'), JSON.stringify(newArchivedRowIds));

    // Save custom overrides for these row IDs
    const currentOverrides = JSON.parse(localStorage.getItem(getStorageKey('crm_custom_overrides')) || '{}');
    memberIds.forEach(id => {
      currentOverrides[id] = {
        ...(currentOverrides[id] || {}),
        isArchived: true,
        status: 'archived',
      };
    });
    localStorage.setItem(getStorageKey('crm_custom_overrides'), JSON.stringify(currentOverrides));

    setMembers(prev =>
      prev.map(m =>
        memberIds.includes(m.id)
          ? { ...m, status: 'archived', isArchived: true }
          : m
      )
    );

    setArchivedQuarantine(prev => [
      ...targetMembers.map(m => ({ ...m, isArchived: true, status: 'archived' })),
      ...prev.filter(a => !memberIds.includes(a.id)),
    ]);

    setToastMessage(`Przeniesiono ${memberIds.length} absolwentów do Archiwum.`);
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Quarantine Handlers with localStorage Persistence ────────────────────
  function handleApprove(id) {
    const entry = quarantine.find(q => q.id === id);
    if (!entry) return;

    const newKeys = Array.from(new Set([...approvedKeys, entry.memberKey]));
    setApprovedKeys(newKeys);
    localStorage.setItem(getStorageKey('crm_approved_keys'), JSON.stringify(newKeys));

    const isResigned = resignedKeys.includes(entry.memberKey);
    const approvedMember = { ...entry, status: isResigned ? 'resigned' : 'active' };

    setMembers(prev => [approvedMember, ...prev]);
    setQuarantine(prev => prev.filter(q => q.id !== id));
  }

  function handleBulkApprove(ids) {
    const entriesToApprove = quarantine.filter(q => ids.includes(q.id));
    if (entriesToApprove.length === 0) return;

    const keysToAdd = entriesToApprove.map(e => e.memberKey);
    const newKeys = Array.from(new Set([...approvedKeys, ...keysToAdd]));
    setApprovedKeys(newKeys);
    localStorage.setItem(getStorageKey('crm_approved_keys'), JSON.stringify(newKeys));

    const approvedMembers = entriesToApprove.map(entry => {
      const isResigned = resignedKeys.includes(entry.memberKey);
      return { ...entry, status: isResigned ? 'resigned' : 'active' };
    });

    setMembers(prev => [...approvedMembers, ...prev]);
    setQuarantine(prev => prev.filter(q => !ids.includes(q.id)));
  }

  function handleArchive(id) {
    const entry = quarantine.find(q => q.id === id);
    if (!entry) return;

    // Zapisz na czarnej liście / archiwum
    addMemberToBlacklist(currentOrg?.id || 'default', { ...entry, archiveReason: 'Kwarantanna / Archiwum' });

    const newKeys = Array.from(new Set([...archivedRowIds, id]));
    setArchivedRowIds(newKeys);
    localStorage.setItem(getStorageKey('crm_archived_row_ids'), JSON.stringify(newKeys));

    setArchivedQuarantine(prev => [{ ...entry, isArchived: true, status: 'archived', isBlacklisted: true }, ...prev]);
    setQuarantine(prev => prev.filter(q => q.id !== id));
  }

  function handleBulkArchive(ids, reason = 'duplicate') {
    const entriesToArchive = quarantine.filter(q => ids.includes(q.id));
    if (entriesToArchive.length === 0) return;

    // Zapisz na czarnej liście / archiwum
    entriesToArchive.forEach(entry => {
      addMemberToBlacklist(currentOrg?.id || 'default', { ...entry, archiveReason: reason });
    });

    const newKeys = Array.from(new Set([...archivedRowIds, ...ids]));
    setArchivedRowIds(newKeys);
    localStorage.setItem(getStorageKey('crm_archived_row_ids'), JSON.stringify(newKeys));

    const currentOverrides = JSON.parse(localStorage.getItem(getStorageKey('crm_custom_overrides')) || '{}');
    entriesToArchive.forEach(e => {
      currentOverrides[e.id] = {
        ...(currentOverrides[e.id] || {}),
        isArchived: true,
        status: 'archived',
        archiveReason: reason,
        isBlacklisted: true,
      };
      if (e.memberKey) {
        currentOverrides[e.memberKey] = {
          ...(currentOverrides[e.memberKey] || {}),
          isArchived: true,
          status: 'archived',
          archiveReason: reason,
          isBlacklisted: true,
        };
      }
    });
    localStorage.setItem(getStorageKey('crm_custom_overrides'), JSON.stringify(currentOverrides));

    setArchivedQuarantine(prev => [
      ...entriesToArchive.map(e => ({ ...e, isArchived: true, status: 'archived', archiveReason: reason, isBlacklisted: true })),
      ...prev.filter(a => !ids.includes(a.id)),
    ]);
    setQuarantine(prev => prev.filter(q => !ids.includes(q.id)));

    setToastMessage(`Przeniesiono ${entriesToArchive.length} rekordów do Archiwum/Odrzucone.`);
    setTimeout(() => setToastMessage(null), 4000);
  }

  function handleRestoreArchive(id) {
    const entry = archivedQuarantine.find(a => a.id === id);
    if (!entry) return;

    const newKeys = archivedRowIds.filter(k => k !== id);
    setArchivedRowIds(newKeys);
    localStorage.setItem(getStorageKey('crm_archived_row_ids'), JSON.stringify(newKeys));

    setQuarantine(prev => [{ ...entry, isArchived: false, status: 'quarantine' }, ...prev]);
    setArchivedQuarantine(prev => prev.filter(a => a.id !== id));
  }

  function handleBulkRestoreArchive(ids) {
    const entriesToRestore = archivedQuarantine.filter(a => ids.includes(a.id));
    if (entriesToRestore.length === 0) return;

    const newKeys = archivedRowIds.filter(k => !ids.includes(k));
    setArchivedRowIds(newKeys);
    localStorage.setItem(getStorageKey('crm_archived_row_ids'), JSON.stringify(newKeys));

    setQuarantine(prev => [...entriesToRestore.map(e => ({ ...e, isArchived: false, status: 'quarantine' })), ...prev]);
    setArchivedQuarantine(prev => prev.filter(a => !ids.includes(a.id)));
  }

  function handlePermanentDeleteArchive(id) {
    const entry = archivedQuarantine.find(a => a.id === id);
    if (!entry) return;

    const newKeys = archivedRowIds.filter(k => k !== id);
    setArchivedRowIds(newKeys);
    localStorage.setItem(getStorageKey('crm_archived_row_ids'), JSON.stringify(newKeys));

    setArchivedQuarantine(prev => prev.filter(a => a.id !== id));
  }

  // ── Mark attendance ─────────────────────────────────────────────────────────
  function handleMarkAttendance(meetingId, indexes, payload) {
    setMeetings(prev =>
      prev.map(m => {
        if (m.id === meetingId || m.date === meetingId || m.code === meetingId) {
          return {
            ...m,
            attendees: indexes,
            participantRecords: payload?.attendees || m.participantRecords || [],
          };
        }
        return m;
      })
    );
  }

  const pendingCount = quarantine.length;
  const activeMembersCount = members.filter(
    m => (m.status === 'active' || !m.status) && !m.isArchived && m.status !== 'resigned' && m.status !== 'archived'
  ).length;

  const syncLabel = lastSync
    ? lastSync.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  if (!isAuthenticated || !user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ── Toast Notification Banner ───────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-800 animate-in slide-in-from-bottom-5 duration-200 text-xs print:hidden">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 print:hidden shadow-xs">
        <div className="w-[98vw] max-w-[1850px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">

          {/* Logo & Multi-Tenant Organization Switcher */}
          <div className="flex items-center gap-3 shrink-0 relative">
            <div className="w-10 h-10 rounded-2xl bg-[#1e3a8a] flex items-center justify-center shadow-sm text-white font-extrabold text-sm tracking-tight shrink-0 border border-blue-900/20">
              KSS
            </div>
            
            <div className="relative">
              <button
                onClick={() => setIsOrgDropdownOpen(prev => !prev)}
                className="flex items-center gap-1.5 text-left group hover:bg-slate-100 p-1.5 -m-1.5 rounded-xl transition cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-[#1e3a8a] transition leading-tight">
                      Kancelaria Samorządu Studenckiego WSKZ
                    </h1>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                      WSKZ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">Kancelaria & System Ewidencji Zarządczej</p>
                </div>
                <ChevronDown size={14} className="text-slate-400 group-hover:text-[#1e3a8a] transition shrink-0 ml-0.5" />
              </button>

              {/* Organization Dropdown Menu */}
              {isOrgDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsOrgDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-800">
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Struktura Samorządu & Koła
                    </div>
                    <div className="space-y-1 py-1 max-h-60 overflow-y-auto">
                      {organizations.map(org => {
                        const isSelected = org.id === currentOrg.id;
                        return (
                          <button
                            key={org.id}
                            onClick={() => {
                              switchOrg(org.id);
                              setIsOrgDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 text-[#1e3a8a] font-bold border border-blue-200'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="truncate font-semibold">{org.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{org.tag || 'WSKZ'}</p>
                            </div>
                            {isSelected && <CheckCircle2 size={14} className="text-[#1e3a8a] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t border-slate-100 pt-1 mt-1">
                      <button
                        onClick={() => {
                          setIsOrgDropdownOpen(false);
                          setIsSettingsOpen(true);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-[#1e3a8a] hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Settings size={14} />
                        <span>Zarządzaj strukturą…</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sync status + Settings + refresh */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Status pill (Single-line) */}
            <div className={`hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap shrink-0 ${
              error
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : loading
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : lastSync
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              {error
                ? <><WifiOff size={12} /> <span>Błąd połączenia</span></>
                : loading
                ? <><RefreshCw size={12} className="animate-spin" /> <span>Ładowanie…</span></>
                : lastSync
                ? <><Wifi size={12} /> <span>Zsynchronizowano {syncLabel}</span></>
                : <><Wifi size={12} /> <span>Oczekiwanie…</span></>
              }
            </div>

            {/* Record count (Single-line row) */}
            {lastSync && !error && (
              <div className="hidden lg:flex items-center gap-3 text-xs text-slate-600 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0">
                <span>Pisma: <strong className="text-slate-900 font-semibold">{correspondence.length}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Wady IT: <strong className="text-amber-700 font-semibold">{itIssues.length}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Ustalenia: <strong className="text-[#1e3a8a] font-semibold">{decisions.length}</strong></span>
              </div>
            )}

            {/* Refresh button */}
            <button
              onClick={loadData}
              disabled={loading}
              title="Odśwież dane z Google Sheets"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Odśwież dane</span>
            </button>

            {/* User Profile & Role Switcher Menu */}
            <ProfileMenu onOpenSettings={() => setIsSettingsOpen(true)} />
          </div>
        </div>
      </header>

      {/* ── Error / Warning banner ────────────────────────────────────────── */}
      {error && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 print:hidden">
          <div className="w-[98vw] max-w-[1850px] mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-900">
            <div className="flex items-center gap-2 min-w-0">
              <WifiOff size={15} className="text-amber-600 shrink-0" />
              <span className="truncate">
                <strong>Status synchronizacji:</strong> {error} (załadowano lokalną bazę ewidencyjną)
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setError(null)}
                className="text-amber-800 hover:text-amber-950 text-xs px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 transition cursor-pointer"
              >
                Ukryj
              </button>
              <button
                onClick={loadData}
                className="text-white font-medium text-xs px-3 py-1 rounded bg-[#1e3a8a] hover:bg-[#1d4ed8] transition cursor-pointer"
              >
                Ponów
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Area ───────────────────────────────────────────────── */}
      <main className="w-[98vw] max-w-[1850px] mx-auto px-4 sm:px-6 py-4 space-y-6">

        {/* Navigation Bar with 6 Tabs */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCorrespondenceCount={correspondence.filter(c => c.status === 'W toku' || c.weryfikacjaFormalna === 'Weryfikacja').length}
          pendingItCount={itIssues.filter(i => i.ectsImpact?.includes('Krytyczny') || i.status?.includes('Oczekuje')).length}
        />

        {/* Skeleton loading state on first load */}
        {loading && correspondence.length === 0 && itIssues.length === 0 && (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 h-28" />
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 h-80" />
          </div>
        )}

        {/* Tabs Router */}
        {(!loading || correspondence.length > 0 || itIssues.length > 0 || members.length > 0) && (
          <ErrorBoundary>
            {(() => {
              switch (activeTab) {
                case 'dashboard':
                  return (
                    <DashboardTab
                      correspondence={correspondence}
                      itIssues={itIssues}
                      organizations={orgsList}
                      decisions={decisions}
                      onNavigateTab={setActiveTab}
                      onSelectCorrespondence={(item) => {
                        setSelectedCorrespondenceItem(item);
                        setActiveTab('correspondence');
                      }}
                    />
                  );

                case 'correspondence':
                case 'mail':
                case 'poczta':
                  return (
                    <CorrespondenceTab
                      correspondence={correspondence}
                      onAddCorrespondence={handleAddCorrespondence}
                      selectedItem={selectedCorrespondenceItem}
                      onSelectItem={setSelectedCorrespondenceItem}
                    />
                  );

                case 'it_issues':
                case 'wady':
                case 'it':
                  return (
                    <ItIssuesTab
                      itIssues={itIssues}
                      onAddItIssue={handleAddItIssue}
                    />
                  );

                case 'decisions':
                case 'protokoly':
                case 'ustalenia':
                  return (
                    <OperationalDecisionsTab
                      decisions={decisions}
                      onAddDecision={handleAddDecision}
                    />
                  );

                case 'organizations':
                case 'kola':
                case 'clubs':
                  return (
                    <OrganizationsTab
                      organizations={orgsList}
                      onAddOrganization={handleAddOrganization}
                    />
                  );

                case 'access_control':
                case 'settings':
                case 'uprawnienia':
                case 'settings_tools':
                  return (
                    <AccessControlTab
                      onRefreshData={loadData}
                    />
                  );

                // Fallback support for legacy tabs
                case 'members':
                  if (membersSubTab === 'quarantine') {
                    return (
                      <QuarantineTab
                        members={members}
                        quarantine={quarantine}
                        archivedQuarantine={archivedQuarantine}
                        onApprove={handleApprove}
                        onBulkApprove={handleBulkApprove}
                        onArchive={handleArchive}
                        onBulkArchive={handleBulkArchive}
                        onRestoreArchive={handleRestoreArchive}
                        onBulkRestoreArchive={handleBulkRestoreArchive}
                        onPermanentDeleteArchive={handlePermanentDeleteArchive}
                        onSaveMember={handleSaveMember}
                      />
                    );
                  }
                  return (
                    <ManagementTab
                      members={members}
                      meetings={meetings}
                      isLoading={loading}
                      onToggleStatus={handleToggleStatus}
                      onRevertToQuarantine={handleRevertToQuarantine}
                      onSaveMember={handleSaveMember}
                      onArchiveMember={handleArchiveMember}
                      onBulkMarkGraduates={handleBulkMarkGraduates}
                      onBulkArchiveGraduates={handleBulkArchiveGraduates}
                      onNavigateToReports={handleNavigateToReports}
                    />
                  );

                case 'meetings':
                  return (
                    <MeetingsTab
                      meetings={meetings}
                      members={members}
                      onMarkAttendance={handleMarkAttendance}
                      subcalendars={subcalendars}
                      selectedSubcalendar={selectedSubcalendar}
                      onSubcalendarChange={handleSubcalendarChange}
                      onRefreshMeetings={() => loadMeetings()}
                      loadingMeetings={loadingMeetings}
                      academicYear={academicYear}
                      onAcademicYearChange={handleAcademicYearChange}
                      customStartDate={customStartDate}
                      customEndDate={customEndDate}
                      onCustomDateChange={handleCustomDateChange}
                    />
                  );

                default:
                  return (
                    <DashboardTab
                      correspondence={correspondence}
                      itIssues={itIssues}
                      organizations={orgsList}
                      decisions={decisions}
                      onNavigateTab={setActiveTab}
                      onSelectCorrespondence={(item) => {
                        setSelectedCorrespondenceItem(item);
                        setActiveTab('correspondence');
                      }}
                    />
                  );
              }
            })()}
          </ErrorBoundary>
        )}
      </main>

      {/* ── Multi-Tenant Settings Modal ─────────────────────────────────────── */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
