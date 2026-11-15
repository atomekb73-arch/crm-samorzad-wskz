import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Printer,
  Users,
  RefreshCw,
  ShieldCheck,
  Search,
  Filter,
  Brain,
  Puzzle,
  Armchair,
  Flame,
  Dna,
  Award,
  Zap,
  Leaf,
  Heart,
  Sparkles,
  HelpCircle,
  Target,
  Rocket,
} from 'lucide-react';

import { WSKZ_CLUBS } from '../config/wskzRegistry';
import {
  generateUniversityReport,
  exportReportToExcel,
} from '../services/reportsAggregatorService';
import { isValidAcademicDate } from '../services/teamupService';
import { SEED_STAROSTOWIE } from '../services/contactsService';

const CLUB_ICONS = {
  Brain,
  Puzzle,
  Armchair,
  Search,
  Flame,
  Dna,
  Ribbon: Award,
  Award,
  Zap,
  Leaf,
  Heart,
  Sparkles,
  HelpCircle,
  Target,
  Rocket,
};

/**
 * Usuwa początkowy numer porządkowy z nazwy koła (np. "10 SKN Seksuologii" -> "SKN Seksuologii")
 */
function cleanOrgName(name) {
  return String(name || '').replace(/^\d+\s+/, '').trim();
}

/**
 * Poprawna polska odmiana rzeczownika "osoba"
 */
function getOsobaSuffix(count) {
  const n = Math.abs(Number(count) || 0);
  if (n === 1) return 'osoba';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 'osoby';
  }
  return 'osób';
}

export default function ReportsGeneratorTab({
  correspondence = [],
  operationalDecisions = [],
  starostowie = SEED_STAROSTOWIE,
  onNavigateToLetter = () => {},
}) {
  // ── Presety dat ───────────────────────────────────────────────────────────
  const datePresets = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    const firstDayCurMonth = new Date(curYear, curMonth, 1).toISOString().slice(0, 10);
    const lastDayCurMonth = new Date(curYear, curMonth + 1, 0).toISOString().slice(0, 10);

    const firstDayPrevMonth = new Date(curYear, curMonth - 1, 1).toISOString().slice(0, 10);
    const lastDayPrevMonth = new Date(curYear, curMonth, 0).toISOString().slice(0, 10);

    return {
      currentMonth: { label: 'Bieżący miesiąc', start: firstDayCurMonth, end: lastDayCurMonth },
      previousMonth: { label: 'Poprzedni miesiąc', start: firstDayPrevMonth, end: lastDayPrevMonth },
      winterSemester: { label: 'Semestr zimowy 2026/2027', start: '2026-10-01', end: '2027-02-28' },
      academicYear: { label: 'Cały rok akad. 2026/2027', start: '2026-10-01', end: '2027-09-30' },
    };
  }, []);

  const [activePreset, setActivePreset] = useState('academicYear');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2027-09-30');

  // Selektor Kół (Domyślnie wszystkie 14 kół)
  const [selectedClubs, setSelectedClubs] = useState(() => new Set(WSKZ_CLUBS.map((c) => c.orgId)));
  const [includeSamorzad, setIncludeSamorzad] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const handleSelectPreset = (key) => {
    setActivePreset(key);
    if (datePresets[key]) {
      setStartDate(datePresets[key].start);
      setEndDate(datePresets[key].end);
    }
  };

  const handleToggleClub = (orgId) => {
    setSelectedClubs((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  };

  const handleSelectAllClubs = () => {
    setSelectedClubs(new Set(WSKZ_CLUBS.map((c) => c.orgId)));
  };

  const handleDeselectAllClubs = () => {
    setSelectedClubs(new Set());
  };

  // Pobieranie i przeliczanie raportu (wyłącznie dla ukończonych, realistycznych dat 2020–2035)
  const loadReport = useCallback(async () => {
    if (!isValidAcademicDate(startDate) || !isValidAcademicDate(endDate) || startDate > endDate) {
      return;
    }
    setIsLoading(true);
    try {
      const selectedOrgIdsArray = Array.from(selectedClubs);
      const res = await generateUniversityReport({
        startDate,
        endDate,
        selectedOrgIds: selectedOrgIdsArray.length === WSKZ_CLUBS.length ? null : selectedOrgIdsArray,
        includeSamorzad,
        correspondenceList: correspondence,
        operationalDecisions: operationalDecisions,
        starostowieList: starostowie,
      });
      setReportData(res);
    } catch (err) {
      console.error('Błąd generowania raportu:', err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedClubs, includeSamorzad, correspondence, operationalDecisions, starostowie]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Wyliczenia zgodne 1:1 z MultiHub InterClubSummaryTemplate
  const clubsReport = reportData?.clubsReport || {};
  const selectedOrgs = clubsReport.selectedOrgs || [];
  const substantiveMeetings = clubsReport.substantiveMeetings || [];
  const projectMeetings = clubsReport.projectMeetings || [];
  const byOrgStats = clubsReport.byOrgStats || [];
  const summaryStats = clubsReport.summaryStats || {};

  const substantiveTotalAttendees = substantiveMeetings.reduce(
    (acc, m) => acc + (Number(m.totalParticipants) || 0),
    0
  );
  const projectTotalAttendees = projectMeetings.reduce(
    (acc, m) => acc + (Number(m.totalParticipants) || 0),
    0
  );
  const projectAvgAttendees = projectMeetings.length > 0
    ? (Math.round((projectTotalAttendees / projectMeetings.length) * 10) / 10).toFixed(1)
    : '0.0';

  const totalAllAttendees = substantiveTotalAttendees + projectTotalAttendees;
  const substantiveAvgRounded = substantiveMeetings.length > 0
    ? Math.round(substantiveTotalAttendees / substantiveMeetings.length)
    : 0;

  const isSingleClubReport = selectedOrgs.length === 1;
  const headerSubjectTitle = isSingleClubReport
    ? cleanOrgName(selectedOrgs[0]?.name || selectedOrgs[0]?.shortName)
    : `Wszystkie Koła Naukowe WSKZ (${selectedOrgs.length || selectedClubs.size} Kół)`;

  const formattedDocDate = useMemo(() => {
    const d = reportData?.generatedAt ? new Date(reportData.generatedAt) : new Date();
    return d.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });
  }, [reportData?.generatedAt]);

  // ── Akcja 1: Wystaw jako Pismo A4 (PDF) do Prorektor ds. studenckich ───────
  const handleCreateA4Letter = () => {
    if (!reportData) return;

    const letterBody = [
      `Szanowna Pani Prorektor,`,
      ``,
      `Kancelaria Samorządu Studenckiego Wyższej Szkoły Kształcenia Zawodowego przedkłada oficjalne, zbiorcze zestawienie statystyczne podsumowujące aktywność naukową, warsztatową i organizacyjną Studenckich Kół Naukowych WSKZ oraz organów Samorządu Studenckiego za okres od ${reportData.period.startDate} do ${reportData.period.endDate}.`,
      ``,
      `I. DZIAŁALNOŚĆ STUDENCKICH KÓŁ NAUKOWYCH WSKZ (${selectedOrgs.length} Kół):`,
      `• Spotkania merytoryczne i warsztaty otwarte (Tabela A): ${summaryStats.substantiveEventsCount || 0} (frekwencja: ${substantiveTotalAttendees} os., średnio ${substantiveAvgRounded} os./spotkanie)`,
      `• Prace projektowe i zespoły techniczne (Tabela B): ${summaryStats.projectEventsCount || 0} (frekwencja: ${projectTotalAttendees} os.)`,
      `• Łącznie unikalnych wydarzeń w okresie: ${summaryStats.totalEvents || 0} (w tym ${summaryStats.jointEventsCount || 0} międzykołowe — deduplikowane)`,
      `• Łączna frekwencja z gośćmi (merytoryczna + projektowa): ${totalAllAttendees} ${getOsobaSuffix(totalAllAttendees)}`,
      ``,
      `Wykaz aktywności poszczególnych Kół Naukowych:`,
      ...byOrgStats.map(
        (cs) =>
          `• ${cleanOrgName(cs.org?.name)}: ${cs.substantiveCount} merytorycznych, ${cs.projectCount} projektowych, ${cs.jointCount} wspólnych (łączna frekwencja: ${cs.totalAttendees} os.)`
      ),
      ``,
      ...(reportData.samorzadStats
        ? [
            `II. AKTYWNOŚĆ KANCELARII SAMORZĄDU STUDENCKIEGO:`,
            `• Korespondencja urzędowa (DKO): ${reportData.samorzadStats.dko.total} spraw (wpływające: ${reportData.samorzadStats.dko.in}, wychodzące: ${reportData.samorzadStats.dko.out})`,
            `• Podjęte Ustalenia Operacyjne i dyspozycje: ${reportData.samorzadStats.decisions.total} (zrealizowane: ${reportData.samorzadStats.decisions.done}, w trakcie: ${reportData.samorzadStats.decisions.inProgress})`,
            `• Sieć Starostów Roczników i Grup: ${reportData.samorzadStats.starostowie.total} aktywnych starostów (zgody RODO aktywne: ${reportData.samorzadStats.starostowie.rodoActive})`,
            `• Inicjatywy i posiedzenia Samorządu: ${reportData.samorzadStats.events.count}`,
            ``,
          ]
        : []),
      `Szczegółowy wykaz zrealizowanych wydarzeń (Sekcje A, B, C) stanowi integralny załącznik do niniejszego sprawozdania.`,
      ``,
      `Z wyrazami szacunku,`,
      `Tomasz Bratkowski\nSekretarz Samorządu Studenckiego WSKZ`,
    ].join('\n');

    onNavigateToLetter({
      recipient: `dr Aneta Kazanecka\nProrektor ds. studenckich\nWyższa Szkoła Kształcenia Zawodowego we Wrocławiu`,
      institution: `Władze Uczelni WSKZ`,
      subject: `Zestawienie statystyczne działalności Studenckich Kół Naukowych oraz Samorządu Studenckiego WSKZ za okres ${reportData.period.startDate} – ${reportData.period.endDate}`,
      body: letterBody,
      originTab: 'reports_generator',
    });
  };

  // ── Akcja 2: Eksport do Excel (.xlsx) ──────────────────────────────────────
  const handleExportExcel = () => {
    if (!reportData) return;
    const dateTag = new Date().toISOString().slice(0, 10);
    exportReportToExcel(reportData, `Zestawienie_WSKZ_${dateTag}.xlsx`);
  };

  // ── Akcja 3: Drukuj pełny załącznik tabelaryczny (A4) ──────────────────────
  const handlePrintTables = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-6">
      {/* Styl wydruku A4 spójny 1:1 z MultiHub InterClubSummaryTemplate */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 12mm;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav,
          header,
          #filter-panel,
          #export-buttons-bar,
          .print-hidden-block {
            display: none !important;
          }
          #printable-report-content {
            display: block !important;
            width: 100% !important;
            max-width: 186mm !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            padding: 0 !important;
          }
          .inter-club-report-print table {
            table-layout: fixed !important;
            width: 100% !important;
            word-wrap: break-word !important;
            font-size: 9.5px !important;
          }
          .inter-club-report-print th,
          .inter-club-report-print td {
            padding: 3px 4px !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            font-size: 9.5px !important;
            line-height: 1.2 !important;
          }
          .inter-club-report-print tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .inter-club-kpi-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            padding: 6px 8px !important;
          }
          .inter-club-signatures {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ── Top Header & Export Toolbar ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 print-hidden-block">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-indigo-50 text-indigo-900 rounded-xl border border-indigo-100 shrink-0">
              <BarChart3 size={28} className="text-[#1e3a8a]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  Zestawienia i Raporty Działalności Studenckiej WSKZ
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Supabase MultiHub + Teamup Live
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Centralny generator sprawozdań dla Władz Uczelni (Prorektor ds. studenckich), łączący aktywność 14 Kół Naukowych (Teamup API + Supabase) oraz Kancelarii Samorządu Studenckiego.
              </p>
            </div>
          </div>

          <div id="export-buttons-bar" className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleCreateA4Letter}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1e3a8a] hover:bg-[#1d4ed8] shadow-xs transition cursor-pointer"
              title="Wygeneruj oficjalne pismo A4 do Prorektor ds. studenckich na papierze firmowym WSKZ"
            >
              <FileText size={15} className="text-amber-300" />
              <span>Wystaw jako Pismo A4 (PDF)</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs transition cursor-pointer"
              title="Pobierz wieloarkuszowy arkusz kalkulacyjny programu Excel (.xlsx)"
            >
              <FileSpreadsheet size={15} className="text-emerald-700" />
              <span>Eksportuj do Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintTables}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition cursor-pointer"
              title="Drukuj pełny załącznik analityczny jako załącznik do pisma"
            >
              <Printer size={15} className="text-slate-600" />
              <span>Drukuj załącznik (A4)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Panel Filtrów i Konfiguracji Zakresu ────────────────────────────── */}
      <div id="filter-panel" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 print-hidden-block">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#1e3a8a]" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Konfiguracja Zakresu Raportu
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {Object.entries(datePresets).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectPreset(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  activePreset === key
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Data początkowa (OD)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setActivePreset('custom');
                setStartDate(e.target.value);
              }}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Data końcowa (DO)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setActivePreset('custom');
                setEndDate(e.target.value);
              }}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-4 p-2 bg-slate-50 rounded-xl border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={includeSamorzad}
                onChange={(e) => setIncludeSamorzad(e.target.checked)}
                className="w-4 h-4 rounded text-blue-900 focus:ring-blue-500 cursor-pointer"
              />
              <span>Uwzględnij statystyki Samorządu (DKO, UO, Starostowie)</span>
            </label>

            <button
              type="button"
              onClick={() => loadReport()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-900 hover:bg-blue-100 transition cursor-pointer shrink-0"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>Odśwież</span>
            </button>
          </div>
        </div>

        {/* Selektor 14 Kół Naukowych */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-slate-600">
              Wybór Kół Naukowych ({selectedClubs.size} z {WSKZ_CLUBS.length}):
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleSelectAllClubs}
                className="text-blue-900 font-semibold hover:underline cursor-pointer"
              >
                Zaznacz wszystkie 14 kół
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleDeselectAllClubs}
                className="text-slate-500 font-semibold hover:underline cursor-pointer"
              >
                Odznacz wszystkie
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {WSKZ_CLUBS.map((club) => {
              const isSelected = selectedClubs.has(club.orgId);
              const IconComp = CLUB_ICONS[club.icon] || Users;
              return (
                <button
                  key={club.orgId}
                  type="button"
                  onClick={() => handleToggleClub(club.orgId)}
                  style={{
                    borderColor: isSelected ? club.color : '#e2e8f0',
                    backgroundColor: isSelected ? `${club.color}10` : '#ffffff',
                  }}
                  className={`p-2 rounded-xl border text-left flex items-start gap-2 transition cursor-pointer ${
                    isSelected ? 'shadow-2xs font-bold' : 'opacity-65 hover:opacity-100'
                  }`}
                >
                  <div
                    style={{ color: club.color, backgroundColor: `${club.color}20` }}
                    className="p-1 rounded-lg shrink-0 mt-0.5"
                  >
                    <IconComp size={13} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-bold text-slate-900 truncate">
                      {club.number} {club.shortName}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {club.subcalendarId ? 'Teamup Live' : 'Brak kalendarza'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Główny Arkusz A4 Raportu (1:1 z MultiHub InterClubSummaryTemplate) ── */}
      {reportData && (
        <div
          id="printable-report-content"
          className="w-full max-w-5xl mx-auto space-y-5 print:space-y-3 print:w-full print:max-w-[186mm] print:mx-auto print:box-border text-slate-900 font-sans inter-club-report-print"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 print:p-0 print:border-none print:shadow-none print:rounded-none">
            {/* Nagłówek Urzędowy WSKZ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 print:pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 print:bg-black inline-block"></span>
                  <span className="text-[10.5px] font-bold tracking-widest uppercase text-slate-500 font-mono">
                    Wyższa Szkoła Kształcenia Zawodowego • Kancelaria Samorządu Studenckiego
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 leading-tight">
                  <div>Sprawozdanie Zbiorcze Aktywności</div>
                  <div className="text-indigo-800 font-extrabold">{headerSubjectTitle}</div>
                </h1>
                <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                  <div>Ustandaryzowane zestawienie dla Władz Uczelni</div>
                  <div>(Prorektor ds. studenckich, Dziekanat, Kolegium Dziekańskie, PKA)</div>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="text-[11px] font-mono font-bold text-slate-600">
                  Okres: <span className="text-indigo-600 font-black">{startDate}</span> do{' '}
                  <span className="text-indigo-600 font-black">{endDate}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Data wygenerowania: <strong>{formattedDocDate}</strong>
                </div>
                <div className="text-[10px] text-slate-500">
                  Zakres kół: <strong>{isSingleClubReport ? headerSubjectTitle : `${selectedOrgs.length} Kół Naukowych WSKZ`}</strong>
                </div>
              </div>
            </div>

            {/* ── Kafelki Syntetyczne (4 kompaktowe KPI w jednym poziomym pasku) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 print:my-2.5">
              {/* KAFELEK 1: Spotkania Merytoryczne */}
              <div className="inter-club-kpi-card bg-emerald-50/70 rounded-xl px-2.5 py-2 border border-emerald-200/80 print:border-slate-300">
                <span className="text-[9.5px] font-bold text-emerald-800 uppercase tracking-wide block leading-tight">
                  Spotkania Merytoryczne
                </span>
                <div className="text-[19px] leading-tight font-bold text-emerald-950 mt-0.5 font-mono">
                  {summaryStats.substantiveEventsCount || 0}
                </div>
                <span className="text-[9px] text-emerald-700 mt-0.5 block leading-tight">
                  Warsztaty, prelekcje, wykłady
                </span>
              </div>

              {/* KAFELEK 2: Prace Projektowe */}
              <div className="inter-club-kpi-card bg-cyan-50/70 rounded-xl px-2.5 py-2 border border-cyan-200/80 print:border-slate-300">
                <span className="text-[9.5px] font-bold text-cyan-800 uppercase tracking-wide block leading-tight">
                  Prace Projektowe &amp; Tech.
                </span>
                <div className="text-[19px] leading-tight font-bold text-cyan-950 mt-0.5 font-mono">
                  {summaryStats.projectEventsCount || 0}
                </div>
                <span className="text-[9px] text-cyan-700 mt-0.5 block leading-tight">
                  Zespoły badawcze i wdrożenia
                </span>
              </div>

              {/* KAFELEK 3: Łącznie Wydarzeń */}
              <div className="inter-club-kpi-card bg-slate-50/90 rounded-xl px-2.5 py-2 border border-slate-200/90 print:border-slate-300">
                <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wide block leading-tight">
                  Łącznie Wydarzeń
                </span>
                <div className="text-[19px] leading-tight font-bold text-slate-900 mt-0.5 font-mono">
                  {summaryStats.totalEvents || 0}
                </div>
                <span className="text-[9px] text-slate-500 mt-0.5 block leading-tight">
                  w tym {summaryStats.jointEventsCount || 0} międzykołowe
                </span>
              </div>

              {/* KAFELEK 4: Łączna Frekwencja z Gośćmi */}
              <div className="inter-club-kpi-card bg-indigo-50/70 rounded-xl px-2.5 py-2 border border-indigo-200/80 print:border-slate-300">
                <span className="text-[9.5px] font-bold text-indigo-800 uppercase tracking-wide block leading-tight">
                  Łączna Frekwencja z Gośćmi
                </span>
                <div className="text-[19px] leading-tight font-bold text-indigo-950 mt-0.5 font-mono">
                  {totalAllAttendees}{' '}
                  <span className="text-xs font-sans font-normal text-indigo-700">
                    {getOsobaSuffix(totalAllAttendees)}
                  </span>
                </div>
                <span className="text-[9px] text-indigo-700 mt-0.5 block leading-tight font-medium">
                  średnia: {substantiveAvgRounded} os. / spotkanie merytoryczne
                </span>
              </div>
            </div>

            {/* ── SEKCJA A: Spotkania Merytoryczne, Warsztaty i Otwarte Prelekcje ── */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  A. Spotkania Merytoryczne, Warsztaty i Otwarte Prelekcje ({substantiveMeetings.length})
                </h2>
                <span className="text-[10.5px] font-mono text-slate-500">
                  Łączna frekwencja: <strong>{substantiveTotalAttendees}</strong> uczestników
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 print:rounded-none">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '4%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '19%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '10%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                      <th className="p-2 text-center whitespace-nowrap">Lp.</th>
                      <th className="p-2 text-center whitespace-nowrap">Data</th>
                      <th className="p-2 whitespace-nowrap">Koło wiodące</th>
                      <th className="p-2 text-center whitespace-nowrap">Współorganizatorzy</th>
                      <th className="p-2">Temat / Tytuł spotkania</th>
                      <th className="p-2">Prelegent / Prowadzący</th>
                      <th className="p-2 text-center whitespace-nowrap bg-emerald-50/70">Frekwencja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {substantiveMeetings.length > 0 ? (
                      substantiveMeetings.map((m, idx) => (
                        <tr
                          key={m.id || idx}
                          className="hover:bg-slate-50/80 transition-colors break-inside-avoid print:break-inside-avoid"
                        >
                          <td className="p-2 text-center font-mono text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="p-2 text-center text-slate-700 whitespace-nowrap text-[10px]">{m.date}</td>
                          <td className="p-2">
                            <span className="font-semibold text-slate-900 block break-words" title={m.primaryOrg?.name}>
                              {cleanOrgName(m.primaryOrg?.shortName || m.primaryOrg?.name)}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            {m.coOrgs && m.coOrgs.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {m.coOrgs.map((co) => (
                                  <span
                                    key={co.orgId}
                                    className="inline-block text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 print:border-slate-300"
                                  >
                                    {co.code || co.shortName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="p-2 font-medium text-slate-900 break-words">{m.title}</td>
                          <td className="p-2 text-slate-600 text-[10.5px] break-words">{m.speaker}</td>
                          <td className="p-2 text-center whitespace-nowrap font-mono font-bold text-emerald-800 bg-emerald-50/40">
                            {m.totalParticipants > 0 ? `${m.totalParticipants} os.` : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-xs text-slate-500">
                          Brak zarejestrowanych spotkań merytorycznych w wybranym przedziale czasowym.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── SEKCJA B: Spotkania Zespołów Projektowych, Technicznych i Badawczych ── */}
            <div className="space-y-2.5 pt-5 print:pt-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                  B. Spotkania Zespołów Projektowych, Technicznych i Badawczych ({projectMeetings.length})
                </h2>
                <span className="text-[10.5px] font-mono text-slate-500">
                  Niewliczane do mianownika frekwencji ogólnej
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 print:rounded-none">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '4%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '19%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '10%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                      <th className="p-2 text-center whitespace-nowrap">Lp.</th>
                      <th className="p-2 text-center whitespace-nowrap">Data</th>
                      <th className="p-2 whitespace-nowrap">Koło wiodące</th>
                      <th className="p-2 text-center whitespace-nowrap">Współorganizatorzy</th>
                      <th className="p-2">Temat / Cel prac projektowych</th>
                      <th className="p-2">Koordynator / Prelegent</th>
                      <th className="p-2 text-center whitespace-nowrap bg-cyan-50/70">Frekwencja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {projectMeetings.length > 0 ? (
                      projectMeetings.map((m, idx) => (
                        <tr
                          key={m.id || idx}
                          className="hover:bg-slate-50/80 transition-colors break-inside-avoid print:break-inside-avoid"
                        >
                          <td className="p-2 text-center font-mono text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="p-2 text-center text-slate-700 whitespace-nowrap text-[10px]">{m.date}</td>
                          <td className="p-2">
                            <span className="font-semibold text-slate-900 block break-words">
                              {cleanOrgName(m.primaryOrg?.shortName || m.primaryOrg?.name)}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            {m.coOrgs && m.coOrgs.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {m.coOrgs.map((co) => (
                                  <span
                                    key={co.orgId}
                                    className="inline-block text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 print:border-slate-300"
                                  >
                                    {co.code || co.shortName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="p-2 font-medium text-slate-900 break-words">{m.title}</td>
                          <td className="p-2 text-slate-600 text-[10.5px] break-words">{m.speaker}</td>
                          <td className="p-2 text-center whitespace-nowrap font-mono font-bold text-cyan-800 bg-cyan-50/40">
                            {m.totalParticipants > 0 ? `${m.totalParticipants} os.` : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-xs text-slate-500">
                          Brak zarejestrowanych spotkań projektowych/technicznych w wybranym przedziale czasowym.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pasek podsumowujący frekwencję projektową */}
              <div className="mt-2 px-3 py-1.5 rounded-xl bg-cyan-50/80 border border-cyan-200/90 text-cyan-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 print:py-1 print:px-2.5 print:text-[9.5px] print:bg-slate-50 print:border-slate-300 break-inside-avoid print:break-inside-avoid">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-600 print:bg-slate-700 shrink-0"></span>
                  <span>
                    Łączna frekwencja na spotkaniach grup projektowych:{' '}
                    <strong className="font-bold text-cyan-900 print:text-slate-900">{projectTotalAttendees}</strong>{' '}
                    uczestników (średnio{' '}
                    <strong className="font-bold text-cyan-900 print:text-slate-900">{projectAvgAttendees}</strong>{' '}
                    os./spotkanie)
                  </span>
                </div>
                <span className="text-[10px] text-cyan-700 print:text-slate-600 font-medium">
                  Osobny wskaźnik zaangażowania
                </span>
              </div>
            </div>

            {/* ── SEKCJA C: Zbiorcza Aktywność Kół Naukowych WSKZ ── */}
            <div className="space-y-2.5 pt-5 print:pt-3.5 print:break-before-page">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  C. Zbiorcza Aktywność Kół Naukowych WSKZ ({byOrgStats.length} Kół)
                </h2>
                <span className="text-[10.5px] font-mono text-slate-500">
                  Synteza statystyczna (frekwencja merytoryczna + projektowa)
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 print:rounded-none">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '37%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '11%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                      <th className="p-2 text-center whitespace-nowrap">Lp.</th>
                      <th className="p-2 text-center whitespace-nowrap">Kod</th>
                      <th className="p-2 whitespace-nowrap">Nazwa Koła Naukowego</th>
                      <th className="p-2 text-center whitespace-nowrap bg-emerald-50/50">Merytoryczne</th>
                      <th className="p-2 text-center whitespace-nowrap bg-indigo-50/50">Frekwencja</th>
                      <th className="p-2 text-center whitespace-nowrap bg-cyan-50/50">Projektowe</th>
                      <th className="p-2 text-center whitespace-nowrap">Wspólne</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {byOrgStats.map((item, idx) => {
                      const org = item.org;
                      return (
                        <tr
                          key={org.orgId || idx}
                          className="hover:bg-slate-50/80 transition-colors break-inside-avoid print:break-inside-avoid"
                        >
                          <td className="p-2 text-center font-mono text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="p-2 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                              {org.code || org.number}
                            </span>
                          </td>
                          <td className="p-2 font-bold text-slate-900 break-words">
                            {cleanOrgName(org.name)}
                            {org.hasActiveCrm && (
                              <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 whitespace-nowrap">
                                CRM
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono font-semibold text-emerald-800 bg-emerald-50/30">
                            {item.substantiveCount}
                          </td>
                          <td className="p-2 text-center font-mono font-semibold text-indigo-900 bg-indigo-50/30 whitespace-nowrap">
                            {item.totalAttendees > 0 ? `${item.totalAttendees} os.` : '—'}
                          </td>
                          <td className="p-2 text-center font-mono font-semibold text-cyan-800 bg-cyan-50/30">
                            {item.projectCount}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-700">
                            {item.jointCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900 text-xs">
                      <td colSpan={3} className="p-2 text-right uppercase tracking-wider text-[10px]">
                        Suma łączna (wydarzenia deduplikowane):
                      </td>
                      <td className="p-2 text-center font-mono text-emerald-900">
                        {summaryStats.substantiveEventsCount || 0}
                      </td>
                      <td className="p-2 text-center font-mono text-indigo-950 whitespace-nowrap">
                        {totalAllAttendees} os.
                      </td>
                      <td className="p-2 text-center font-mono text-cyan-900">
                        {summaryStats.projectEventsCount || 0}
                      </td>
                      <td className="p-2 text-center font-mono">
                        {summaryStats.jointEventsCount || 0}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── SEKCJA D: Działalność Kancelarii Samorządu Studenckiego (opcjonalna) ── */}
            {reportData?.samorzadStats && (
              <div className="space-y-3 pt-5 print:pt-3.5 break-inside-avoid print:break-inside-avoid">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck size={15} className="text-[#1e3a8a]" />
                    D. Działalność Kancelarii Samorządu Studenckiego WSKZ (Dane zanonimizowane)
                  </h2>
                  <span className="text-[10.5px] font-mono text-slate-500">
                    Łącznie spraw i ustaleń: <strong>{reportData.samorzadStats.dko.total + reportData.samorzadStats.decisions.total}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Blok 1: DKO */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>Dziennik Korespondencji (DKO)</span>
                      <span className="text-blue-900 font-mono">{reportData.samorzadStats.dko.total} spraw</span>
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Wpływające (IN):</span>
                        <strong>{reportData.samorzadStats.dko.in}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Wychodzące (OUT):</span>
                        <strong>{reportData.samorzadStats.dko.out}</strong>
                      </div>
                      <div className="pt-1 border-t border-slate-200 text-[10px]">
                        Statusy:{' '}
                        {Object.entries(reportData.samorzadStats.dko.byStatus).map(([st, cnt]) => (
                          <span key={st} className="mr-2">
                            {st}: <strong>{cnt}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Blok 2: Ustalenia Operacyjne */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>Ustalenia Operacyjne i Uchwały</span>
                      <span className="text-purple-900 font-mono">{reportData.samorzadStats.decisions.total} podjętych</span>
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Zrealizowane:</span>
                        <strong className="text-emerald-700">{reportData.samorzadStats.decisions.done}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>W realizacji:</span>
                        <strong className="text-amber-700">{reportData.samorzadStats.decisions.inProgress}</strong>
                      </div>
                      <div
                        className="pt-1 border-t border-slate-200 text-[10px] text-slate-500 truncate"
                        title={reportData.samorzadStats.decisions.topics.join(', ')}
                      >
                        Ostatnie uchwały: {reportData.samorzadStats.decisions.topics.slice(0, 2).join('; ') || 'Brak'}
                      </div>
                    </div>
                  </div>

                  {/* Blok 3: Sieć Starostów */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>Sieć Starostów Roczników</span>
                      <span className="text-emerald-800 font-mono">{reportData.samorzadStats.starostowie.total} aktywnych</span>
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Zgody RODO aktywne:</span>
                        <strong className="text-emerald-700">{reportData.samorzadStats.starostowie.rodoActive}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Oczekuje na podpis:</span>
                        <strong className="text-amber-700">{reportData.samorzadStats.starostowie.rodoPending}</strong>
                      </div>
                      <div className="pt-1 border-t border-slate-200 text-[10px]">
                        Kierunki:{' '}
                        {Object.entries(reportData.samorzadStats.starostowie.byField).slice(0, 3).map(([fld, cnt]) => (
                          <span key={fld} className="mr-2">
                            {fld}: <strong>{cnt}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Stopka z Podpisami Władz Uczelni ── */}
            <div className="inter-club-signatures pt-6 mt-5 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs print:pt-5 print:mt-4 print:break-inside-avoid break-inside-avoid">
              <div className="space-y-1">
                <div className="border-b border-dashed border-slate-400 h-8 w-40 mx-auto mb-1.5"></div>
                <div className="font-bold text-slate-900 text-[11px]">Sekretarz Samorządu Studenckiego</div>
                <div className="text-[10px] text-slate-500">Kancelaria Samorządu WSKZ</div>
              </div>

              <div className="space-y-1">
                <div className="border-b border-dashed border-slate-400 h-8 w-40 mx-auto mb-1.5"></div>
                <div className="font-bold text-slate-900 text-[11px]">Opiekunowie Naukowi Kół</div>
                <div className="text-[10px] text-slate-500">Wyższa Szkoła Kształcenia Zawodowego</div>
              </div>

              <div className="space-y-1">
                <div className="border-b border-dashed border-slate-400 h-8 w-40 mx-auto mb-1.5"></div>
                <div className="font-bold text-slate-900 text-[11px]">Prorektor ds. studenckich</div>
                <div className="text-[10px] text-slate-500">Wyższa Szkoła Kształcenia Zawodowego</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
