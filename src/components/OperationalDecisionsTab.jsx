import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  X,
  ClipboardList,
} from 'lucide-react';

export default function OperationalDecisionsTab({
  decisions = [],
  onAddDecision = () => {},
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newDecision, setNewDecision] = useState({
    topic: '',
    details: '',
    responsible: 'Zarząd Samorządu Studenckiego WSKZ',
    status: 'W realizacji',
  });

  const filteredDecisions = useMemo(() => {
    return decisions.filter(item => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const searchable = `${item.id || ''} ${item.topic || ''} ${item.details || ''} ${item.responsible || ''}`.toLowerCase();
        if (!searchable.includes(term)) return false;
      }
      return true;
    });
  }, [decisions, statusFilter, searchTerm]);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newDecision.topic) return;

    const nextId = `UO/2026/${String(decisions.length + 1).padStart(2, '0')}`;
    const toSave = {
      ...newDecision,
      id: nextId,
      date: new Date().toISOString().slice(0, 10),
    };

    onAddDecision(toSave);
    setIsAddModalOpen(false);
    setNewDecision({
      topic: '',
      details: '',
      responsible: 'Zarząd Samorządu Studenckiego WSKZ',
      status: 'W realizacji',
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-900">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="text-[#1e3a8a]" size={20} />
            Ustalenia Operacyjne i Protokoły Kancelarii
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ewidencja postanowień organów wykonawczych samorządu, harmonogramów dyżurów i dyspozycji organizacyjnych
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-xs transition cursor-pointer self-start md:self-auto"
        >
          <Plus size={15} />
          <span>Dodaj ustalenie operacyjne</span>
        </button>
      </div>

      {/* ── Search & Filter ─────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Szukaj po temacie, treści lub osobie odpowiedzialnej..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1e3a8a] transition"
          />
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium border border-slate-200">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-[#1e3a8a] font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Wszystkie
          </button>
          <button
            onClick={() => setStatusFilter('W realizacji')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              statusFilter === 'W realizacji' ? 'bg-amber-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            W realizacji
          </button>
          <button
            onClick={() => setStatusFilter('Zrealizowane')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              statusFilter === 'Zrealizowane' ? 'bg-emerald-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Zrealizowane
          </button>
        </div>
      </div>

      {/* ── Table of Operational Decisions ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Numer</th>
                <th className="py-3 px-3">Data</th>
                <th className="py-3 px-4">Temat i postanowienie</th>
                <th className="py-3 px-4">Szczegóły wykonawcze</th>
                <th className="py-3 px-4">Osoba / Organ odpowiedzialny</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDecisions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Brak zarejestrowanych ustaleń operacyjnych w Kancelarii
                  </td>
                </tr>
              ) : (
                filteredDecisions.map((dec) => (
                  <tr key={dec.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1e3a8a] whitespace-nowrap">
                      {dec.id}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                      {dec.date}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {dec.topic}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 leading-relaxed max-w-md">
                      {dec.details}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                      {dec.responsible}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        dec.status === 'Zrealizowane'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {dec.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Nowe Ustalenie Operacyjne ──────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-[#1e3a8a]" />
                Nowe ustalenie operacyjne
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Temat / Przedmiot decyzji *</label>
                <input
                  type="text"
                  required
                  placeholder="Krótki tytuł postanowienia"
                  value={newDecision.topic}
                  onChange={(e) => setNewDecision({ ...newDecision, topic: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Szczegóły wykonawcze</label>
                <textarea
                  rows={3}
                  placeholder="Ustalenia, warunki, terminy..."
                  value={newDecision.details}
                  onChange={(e) => setNewDecision({ ...newDecision, details: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Odpowiedzialny organ / osoba</label>
                  <input
                    type="text"
                    value={newDecision.responsible}
                    onChange={(e) => setNewDecision({ ...newDecision, responsible: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status realizacji</label>
                  <select
                    value={newDecision.status}
                    onChange={(e) => setNewDecision({ ...newDecision, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="W realizacji">W realizacji</option>
                    <option value="W toku">W toku</option>
                    <option value="Zrealizowane">Zrealizowane</option>
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
                  Zapisz ustalenie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
