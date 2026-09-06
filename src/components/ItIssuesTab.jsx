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
import { sanitizeStatus } from '../services/googleSheets';

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
    ectsImpact: 'Wpływ na tok studiów',
    reportedBy: 'Kancelaria Samorządu Studenckiego WSKZ',
    assignedTo: 'Dział IT',
    notes: '',
  });

  const filteredIssues = useMemo(() => {
    return itIssues.map(item => ({
      ...item,
      status: sanitizeStatus(item.status),
    })).filter(item => {
      if (severityFilter !== 'ALL') {
        if (severityFilter === 'CRITICAL' && !item.ectsImpact?.includes('Krytyczny') && !item.ectsImpact?.includes('Wpływ na tok studiów') && item.severity !== 'Krytyczny') {
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
        if (statusFilter === 'IN_PROGRESS' && !item.status?.includes('trakcie') && !item.status?.includes('Przekazano') && !item.status?.includes('właściwości')) {
          return false;
        }
        if (statusFilter === 'RESOLVED' && !item.status?.includes('Rozwiązane') && !item.status?.includes('Zakończone')) {
          return false;
        }
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const searchable = `${item.id || ''} ${item.fieldAndSemester || ''} ${item.platformArea || ''} ${item.description || ''} ${item.reportedBy || ''} ${item.assignedTo || ''} ${item.status || ''}`.toLowerCase();
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
      status: sanitizeStatus(newIssue.status),
    };

    onAddItIssue(issueToSave);
    setIsAddModalOpen(false);
    setNewIssue({
      fieldAndSemester: '',
      platformArea: 'Platforma e-learningowa',
      description: '',
      status: 'Oczekuje / Do weryfikacji',
      severity: 'Wysoki',
      ectsImpact: 'Wpływ na tok studiów',
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
            Rejestr Zgłoszeń Technicznych i Wsparcia Platformy
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ewidencja zgłoszeń technicznych platformy e-learningowej, Wirtualnego Dziekanatu i wsparcia procesu kształcenia
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus size={15} />
            <span>+ Nowe Zgłoszenie Techniczne</span>
          </button>
        </div>
      </div>

      {/* ── Search and Filter Controls ──────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Szukaj po sygnaturze zgłoszenia, kierunku, obszarze platformy lub treści..."
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
          {/* Priority / Impact Filter */}
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
              <ShieldAlert size={12} /> Wpływ na tok studiów
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
              W realizacji
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden w-full">
        <div className="w-full">
          <table className="w-full table-fixed text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="w-[12%] py-3 px-3">SYGNATURA</th>
                <th className="w-[10%] py-3 px-2">DATA</th>
                <th className="w-[20%] py-3 px-3">KIERUNEK I MODUŁ</th>
                <th className="w-[38%] py-3 px-3">TREŚĆ ZGŁOSZENIA</th>
                <th className="w-[12%] py-3 px-2 text-center">STATUS OBSŁUGI</th>
                <th className="w-[8%] py-3 px-2 text-center">WPŁYW NA STUDIA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Brak zarejestrowanych zgłoszeń technicznych w Kancelarii
                  </td>
                </tr>
              ) : (
                filteredIssues.map((item) => {
                  const isCriticalEcts = item.ectsImpact?.includes('Krytyczny') || item.ectsImpact?.includes('Wpływ na tok studiów') || item.severity === 'Krytyczny';
                  const isPending = item.status?.includes('Oczekuje');
                  const isHighAlert = isCriticalEcts || isPending;
                  const statusText = sanitizeStatus(item.status);

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
                      {/* Sygnatura: 12% */}
                      <td className="w-[12%] py-3.5 px-3 font-mono font-extrabold break-words">
                        <div className="flex items-center gap-1.5">
                          {isHighAlert && (
                            <AlertCircle
                              size={13}
                              className={`${isCriticalEcts ? 'text-rose-600' : 'text-amber-600'} shrink-0`}
                            />
                          )}
                          <span className="text-[#1e3a8a] text-xs leading-tight break-all">{item.id}</span>
                        </div>
                      </td>

                      {/* Data: 10% */}
                      <td className="w-[10%] py-3.5 px-2 text-slate-500 text-xs whitespace-nowrap">
                        {item.date}
                      </td>

                      {/* Kierunek i Moduł: 20% */}
                      <td className="w-[20%] py-3.5 px-3">
                        <div className="font-medium text-slate-800 break-words leading-tight">
                          {item.fieldAndSemester || item.jednostka || 'Wszystkie kierunki'}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5 break-words">
                          {item.platformArea || 'Platforma e-learningowa'}
                        </div>
                      </td>

                      {/* Treść Zgłoszenia: 38% */}
                      <td className="w-[38%] py-3.5 px-3 text-slate-900 text-sm break-words whitespace-normal leading-relaxed">
                        {item.description}
                      </td>

                      {/* Status Obsługi: 12% */}
                      <td className="w-[12%] py-3.5 px-2 text-center">
                        <span className={`inline-block w-full px-2 py-1 rounded-full text-[11px] font-bold break-words whitespace-normal leading-tight text-center ${
                          statusText === 'Rozwiązane'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : statusText?.includes('trakcie') || statusText?.includes('Przekazano') || statusText?.includes('właściwości')
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {statusText}
                        </span>
                      </td>

                      {/* Wpływ na studia: 8% */}
                      <td className="w-[8%] py-3.5 px-2 text-center">
                        <span className={`inline-flex items-center justify-center gap-1 w-full px-1.5 py-1 rounded-full text-[10px] font-extrabold break-words whitespace-normal leading-tight text-center ${
                          isCriticalEcts
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : item.ectsImpact === 'Wysoki'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {isCriticalEcts && <AlertTriangle size={11} className="shrink-0" />}
                          <span>{isCriticalEcts ? 'Krytyczny' : item.ectsImpact || 'Standard'}</span>
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
          <span>Łącznie w rejestrze: <strong className="text-slate-900">{itIssues.length}</strong> zgłoszeń (w tym <strong className="text-rose-700">{itIssues.filter(i => i.ectsImpact?.includes('Krytyczny') || i.ectsImpact?.includes('Wpływ na tok studiów')).length}</strong> z bezpośrednim wpływem na tok studiów)</span>
          <span className="text-[11px] text-slate-400">Wiersze wyróżnione oznaczają zgłoszenia priorytetowe</span>
        </div>
      </div>

      {/* ── Modal: Szczegóły Zgłoszenia Technicznego ──────────────────────── */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-extrabold bg-blue-50 text-[#1e3a8a] px-2 py-0.5 rounded border border-blue-200">
                  {selectedIssue.id}
                </span>
                <span className="text-sm font-bold text-slate-900">Szczegóły zgłoszenia technicznego</span>
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
                  <span className="text-slate-400">Wpływ na tok studiów:</span>
                  <span className="font-bold text-red-700">{selectedIssue.ectsImpact}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status obsługi:</span>
                  <span className="font-semibold text-slate-800">{sanitizeStatus(selectedIssue.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Zgłaszający:</span>
                  <span className="font-medium text-slate-700">{selectedIssue.reportedBy}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">Opis techniczny zgłoszenia</h4>
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

      {/* ── Modal: Nowe Zgłoszenie Techniczne ─────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-amber-600" />
                Nowe Zgłoszenie Techniczne
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
                  <label className="block font-semibold text-slate-700 mb-1">Wpływ na tok studiów *</label>
                  <select
                    value={newIssue.ectsImpact}
                    onChange={(e) => setNewIssue({ ...newIssue, ectsImpact: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="Wpływ na tok studiów">Wpływ na tok studiów</option>
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
                <label className="block font-semibold text-slate-700 mb-1">Opis techniczny zgłoszenia *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Dokładny opis zgłoszenia technicznego, zachowanie platformy, kody błędów..."
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
                  className="px-4 py-2 rounded-xl font-semibold bg-[#1e3a8a] hover:bg-blue-800 text-white shadow-xs transition"
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
