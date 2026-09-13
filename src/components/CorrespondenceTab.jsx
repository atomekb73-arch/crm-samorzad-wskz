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
  Sparkles,
  Zap,
  Check,
} from 'lucide-react';

export default function CorrespondenceTab({
  correspondence = [],
  onAddCorrespondence = () => {},
  onChangeStatus = () => {},
  onRefreshData = () => {},
  selectedItem = null,
  onSelectItem = () => {},
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, IN, OUT
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, Zatwierdzone, W toku, Weryfikacja
  const [activeDrawerItem, setActiveDrawerItem] = useState(selectedItem);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('parser'); // 'parser' | 'form'
  const [rawPastedText, setRawPastedText] = useState('');
  const [parseNotice, setParseNotice] = useState(null);

  // Form state for adding new correspondence
  const [newEntry, setNewEntry] = useState({
    direction: 'IN',
    sender: '',
    recipient: 'Kancelaria Samorządu Studenckiego WSKZ',
    subject: '',
    summary: '',
    status: 'W toku',
    statusUjednolicenia: 'W trakcie',
    weryfikacjaFormalna: 'Weryfikacja',
    sourceCitation: '',
    lokalizacjaDrive: '',
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

  const handleParsePastedText = () => {
    if (!rawPastedText.trim()) return;

    const text = rawPastedText.trim();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    let detectedSender = '';
    let detectedRecipient = 'Kancelaria Samorządu Studenckiego WSKZ';
    let detectedSubject = '';
    let detectedSignature = '';
    let detectedDirection = 'IN';
    let detectedStatus = 'W toku';
    let bodyLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Nadawca / Od / From / Zgłaszający / Wnioskodawca
      const senderMatch = line.match(/^(?:Od|Nadawca|From|Zgłaszający|Wnioskodawca|Autor)\s*[:\-]\s*(.+)$/i);
      if (senderMatch) {
        detectedSender = senderMatch[1].trim();
        continue;
      }

      // Odbiorca / Do / To / Adresat / DW
      const recipientMatch = line.match(/^(?:Do|Odbiorca|To|Adresat|DW|Otrzymują)\s*[:\-]\s*(.+)$/i);
      if (recipientMatch) {
        detectedRecipient = recipientMatch[1].trim();
        continue;
      }

      // Temat / Dotyczy / Subject / Re / Tytuł / Przedmiot
      const subjectMatch = line.match(/^(?:Temat|Dotyczy|Subject|Re|Tytuł|Przedmiot)\s*[:\-]\s*(.+)$/i);
      if (subjectMatch) {
        detectedSubject = subjectMatch[1].trim();
        continue;
      }

      // Sygnatura / Znak sprawy / Ref / Numer
      const sigMatch = line.match(/^(?:Sygnatura|Znak(?:\s+sprawy)?|Sygn\.?|Ref\.?|Numer(?:\s+pisma)?)\s*[:\-]\s*([A-Za-z0-9\/\-_\.\s]+)$/i);
      if (sigMatch) {
        detectedSignature = sigMatch[1].trim();
        continue;
      }

      // Status
      const statusMatch = line.match(/^(?:Status)\s*[:\-]\s*(.+)$/i);
      if (statusMatch) {
        const rawStatus = statusMatch[1].trim();
        if (/zatwierdz/i.test(rawStatus)) detectedStatus = 'Zatwierdzone';
        else if (/weryfikac/i.test(rawStatus)) detectedStatus = 'Weryfikacja';
        else detectedStatus = 'W toku';
        continue;
      }

      bodyLines.push(line);
    }

    // Heurystyka: wykrycie sygnatury w treści (np. DK/2026/..., D-WNS/412/2026, KSS/2026/01)
    if (!detectedSignature) {
      const inlineSigMatch = text.match(/\b([A-Z]{2,6}\/[0-9]{4}\/[0-9]{1,4}(?:\/[0-9]{1,4})?|[A-Z]{1,4}-[A-Z0-9]+\/[0-9]{1,4}\/[0-9]{4})\b/);
      if (inlineSigMatch) {
        detectedSignature = inlineSigMatch[1];
      }
    }

    // Heurystyka: temat z pierwszej linii jeśli nie wykryto etykiety
    if (!detectedSubject && bodyLines.length > 0) {
      detectedSubject = bodyLines[0];
      bodyLines = bodyLines.slice(1);
    }

    // Heurystyka: nadawca ze słów kluczowych
    if (!detectedSender) {
      if (/dziekanat/i.test(text)) detectedSender = 'Dziekanat WSKZ';
      else if (/rektor|prorektor/i.test(text)) detectedSender = 'Rektorat WSKZ';
      else if (/kwestura|płatnośc/i.test(text)) detectedSender = 'Kwestura WSKZ';
      else if (/samorząd/i.test(text)) detectedSender = 'Zarząd Samorządu Studenckiego';
      else detectedSender = 'Dziekanat / Koło Naukowe';
    }

    // Heurystyka: kierunek pisma
    if (/kancelaria samorządu|zarząd samorządu|prezydium samorządu/i.test(detectedSender) || /wychodzące|wysłano z kancelarii/i.test(text)) {
      detectedDirection = 'OUT';
      if (detectedRecipient === 'Kancelaria Samorządu Studenckiego WSKZ') {
        detectedRecipient = 'Dziekanat / Organy Uczelni';
      }
    }

    const bodySummary = bodyLines.join('\n\n').trim();

    setNewEntry(prev => ({
      ...prev,
      direction: detectedDirection,
      sender: detectedSender,
      recipient: detectedRecipient,
      subject: detectedSubject,
      summary: bodySummary || prev.summary,
      sourceCitation: detectedSignature || prev.sourceCitation,
      status: detectedStatus,
    }));

    setParseNotice('Pomyślnie rozpoznano dane pisma! Zweryfikuj i uzupełnij poniższe pola.');
    setModalMode('form');
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newEntry.subject || !newEntry.sender) return;

    const typ = newEntry.direction === 'OUT' ? 'Wychodzące' : 'Wchodzące';
    const nextId = `DK/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(correspondence.length + 1).padStart(2, '0')}`;
    const entryToSave = {
      action: "zarejestruj_pismo",
      sygnatura: nextId,
      id: nextId,
      typ,
      direction: newEntry.direction,
      nadawca: newEntry.sender,
      sender: newEntry.sender,
      odbiorca: newEntry.recipient || (newEntry.direction === 'OUT' ? 'Dziekanat / Samorząd' : 'Kancelaria Samorządu Studenckiego WSKZ'),
      recipient: newEntry.recipient || (newEntry.direction === 'OUT' ? 'Dziekanat / Samorząd' : 'Kancelaria Samorządu Studenckiego WSKZ'),
      przedmiot: newEntry.subject,
      subject: newEntry.subject,
      status: newEntry.status || "W toku",
      statusUjednolicenia: newEntry.status || "W toku",
      weryfikacjaFormalna: "Zatwierdzone",
      lokalizacjaDrive: newEntry.lokalizacjaDrive || "",
      summary: newEntry.summary,
      notes: newEntry.notes,
      sourceCitation: newEntry.sourceCitation,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      attachments: newEntry.lokalizacjaDrive ? [{ name: 'Dokument Google Drive', url: newEntry.lokalizacjaDrive }] : [],
      hash: `${nextId}_${Date.now()}`,
    };

    onAddCorrespondence(entryToSave);
    setIsAddModalOpen(false);
    setParseNotice(null);
    setRawPastedText('');
    setModalMode('parser');
    setNewEntry({
      direction: 'IN',
      sender: '',
      recipient: 'Kancelaria Samorządu Studenckiego WSKZ',
      subject: '',
      summary: '',
      status: 'W toku',
      statusUjednolicenia: 'W trakcie',
      weryfikacjaFormalna: 'Weryfikacja',
      sourceCitation: '',
      lokalizacjaDrive: '',
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
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-500 transition"
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
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl text-xs font-medium border border-slate-300">
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
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl text-xs font-medium border border-slate-300">
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
              <tr className="bg-slate-100/90 border-b border-slate-300 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
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
            <tbody className="divide-y divide-slate-200">
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
                      className={`hover:bg-slate-50 transition cursor-pointer ${
                        isSelected ? 'bg-blue-50/70 font-semibold' : ''
                      }`}
                    >
                      {/* Sygnatura */}
                      <td className="py-3 px-4 font-mono font-bold text-[#1e3a8a] whitespace-nowrap">
                        {item.id}
                      </td>

                      {/* Data wpływu */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-medium">
                        {item.date}
                      </td>

                      {/* Typ (Badge) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isIncoming ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                            <ArrowDownLeft size={12} /> Wchodzące
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <ArrowUpRight size={12} /> Wychodzące
                          </span>
                        )}
                      </td>

                      {/* Nadawca */}
                      <td className="py-3 px-4 text-slate-800 font-medium max-w-[180px] truncate" title={item.sender}>
                        {item.sender}
                      </td>

                      {/* Odbiorca/DW */}
                      <td className="py-3 px-4 text-slate-800 font-medium max-w-[180px] truncate" title={item.recipient}>
                        {item.recipient}
                      </td>

                      {/* Temat */}
                      <td className="py-3 px-4 text-slate-900 font-semibold max-w-[260px] truncate" title={item.subject}>
                        {item.subject}
                      </td>

                      {/* Status Ujednolicenia */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                          item.statusUjednolicenia === 'Ujednolicone' || item.status === 'Zatwierdzone'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : item.statusUjednolicenia === 'W trakcie' || item.status === 'W toku'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}>
                          {item.statusUjednolicenia || item.status || 'Ujednolicone'}
                        </span>
                      </td>

                      {/* Weryfikacja Formalna */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                          item.weryfikacjaFormalna === 'Zatwierdzone' || item.weryfikacjaFormalna === 'Zgodna ze statutem'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-sky-100 text-sky-800 border border-sky-300'
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
              <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-[#1e3a8a] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                      {activeDrawerItem.id}
                    </span>
                    {activeDrawerItem.direction === 'IN' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                        Wchodzące
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
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
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-medium">Data wpływu/wysłania:</span>
                    <p className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Calendar size={13} className="text-slate-400" /> {activeDrawerItem.date}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Status sprawy:</span>
                    <div className="mt-0.5 flex items-center gap-2">
                      <select
                        value={activeDrawerItem.status || 'W toku'}
                        onChange={(e) => {
                          const newSt = e.target.value;
                          setActiveDrawerItem(prev => ({ ...prev, status: newSt }));
                          onChangeStatus(activeDrawerItem.id || activeDrawerItem.sygnatura, newSt);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-800 shadow-2xs focus:ring-2 focus:ring-[#1e3a8a]/20 cursor-pointer"
                      >
                        <option value="W toku">W toku</option>
                        <option value="Zatwierdzone">Zatwierdzone</option>
                        <option value="Weryfikacja">Weryfikacja</option>
                        <option value="Przekazano wg właściwości">Przekazano wg właściwości</option>
                        <option value="Zakończone">Zakończone</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Nadawca:</span>
                    <p className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Building size={13} className="text-slate-400" /> {activeDrawerItem.sender}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Odbiorca:</span>
                    <p className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <User size={13} className="text-slate-400" /> {activeDrawerItem.recipient}
                    </p>
                  </div>
                </div>

                {/* Streszczenie / Treść sprawy */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FileText size={14} className="text-[#1e3a8a]" /> Streszczenie sprawy / Pełna treść
                  </h4>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed">
                    {activeDrawerItem.summary || 'Brak dodatkowego streszczenia sprawy.'}
                  </div>
                </div>

                {/* Cytat źródłowy / Podstawa prawna */}
                {activeDrawerItem.sourceCitation && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Paperclip size={14} className="text-[#1e3a8a]" /> Cytat źródłowy / Oznaczenie pisma
                    </h4>
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-[#1e3a8a] font-mono text-[11px]">
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
                    <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-900">
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
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium"
                        >
                          <span className="font-mono text-xs truncate max-w-xs">{att}</span>
                          <span className="text-[11px] text-[#1e3a8a] font-semibold cursor-pointer hover:underline">
                            Pobierz
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 italic">Brak zarejestrowanych załączników cyfrowych.</p>
                    )}
                  </div>
                </div>

                {/* Sygnatura cyfrowa & Audit Trail */}
                <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200 text-[10.5px] text-slate-600 space-y-1">
                  <p><strong className="text-slate-800">Identyfikator cyfrowy:</strong> {activeDrawerItem.hash || activeDrawerItem.id}</p>
                  <p><strong className="text-slate-800">Zarejestrowano w:</strong> Kancelaria Samorządu Studenckiego WSKZ</p>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
                <button
                  onClick={handleCloseDrawer}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-white flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-[#1e3a8a]" />
                Rejestracja nowego pisma w Dzienniku Korespondencji
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setParseNotice(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Segmented Switcher */}
            <div className="px-5 pt-4 pb-2 bg-white">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => setModalMode('parser')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    modalMode === 'parser'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles size={14} className={modalMode === 'parser' ? 'text-blue-600' : 'text-slate-400'} />
                  <span>📋 Wklej i Rozpoznaj (Parser)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('form')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    modalMode === 'form'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>✍️ Formularz ręczny</span>
                  {newEntry.subject && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  )}
                </button>
              </div>
            </div>

            {parseNotice && (
              <div className="mx-5 my-2 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-medium flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Check size={15} className="text-emerald-600 shrink-0" />
                  {parseNotice}
                </span>
                <button
                  type="button"
                  onClick={() => setParseNotice(null)}
                  className="text-emerald-600 hover:text-emerald-800 text-xs font-bold ml-2 cursor-pointer"
                >
                  &times;
                </button>
              </div>
            )}

            {/* TAB 1: PARSER KOLESPONDENCJI */}
            {modalMode === 'parser' ? (
              <div className="p-5 pt-2 space-y-4 text-xs">
                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 text-slate-800 space-y-1">
                  <p className="font-semibold text-[#1e3a8a] flex items-center gap-1.5">
                    <Zap size={14} className="text-blue-600" />
                    Automatyczne rozpoznawanie treści pism i wiadomości
                  </p>
                  <p className="text-slate-600 leading-relaxed text-[11.5px]">
                    Wklej poniżej surową treść otrzymanego maila, pismo urzędowe lub zgłoszenie. Parser automatycznie wyodrębni nadawcę, adresata, temat, sygnaturę oraz treść.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                    Treść do rozpoznania
                  </label>
                  <textarea
                    rows={6}
                    value={rawPastedText}
                    onChange={(e) => setRawPastedText(e.target.value)}
                    placeholder="Wklej tutaj surową treść maila, nagłówek pisma urzędowego lub zgłoszenie (np. Od: Dziekanat, Do: Samorząd, Temat: ..., Sygnatura: ...)..."
                    className="w-full min-h-[140px] p-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 text-xs leading-relaxed"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRawPastedText(`Od: Dziekanat Kolegium Nauk Społecznych WSKZ\nDo: Kancelaria Samorządu Studenckiego WSKZ\nTemat: Wniosek o zaopiniowanie regulaminu dyżurów semestralnych\nSygnatura: D-WNS/412/2026\n\nSzanowni Państwo,\nZwracamy się z uprzejmą prośbą o przedstawienie opinii Samorządu Studenckiego w sprawie harmonogramu.`);
                    }}
                    className="text-[11px] text-[#1e3a8a] font-semibold hover:underline cursor-pointer"
                  >
                    Wstaw przykładową treść
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddModalOpen(false);
                        setParseNotice(null);
                      }}
                      className="px-4 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-300 font-medium transition cursor-pointer"
                    >
                      Anuluj
                    </button>
                    <button
                      type="button"
                      disabled={!rawPastedText.trim()}
                      onClick={handleParsePastedText}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-xs transition cursor-pointer"
                    >
                      <Zap size={14} />
                      <span>⚡ Rozpoznaj i Wypełnij Pola</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: FORMULARZ RĘCZNY */
              <form onSubmit={handleCreateSubmit} className="p-5 pt-2 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Kierunek pisma
                    </label>
                    <select
                      value={newEntry.direction}
                      onChange={(e) => setNewEntry({ ...newEntry, direction: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="IN">Wchodzące (Wpływ do Kancelarii)</option>
                      <option value="OUT">Wychodzące (Wysłane z Kancelarii)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Status sprawy
                    </label>
                    <select
                      value={newEntry.status}
                      onChange={(e) => setNewEntry({ ...newEntry, status: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="W toku">W toku</option>
                      <option value="Zatwierdzone">Zatwierdzone</option>
                      <option value="Weryfikacja">Weryfikacja formalna</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Nadawca *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="np. Dziekanat WNS / Koło Naukowe"
                      value={newEntry.sender}
                      onChange={(e) => setNewEntry({ ...newEntry, sender: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Odbiorca / DW *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="np. Kancelaria Samorządu Studenckiego WSKZ"
                      value={newEntry.recipient}
                      onChange={(e) => setNewEntry({ ...newEntry, recipient: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                    Temat sprawy *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Krótki, precyzyjny tytuł pisma lub wniosku"
                    value={newEntry.subject}
                    onChange={(e) => setNewEntry({ ...newEntry, subject: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                    Streszczenie / Treść
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Kluczowe ustalenia, opis sprawy, wnioski..."
                    value={newEntry.summary}
                    onChange={(e) => setNewEntry({ ...newEntry, summary: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Cytat źródłowy / Sygnatura oryginału
                    </label>
                    <input
                      type="text"
                      placeholder="np. Pismo D-WNS/412/2026"
                      value={newEntry.sourceCitation}
                      onChange={(e) => setNewEntry({ ...newEntry, sourceCitation: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Lokalizacja Drive / Link do skanu
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={newEntry.lokalizacjaDrive}
                      onChange={(e) => setNewEntry({ ...newEntry, lokalizacjaDrive: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setParseNotice(null);
                    }}
                    className="px-4 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 transition cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl font-semibold bg-blue-900 hover:bg-blue-950 text-white shadow-sm transition cursor-pointer"
                  >
                    Zarejestruj pismo
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
