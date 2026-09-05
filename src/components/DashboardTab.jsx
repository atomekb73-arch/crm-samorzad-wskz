import React from 'react';
import {
  Mail,
  Clock,
  AlertTriangle,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function DashboardTab({
  correspondence = [],
  itIssues = [],
  organizations = [],
  decisions = [],
  onNavigateTab = () => {},
  onSelectCorrespondence = () => {},
}) {
  const totalLetters = correspondence.length;
  const inProgressLetters = correspondence.filter(
    c => c.status === 'W toku' || c.weryfikacjaFormalna === 'Weryfikacja' || c.statusUjednolicenia === 'W trakcie'
  ).length;
  const criticalItCount = itIssues.filter(
    i => i.severity === 'Krytyczny' || i.ectsImpact?.includes('Krytyczny') || i.status?.includes('Oczekuje')
  ).length;
  const activeOrgsCount = organizations.length;

  const recentLetters = correspondence.slice(0, 5);
  const recentItIssues = itIssues.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Łączna liczba pism */}
        <div
          onClick={() => onNavigateTab('correspondence')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Łączna liczba pism
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e3a8a] border border-blue-100 flex items-center justify-center group-hover:scale-105 transition">
              <Mail size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalLetters}</span>
            <span className="text-xs text-slate-500 font-medium">zarejestrowanych</span>
          </div>
          <p className="text-[11px] text-[#1e3a8a] font-semibold mt-2 flex items-center gap-1 group-hover:underline">
            Zobacz Dziennik Korespondencji <ChevronRight size={13} />
          </p>
        </div>

        {/* KPI 2: Pisma w toku */}
        <div
          onClick={() => onNavigateTab('correspondence')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pisma w toku
            </span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center group-hover:scale-105 transition">
              <Clock size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-sky-700">{inProgressLetters}</span>
            <span className="text-xs text-slate-500 font-medium">wymaga decyzji</span>
          </div>
          <p className="text-[11px] text-sky-700 font-semibold mt-2 flex items-center gap-1 group-hover:underline">
            Wymagają weryfikacji formalnej <ChevronRight size={13} />
          </p>
        </div>

        {/* KPI 3: Zgłoszone wady IT */}
        <div
          onClick={() => onNavigateTab('it_issues')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Zgłoszone wady IT
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center group-hover:scale-105 transition">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-700">{itIssues.length}</span>
            {criticalItCount > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                {criticalItCount} krytycznych ECTS
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-700 font-semibold mt-2 flex items-center gap-1 group-hover:underline">
            Zobacz Rejestr Wad IT <ChevronRight size={13} />
          </p>
        </div>

        {/* KPI 4: Aktywne organizacje studenckie */}
        <div
          onClick={() => onNavigateTab('organizations')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Aktywne organizacje
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center group-hover:scale-105 transition">
              <Users size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{activeOrgsCount}</span>
            <span className="text-xs text-slate-500 font-medium">kół i organów</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-2 flex items-center gap-1 group-hover:underline">
            Zobacz ewidencję kół <ChevronRight size={13} />
          </p>
        </div>
      </div>

      {/* ── Main Dashboard Content Split ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Ostatnie 5 wpisów z Dziennika Korespondencji ────── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-[#1e3a8a] rounded-lg border border-blue-100">
                <Mail size={16} />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Ostatnie wpisy w Dzienniku Korespondencji
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('correspondence')}
              className="text-xs font-semibold text-[#1e3a8a] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Wszystkie ({totalLetters}) <ChevronRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentLetters.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                Brak zarejestrowanych wpisów w Kancelarii
              </div>
            ) : (
              recentLetters.map((item) => {
                const isIncoming = item.direction === 'IN';
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectCorrespondence(item)}
                    className="py-3 px-2 rounded-xl hover:bg-slate-50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-[#1e3a8a]">
                          {item.id}
                        </span>
                        {isIncoming ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <ArrowDownLeft size={12} /> Wchodzące
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <ArrowUpRight size={12} /> Wychodzące
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 font-medium">
                          {item.date}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-[#1e3a8a] transition truncate max-w-xl">
                        {item.subject}
                      </p>
                      <p className="text-xs text-slate-500 truncate max-w-xl">
                        <span className="text-slate-400 font-medium">Nadawca:</span> {item.sender} &bull; <span className="text-slate-400 font-medium">Odbiorca:</span> {item.recipient}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                        item.status === 'Zatwierdzone'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {item.status}
                      </span>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-[#1e3a8a] transition" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Col: Ważne anomalie IT & Ustalenia Operacyjne ────────── */}
        <div className="space-y-6">
          
          {/* Critical IT Defects Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
                  <AlertTriangle size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pilne anomalie IT (Wpływ ECTS)
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('it_issues')}
                className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
              >
                Rejestr <ChevronRight size={13} className="inline" />
              </button>
            </div>

            <div className="space-y-2.5">
              {recentItIssues.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs font-medium">
                  Brak zgłoszonych wad IT
                </div>
              ) : (
                recentItIssues.map((issue) => (
                  <div
                    key={issue.id}
                    onClick={() => onNavigateTab('it_issues')}
                    className={`p-3 rounded-xl border text-xs transition cursor-pointer hover:shadow-xs ${
                      issue.ectsImpact?.includes('Krytyczny')
                        ? 'bg-rose-50/60 border-rose-200 hover:bg-rose-50 text-slate-900'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-[#1e3a8a]">{issue.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        issue.ectsImpact?.includes('Krytyczny')
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {issue.ectsImpact}
                      </span>
                    </div>
                    <p className="font-medium text-slate-800 line-clamp-2">{issue.description}</p>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                      <span>{issue.platformArea}</span>
                      <span className="font-semibold text-slate-700">{issue.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Operational Decisions Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-[#1e3a8a] rounded-lg border border-blue-100">
                  <FileText size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Ustalenia Operacyjne
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('decisions')}
                className="text-xs font-semibold text-[#1e3a8a] hover:underline cursor-pointer"
              >
                Wszystkie <ChevronRight size={13} className="inline" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {decisions.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs font-medium">
                  Brak ustaleń operacyjnych
                </div>
              ) : (
                decisions.slice(0, 3).map((dec) => (
                  <div key={dec.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-[#1e3a8a]">{dec.id}</span>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {dec.status}
                      </span>
                    </div>
                    <p className="font-medium text-slate-800">{dec.topic}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Odp: {dec.responsible}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
