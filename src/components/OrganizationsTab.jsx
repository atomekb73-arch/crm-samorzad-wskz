import React, { useState } from 'react';
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
} from 'lucide-react';

export default function OrganizationsTab({
  organizations = [],
  onAddOrganization = () => {},
}) {
  const [searchTerm, setSearchTerm] = useState('');
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
  });

  const filteredOrgs = organizations.filter(o => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return `${o.name || ''} ${o.shortName || ''} ${o.leader || ''} ${o.supervisor || ''} ${o.email || ''}`.toLowerCase().includes(term);
  });

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
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div className="bg-slate-900/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-sky-900/40 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Users className="text-emerald-400" size={20} />
            Ewidencja Kół Naukowych i Organizacji Studenckich WSKZ
          </h2>
          <p className="text-xs text-sky-200/60 mt-0.5">
            Oficjalny rejestr kół naukowych, sekcji dyscyplinowych, zarządów kół oraz opiekunów naukowych
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md transition cursor-pointer self-start md:self-auto border border-emerald-500/30"
        >
          <Plus size={15} />
          <span>Zarejestruj nową organizację</span>
        </button>
      </div>

      {/* ── Search Bar ──────────────────────────────────────────────────── */}
      <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-sky-900/40 shadow-md">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Szukaj koła naukowego po nazwie, zarządzie, opiekunie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-sky-950 bg-slate-950/60 text-slate-100 placeholder:text-slate-500 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* ── Organizations Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOrgs.map((org) => (
          <div
            key={org.id}
            className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-sky-900/40 p-5 shadow-md hover:border-emerald-500/40 hover:shadow-lg transition flex flex-col justify-between space-y-4 text-white"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-800/50">
                    {org.category || 'Koło Naukowe'}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white mt-1">
                    {org.name}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">
                  {org.status || 'Aktywne'}
                </span>
              </div>

              {org.description && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  {org.description}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Zarząd / Lider:</span>
                <span className="font-semibold text-white">{org.leader || 'Zarząd Koła'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Opiekun Naukowy:</span>
                <span className="font-semibold text-white">{org.supervisor || 'Instytut / Katedra'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Liczba członków:</span>
                <span className="font-extrabold text-emerald-300 bg-emerald-950/70 px-2 py-0.2 rounded border border-emerald-800/50">
                  {org.membersCount || 0} osób
                </span>
              </div>
              {org.email && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Kontakt email:</span>
                  <span className="font-mono text-sky-400 font-medium">{org.email}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Modal: Nowa Organizacja ──────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-emerald-600" />
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
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategoria</label>
                  <select
                    value={newOrg.category}
                    onChange={(e) => setNewOrg({ ...newOrg, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="Koło Naukowe">Koło Naukowe</option>
                    <option value="Samorząd">Organ Samorządowy</option>
                    <option value="Sekcja Sportowa">Sekcja Sportowa</option>
                    <option value="Inicjatywa Studencka">Inicjatywa Studencka</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Liczba członków</label>
                  <input
                    type="number"
                    value={newOrg.membersCount}
                    onChange={(e) => setNewOrg({ ...newOrg, membersCount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Przewodniczący / Zarząd</label>
                  <input
                    type="text"
                    value={newOrg.leader}
                    onChange={(e) => setNewOrg({ ...newOrg, leader: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opiekun Naukowy</label>
                  <input
                    type="text"
                    value={newOrg.supervisor}
                    onChange={(e) => setNewOrg({ ...newOrg, supervisor: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
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
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
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
                  className="px-4 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
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
