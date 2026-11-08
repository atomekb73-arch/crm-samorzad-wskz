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
  const [activeSubTab, setActiveSubTab] = useState('starostowie'); // 'starostowie' | 'faculty' | 'clubs'
  const [searchTerm, setSearchTerm] = useState('');
  const [fieldFilter, setFieldFilter] = useState('ALL');
  const [rodoFilter, setRodoFilter] = useState('ALL');
  const [facultyFilter, setFacultyFilter] = useState('ALL');

  // Contact list state loaded from SSOT / localStorage
  const [contactsData, setContactsData] = useState(() => getLocalContacts());

  // Copy-to-clipboard toast/feedback per item
  const [copiedId, setCopiedId] = useState(null);

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

  // Open Add modal
  const handleOpenAddModal = (category = activeSubTab) => {
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

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
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
              onClick={() => handleOpenAddModal(activeSubTab)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1e3a8a] hover:bg-[#1d4ed8] shadow-xs transition cursor-pointer"
            >
              <Plus size={15} />
              <span>Dodaj kontakt</span>
            </button>
          </div>
        </div>

        {/* ── Sub-navigation Switcher ─────────────────────────────────────── */}
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

      {/* ── Search and Filter Controls ──────────────────────────────────── */}
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
              {/* Field Filter */}
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

              {/* RODO Filter */}
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

      {/* ── Tab Content: Starostowie ─────────────────────────────────────── */}
      {activeSubTab === 'starostowie' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Wyniki: <strong>{filteredStarostowie.length}</strong> starostów
            </span>
            <span className="text-slate-400">
              Szybka akcja: kliknij <strong>Wystaw pismo A4</strong>, aby wygenerować oficjalny dokument z tym adresatem
            </span>
          </div>

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
                    {/* Header Card: Name & Role Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition">
                            {starosta.name}
                          </h3>
                        </div>
                        <div className="text-[11px] font-medium text-blue-700">
                          {starosta.role || 'Starosta Grupy'}
                        </div>
                      </div>

                      {/* RODO Badge */}
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

                    {/* Academic info pill list */}
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

                    {/* Contact Channels */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2 text-xs">
                      {/* Phone */}
                      {hasPhone ? (
                        <div className="flex items-center justify-between text-slate-700">
                          <a
                            href={`tel:${starosta.phone.replace(/\s+/g, '')}`}
                            className="inline-flex items-center gap-1.5 hover:text-blue-700 font-medium"
                          >
                            <Phone size={13} className="text-slate-400" />
                            <span>{starosta.phone}</span>
                          </a>
                          <button
                            onClick={() => handleCopyText(starosta.id, starosta.phone)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                            title="Kopiuj numer telefonu"
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

                      {/* Email */}
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
                            title="Kopiuj adres e-mail"
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

                      {/* Notes snippet */}
                      {starosta.notes && (
                        <div className="mt-1 text-[10.5px] text-slate-500 line-clamp-2 bg-slate-50 p-1.5 rounded-lg border border-slate-150">
                          {starosta.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
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
        </div>
      )}

      {/* ── Tab Content: Faculty & Authorities ──────────────────────────── */}
      {activeSubTab === 'faculty' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Wyniki: <strong>{filteredFaculty.length}</strong> jednostek i osób decyzyjnych
            </span>
            <span className="text-slate-400">
              Szybka akcja: kliknij <strong>Wystaw pismo A4</strong>, aby skierować oficjalne wystąpienie do danego Dziekana lub Biura
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFaculty.map((item) => {
              const isCopied = copiedId === item.id;
              const hasPhone = Boolean(item.phone);
              const hasEmail = Boolean(item.email);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition p-4 flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: Title & Name */}
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
                    </div>

                    {/* Duty hours / powiązane kierunki */}
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-150">
                      {item.dutyHours && (
                        <div className="flex items-start gap-1.5 text-[11px]">
                          <Clock size={12} className="text-slate-400 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-slate-700">Dyżury:</strong> {item.dutyHours}
                          </span>
                        </div>
                      )}
                      {item.relatedFields && (
                        <div className="text-[11px] text-slate-500">
                          <strong className="text-slate-700">Kierunki:</strong> {item.relatedFields}
                        </div>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="mt-3.5 space-y-2 text-xs">
                      {hasEmail ? (
                        <div className="flex items-center justify-between text-slate-700">
                          <a
                            href={`mailto:${item.email}`}
                            className="inline-flex items-center gap-1.5 hover:text-blue-700 truncate max-w-[210px] text-[11.5px] font-medium"
                          >
                            <Mail size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate">{item.email}</span>
                          </a>
                          <button
                            onClick={() => handleCopyText(item.id, item.email)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                            title="Kopiuj adres e-mail"
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

                      {hasPhone && (
                        <div className="flex items-center justify-between text-slate-700">
                          <a
                            href={`tel:${item.phone.replace(/\s+/g, '')}`}
                            className="inline-flex items-center gap-1.5 hover:text-blue-700 font-medium"
                          >
                            <Phone size={13} className="text-slate-400" />
                            <span>{item.phone}</span>
                          </a>
                          <button
                            onClick={() => handleCopyText(item.id, item.phone)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                            title="Kopiuj telefon"
                          >
                            {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenEditModal(item, 'faculty')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      title="Edytuj dane kontaktu"
                    >
                      <Edit3 size={14} />
                    </button>

                    <div className="flex items-center gap-2">
                      {hasEmail && (
                        <a
                          href={`mailto:${item.email}`}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition inline-flex items-center gap-1"
                        >
                          <Mail size={12} />
                          <span>Napisz</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleCreateLetter(item, 'faculty')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer"
                        title="Wygeneruj oficjalne pismo A4 do tej jednostki"
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
        </div>
      )}

      {/* ── Tab Content: Scientific Clubs ───────────────────────────────── */}
      {activeSubTab === 'clubs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Wyniki: <strong>{filteredClubs.length}</strong> Kół Naukowych
            </span>
            <span className="text-slate-400">
              Szybka akcja: kliknij <strong>Wystaw pismo A4</strong>, aby wygenerować formalne zapytanie lub uchwałę Samorządu
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClubs.map((club) => {
              const isCopied = copiedId === club.id;
              const hasEmail = Boolean(club.email);

              return (
                <div
                  key={club.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition p-4 flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: Name & ID */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                          {club.id}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition">
                          {club.name}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        {club.status || 'Aktywne'}
                      </span>
                    </div>

                    {/* Faculty and Supervisor */}
                    <div className="mt-2.5 space-y-1 text-xs">
                      <div className="text-[11.5px] font-semibold text-slate-700">
                        {club.faculty}
                      </div>
                      {club.supervisor && (
                        <div className="text-[11px] text-blue-800">
                          <strong>Opiekun naukowy:</strong> {club.supervisor}
                        </div>
                      )}
                    </div>

                    {/* Description snippet */}
                    {club.description && (
                      <p className="mt-2.5 text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-xl border border-slate-150">
                        {club.description}
                      </p>
                    )}

                    {/* Contact Email */}
                    <div className="mt-3.5 space-y-1 text-xs">
                      {hasEmail ? (
                        <div className="flex items-center justify-between text-slate-700">
                          <a
                            href={`mailto:${club.email}`}
                            className="inline-flex items-center gap-1.5 hover:text-blue-700 truncate max-w-[210px] text-[11.5px] font-medium"
                          >
                            <Mail size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate">{club.email}</span>
                          </a>
                          <button
                            onClick={() => handleCopyText(club.id, club.email)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                            title="Kopiuj adres e-mail"
                          >
                            {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5">
                          <Mail size={13} className="text-slate-300" />
                          <span>E-mail koła w toku nadawania</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenEditModal(club, 'clubs')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      title="Edytuj dane koła"
                    >
                      <Edit3 size={14} />
                    </button>

                    <div className="flex items-center gap-2">
                      {hasEmail && (
                        <a
                          href={`mailto:${club.email}`}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition inline-flex items-center gap-1"
                        >
                          <Mail size={12} />
                          <span>Napisz</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleCreateLetter(club, 'clubs')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer"
                        title="Wygeneruj oficjalne pismo A4 do tego koła"
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
        </div>
      )}

      {/* ── Add / Edit Contact Modal ────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
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

            {/* Modal Form */}
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
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Godziny dyżurów
                      </label>
                      <input
                        type="text"
                        value={formData.dutyHours || ''}
                        onChange={(e) => setFormData({ ...formData, dutyHours: e.target.value })}
                        placeholder="np. Czwartki 16:00–18:00 (MS Teams)"
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

              {/* Modal Actions */}
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
