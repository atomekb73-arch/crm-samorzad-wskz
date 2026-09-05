import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Laptop,
  GraduationCap,
  FileCode,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export default function ItIssuesTab({
  itIssues = [],
  onAddItIssue = () => {},
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newIssue, setNewIssue] = useState({
    fieldAndSemester: '',
    platformArea: 'Platforma e-learningowa',
    description: '',
    status: 'Oczekuje / Do weryfikacji',
    severity: 'Wysoki',
    ectsImpact: 'Krytyczny / Blokujący',
    reportedBy: 'Kancelaria Samorządu Studenckiego WSKZ',
    assignedTo: 'Dział IT',
    notes: '',
  });

  const filteredIssues = useMemo(() => {
    return itIssues.filter(item => {
      if (severityFilter !== 'ALL') {
        if (severityFilter === 'CRITICAL' && !item.ectsImpact?.includes('Krytyczny') && item.severity !== 'Krytyczny') {
          return false;
        }
        if (severityFilter === 'HIGH' && item.severity !== 'Wysoki') {
          return false;
        }
      }

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING' && !item.status?.includes('Oczekuje')) {
          return false;
        }
        if (statusFilter === 'IN_PROGRESS' && !item.status?.includes('trakcie') && !item.status?.includes('Przekazano')) {
          return false;
        }
        if (statusFilter === 'RESOLVED' && !item.status?.includes('Rozwiązane') && !item.status?.includes('Zakończone')) {
          return false;
        }
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const searchable = `${item.id || ''} ${item.fieldAndSemester || ''} ${item.platformArea || ''} ${item.description || ''} ${item.reportedBy || ''} ${item.assignedTo || ''}`.toLowerCase();
        if (!searchable.includes(term)) return false;
      }

      return true;
    });
  }, [itIssues, severityFilter, statusFilter, searchTerm]);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newIssue.description || !newIssue.fieldAndSemester) return;

    const nextId = `IT-2026-${String(itIssues.length + 1).padStart(3, '0')}`;
    const issueToSave = {
      ...newIssue,
      id: nextId,
      date: new Date().toISOString().slice(0, 10),
    };

    onAddItIssue(issueToSave);
    setIsAddModalOpen(false);
    setNewIssue({
      fieldAndSemester: '',
      platformArea: 'Platforma e-learningowa',
      description: '',
      status: 'Oczekuje / Do weryfikacji',
      severity: 'Wysoki',
      ectsImpact: 'Krytyczny / Blokujący',
      reportedBy: 'Kancelaria Samorządu Studenckiego WSKZ',
      assignedTo: 'Dział IT',
      notes: '',
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Top Header & Description ────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-900">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="text-amber-600" size={20} />
            Rejestr Wad IT i Anomalii Systemowych WSKZ
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ewidencja błędów technicznych platformy e-learningowej, Wirtualnego Dziekanatu i ich bezpośredniego wpływu na punkty ECTS
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Zgłoś anomalię IT</span>
          </button>
        </div>
      </div>

      {/* ── Search and Filter Controls ──────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Szukaj po ID błędu, kierunku, obszarze platformy lub opisie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* ECTS Impact / Severity Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium border border-slate-200">
            <button
              onClick={() => setSeverityFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                severityFilter === 'ALL' ? 'bg-[#1e3a8a] font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Wszystkie
            </button>
            <button
              onClick={() => setSeverityFilter('CRITICAL')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                severityFilter === 'CRITICAL' ? 'bg-rose-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <ShieldAlert size={12} /> Krytyczne ECTS
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
              onClick={() => setStatusFilter('PENDING')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'PENDING' ? 'bg-amber-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Oczekujące
            </button>
            <button
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'IN_PROGRESS' ? 'bg-blue-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              W naprawie
            </button>
            <button
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'RESOLVED' ? 'bg-emerald-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rozwiązane
            </button>
          </div>
        </div>
      </div>

      {/* ── IT Issues Data Table with Highlight Rules ────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">ID Błędu</th>
                <th className="py-3 px-3">Data</th>
                <th className="py-3 px-4">Kierunek i Semestr</th>
                <th className="py-3 px-4">Obszar Platformy</th>
                <th className="py-3 px-4">Opis Anomalii</th>
                <th className="py-3 px-3">Status Zgłoszenia</th>
                <th className="py-3 px-3">Wpływ na ECTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Brak zarejestrowanych wad IT w Kancelarii
                  </td>
                </tr>
              ) : (
                filteredIssues.map((item) => {
                  const isCriticalEcts = item.ectsImpact?.includes('Krytyczny') || item.severity === 'Krytyczny';
                  const isPending = item.status?.includes('Oczekuje');
                  const isHighAlert = isCriticalEcts || isPending;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedIssue(item)}
                      className={`transition cursor-pointer ${
                        isCriticalEcts
                          ? 'bg-rose-50/50 hover:bg-rose-50 text-slate-900'
                          : isPending
                          ? 'bg-amber-50/30 hover:bg-amber-50 text-slate-900'
                          : 'hover:bg-slate-50/80 text-slate-800'
                      }`}
                    >
                      {/* ID Błędu */}
                      <td className="py-3.5 px-4 font-mono font-extrabold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isHighAlert && <AlertCircle size={14} className={isCriticalEcts ? 'text-rose-600' : 'text-amber-600'} />}
                          <span className="text-[#1e3a8a]">{item.id}</span>
                        </div>
                      </td>

                      {/* Data */}
                      <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                        {item.date}
                      </td>

                      {/* Kierunek i Semestr */}
                      <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {item.fieldAndSemester || 'Wszystkie kierunki'}
                      </td>

                      {/* Obszar Platformy */}
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] border border-slate-200">
                          {item.platformArea}
                        </span>
                      </td>

                      {/* Opis Anomalii */}
                      <td className="py-3.5 px-4 text-slate-900 font-medium max-w-md truncate" title={item.description}>
                        {item.description}
                      </td>

                      {/* Status Zgłoszenia */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.status === 'Rozwiązane'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : item.status?.includes('trakcie') || item.status?.includes('Przekazano')
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      {/* Wpływ na ECTS */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                          isCriticalEcts
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : item.ectsImpact === 'Wysoki'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {isCriticalEcts && <AlertTriangle size={12} />}
                          {item.ectsImpact || 'Średni'}
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
          <span>Łącznie w rejestrze: <strong className="text-slate-900">{itIssues.length}</strong> zgłoszeń (w tym <strong className="text-rose-700">{itIssues.filter(i => i.ectsImpact?.includes('Krytyczny')).length}</strong> o krytycznym wpływie na ECTS)</span>
          <span className="text-[11px] text-slate-400">Wiersze czerwone/bursztynowe oznaczają sprawy priorytetowe</span>
        </div>
      </div>

      {/* ── Modal: Szczegóły Zgłoszenia IT ─────────────────────────────────── */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-extrabold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                  {selectedIssue.id}
                </span>
                <span className="text-sm font-bold text-slate-900">Szczegóły wady IT</span>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Obszar platformy:</span>
                  <span className="font-semibold text-slate-800">{selectedIssue.platformArea}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kierunek i semestr:</span>
                  <span className="font-semibold text-slate-800">{selectedIssue.fieldAndSemester}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Wpływ na ECTS:</span>
                  <span className="font-bold text-red-700">{selectedIssue.ectsImpact}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status zgłoszenia:</span>
                  <span className="font-semibold text-slate-800">{selectedIssue.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Zgłaszający:</span>
                  <span className="font-medium text-slate-700">{selectedIssue.reportedBy}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">Opis anomalii technicznej</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedIssue.description}
                </p>
              </div>

              {selectedIssue.notes && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">Notatki zespołu wdrożeniowego</h4>
                  <p className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                    {selectedIssue.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedIssue(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
              >
                Zamknij podgląd
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nowe Zgłoszenie Wad IT ─────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-amber-600" />
                Zgłoszenie nowej wady IT / anomalii
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
                  <label className="block font-semibold text-slate-700 mb-1">Obszar platformy *</label>
                  <select
                    value={newIssue.platformArea}
                    onChange={(e) => setNewIssue({ ...newIssue, platformArea: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="Platforma e-learningowa">Platforma e-learningowa</option>
                    <option value="Wirtualny Dziekanat">Wirtualny Dziekanat</option>
                    <option value="Testy i Zaliczenia">Testy i Zaliczenia</option>
                    <option value="Poczta / MS Teams">Poczta / MS Teams</option>
                    <option value="Płatności i Finanse">Płatności i Finanse</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wpływ na ECTS *</label>
                  <select
                    value={newIssue.ectsImpact}
                    onChange={(e) => setNewIssue({ ...newIssue, ectsImpact: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="Krytyczny / Blokujący">Krytyczny / Blokujący</option>
                    <option value="Wysoki">Wysoki</option>
                    <option value="Średni">Średni</option>
                    <option value="Niski">Niski</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kierunek i semestr *</label>
                <input
                  type="text"
                  required
                  placeholder="np. Psychologia, sem. 4 / Wszystkie kierunki"
                  value={newIssue.fieldAndSemester}
                  onChange={(e) => setNewIssue({ ...newIssue, fieldAndSemester: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Opis anomalii technicznej *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Dokładny opis błędu, zachowanie systemu, kody błędów..."
                  value={newIssue.description}
                  onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zgłaszający</label>
                  <input
                    type="text"
                    value={newIssue.reportedBy}
                    onChange={(e) => setNewIssue({ ...newIssue, reportedBy: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Skierowano do</label>
                  <input
                    type="text"
                    value={newIssue.assignedTo}
                    onChange={(e) => setNewIssue({ ...newIssue, assignedTo: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
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
                  className="px-4 py-2 rounded-xl font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition"
                >
                  Dodaj zgłoszenie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
