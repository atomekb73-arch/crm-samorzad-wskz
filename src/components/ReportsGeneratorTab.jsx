import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Printer,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  RefreshCw,
  Layers,
  ShieldCheck,
  Check,
  Wrench,
  Sparkles,
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
  HelpCircle,
  Target,
  Rocket,
  Building2,
  Mail,
  ChevronDown,
} from 'lucide-react';

import {
  WSKZ_CLUBS,
  SAMORZAD_SUBCALENDAR_ID,
} from '../config/wskzRegistry';
import {
  generateUniversityReport,
  exportReportToExcel,
} from '../services/reportsAggregatorService';
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
    const curMonth = now.getMonth(); // 0-indexed

    // Bieżący miesiąc
    const firstDayCurMonth = new Date(curYear, curMonth, 1).toISOString().slice(0, 10);
    const lastDayCurMonth = new Date(curYear, curMonth + 1, 0).toISOString().slice(0, 10);

    // Poprzedni miesiąc
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
  const [selectedClubs, setSelectedClubs] = useState(() => new Set(WSKZ_CLUBS.map(c => c.orgId)));
  const [includeSamorzad, setIncludeSamorzad] = useState(true);

  // Stan ładowania i wynik raportu
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [eventsSearchTerm, setEventsSearchTerm] = useState('');
  const [eventsTypeFilter, setEventsTypeFilter] = useState('ALL'); // 'ALL' | 'substantive' | 'project' | 'internal'

  // Obsługa wyboru presetu dat
  const handleSelectPreset = (key) => {
    setActivePreset(key);
    if (datePresets[key]) {
      setStartDate(datePresets[key].start);
      setEndDate(datePresets[key].end);
    }
  };

  // Przełączanie pojedynczego koła
  const handleToggleClub = (orgId) => {
    setSelectedClubs(prev => {
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
    setSelectedClubs(new Set(WSKZ_CLUBS.map(c => c.orgId)));
  };

  const handleDeselectAllClubs = () => {
    setSelectedClubs(new Set());
  };

  // Pobieranie i przeliczanie raportu
  const loadReport = useCallback(async () => {
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

  // Filtrowane wydarzenia w tabeli
  const filteredEventsList = useMemo(() => {
    if (!reportData?.clubsReport?.allUniqueMeetings) return [];
    return reportData.clubsReport.allUniqueMeetings.filter(m => {
      if (eventsTypeFilter === 'substantive' && (m.meetingType === 'project' || m.meetingType === 'internal')) return false;
      if (eventsTypeFilter === 'project' && m.meetingType !== 'project') return false;
      if (eventsTypeFilter === 'internal' && m.meetingType !== 'internal') return false;

      if (eventsSearchTerm.trim()) {
        const term = eventsSearchTerm.toLowerCase();
        const searchable = `${m.title} ${m.who} ${m.location} ${m.participatingClubs.map(c => c.name).join(' ')}`.toLowerCase();
        if (!searchable.includes(term)) return false;
      }
      return true;
    });
  }, [reportData, eventsTypeFilter, eventsSearchTerm]);

  // ── Akcja 1: Wystaw jako Pismo A4 (PDF) do Prorektor ds. studenckich ───────
  const handleCreateA4Letter = () => {
    if (!reportData) return;

    const letterBody = [
      `Szanowna Pani Prorektor,`,
      ``,
      `Kancelaria Samorządu Studenckiego Wyższej Szkoły Kształcenia Zawodowego przedkłada oficjalne, zbiorcze zestawienie statystyczne podsumowujące aktywność naukową, warsztatową i organizacyjną Studenckich Kół Naukowych WSKZ oraz organów Samorządu Studenckiego za okres od ${reportData.period.startDate} do ${reportData.period.endDate}.`,
      ``,
      `I. DZIAŁALNOŚĆ 14 STUDENCKICH KÓŁ NAUKOWYCH WSKZ:`,
      `• Liczba monitorowanych Kół Naukowych: ${reportData.clubsReport.activeClubsCount}`,
      `• Łączna liczba unikalnych wydarzeń w okresie: ${reportData.clubsReport.totalUniqueMeetings} (wydarzenia międzykołowe deduplikowane — liczone jako 1 unikalne)`,
      `• Spotkania merytoryczne i warsztaty otwarte: ${reportData.clubsReport.substantiveMeetingsCount}`,
      `• Łączna frekwencja zarejestrowana na spotkaniach merytorycznych: ${reportData.clubsReport.totalParticipants} uczestników`,
      `• Średnia liczba uczestników na spotkanie merytoryczne: ${reportData.clubsReport.substantiveMeetingsCount > 0 ? Math.round(reportData.clubsReport.totalParticipants / reportData.clubsReport.substantiveMeetingsCount) : 0} osób`,
      `• Spotkania robocze i techniczne zespołów projektowych (Wrench): ${reportData.clubsReport.projectMeetingsCount}`,
      `• Posiedzenia wewnętrzne zarządów kół: ${reportData.clubsReport.internalMeetingsCount}`,
      ``,
      `Wykaz aktywności poszczególnych Kół Naukowych:`,
      ...reportData.clubsReport.clubsStats.map(cs => 
        `• ${cs.club.name}: ${cs.substantiveCount} spotkań merytorycznych (${cs.totalParticipants} os.), ${cs.projectCount} spotkań projektowych`
      ),
      ``,
      ...(reportData.samorzadStats ? [
        `II. AKTYWNOŚĆ KANCELARII SAMORZĄDU STUDENCKIEGO:`,
        `• Korespondencja urzędowa (DKO): ${reportData.samorzadStats.dko.total} spraw (wpływające: ${reportData.samorzadStats.dko.in}, wychodzące: ${reportData.samorzadStats.dko.out})`,
        `• Podjęte Ustalenia Operacyjne i dyspozycje: ${reportData.samorzadStats.decisions.total} (zrealizowane: ${reportData.samorzadStats.decisions.done}, w trakcie: ${reportData.samorzadStats.decisions.inProgress})`,
        `• Sieć Starostów Roczników i Grup: ${reportData.samorzadStats.starostowie.total} aktywnych starostów (zgody RODO aktywne: ${reportData.samorzadStats.starostowie.rodoActive})`,
        `• Inicjatywy i posiedzenia Samorządu: ${reportData.samorzadStats.events.count}`,
        ``,
      ] : []),
      `Szczegółowy wykaz zrealizowanych wydarzeń oraz załączniki tabelaryczne stanowią integralną część niniejszego sprawozdania.`,
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
      {/* Styl wydruku tabelarycznego załącznika */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
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
          }
          table {
            font-size: 8pt !important;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
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

          {/* ── 3 Główne Przyciski Eksportu ─────────────────────────────────── */}
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

          {/* Szybkie presety dat */}
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

        {/* Własny wybór Od – Do oraz Przełącznik Samorządu */}
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
              onClick={loadReport}
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

      {/* ── Widok Podsumowania (KPI & Raport na Ekranie) ────────────────────── */}
      <div id="printable-report-content" className="space-y-6">
        {/* Nagłówek druku A4 załącznika tabelarycznego */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
          <div className="text-[10pt] font-bold uppercase text-[#1e3a8a]">
            Wyższa Szkoła Kształcenia Zawodowego • Kancelaria Samorządu Studenckiego
          </div>
          <h2 className="text-[15pt] font-bold text-slate-900 mt-1">
            Zbiorcze Zestawienie Aktywności Kół Naukowych i Samorządu Studenckiego WSKZ
          </h2>
          <div className="text-[9pt] text-slate-600 mt-0.5">
            Okres sprawozdawczy: <strong>{startDate}</strong> do <strong>{endDate}</strong> • Załącznik analityczny do pisma przewodniego
          </div>
        </div>

        {/* Karty KPI */}
        {reportData && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-100 shrink-0">
                <Calendar size={22} className="text-[#1e3a8a]" />
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold text-slate-900">
                  {reportData.clubsReport.substantiveMeetingsCount}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Spotkania merytoryczne i warsztaty
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-100 shrink-0">
                <Users size={22} className="text-emerald-700" />
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold text-emerald-700">
                  {reportData.clubsReport.totalParticipants}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Łączna frekwencja z gośćmi
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-100 shrink-0">
                <Wrench size={22} className="text-amber-700" />
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold text-amber-800">
                  {reportData.clubsReport.projectMeetingsCount}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Spotkania zespołów projektowych
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-purple-50 text-purple-900 rounded-xl border border-purple-100 shrink-0">
                <Layers size={22} className="text-purple-700" />
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold text-purple-900">
                  {reportData.samorzadStats ? reportData.samorzadStats.dko.total + reportData.samorzadStats.decisions.total : reportData.clubsReport.totalUniqueMeetings}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  {reportData.samorzadStats ? 'Sprawy DKO + Ustalenia Samorządu' : 'Wszystkie unikalne wydarzenia'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tabela Zbiorcza 14 Kół Naukowych ──────────────────────────────── */}
        {reportData && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm md:text-base font-bold text-slate-900">
                  Tabela Zbiorcza Aktywności Kół Naukowych WSKZ ({reportData.clubsReport.activeClubsCount} kół)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Wydarzenia międzykołowe deduplikowane w podsumowaniu łącznym. Spotkania projektowe liczone osobno.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[10.5px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 font-bold">Koło Naukowe</th>
                    <th className="py-3 px-3.5 font-bold">Wydział</th>
                    <th className="py-3 px-3.5 font-bold text-center">Spotkania merytoryczne</th>
                    <th className="py-3 px-3.5 font-bold text-center">Łączna frekwencja</th>
                    <th className="py-3 px-3.5 font-bold text-center">Średnia / spotkanie</th>
                    <th className="py-3 px-3.5 font-bold text-center">
                      <span className="inline-flex items-center gap-1 text-amber-800">
                        <Wrench size={12} />
                        Projektowe
                      </span>
                    </th>
                    <th className="py-3 px-3.5 font-bold text-center">Zarząd</th>
                    <th className="py-3 px-3.5 font-bold text-right">Razem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.clubsReport.clubsStats.map((cs) => {
                    const IconComp = CLUB_ICONS[cs.club.icon] || Users;
                    return (
                      <tr key={cs.club.orgId} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3.5 font-medium text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div
                              style={{ color: cs.club.color, backgroundColor: `${cs.club.color}18` }}
                              className="p-1.5 rounded-lg shrink-0"
                            >
                              <IconComp size={14} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{cs.club.name}</div>
                              <div className="text-[10px] text-slate-400">orgId: {cs.club.orgId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600">{cs.club.faculty}</td>
                        <td className="py-3 px-3.5 text-center font-bold text-blue-900">
                          {cs.substantiveCount}
                        </td>
                        <td className="py-3 px-3.5 text-center font-bold text-emerald-700">
                          {cs.totalParticipants} os.
                        </td>
                        <td className="py-3 px-3.5 text-center text-slate-600">
                          {cs.avgAttendance} os.
                        </td>
                        <td className="py-3 px-3.5 text-center font-bold text-amber-800">
                          {cs.projectCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              <Wrench size={11} />
                              {cs.projectCount}
                            </span>
                          ) : (
                            '0'
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center text-slate-500">
                          {cs.internalCount}
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-slate-900">
                          {cs.meetingsCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td className="py-3.5 px-3.5">
                      ŁĄCZNIE (Deduplikowane wydarzenia unikalne)
                    </td>
                    <td className="py-3.5 px-3.5 text-slate-500">Wszystkie wydziały WSKZ</td>
                    <td className="py-3.5 px-3.5 text-center text-blue-900 text-sm">
                      {reportData.clubsReport.substantiveMeetingsCount}
                    </td>
                    <td className="py-3.5 px-3.5 text-center text-emerald-800 text-sm">
                      {reportData.clubsReport.totalParticipants} os.
                    </td>
                    <td className="py-3.5 px-3.5 text-center text-slate-700">
                      {reportData.clubsReport.substantiveMeetingsCount > 0
                        ? Math.round(reportData.clubsReport.totalParticipants / reportData.clubsReport.substantiveMeetingsCount)
                        : 0}{' '}
                      os.
                    </td>
                    <td className="py-3.5 px-3.5 text-center text-amber-800 text-sm">
                      {reportData.clubsReport.projectMeetingsCount}
                    </td>
                    <td className="py-3.5 px-3.5 text-center text-slate-700">
                      {reportData.clubsReport.internalMeetingsCount}
                    </td>
                    <td className="py-3.5 px-3.5 text-right text-slate-900 text-sm">
                      {reportData.clubsReport.totalUniqueMeetings}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Sekcja Statystyk Kancelarii Samorządu Studenckiego ──────────────── */}
        {reportData?.samorzadStats && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#1e3a8a]" />
                  Działalność Samorządu Studenckiego WSKZ (Dane Kancelarii — 100% zanonimizowane)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Podsumowanie rejestru DKO, zrealizowanych ustaleń operacyjnych oraz obsadzenia starostów.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Blok 1: DKO */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Dziennik Korespondencji (DKO)</span>
                  <span className="text-blue-900">{reportData.samorzadStats.dko.total} spraw</span>
                </div>
                <div className="text-[11.5px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Wpływające (IN):</span>
                    <strong>{reportData.samorzadStats.dko.in}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Wychodzące (OUT):</span>
                    <strong>{reportData.samorzadStats.dko.out}</strong>
                  </div>
                  <div className="pt-1 border-t border-slate-200 text-[10.5px]">
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
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Ustalenia Operacyjne i Uchwały</span>
                  <span className="text-purple-900">{reportData.samorzadStats.decisions.total} podjętych</span>
                </div>
                <div className="text-[11.5px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Zrealizowane:</span>
                    <strong className="text-emerald-700">{reportData.samorzadStats.decisions.done}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>W realizacji:</span>
                    <strong className="text-amber-700">{reportData.samorzadStats.decisions.inProgress}</strong>
                  </div>
                  <div className="pt-1 border-t border-slate-200 text-[10px] text-slate-500 truncate" title={reportData.samorzadStats.decisions.topics.join(', ')}>
                    Ostatnie uchwały: {reportData.samorzadStats.decisions.topics.slice(0, 2).join('; ') || 'Brak'}
                  </div>
                </div>
              </div>

              {/* Blok 3: Sieć Starostów */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Sieć Starostów Roczników</span>
                  <span className="text-emerald-800">{reportData.samorzadStats.starostowie.total} aktywnych</span>
                </div>
                <div className="text-[11.5px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Zgody RODO aktywne:</span>
                    <strong className="text-emerald-700">{reportData.samorzadStats.starostowie.rodoActive}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Oczekuje na podpis:</span>
                    <strong className="text-amber-700">{reportData.samorzadStats.starostowie.rodoPending}</strong>
                  </div>
                  <div className="pt-1 border-t border-slate-200 text-[10.5px]">
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

        {/* ── Szczegółowy Wykaz Zrealizowanych Wydarzeń w Okresie ─────────────── */}
        {reportData && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm md:text-base font-bold text-slate-900">
                  Szczegółowy Wykaz Wydarzeń w Wybranym Okresie ({filteredEventsList.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Wszystkie zrealizowane i zaplanowane inicjatywy zsynchronizowane z kalendarzem Teamup i bazą Supabase.
                </p>
              </div>

              {/* Filtry wyszukiwania wydarzeń */}
              <div className="flex items-center gap-2 print-hidden-block">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={eventsSearchTerm}
                    onChange={(e) => setEventsSearchTerm(e.target.value)}
                    placeholder="Szukaj spotkania..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={eventsTypeFilter}
                  onChange={(e) => setEventsTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Wszystkie typy</option>
                  <option value="substantive">Tylko merytoryczne i warsztaty</option>
                  <option value="project">Tylko zespoły projektowe (Wrench)</option>
                  <option value="internal">Tylko posiedzenia zarządów</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[10px] sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Data</th>
                    <th className="py-2.5 px-3 font-bold">Tytuł spotkania / Temat</th>
                    <th className="py-2.5 px-3 font-bold">Typ</th>
                    <th className="py-2.5 px-3 font-bold">Organizator / Koła</th>
                    <th className="py-2.5 px-3 font-bold text-center">Uczestnicy</th>
                    <th className="py-2.5 px-3 font-bold">Lokalizacja / Platforma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEventsList.map((m) => {
                    const isProject = m.meetingType === 'project';
                    const isInternal = m.meetingType === 'internal';

                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {m.date}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div>{m.title}</div>
                          {m.who && <div className="text-[10px] text-slate-500 font-normal">Prowadzący: {m.who}</div>}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isProject ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Wrench size={10} />
                              Projektowe
                            </span>
                          ) : isInternal ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              Zarząd
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              Warsztat / Otwarte
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {m.participatingClubs.map(c => (
                              <span
                                key={c.orgId}
                                style={{ color: c.color, backgroundColor: `${c.color}15` }}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                              >
                                {c.shortName}
                              </span>
                            ))}
                            {m.isJoint && (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Wspólne
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900 whitespace-nowrap">
                          {m.participants} os.
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {m.location}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
