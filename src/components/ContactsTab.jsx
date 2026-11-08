import React, { useState, useMemo, useCallback } from 'react';
import {
  BookUser,
  Users,
  Building2,
  GraduationCap,
  Search,
  Mail,
  Phone,
  FileText,
  Copy,
  Check,
  Plus,
  Filter,
  ShieldCheck,
  Clock,
  ExternalLink,
  Edit3,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  MapPin,
  Sparkles,
  LayoutGrid,
  List,
  Send,
  Download,
  CheckSquare,
  Square,
  AtSign,
  FileSpreadsheet,
} from 'lucide-react';
import {
  CONTACTS_SPREADSHEET_ID,
  getLocalContacts,
  saveLocalContact,
} from '../services/contactsService';

const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${CONTACTS_SPREADSHEET_ID}/edit`;

export default function ContactsTab({
  onNavigateToLetter = () => {},
}) {
  const [activeSubTab, setActiveSubTab] = useState('starostowie'); // 'starostowie' | 'faculty' | 'clubs' | 'mailing'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [searchTerm, setSearchTerm] = useState('');
  const [fieldFilter, setFieldFilter] = useState('ALL');
  const [rodoFilter, setRodoFilter] = useState('ALL');
  const [facultyFilter, setFacultyFilter] = useState('ALL');

  // Contact list state loaded from SSOT / localStorage
  const [contactsData, setContactsData] = useState(() => getLocalContacts());

  // Copy-to-clipboard toast/feedback per item
  const [copiedId, setCopiedId] = useState(null);
  const [mailingCopied, setMailingCopied] = useState(false);

  // Mailing view configuration
  const [mailingAudience, setMailingAudience] = useState('starostowie'); // 'starostowie' | 'faculty' | 'clubs' | 'all'
  const [mailingRodoOnly, setMailingRodoOnly] = useState(false); // only with RODO consent
  const [mailingFormat, setMailingFormat] = useState('comma'); // 'comma' | 'semicolon' | 'lines'
  const [selectedRecipientIds, setSelectedRecipientIds] = useState(new Set());
  const [mailingFieldFilter, setMailingFieldFilter] = useState('ALL');

  // Modal state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingCategory, setEditingCategory] = useState('starostowie');
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    role: '',
    title: '',
    field: '',
    faculty: '',
    unit: '',
    mode: '',
    year: '',
    semester: '',
    group: '',
    phone: '',
    email: '',
    emailUczelniany: '',
    emailPrywatny: '',
    dutyHours: '',
    notes: '',
    rodoStatus: 'Zgoda aktywna',
    supervisor: '',
    status: 'Aktywne',
  });

  const handleCopyText = useCallback((id, text) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.warn('Nie udało się skopiować:', e);
    }
  }, []);

  // Filtered Starostowie
  const filteredStarostowie = useMemo(() => {
    return (contactsData.starostowie || []).filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        `${item.name} ${item.role} ${item.field} ${item.group} ${item.email || ''} ${item.phone || ''} ${item.notes || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchField =
        fieldFilter === 'ALL' ||
        (item.field && item.field.toLowerCase().includes(fieldFilter.toLowerCase()));

      const matchRodo =
        rodoFilter === 'ALL' ||
        (rodoFilter === 'active' && item.rodoStatus === 'Zgoda aktywna') ||
        (rodoFilter === 'pending' && item.rodoStatus !== 'Zgoda aktywna');

      return matchSearch && matchField && matchRodo;
    });
  }, [contactsData.starostowie, searchTerm, fieldFilter, rodoFilter]);

  // Filtered Faculty & Deans
  const filteredFaculty = useMemo(() => {
    return (contactsData.faculty || []).filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        `${item.name} ${item.title} ${item.unit} ${item.email || ''} ${item.phone || ''} ${item.relatedFields || ''} ${item.notes || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchFaculty =
        facultyFilter === 'ALL' ||
        (item.unit && item.unit.toLowerCase().includes(facultyFilter.toLowerCase()));

      return matchSearch && matchFaculty;
    });
  }, [contactsData.faculty, searchTerm, facultyFilter]);

  // Filtered Clubs
  const filteredClubs = useMemo(() => {
    return (contactsData.clubs || []).filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        `${item.name} ${item.supervisor || ''} ${item.faculty || ''} ${item.email || ''} ${item.description || ''} ${item.notes || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchFaculty =
        facultyFilter === 'ALL' ||
        (item.faculty && item.faculty.toLowerCase().includes(facultyFilter.toLowerCase()));

      return matchSearch && matchFaculty;
    });
  }, [contactsData.clubs, searchTerm, facultyFilter]);

  // ── Mailing List Candidates Calculation ──────────────────────────────────
  const mailingCandidates = useMemo(() => {
    let list = [];

    if (mailingAudience === 'starostowie' || mailingAudience === 'all') {
      contactsData.starostowie.forEach((s) => {
        const email = (s.email || s.emailPrywatny || s.emailUczelniany || '').trim();
        if (email) {
          const matchField =
            mailingFieldFilter === 'ALL' ||
            (s.field && s.field.toLowerCase().includes(mailingFieldFilter.toLowerCase()));
          const matchRodo = !mailingRodoOnly || s.rodoStatus === 'Zgoda aktywna';

          if (matchField && matchRodo) {
            list.push({
              id: s.id,
              name: s.name,
              role: s.role || 'Starosta',
              group: s.group,
              field: s.field,
              category: 'Starosta',
              email,
              phone: s.phone,
              rodoStatus: s.rodoStatus,
            });
          }
        }
      });
    }

    if (mailingAudience === 'faculty' || mailingAudience === 'all') {
      contactsData.faculty.forEach((f) => {
        const email = (f.email || '').trim();
        if (email) {
          list.push({
            id: f.id,
            name: f.name,
            role: f.title || 'Władze / Dziekanat',
            group: '',
            field: f.unit,
            category: 'Władze Uczelni',
            email,
            phone: f.phone,
            rodoStatus: 'Zgoda służbowa',
          });
        }
      });
    }

    if (mailingAudience === 'clubs' || mailingAudience === 'all') {
      contactsData.clubs.forEach((c) => {
        const email = (c.email || '').trim();
        if (email) {
          list.push({
            id: c.id,
            name: c.name,
            role: c.supervisor ? `opiekun: ${c.supervisor}` : 'Koło Naukowe',
            group: '',
            field: c.faculty,
            category: 'Koło Naukowe',
            email,
            phone: '',
            rodoStatus: 'Zgoda statutowa',
          });
        }
      });
    }

    return list;
  }, [contactsData, mailingAudience, mailingRodoOnly, mailingFieldFilter]);

  // Initialize or reconcile selection set when audience changes
  const activeRecipientList = useMemo(() => {
    if (selectedRecipientIds.size === 0) {
      return mailingCandidates;
    }
    return mailingCandidates.filter((c) => selectedRecipientIds.has(c.id));
  }, [mailingCandidates, selectedRecipientIds]);

  const uniqueActiveEmails = useMemo(() => {
    const set = new Set();
    activeRecipientList.forEach((r) => {
      if (r.email) set.add(r.email.toLowerCase().trim());
    });
    return Array.from(set);
  }, [activeRecipientList]);

  const formattedMailingString = useMemo(() => {
    if (uniqueActiveEmails.length === 0) return '';
    if (mailingFormat === 'semicolon') {
      return uniqueActiveEmails.join('; ');
    }
    if (mailingFormat === 'lines') {
      return uniqueActiveEmails.join('\n');
    }
    return uniqueActiveEmails.join(', ');
  }, [uniqueActiveEmails, mailingFormat]);

  // Toggle selection for all
  const handleSelectAllRecipients = () => {
    setSelectedRecipientIds(new Set(mailingCandidates.map((c) => c.id)));
  };

  const handleDeselectAllRecipients = () => {
    setSelectedRecipientIds(new Set());
  };

  const handleToggleRecipient = (id) => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev.size === 0 ? mailingCandidates.map((c) => c.id) : prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyMailingList = () => {
    if (!formattedMailingString) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(formattedMailingString);
      }
      setMailingCopied(true);
      setTimeout(() => setMailingCopied(false), 2000);
    } catch (e) {
      console.warn('Błąd kopiowania listy mailingowej:', e);
    }
  };

  const handleExportTxt = () => {
    if (!formattedMailingString) return;
    const blob = new Blob([formattedMailingString], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mailing_${mailingAudience}_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (activeRecipientList.length === 0) return;
    const header = 'ID,Imię i nazwisko,Rola,Kierunek/Jednostka,Grupa,E-mail,Telefon,Status RODO\n';
    const rows = activeRecipientList
      .map(
        (r) =>
          `"${r.id}","${r.name}","${r.role}","${r.field}","${r.group || ''}","${r.email}","${r.phone || ''}","${r.rodoStatus}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `odbiorcy_mailingu_${mailingAudience}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Open Add modal
  const handleOpenAddModal = (category = activeSubTab === 'mailing' ? 'starostowie' : activeSubTab) => {
    setModalMode('add');
    setEditingCategory(category);
    setFormData({
      id: `${category === 'starostowie' ? 'ST' : category === 'faculty' ? 'OU' : 'KN'}-${Date.now().toString().slice(-4)}`,
      name: '',
      role: category === 'starostowie' ? 'Starosta Grupy' : '',
      title: category === 'faculty' ? 'Prodziekan ds. Studenckich' : '',
      field: '',
      faculty: '',
      unit: '',
      mode: 'Niestacjonarne',
      year: 'I rok',
      semester: 'Semestr 1',
      group: '',
      phone: '',
      email: '',
      emailUczelniany: '',
      emailPrywatny: '',
      dutyHours: '',
      notes: '',
      rodoStatus: 'Zgoda aktywna',
      supervisor: '',
      status: 'Aktywne',
    });
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEditModal = (item, category) => {
    setModalMode('edit');
    setEditingCategory(category);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  // Save Modal Form
  const handleSaveModal = (e) => {
    e.preventDefault();
    const updated = saveLocalContact(editingCategory, formData);
    setContactsData((prev) => ({
      ...prev,
      [editingCategory]: updated,
    }));
    setIsModalOpen(false);
  };

  // Action: Launch A4 letter from contact
  const handleCreateLetter = (contact, category) => {
    let recipientName = contact.name;
    let recipientOrg = 'Wyższa Szkoła Kształcenia Zawodowego we Wrocławiu';

    if (category === 'starostowie') {
      const grp = contact.group ? `, gr. ${contact.group}` : '';
      const fld = contact.field ? ` (${contact.field})` : '';
      recipientName = `${contact.name} — Starosta${grp}${fld}`;
      recipientOrg = `Samorząd Studencki WSKZ • ${contact.field || 'Student WSKZ'}`;
    } else if (category === 'faculty') {
      recipientName = `${contact.name} (${contact.title})`;
      recipientOrg = contact.unit || 'Władze Uczelni WSKZ';
    } else if (category === 'clubs') {
      recipientName = `${contact.name} (opiekun: ${contact.supervisor || 'Zarząd Koła'})`;
      recipientOrg = `Studenckie Koło Naukowe WSKZ • ${contact.faculty || ''}`;
    }

    onNavigateToLetter({
      recipient: recipientName,
      institution: recipientOrg,
      email: contact.email || contact.emailPrywatny || contact.emailUczelniany,
      phone: contact.phone,
      contactItem: contact,
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Top Header & Stats Bar ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-100 shrink-0">
              <BookUser size={26} className="text-[#1e3a8a]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  Książka Adresowa i Kontakty Samorządu
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Kadencja 2026–2028
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Centralny rejestr teleadresowy Starostów Roczników, Władz Dziekańskich, Instytutów oraz 18 Kół Naukowych WSKZ.
              </p>
            </div>
          </div>

          {/* Header Action Buttons & View Mode Toggle */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* View Mode Switcher (Grid vs Table) */}
            {activeSubTab !== 'mailing' && (
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Widok tabeli / listy (jak w Kole Naukowym)"
                >
                  <List size={14} />
                  <span className="hidden sm:inline">Tabela / Lista</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Widok kart / siatki"
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">Karty</span>
                </button>
              </div>
            )}

            <a
              href={SPREADSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition shadow-2xs"
              title="Otwórz połączony Arkusz Google w nowej karcie"
            >
              <ExternalLink size={14} className="text-slate-500" />
              <span>Arkusz Google</span>
            </a>

            <button
              onClick={() => handleOpenAddModal(activeSubTab === 'mailing' ? 'starostowie' : activeSubTab)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1e3a8a] hover:bg-[#1d4ed8] shadow-xs transition cursor-pointer"
            >
              <Plus size={15} />
              <span>Dodaj kontakt</span>
            </button>
          </div>
        </div>

        {/* ── Sub-navigation Switcher with 4 tabs (including Mailing) ─────── */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => {
                setActiveSubTab('starostowie');
                setFieldFilter('ALL');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSubTab === 'starostowie'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <GraduationCap size={16} />
              <span>Starostowie Grup i Roczników</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeSubTab === 'starostowie'
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {contactsData.starostowie.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveSubTab('faculty');
                setFacultyFilter('ALL');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSubTab === 'faculty'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Building2 size={16} />
              <span>Władze Uczelni i Dziekanaty</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeSubTab === 'faculty'
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {contactsData.faculty.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveSubTab('clubs');
                setFacultyFilter('ALL');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSubTab === 'clubs'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users size={16} />
              <span>Koła Naukowe i Opiekunowie</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeSubTab === 'clubs'
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {contactsData.clubs.length}
              </span>
            </button>

            {/* NEW SUB-TAB: Mailing do Grup */}
            <button
              onClick={() => {
                setActiveSubTab('mailing');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSubTab === 'mailing'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-indigo-50/70 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <Send size={15} />
              <span>Narzędzia & Mailing do Grup</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeSubTab === 'mailing'
                    ? 'bg-indigo-900 text-white'
                    : 'bg-indigo-200 text-indigo-900'
                }`}
              >
                {uniqueActiveEmails.length}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            Łącznie w bazie:{' '}
            <strong className="text-slate-700">
              {contactsData.starostowie.length +
                contactsData.faculty.length +
                contactsData.clubs.length}
            </strong>{' '}
            pozycji
          </div>
        </div>
      </div>

      {/* ── Search and Filter Controls (Active for Directory Tabs) ──────── */}
      {activeSubTab !== 'mailing' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative w-full md:w-96">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Szukaj po nazwisku, grupie, e-mailu, roli..."
              className="w-full pl-9 pr-3.5 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Dynamic Filters depending on active sub-view */}
          <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {activeSubTab === 'starostowie' && (
              <>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Kierunek:
                  </span>
                  <select
                    value={fieldFilter}
                    onChange={(e) => setFieldFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">Wszystkie kierunki</option>
                    <option value="Administracja">Administracja</option>
                    <option value="Psychologia">Psychologia</option>
                    <option value="Zarządzanie">Zarządzanie</option>
                    <option value="Cyberbezpieczeństwo">Cyberbezpieczeństwo</option>
                    <option value="Dietetyka">Dietetyka</option>
                    <option value="Turystyka">Turystyka</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Status RODO:
                  </span>
                  <select
                    value={rodoFilter}
                    onChange={(e) => setRodoFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">Wszystkie</option>
                    <option value="active">Zgoda aktywna</option>
                    <option value="pending">Oczekuje na podpis</option>
                  </select>
                </div>
              </>
            )}

            {(activeSubTab === 'faculty' || activeSubTab === 'clubs') && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-semibold text-slate-500">
                  Wydział / Jednostka:
                </span>
                <select
                  value={facultyFilter}
                  onChange={(e) => setFacultyFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">Wszystkie jednostki</option>
                  <option value="Władze">Władze Uczelni</option>
                  <option value="Psychologii">Wydział Psychologii</option>
                  <option value="Bezpieczeństwa">Wydział Nauk Społecznych i Bezpieczeństwa</option>
                  <option value="Zarządzania">Wydział Zarządzania i Informatyki</option>
                  <option value="Medycznych">Wydział Nauk Medycznych</option>
                  <option value="Biuro">Dziekanat / Biura</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Content: Starostowie ─────────────────────────────────────── */}
      {activeSubTab === 'starostowie' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Wyniki: <strong>{filteredStarostowie.length}</strong> starostów
            </span>
            <span className="text-slate-400 hidden sm:inline">
              Szybka akcja: kliknij <strong>Wystaw pismo A4</strong>, aby wygenerować oficjalny dokument z tym adresatem
            </span>
          </div>

          {/* TABLE VIEW (Kompaktowa lista jak w Kole Naukowym) */}
          {viewMode === 'table' ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3.5 w-12 text-center">L.p.</th>
                      <th className="py-3 px-4">Imię i nazwisko / Rola</th>
                      <th className="py-3 px-4">Kierunek / Grupa</th>
                      <th className="py-3 px-4">Telefon</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4 text-center">Status RODO</th>
                      <th className="py-3 px-4 text-right">Opcje / Działania</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredStarostowie.map((starosta, idx) => {
                      const isCopied = copiedId === starosta.id;
                      const hasPhone = Boolean(starosta.phone);
                      const primaryEmail = starosta.email || starosta.emailPrywatny || starosta.emailUczelniany || '';

                      return (
                        <tr
                          key={starosta.id}
                          className="hover:bg-blue-50/40 transition group"
                        >
                          <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Imię i nazwisko / Rola */}
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-900 group-hover:text-blue-900 transition flex items-center gap-1.5">
                              <span>{starosta.name}</span>
                            </div>
                            <div className="text-[11px] text-blue-700 font-medium">
                              {starosta.role || 'Starosta Grupy'}
                            </div>
                          </td>

                          {/* Kierunek / Grupa */}
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-800">
                              {starosta.field}
                            </div>
                            <div className="text-[10.5px] text-slate-500">
                              {starosta.year} • {starosta.semester}
                              {starosta.group && (
                                <span className="ml-1 font-bold text-blue-900">
                                  gr. {starosta.group}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Telefon */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            {hasPhone ? (
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`tel:${starosta.phone.replace(/\s+/g, '')}`}
                                  className="text-slate-800 hover:text-blue-700 font-mono text-[11px]"
                                >
                                  {starosta.phone}
                                </a>
                                <button
                                  onClick={() => handleCopyText(starosta.id + '_phone', starosta.phone)}
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                                  title="Kopiuj telefon"
                                >
                                  {copiedId === starosta.id + '_phone' ? (
                                    <Check size={12} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">—</span>
                            )}
                          </td>

                          {/* E-mail */}
                          <td className="py-2.5 px-4">
                            {primaryEmail ? (
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`mailto:${primaryEmail}`}
                                  className="text-slate-800 hover:text-blue-700 truncate max-w-[190px] text-[11px]"
                                  title={primaryEmail}
                                >
                                  {primaryEmail}
                                </a>
                                <button
                                  onClick={() => handleCopyText(starosta.id + '_mail', primaryEmail)}
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer shrink-0"
                                  title="Kopiuj e-mail"
                                >
                                  {copiedId === starosta.id + '_mail' ? (
                                    <Check size={12} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">—</span>
                            )}
                          </td>

                          {/* Status RODO */}
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                starosta.rodoStatus === 'Zgoda aktywna'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              <ShieldCheck size={11} />
                              <span>{starosta.rodoStatus === 'Zgoda aktywna' ? 'RODO OK' : 'Oczekuje'}</span>
                            </span>
                          </td>

                          {/* Opcje */}
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {primaryEmail && (
                                <a
                                  href={`mailto:${primaryEmail}`}
                                  className="p-1.5 text-slate-600 hover:text-blue-700 rounded-lg hover:bg-slate-100 transition"
                                  title="Napisz e-mail"
                                >
                                  <Mail size={13} />
                                </a>
                              )}

                              <button
                                onClick={() => handleCreateLetter(starosta, 'starostowie')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer"
                                title="Wystaw oficjalne pismo A4"
                              >
                                <FileText size={11} />
                                <span>Pismo A4</span>
                              </button>

                              <button
                                onClick={() => handleOpenEditModal(starosta, 'starostowie')}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                title="Edytuj dane"
                              >
                                <Edit3 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* GRID VIEW (Duże karty) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStarostowie.map((starosta) => {
                const isCopied = copiedId === starosta.id;
                const hasPhone = Boolean(starosta.phone);
                const hasEmail = Boolean(starosta.email || starosta.emailPrywatny || starosta.emailUczelniany);
                const primaryEmail = starosta.email || starosta.emailPrywatny || starosta.emailUczelniany || '';

                return (
                  <div
                    key={starosta.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition p-4 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition">
                            {starosta.name}
                          </h3>
                          <div className="text-[11px] font-medium text-blue-700">
                            {starosta.role || 'Starosta Grupy'}
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                            starosta.rodoStatus === 'Zgoda aktywna'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                          title={starosta.rodoStatus}
                        >
                          <ShieldCheck size={11} />
                          <span>{starosta.rodoStatus === 'Zgoda aktywna' ? 'RODO OK' : 'Oczekuje'}</span>
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <GraduationCap size={13} className="text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">{starosta.field}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {starosta.year}
                          </span>
                          <span>•</span>
                          <span>{starosta.semester}</span>
                          {starosta.group && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-blue-900">gr. {starosta.group}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2 text-xs">
                        {hasPhone ? (
                          <div className="flex items-center justify-between text-slate-700">
                            <a
                              href={`tel:${starosta.phone.replace(/\s+/g, '')}`}
                              className="inline-flex items-center gap-1.5 hover:text-blue-700 font-medium font-mono text-[11.5px]"
                            >
                              <Phone size={13} className="text-slate-400" />
                              <span>{starosta.phone}</span>
                            </a>
                            <button
                              onClick={() => handleCopyText(starosta.id, starosta.phone)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                              title="Kopiuj telefon"
                            >
                              {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5">
                            <Phone size={13} className="text-slate-300" />
                            <span>Brak numeru telefonu</span>
                          </div>
                        )}

                        {hasEmail ? (
                          <div className="flex items-center justify-between text-slate-700">
                            <a
                              href={`mailto:${primaryEmail}`}
                              className="inline-flex items-center gap-1.5 hover:text-blue-700 truncate max-w-[210px] text-[11.5px]"
                              title={primaryEmail}
                            >
                              <Mail size={13} className="text-slate-400 shrink-0" />
                              <span className="truncate">{primaryEmail}</span>
                            </a>
                            <button
                              onClick={() => handleCopyText(starosta.id, primaryEmail)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                              title="Kopiuj e-mail"
                            >
                              {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5">
                            <Mail size={13} className="text-slate-300" />
                            <span>Brak adresu e-mail</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenEditModal(starosta, 'starostowie')}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        title="Edytuj dane kontaktu"
                      >
                        <Edit3 size={14} />
                      </button>

                      <div className="flex items-center gap-2">
                        {hasEmail && (
                          <a
                            href={`mailto:${primaryEmail}`}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition inline-flex items-center gap-1"
                          >
                            <Mail size={12} />
                            <span>Napisz</span>
                          </a>
                        )}

                        <button
                          onClick={() => handleCreateLetter(starosta, 'starostowie')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer"
                          title="Wygeneruj oficjalne pismo do tego starosty"
                        >
                          <FileText size={12} />
                          <span>Wystaw pismo A4</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content: Faculty & Authorities ──────────────────────────── */}
      {activeSubTab === 'faculty' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Wyniki: <strong>{filteredFaculty.length}</strong> jednostek i osób decyzyjnych
            </span>
          </div>

          {viewMode === 'table' ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3.5 w-12 text-center">L.p.</th>
                      <th className="py-3 px-4">Imię i nazwisko / Stanowisko</th>
                      <th className="py-3 px-4">Wydział / Jednostka</th>
                      <th className="py-3 px-4">Dyżury & Powiązania</th>
                      <th className="py-3 px-4">Kontakt służbowy</th>
                      <th className="py-3 px-4 text-right">Opcje / Działania</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredFaculty.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-blue-50/40 transition group">
                        <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-900 group-hover:text-blue-900 transition">
                            {item.name}
                          </div>
                          <div className="text-[11px] font-semibold text-blue-800">
                            {item.title}
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="text-slate-800 font-medium flex items-center gap-1.5">
                            <Building2 size={12} className="text-slate-400" />
                            <span>{item.unit}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          {item.dutyHours && (
                            <div className="text-[11px] text-slate-600 flex items-center gap-1">
                              <Clock size={11} className="text-slate-400" />
                              <span>{item.dutyHours}</span>
                            </div>
                          )}
                          {item.relatedFields && (
                            <div className="text-[10.5px] text-slate-500 mt-0.5">
                              {item.relatedFields}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {item.email && (
                            <div className="text-[11px] font-medium text-slate-800 truncate max-w-[180px]">
                              {item.email}
                            </div>
                          )}
                          {item.phone && (
                            <div className="text-[10.5px] font-mono text-slate-500">
                              {item.phone}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.email && (
                              <a
                                href={`mailto:${item.email}`}
                                className="p-1.5 text-slate-600 hover:text-blue-700 rounded-lg hover:bg-slate-100 transition"
                                title="Napisz e-mail"
                              >
                                <Mail size={13} />
                              </a>
                            )}
                            <button
                              onClick={() => handleCreateLetter(item, 'faculty')}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer"
                              title="Wystaw oficjalne pismo A4"
                            >
                              <FileText size={11} />
                              <span>Pismo A4</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(item, 'faculty')}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              title="Edytuj dane"
                            >
                              <Edit3 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFaculty.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition p-4 flex flex-col justify-between group"
                >
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition">
                      {item.name}
                    </h3>
                    <div className="text-xs font-semibold text-blue-800 mt-0.5">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                      <Building2 size={12} className="text-slate-400 shrink-0" />
                      <span>{item.unit}</span>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-150">
                      {item.dutyHours && (
                        <div className="flex items-start gap-1.5 text-[11px]">
                          <Clock size={12} className="text-slate-400 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-slate-700">Dyżury:</strong> {item.dutyHours}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenEditModal(item, 'faculty')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Edit3 size={14} />
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCreateLetter(item, 'faculty')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText size={12} />
                        <span>Wystaw pismo A4</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content: Scientific Clubs ───────────────────────────────── */}
      {activeSubTab === 'clubs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Wyniki: <strong>{filteredClubs.length}</strong> Kół Naukowych
            </span>
          </div>

          {viewMode === 'table' ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3.5 w-16 text-center">ID</th>
                      <th className="py-3 px-4">Nazwa Koła Naukowego</th>
                      <th className="py-3 px-4">Wydział</th>
                      <th className="py-3 px-4">Opiekun Naukowy</th>
                      <th className="py-3 px-4">E-mail Koła</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Opcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredClubs.map((club) => (
                      <tr key={club.id} className="hover:bg-blue-50/40 transition group">
                        <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono text-[10.5px]">
                          {club.id}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 group-hover:text-blue-900 transition">
                          {club.name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {club.faculty}
                        </td>
                        <td className="py-2.5 px-4 text-blue-900 font-medium">
                          {club.supervisor || '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-800">
                          {club.email || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {club.status || 'Aktywne'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {club.email && (
                              <a
                                href={`mailto:${club.email}`}
                                className="p-1.5 text-slate-600 hover:text-blue-700 rounded-lg hover:bg-slate-100 transition"
                                title="Napisz e-mail"
                              >
                                <Mail size={13} />
                              </a>
                            )}
                            <button
                              onClick={() => handleCreateLetter(club, 'clubs')}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer"
                              title="Wystaw oficjalne pismo A4"
                            >
                              <FileText size={11} />
                              <span>Pismo A4</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(club, 'clubs')}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Edit3 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClubs.map((club) => (
                <div
                  key={club.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition p-4 flex flex-col justify-between group"
                >
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                      {club.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition">
                      {club.name}
                    </h3>
                    <div className="mt-2 text-xs text-slate-700 font-medium">
                      {club.faculty}
                    </div>
                    {club.supervisor && (
                      <div className="text-[11px] text-blue-800 mt-1">
                        <strong>Opiekun:</strong> {club.supervisor}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenEditModal(club, 'clubs')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleCreateLetter(club, 'clubs')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <FileText size={12} />
                      <span>Wystaw pismo A4</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── NEW SECTION: NARZĘDZIA & MAILING DO GRUP ─────────────────────── */}
      {activeSubTab === 'mailing' && (
        <div className="space-y-6">
          {/* Header Card for Mailing */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Send size={20} className="text-indigo-600" />
                  <h2 className="text-lg font-bold text-slate-900">
                    Generator Listy Mailingowej Samorządu
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {uniqueActiveEmails.length} unikalnych adresów
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Błyskawiczne przygotowanie adresów do masowej wysyłki (UDW/BCC) do Starostów, Władz lub Kół Naukowych.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyMailingList}
                  disabled={uniqueActiveEmails.length === 0}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 ${
                    mailingCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                  title="Kopiuj gotową listę adresów e-mail do schowka"
                >
                  {mailingCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{mailingCopied ? 'Skopiowano!' : 'Kopiuj e-maile'}</span>
                </button>

                {uniqueActiveEmails.length > 0 && (
                  <a
                    href={`mailto:?bcc=${encodeURIComponent(uniqueActiveEmails.join(','))}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition shadow-2xs"
                    title="Otwórz klienta poczty z adresami w UDW / BCC"
                  >
                    <Send size={13} />
                    <span>Otwórz w poczcie (UDW)</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleExportTxt}
                  disabled={uniqueActiveEmails.length === 0}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Pobierz listę jako plik TXT"
                >
                  <Download size={13} />
                  <span>TXT</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={activeRecipientList.length === 0}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Pobierz zestawienie jako CSV"
                >
                  <FileSpreadsheet size={13} />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Controls Bar: Audience, RODO Filter, Format */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Audience selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Grupa odbiorców:
                </label>
                <select
                  value={mailingAudience}
                  onChange={(e) => {
                    setMailingAudience(e.target.value);
                    setSelectedRecipientIds(new Set());
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
                >
                  <option value="starostowie">Starostowie Grup i Roczników (Wszyscy)</option>
                  <option value="faculty">Władze Uczelni i Dziekanaty</option>
                  <option value="clubs">Koła Naukowe i Opiekunowie</option>
                  <option value="all">Wszyscy adresaci w bazie</option>
                </select>
              </div>

              {/* RODO consent toggle & Field Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Filtr kierunku / RODO:
                </label>
                <div className="flex items-center gap-2">
                  {mailingAudience === 'starostowie' && (
                    <select
                      value={mailingFieldFilter}
                      onChange={(e) => setMailingFieldFilter(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 font-medium focus:outline-none focus:border-indigo-600 grow"
                    >
                      <option value="ALL">Wszystkie kierunki</option>
                      <option value="Administracja">Administracja</option>
                      <option value="Psychologia">Psychologia</option>
                      <option value="Zarządzanie">Zarządzanie</option>
                    </select>
                  )}
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer shrink-0 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                    <input
                      type="checkbox"
                      checked={mailingRodoOnly}
                      onChange={(e) => setMailingRodoOnly(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Tylko ze zgodą RODO</span>
                  </label>
                </div>
              </div>

              {/* Format selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Format separatora:
                </label>
                <div className="inline-flex w-full p-1 rounded-xl bg-slate-100 text-slate-600 text-xs">
                  <button
                    type="button"
                    onClick={() => setMailingFormat('comma')}
                    className={`flex-1 py-1 rounded-lg font-semibold transition ${
                      mailingFormat === 'comma' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
                    }`}
                  >
                    Przecinki (UDW)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMailingFormat('semicolon')}
                    className={`flex-1 py-1 rounded-lg font-semibold transition ${
                      mailingFormat === 'semicolon' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
                    }`}
                  >
                    Średniki (Outlook)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMailingFormat('lines')}
                    className={`flex-1 py-1 rounded-lg font-semibold transition ${
                      mailingFormat === 'lines' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
                    }`}
                  >
                    Linia po linii
                  </button>
                </div>
              </div>
            </div>

            {/* Generated Text Box Preview */}
            <div className="mt-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                Gotowy ciąg adresów do skopiowania do pola UDW/BCC:
              </label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 break-all max-h-28 overflow-y-auto leading-relaxed select-all">
                {formattedMailingString || (
                  <span className="text-slate-400 italic">Brak adresów e-mail spełniających kryteria</span>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Recipient Selection Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Lista adresatów ({activeRecipientList.length} z {mailingCandidates.length} zaznaczonych)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllRecipients}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition cursor-pointer"
                >
                  Zaznacz wszystkich
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAllRecipients}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  Odznacz wszystkich
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider sticky top-0 bg-slate-50 z-10">
                    <th className="py-2.5 px-3.5 w-10 text-center">Wybór</th>
                    <th className="py-2.5 px-4">Imię i nazwisko / Rola</th>
                    <th className="py-2.5 px-4">Kierunek / Jednostka</th>
                    <th className="py-2.5 px-4">Adres e-mail</th>
                    <th className="py-2.5 px-4 text-center">Status RODO</th>
                    <th className="py-2.5 px-4 text-right">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {mailingCandidates.map((candidate) => {
                    const isSelected = selectedRecipientIds.size === 0 || selectedRecipientIds.has(candidate.id);

                    return (
                      <tr
                        key={candidate.id}
                        onClick={() => handleToggleRecipient(candidate.id)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-indigo-50/30 hover:bg-indigo-50/60' : 'bg-slate-50/40 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <td className="py-2 px-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <div className="font-bold text-slate-900">{candidate.name}</div>
                          <div className="text-[11px] text-blue-700">{candidate.role}</div>
                        </td>
                        <td className="py-2 px-4 text-slate-700 font-medium">
                          {candidate.field} {candidate.group && `(gr. ${candidate.group})`}
                        </td>
                        <td className="py-2 px-4 font-mono text-[11px] text-slate-800">
                          {candidate.email}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              candidate.rodoStatus === 'Zgoda aktywna' || candidate.rodoStatus?.includes('Zgoda')
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            <ShieldCheck size={11} />
                            <span>{candidate.rodoStatus}</span>
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right">
                          <a
                            href={`mailto:${candidate.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-slate-400 hover:text-indigo-700 rounded transition inline-flex items-center gap-1"
                            title="Napisz indywidualnie"
                          >
                            <Mail size={13} />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Contact Modal ────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {modalMode === 'add' ? 'Dodaj nowy kontakt' : 'Edycja kontaktu'}
                </h2>
                <p className="text-xs text-slate-500">
                  Kategoria:{' '}
                  <strong>
                    {editingCategory === 'starostowie'
                      ? 'Starostowie Grup i Roczników'
                      : editingCategory === 'faculty'
                      ? 'Władze Uczelni i Dziekanaty'
                      : 'Koła Naukowe'}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Imię i nazwisko / Nazwa jednostki *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="np. Jan Kowalski lub Prodziekan ds. Studenckich"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                  />
                </div>

                {editingCategory === 'starostowie' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Rola
                      </label>
                      <input
                        type="text"
                        value={formData.role || ''}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        placeholder="Starosta Grupy / Starosta Roku"
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Kierunek
                      </label>
                      <input
                        type="text"
                        value={formData.field || ''}
                        onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                        placeholder="np. Psychologia, Administracja..."
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Rok i Semestr
                      </label>
                      <input
                        type="text"
                        value={formData.year || ''}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        placeholder="np. II rok, Semestr 3"
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Oznaczenie grupy
                      </label>
                      <input
                        type="text"
                        value={formData.group || ''}
                        onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                        placeholder="np. 5-1 lub PS_PS 6-1"
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                  </>
                )}

                {editingCategory === 'faculty' && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Stanowisko / Tytuł
                      </label>
                      <input
                        type="text"
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="np. Prodziekan ds. Jakości Kształcenia"
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Wydział / Jednostka
                      </label>
                      <input
                        type="text"
                        value={formData.unit || ''}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        placeholder="np. Wydział Psychologii"
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                  </>
                )}

                {editingCategory === 'clubs' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Wydział
                      </label>
                      <input
                        type="text"
                        value={formData.faculty || ''}
                        onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                        placeholder="Wydział Psychologii"
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Opiekun Naukowy
                      </label>
                      <input
                        type="text"
                        value={formData.supervisor || ''}
                        onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                        placeholder="np. dr Jan Kowalski"
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email || formData.emailPrywatny || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email: e.target.value,
                        emailPrywatny: e.target.value,
                      })
                    }
                    placeholder="kontakt@wskz.pl"
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+48 123 456 789"
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                {editingCategory === 'starostowie' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Status zgody RODO
                    </label>
                    <select
                      value={formData.rodoStatus || 'Zgoda aktywna'}
                      onChange={(e) => setFormData({ ...formData, rodoStatus: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-medium"
                    >
                      <option value="Zgoda aktywna">Zgoda aktywna</option>
                      <option value="Oczekuje na podpis">Oczekuje na podpis</option>
                      <option value="Wstrzymana">Wstrzymana</option>
                    </select>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Uwagi / Notatki kancelaryjne
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes || formData.description || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notes: e.target.value,
                        description: e.target.value,
                      })
                    }
                    placeholder="Dodatkowe informacje..."
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1e3a8a] hover:bg-[#1d4ed8] shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={13} />
                  <span>Zapisz kontakt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
