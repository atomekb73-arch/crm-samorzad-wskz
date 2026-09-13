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
import { sanitizeStatus } from '../services/googleSheets';
import { formatTableDate, formatTableDateTime, parseDateToTimestamp } from '../utils/dateUtils';

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

  const recentLetters = [...correspondence].sort((a, b) => {
    const rawA = a.dataWplywu || a.data || a.date || a.Data_Wplywu || "";
    const rawB = b.dataWplywu || b.data || b.date || b.Data_Wplywu || "";
    const timeA = parseDateToTimestamp(rawA);
    const timeB = parseDateToTimestamp(rawB);
    return timeB - timeA;
  }).slice(0, 5);
  const recentItIssues = itIssues.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* ── 1. Kompaktowe Kafelki Liczników (Horizontal Compact) ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Łączna liczba pism */}
        <div
          onClick={() => onNavigateTab('correspondence')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition cursor-pointer flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight shrink-0">
              {totalLetters}
            </span>
            <span className="font-semibold text-xs text-slate-500 uppercase tracking-wider leading-tight">
              Łączna liczba pism
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e3a8a] border border-blue-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
            <Mail size={19} />
          </div>
        </div>

        {/* KPI 2: Pisma w toku */}
        <div
          onClick={() => onNavigateTab('correspondence')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition cursor-pointer flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="text-3xl sm:text-4xl font-extrabold text-sky-700 tracking-tight shrink-0">
              {inProgressLetters}
            </span>
            <span className="font-semibold text-xs text-slate-500 uppercase tracking-wider leading-tight">
              Pisma w toku
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
            <Clock size={19} />
          </div>
        </div>

        {/* KPI 3: Zgłoszenia techniczne */}
        <div
          onClick={() => onNavigateTab('it_issues')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition cursor-pointer flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-700 tracking-tight shrink-0">
              {itIssues.length}
            </span>
            <span className="font-semibold text-xs text-slate-500 uppercase tracking-wider leading-tight">
              Zgłoszenia techniczne
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
            <AlertTriangle size={19} />
          </div>
        </div>

        {/* KPI 4: Aktywne organizacje */}
        <div
          onClick={() => onNavigateTab('organizations')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition cursor-pointer flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-700 tracking-tight shrink-0">
              {activeOrgsCount}
            </span>
            <span className="font-semibold text-xs text-slate-500 uppercase tracking-wider leading-tight">
              Aktywne organizacje
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
            <Users size={19} />
          </div>
        </div>
      </div>

      {/* ── 2. Układ Trzykolumnowy Poniżej Liczników (3-Column Grid) ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* ── KOLUMNA 1 (Left): Ostatnie wpisy w Dzienniku Korespondencji ────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-[#1e3a8a] rounded-lg border border-blue-200">
                <Mail size={16} />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Dziennik Korespondencji
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('correspondence')}
              className="text-xs font-semibold text-[#1e3a8a] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Wszystkie ({totalLetters}) <ChevronRight size={13} />
            </button>
          </div>

          <div className="divide-y divide-slate-200">
            {recentLetters.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-medium">
                Brak zarejestrowanych pism
              </div>
            ) : (
              recentLetters.map((item) => {
                const isIncoming = item.direction === 'IN' || item.typ === 'Wchodzące';
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectCorrespondence(item)}
                    className="py-3 px-1 hover:bg-slate-50 transition cursor-pointer flex flex-col justify-between gap-1.5 group rounded-lg"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-[#1e3a8a]">
                          {item.id || item.sygnatura}
                        </span>
                        {isIncoming ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                            <ArrowDownLeft size={11} /> Wchodzące
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <ArrowUpRight size={11} /> Wychodzące
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {(() => {
                          const dt = formatTableDateTime(item.dataWplywu || item.data || item.date || item.Data_Wplywu);
                          return dt.time ? `${dt.date} ${dt.time}` : dt.date;
                        })()}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-900 group-hover:text-[#1e3a8a] transition line-clamp-2">
                      {item.subject || item.przedmiot}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span className="truncate max-w-[170px]">
                        {item.sender || item.nadawca}
                      </span>
                      <span className={`px-2 py-0.2 rounded text-[10.5px] font-semibold shrink-0 ${
                        item.status === 'Zatwierdzone'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {item.status || 'W toku'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── KOLUMNA 2 (Center): Pilne zgłoszenia techniczne ─────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                <AlertTriangle size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Pilne zgłoszenia techniczne
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('it_issues')}
              className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
            >
              Rejestr ({itIssues.length}) <ChevronRight size={13} className="inline" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentItIssues.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-medium">
                Brak aktywnych zgłoszeń technicznych
              </div>
            ) : (
              recentItIssues.map((issue) => (
                <div
                  key={issue.id || issue.idZgloszenia}
                  onClick={() => onNavigateTab('it_issues')}
                  className={`p-3 rounded-xl border text-xs transition cursor-pointer hover:shadow-xs space-y-1.5 ${
                    issue.ectsImpact?.includes('Krytyczny') || issue.ectsImpact?.includes('Wpływ na tok studiów')
                      ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-50 text-slate-900'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#1e3a8a]">{issue.id || issue.idZgloszenia}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      issue.ectsImpact?.includes('Krytyczny') || issue.ectsImpact?.includes('Wpływ na tok studiów')
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {issue.ectsImpact || 'Zgłoszone'}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 line-clamp-2">{issue.description || issue.opis}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                    <span className="truncate max-w-[150px]">{issue.kierunek || issue.platformArea || 'Platforma e-learningowa'}</span>
                    <span className="font-semibold text-slate-800">{sanitizeStatus(issue.status)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── KOLUMNA 3 (Right): Podstawowe Dokumenty / Ustalenia ─────────────── */}
        <div className="space-y-6">
          
          {/* Top: PODSTAWOWE DOKUMENTY USTROJOWE */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-[#1e3a8a] rounded-lg border border-blue-200">
                  <ShieldCheck size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Dokumenty Ustrojowe
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Akty prawne
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100/70 text-[#1e3a8a] rounded-lg mt-0.5 shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    Regulamin Samorządu Studenckiego WSKZ
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    Jednolity akt ustrojowy z ordynacją wyborczą i ramami kompetencyjnymi organów
                  </p>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-mono text-slate-500">
                  Wersja: Obowiązująca (PDF)
                </span>
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-medium shadow-2xs transition"
                >
                  <ExternalLink size={12} />
                  <span>Otwórz Regulamin</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom: Ustalenia Operacyjne */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-[#1e3a8a] rounded-lg border border-blue-200">
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
                Wszystkie ({decisions.length}) <ChevronRight size={13} className="inline" />
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
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        {dec.status}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900">{dec.topic}</p>
                    <p className="text-[11px] text-slate-600 mt-1">Odp: <strong className="text-slate-800">{dec.responsible}</strong></p>
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
