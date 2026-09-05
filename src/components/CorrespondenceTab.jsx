import React, { useState, useMemo } from 'react';
import {
  Mail,
  Search,
  Filter,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  FileText,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Download,
  Share2,
  Calendar,
  Building,
  User,
  Hash,
  ShieldCheck,
} from 'lucide-react';

export default function CorrespondenceTab({
  correspondence = [],
  onAddCorrespondence = () => {},
  selectedItem = null,
  onSelectItem = () => {},
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, IN, OUT
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, Zatwierdzone, W toku, Weryfikacja
  const [activeDrawerItem, setActiveDrawerItem] = useState(selectedItem);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for adding new correspondence
  const [newEntry, setNewEntry] = useState({
    direction: 'IN',
    sender: '',
    recipient: '',
    subject: '',
    summary: '',
    status: 'W toku',
    statusUjednolicenia: 'W trakcie',
    weryfikacjaFormalna: 'Weryfikacja',
    sourceCitation: '',
    notes: '',
  });

  // Filtered correspondence
  const filteredList = useMemo(() => {
    return correspondence.filter(item => {
      // Type filter
      if (typeFilter !== 'ALL' && item.direction !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Zatwierdzone' && item.status !== 'Zatwierdzone') return false;
        if (statusFilter === 'W toku' && item.status !== 'W toku') return false;
        if (statusFilter === 'Weryfikacja' && item.weryfikacjaFormalna !== 'Weryfikacja' && item.status !== 'Weryfikacja') return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const searchable = `${item.id || ''} ${item.subject || ''} ${item.sender || ''} ${item.recipient || ''} ${item.summary || ''} ${item.sourceCitation || ''}`.toLowerCase();
        if (!searchable.includes(term)) return false;
      }

      return true;
    });
  }, [correspondence, typeFilter, statusFilter, searchTerm]);

  const handleOpenDrawer = (item) => {
    setActiveDrawerItem(item);
    onSelectItem(item);
  };

  const handleCloseDrawer = () => {
    setActiveDrawerItem(null);
    onSelectItem(null);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newEntry.subject || !newEntry.sender) return;

    const nextId = `KANC/SAM/${newEntry.direction}/${String(correspondence.length + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
    const entryToSave = {
      ...newEntry,
      id: nextId,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      attachments: [],
      hash: `${nextId}_${Date.now()}`,
    };

    onAddCorrespondence(entryToSave);
    setIsAddModalOpen(false);
    setNewEntry({
      direction: 'IN',
      sender: '',
      recipient: '',
      subject: '',
      summary: '',
      status: 'W toku',
      statusUjednolicenia: 'W trakcie',
      weryfikacjaFormalna: 'Weryfikacja',
      sourceCitation: '',
      notes: '',
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Top Header & Actions ────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-900">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mail className="text-[#1e3a8a]" size={20} />
            Dziennik Korespondencji Kancelarii Samorządu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Oficjalny rejestr pism przychodzących i wychodzących z weryfikacją formalną i statusem ujednolicenia
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Zarejestruj pismo</span>
          </button>
        </div>
      </div>

      {/* ── Filters and Search Bar ───────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Szukaj po sygnaturze, temacie, nadawcy, odbiorcy lub cytacie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1e3a8a] transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium border border-slate-200">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                typeFilter === 'ALL' ? 'bg-[#1e3a8a] font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Wszystkie
            </button>
            <button
              onClick={() => setTypeFilter('IN')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                typeFilter === 'IN' ? 'bg-blue-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <ArrowDownLeft size={12} /> Wchodzące
            </button>
            <button
              onClick={() => setTypeFilter('OUT')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                typeFilter === 'OUT' ? 'bg-emerald-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <ArrowUpRight size={12} /> Wychodzące
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium border border-slate-200">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-[#1e3a8a] font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Status: Wszystkie
            </button>
            <button
              onClick={() => setStatusFilter('Zatwierdzone')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'Zatwierdzone' ? 'bg-emerald-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Zatwierdzone
            </button>
            <button
              onClick={() => setStatusFilter('W toku')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'W toku' ? 'bg-amber-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              W toku
            </button>
            <button
              onClick={() => setStatusFilter('Weryfikacja')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'Weryfikacja' ? 'bg-sky-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weryfikacja
            </button>
          </div>
        </div>
      </div>

      {/* ── Correspondence Data Table ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Sygnatura</th>
                <th className="py-3 px-3">Data wpływu</th>
                <th className="py-3 px-3">Typ</th>
                <th className="py-3 px-4">Nadawca</th>
                <th className="py-3 px-4">Odbiorca / DW</th>
                <th className="py-3 px-4">Temat</th>
                <th className="py-3 px-3">Status Ujednolicenia</th>
                <th className="py-3 px-3">Weryfikacja Formalna</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Brak zarejestrowanych wpisów w Kancelarii
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isIncoming = item.direction === 'IN';
                  const isSelected = activeDrawerItem?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenDrawer(item)}
                      className={`hover:bg-slate-50/80 transition cursor-pointer ${
                        isSelected ? 'bg-blue-50/60 font-semibold' : ''
                      }`}
                    >
                      {/* Sygnatura */}
                      <td className="py-3 px-4 font-mono font-bold text-[#1e3a8a] whitespace-nowrap">
                        {item.id}
                      </td>

                      {/* Data wpływu */}
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {item.date}
                      </td>

                      {/* Typ (Badge) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isIncoming ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <ArrowDownLeft size={12} /> Wchodzące
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <ArrowUpRight size={12} /> Wychodzące
                          </span>
                        )}
                      </td>

                      {/* Nadawca */}
                      <td className="py-3 px-4 text-slate-700 max-w-[180px] truncate" title={item.sender}>
                        {item.sender}
                      </td>

                      {/* Odbiorca/DW */}
                      <td className="py-3 px-4 text-slate-700 max-w-[180px] truncate" title={item.recipient}>
                        {item.recipient}
                      </td>

                      {/* Temat */}
                      <td className="py-3 px-4 text-slate-900 font-medium max-w-[260px] truncate" title={item.subject}>
                        {item.subject}
                      </td>

                      {/* Status Ujednolicenia */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          item.statusUjednolicenia === 'Ujednolicone'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : item.statusUjednolicenia === 'W trakcie'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {item.statusUjednolicenia || item.status || 'Ujednolicone'}
                        </span>
                      </td>

                      {/* Weryfikacja Formalna */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          item.weryfikacjaFormalna === 'Zatwierdzone' || item.weryfikacjaFormalna === 'Zgodna ze statutem'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-sky-50 text-sky-800 border border-sky-200'
                        }`}>
                          <ShieldCheck size={12} />
                          {item.weryfikacjaFormalna || 'Zatwierdzone'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="py-2.5 px-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Wyświetlono <strong className="text-slate-900">{filteredList.length}</strong> z <strong className="text-slate-900">{correspondence.length}</strong> zarejestrowanych pism</span>
          <span className="text-[11px] text-slate-400">Kliknij dowolny wiersz, aby otworzyć panel sprawy</span>
        </div>
      </div>

      {/* ── Slide-over Drawer: Szczegóły sprawy i cytaty źródłowe ─────────── */}
      {activeDrawerItem && (
        <div className="fixed inset-0 z-50 overflow-hidden print:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={handleCloseDrawer}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200">
              
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {activeDrawerItem.id}
                    </span>
                    {activeDrawerItem.direction === 'IN' ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Wchodzące
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Wychodzące
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {activeDrawerItem.subject}
                  </h3>
                </div>

                <button
                  onClick={handleCloseDrawer}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-medium">Data wpływu/wysłania:</span>
                    <p className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Calendar size={13} className="text-slate-400" /> {activeDrawerItem.date}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Status sprawy:</span>
                    <p className="font-semibold text-indigo-700 mt-0.5">
                      {activeDrawerItem.status || 'W toku'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Nadawca:</span>
                    <p className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Building size={13} className="text-slate-400" /> {activeDrawerItem.sender}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Odbiorca:</span>
                    <p className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <User size={13} className="text-slate-400" /> {activeDrawerItem.recipient}
                    </p>
                  </div>
                </div>

                {/* Streszczenie / Treść sprawy */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FileText size={14} className="text-indigo-600" /> Streszczenie sprawy / Pełna treść
                  </h4>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-700 leading-relaxed">
                    {activeDrawerItem.summary || 'Brak dodatkowego streszczenia sprawy.'}
                  </div>
                </div>

                {/* Cytat źródłowy / Podstawa prawna */}
                {activeDrawerItem.sourceCitation && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Paperclip size={14} className="text-indigo-600" /> Cytat źródłowy / Oznaczenie pisma
                    </h4>
                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-indigo-900 font-mono text-[11px]">
                      &ldquo;{activeDrawerItem.sourceCitation}&rdquo;
                    </div>
                  </div>
                )}

                {/* Notatki kancelaryjne */}
                {activeDrawerItem.notes && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-amber-600" /> Dyspozycje i notatki kancelaryjne
                    </h4>
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 text-amber-900">
                      {activeDrawerItem.notes}
                    </div>
                  </div>
                )}

                {/* Załączniki */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Paperclip size={14} className="text-slate-500" /> Załączniki do sprawy
                  </h4>
                  <div className="space-y-1.5">
                    {(activeDrawerItem.attachments && activeDrawerItem.attachments.length > 0) ? (
                      activeDrawerItem.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700"
                        >
                          <span className="font-mono text-xs truncate max-w-xs">{att}</span>
                          <span className="text-[11px] text-indigo-600 font-semibold cursor-pointer hover:underline">
                            Pobierz
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic">Brak zarejestrowanych załączników cyfrowych.</p>
                    )}
                  </div>
                </div>

                {/* Sygnatura cyfrowa & Audit Trail */}
                <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200 text-[10.5px] text-slate-500 space-y-1">
                  <p><strong className="text-slate-700">Identyfikator cyfrowy:</strong> {activeDrawerItem.hash || activeDrawerItem.id}</p>
                  <p><strong className="text-slate-700">Zarejestrowano w:</strong> Kancelaria Samorządu Studenckiego WSKZ</p>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
                <button
                  onClick={handleCloseDrawer}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Zamknij
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => alert(`Sprawa ${activeDrawerItem.id} została pomyślnie zarchiwizowana.`)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white shadow-xs transition cursor-pointer"
                  >
                    Drukuj / Eksportuj PDF
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Rejestracja Nowego Pisma ──────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-[#1e3a8a]" />
                Rejestracja nowego pisma w Dzienniku Korespondencji
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kierunek pisma</label>
                  <select
                    value={newEntry.direction}
                    onChange={(e) => setNewEntry({ ...newEntry, direction: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="IN">Wchodzące (Wpływ do Kancelarii)</option>
                    <option value="OUT">Wychodzące (Wysłane z Kancelarii)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status sprawy</label>
                  <select
                    value={newEntry.status}
                    onChange={(e) => setNewEntry({ ...newEntry, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="W toku">W toku</option>
                    <option value="Zatwierdzone">Zatwierdzone</option>
                    <option value="Weryfikacja">Weryfikacja formalna</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nadawca *</label>
                  <input
                    type="text"
                    required
                    placeholder="np. Dziekanat WNS / Koło Naukowe"
                    value={newEntry.sender}
                    onChange={(e) => setNewEntry({ ...newEntry, sender: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                  </input>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Odbiorca / DW *</label>
                  <input
                    type="text"
                    required
                    placeholder="np. Kancelaria Samorządu Studenckiego WSKZ"
                    value={newEntry.recipient}
                    onChange={(e) => setNewEntry({ ...newEntry, recipient: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                  </input>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Temat sprawy *</label>
                <input
                  type="text"
                  required
                  placeholder="Krótki, precyzyjny tytuł pisma lub wniosku"
                  value={newEntry.subject}
                  onChange={(e) => setNewEntry({ ...newEntry, subject: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                >
                </input>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Streszczenie / Treść</label>
                <textarea
                  rows={3}
                  placeholder="Kluczowe ustalenia, opis sprawy, wnioski..."
                  value={newEntry.summary}
                  onChange={(e) => setNewEntry({ ...newEntry, summary: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cytat źródłowy / Sygnatura oryginału</label>
                  <input
                    type="text"
                    placeholder="np. Pismo D-WNS/412/2026"
                    value={newEntry.sourceCitation}
                    onChange={(e) => setNewEntry({ ...newEntry, sourceCitation: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status ujednolicenia</label>
                  <select
                    value={newEntry.statusUjednolicenia}
                    onChange={(e) => setNewEntry({ ...newEntry, statusUjednolicenia: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="Ujednolicone">Ujednolicone</option>
                    <option value="W trakcie">W trakcie</option>
                    <option value="Wymaga uzupełnienia">Wymaga uzupełnienia</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-semibold bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white shadow-xs transition"
                >
                  Zarejestruj pismo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
