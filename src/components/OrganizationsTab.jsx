import React, { useState, useMemo, useCallback } from 'react';
import {
  Users,
  Building2,
  Mail,
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  ExternalLink,
  Shield,
  Calendar,
  X,
  List,
  LayoutGrid,
  FileText,
  Copy,
  Check,
} from 'lucide-react';

export default function OrganizationsTab({
  organizations = [],
  onAddOrganization = () => {},
  onNavigateToLetter = () => {},
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [copiedId, setCopiedId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newOrg, setNewOrg] = useState({
    name: '',
    shortName: '',
    leader: '',
    email: '',
    supervisor: '',
    membersCount: 0,
    category: 'Koło Naukowe',
    status: 'Aktywne',
    description: '',
    faculty: 'Wydział Psychologii',
  });

  const handleCopyText = useCallback((id, text) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {}
  }, []);

  const filteredOrgs = useMemo(() => {
    return organizations.filter(o => {
      if (statusFilter !== 'ALL' && (o.status || 'Aktywne') !== statusFilter) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return `${o.name || ''} ${o.shortName || ''} ${o.leader || ''} ${o.supervisor || ''} ${o.email || ''} ${o.faculty || ''}`.toLowerCase().includes(term);
    });
  }, [organizations, searchTerm, statusFilter]);

  const activeCount = useMemo(() => {
    return organizations.filter(o => (o.status || 'Aktywne') === 'Aktywne').length;
  }, [organizations]);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newOrg.name) return;

    const id = `org-${newOrg.shortName ? newOrg.shortName.toLowerCase().replace(/\s+/g, '-') : Date.now()}`;
    onAddOrganization({
      ...newOrg,
      id,
      establishedYear: '2026',
    });
    setIsAddModalOpen(false);
    setNewOrg({
      name: '',
      shortName: '',
      leader: '',
      email: '',
      supervisor: '',
      membersCount: 0,
      category: 'Koło Naukowe',
      status: 'Aktywne',
      description: '',
      faculty: 'Wydział Psychologii',
    });
  };

  const handleCreateLetter = (org) => {
    onNavigateToLetter({
      recipient: org.name,
      institution: `Studenckie Koło Naukowe WSKZ • ${org.faculty || 'Wydział WSKZ'} (opiekun: ${org.supervisor || 'Zarząd Koła'})`,
      email: org.email,
      contactItem: org,
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-900">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="text-[#1e3a8a]" size={20} />
              Ewidencja Kół Naukowych i Organizacji Studenckich WSKZ
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {organizations.length} kół i organizacji
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Oficjalny rejestr kół naukowych, sekcji dyscyplinowych, zarządów kół oraz opiekunów naukowych
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View mode toggle */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Widok kart / kafelków"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Karty</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Widok tabeli / listy (jak w Kole MAM)"
            >
              <List size={14} />
              <span className="hidden sm:inline">Tabela</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-xs transition cursor-pointer self-start md:self-auto"
          >
            <Plus size={15} />
            <span>Zarejestruj nową organizację</span>
          </button>
        </div>
      </div>

      {/* ── Search & Filter Bar ─────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Szukaj koła naukowego po nazwie, zarządzie, opiekunie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-500 transition"
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

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-[11px] font-semibold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Wszystkie statusy</option>
            <option value="Aktywne">Tylko aktywne ({activeCount})</option>
            <option value="Zawieszone">Zawieszone</option>
          </select>
        </div>
      </div>

      {/* ── Content View ────────────────────────────────────────────────── */}
      {filteredOrgs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs font-medium">
          Brak zarejestrowanych kół spełniających kryteria wyszukiwania
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (Kompaktowa lista) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3.5 w-12 text-center">L.p.</th>
                  <th className="py-3 px-4">Nazwa Koła / Wydział</th>
                  <th className="py-3 px-4">Opiekun Naukowy</th>
                  <th className="py-3 px-4">Zarząd / Lider</th>
                  <th className="py-3 px-4">Kontakt E-mail</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Opcje / Pismo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrgs.map((org, idx) => {
                  const hasEmail = Boolean(org.email);
                  const isCopied = copiedId === org.id;

                  return (
                    <tr key={org.id} className="hover:bg-blue-50/40 transition group">
                      <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-blue-900 transition">
                          {org.name}
                        </div>
                        <div className="text-[10.5px] text-slate-500">
                          {org.faculty || 'Wydział WSKZ'}
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-800">
                          {org.supervisor || 'Instytut / Katedra'}
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-700">
                          {org.leader || 'Zarząd Koła'}
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        {hasEmail ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`mailto:${org.email}`}
                              className="text-slate-800 hover:text-blue-700 truncate max-w-[170px] text-[11px]"
                              title={org.email}
                            >
                              {org.email}
                            </a>
                            <button
                              onClick={() => handleCopyText(org.id, org.email)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer shrink-0"
                              title="Kopiuj e-mail"
                            >
                              {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            (org.status || 'Aktywne') === 'Aktywne'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}
                        >
                          {org.status || 'Aktywne'}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasEmail && (
                            <a
                              href={`mailto:${org.email}`}
                              className="p-1.5 text-slate-600 hover:text-blue-700 rounded-lg hover:bg-slate-100 transition"
                              title="Napisz e-mail"
                            >
                              <Mail size={13} />
                            </a>
                          )}

                          <button
                            onClick={() => handleCreateLetter(org)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer"
                            title="Wystaw oficjalne pismo A4 do Koła"
                          >
                            <FileText size={11} />
                            <span>Pismo A4</span>
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
          {filteredOrgs.map((org) => {
            const hasEmail = Boolean(org.email);
            const isCopied = copiedId === org.id;

            return (
              <div
                key={org.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between space-y-4 text-slate-900 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        {org.category || 'Koło Naukowe'}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition mt-1.5">
                        {org.name}
                      </h3>
                      {org.faculty && (
                        <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          {org.faculty}
                        </div>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0 ${
                        (org.status || 'Aktywne') === 'Aktywne'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                    >
                      {org.status || 'Aktywne'}
                    </span>
                  </div>

                  {org.description && (
                    <p className="text-xs text-slate-600 leading-relaxed font-normal pt-1">
                      {org.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400 font-medium shrink-0">Opiekun:</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {org.supervisor || 'Instytut / Katedra WSKZ'}
                    </span>
                  </div>

                  {org.leader && org.leader !== 'Zarząd Koła' && (
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-400 font-medium shrink-0">Zarząd:</span>
                      <span className="font-medium text-slate-800 text-right">{org.leader}</span>
                    </div>
                  )}

                  {hasEmail && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-400 font-medium">E-mail:</span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`mailto:${org.email}`}
                          className="font-mono text-blue-900 hover:text-blue-700 font-medium text-[11px] truncate max-w-[190px]"
                          title={org.email}
                        >
                          {org.email}
                        </a>
                        <button
                          onClick={() => handleCopyText(org.id, org.email)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                          title="Kopiuj e-mail"
                        >
                          {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {hasEmail ? (
                      <a
                        href={`mailto:${org.email}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition"
                      >
                        <Mail size={12} />
                        <span>Napisz</span>
                      </a>
                    ) : (
                      <span />
                    )}

                    <button
                      onClick={() => handleCreateLetter(org)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
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

      {/* ── Modal: Nowa Organizacja ──────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-[#1e3a8a]" />
                Rejestracja nowej organizacji / koła
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pełna nazwa koła / organizacji *</label>
                <input
                  type="text"
                  required
                  placeholder="np. Studenckie Koło Naukowe Psychoterapii WSKZ"
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wydział</label>
                  <select
                    value={newOrg.faculty}
                    onChange={(e) => setNewOrg({ ...newOrg, faculty: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-500"
                  >
                    <option value="Wydział Psychologii">Wydział Psychologii</option>
                    <option value="Wydział Administracji, Zarządzania i Informatyki">Wydział Administracji, Zarządzania i Informatyki</option>
                    <option value="Wydział Prawa, Bezpieczeństwa i Kryminologii">Wydział Prawa, Bezpieczeństwa i Kryminologii</option>
                    <option value="Wydział Nauk Społecznych i Technicznych">Wydział Nauk Społecznych i Technicznych</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kontakt E-mail</label>
                  <input
                    type="email"
                    placeholder="kolo@wskz.pl"
                    value={newOrg.email}
                    onChange={(e) => setNewOrg({ ...newOrg, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Przewodniczący / Zarząd</label>
                  <input
                    type="text"
                    placeholder="np. Zarząd Koła"
                    value={newOrg.leader}
                    onChange={(e) => setNewOrg({ ...newOrg, leader: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opiekun Naukowy</label>
                  <input
                    type="text"
                    placeholder="np. dr Jan Kowalski"
                    value={newOrg.supervisor}
                    onChange={(e) => setNewOrg({ ...newOrg, supervisor: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Opis działalności</label>
                <textarea
                  rows={2}
                  placeholder="Główne cele, obszar badawczy..."
                  value={newOrg.description}
                  onChange={(e) => setNewOrg({ ...newOrg, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-semibold bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white shadow-xs transition cursor-pointer"
                >
                  Zarejestruj organizację
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
