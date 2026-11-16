import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FolderKanban,
  FileText,
  ExternalLink,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Archive,
  Edit3,
  Trash2,
  X,
  FileCheck,
  HardDrive,
  Calendar,
  ShieldCheck,
  Download,
  FolderOpen,
  Link,
  Sparkles,
  Eye,
  RefreshCw,
  Layers,
  Users,
  Check,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import {
  studentGovDocsService,
  SAMORZAD_DOCUMENT_CATEGORIES,
  SAMORZAD_BODY_TYPES,
  SAMORZAD_DOCUMENT_STATUSES,
  generateDocumentSignature,
  filterStudentGovDocuments,
  extractGoogleDriveFileId,
  extractGoogleDriveFolderId,
} from '../services/studentGovDocsService.js';

export default function DocumentsRepositoryTab({
  academicYear = '2026/2027',
  onNavigateToLetter = () => {},
}) {
  // Główne podwidoki: 'documents' (Akty Prawne) vs 'protocols' (Protokoły z Posiedzeń)
  const [activeMainTab, setActiveMainTab] = useState('documents');

  // Stan dokumentów i protokołów
  const [documents, setDocuments] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filtry
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');
  const [selectedBodyType, setSelectedBodyType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Szerokość panelu bocznego
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_docs_sidebar_width');
      const parsed = saved ? Number(saved) : 345;
      return parsed < 340 ? 345 : parsed;
    } catch {
      return 345;
    }
  });

  // Modale
  const [previewDoc, setPreviewDoc] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editingProtocol, setEditingProtocol] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  // Ładowanie danych z Supabase / LocalStorage
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [docsData, protocolsData] = await Promise.all([
        studentGovDocsService.getDocuments(academicYear),
        studentGovDocsService.getProtocols(academicYear),
      ]);
      setDocuments(docsData || []);
      setProtocols(protocolsData || []);
    } catch (err) {
      console.error('Błąd ładowania repozytorium dokumentów:', err);
    } finally {
      setIsLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrowane akty prawne
  const filteredDocuments = useMemo(() => {
    return filterStudentGovDocuments({
      documents,
      selectedCategory,
      selectedBodyType,
      selectedStatus,
      academicYear,
      searchQuery,
    });
  }, [documents, selectedCategory, selectedBodyType, selectedStatus, academicYear, searchQuery]);

  // Liczniki kategorii do panelu bocznego
  const categoryCounts = useMemo(() => {
    const counts = { Wszystkie: documents.length };
    SAMORZAD_DOCUMENT_CATEGORIES.forEach((cat) => {
      if (cat !== 'Wszystkie') {
        counts[cat] = documents.filter((d) => d.category === cat).length;
      }
    });
    return counts;
  }, [documents]);

  // Filtrowane protokoły
  const filteredProtocols = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return protocols.filter((p) => {
      if (!q) return true;
      const haystack = `${p.protocol_number} ${p.title} ${p.chairperson} ${p.recorder} ${p.agenda} ${p.resolutions_summary}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [protocols, searchQuery]);

  // Zapisywanie dokumentu
  const handleSaveDoc = async (docData) => {
    try {
      await studentGovDocsService.saveDocument(docData);
      setEditingDoc(null);
      await loadData();
    } catch (err) {
      console.error('Błąd zapisu dokumentu:', err);
    }
  };

  // Usuwanie dokumentu
  const handleDeleteDoc = async (id) => {
    try {
      await studentGovDocsService.deleteDocument(id);
      setDeleteConfirmation(null);
      await loadData();
    } catch (err) {
      console.error('Błąd usuwania dokumentu:', err);
    }
  };

  // Zapisywanie protokołu
  const handleSaveProtocol = async (protocolData) => {
    try {
      await studentGovDocsService.saveProtocol(protocolData);
      setEditingProtocol(null);
      await loadData();
    } catch (err) {
      console.error('Błąd zapisu protokołu:', err);
    }
  };

  // Usuwanie protokołu
  const handleDeleteProtocol = async (id) => {
    try {
      await studentGovDocsService.deleteProtocol(id);
      setDeleteConfirmation(null);
      await loadData();
    } catch (err) {
      console.error('Błąd usuwania protokołu:', err);
    }
  };

  return (
    <div className="w-full max-w-[1650px] mx-auto space-y-5">
      {/* ── Top Header Toolbar ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-100 shrink-0">
              <FolderKanban size={28} className="text-[#1e3a8a]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  Repozytorium Aktów Prawnych i Kancelarii WSKZ
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Supabase SSOT • Kadencja 2026–2028
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Centralny rejestr aktów ustrojowych, uchwał Zarządu i Rady Samorządu Studenckiego, protokołów posiedzeń oraz oficjalnych pism urzędowych WSKZ.
              </p>
            </div>
          </div>

          {/* Przyciski akcji */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {activeMainTab === 'documents' ? (
              <button
                type="button"
                onClick={() =>
                  setEditingDoc({
                    academic_year: academicYear,
                    category: selectedCategory === 'Wszystkie' ? 'Uchwały Zarządu' : selectedCategory,
                    body_type: 'zarzad',
                    document_date: new Date().toISOString().slice(0, 10),
                    status: 'obowiazujacy',
                    is_public: true,
                    code: generateDocumentSignature({
                      category: selectedCategory === 'Wszystkie' ? 'Uchwały Zarządu' : selectedCategory,
                      bodyType: 'zarzad',
                      existingDocuments: documents,
                    }),
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1e3a8a] hover:bg-[#1d4ed8] shadow-xs transition cursor-pointer"
              >
                <Plus size={15} />
                <span>Nowa Uchwała / Akt</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setEditingProtocol({
                    academic_year: academicYear,
                    protocol_number: `PROT/SS_WSKZ/ZS/${String(protocols.length + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
                    meeting_date: new Date().toISOString().slice(0, 10),
                    meeting_time: '18:00 - 20:00',
                    location: 'Biuro Samorządu WSKZ / Google Meet',
                    body_type: 'zarzad',
                    title: `Protokół z Posiedzenia Zarządu Samorządu nr ${protocols.length + 1}`,
                    chairperson: 'Agnieszka Rusnarczyk (Przewodnicząca RSS)',
                    recorder: 'Tomasz Bratkowski (Sekretarz RSS)',
                    attendees_count: 5,
                    agenda: '1. Otwarcie posiedzenia i stwierdzenie kworum.\n2. Przyjęcie porządku obrad.\n3. Dyskusja nad bieżącymi sprawami studenckimi.\n4. Podjęcie uchwał.\n5. Wolne wnioski i zamknięcie.',
                    driveFolderUrl: '',
                    drive_folder_url: '',
                    originalFileUrl: '',
                    original_file_url: '',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1e3a8a] hover:bg-[#1d4ed8] shadow-xs transition cursor-pointer"
              >
                <Plus size={15} />
                <span>Nowy Protokół z Posiedzenia</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                onNavigateToLetter({
                  subject: 'Wystąpienie Kancelarii Samorządu Studenckiego WSKZ',
                  originTab: 'documents',
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-2xs transition cursor-pointer"
              title="Przejdź do edytora oficjalnego pisma A4 na papierze firmowym WSKZ"
            >
              <FileText size={15} className="text-[#1e3a8a]" />
              <span>Wystaw Pismo A4</span>
            </button>

            <button
              type="button"
              onClick={() => loadData()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition cursor-pointer"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Odśwież</span>
            </button>
          </div>
        </div>

        {/* Zakładki modułu: Akty Prawne vs Protokoły */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveMainTab('documents')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'documents'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FolderOpen size={15} />
            <span>Akty Prawne i Uchwały ({documents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('protocols')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'protocols'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calendar size={15} />
            <span>Protokoły z Posiedzeń ({protocols.length})</span>
          </button>
        </div>
      </div>

      {/* ── Główny Widok Dokumentów z Bocznym Panelem ──────────────────────── */}
      {activeMainTab === 'documents' && (
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          {/* Lewy panel boczny: Kategorie i Karta Statutu */}
          <div
            style={{ width: `${Math.max(sidebarWidth, 340)}px` }}
            className="w-full lg:w-[345px] min-w-[340px] lg:shrink-0 space-y-4"
          >
            {/* Lista Kategorii */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                <span>Kategorie Aktów</span>
                <span className="font-mono">{documents.length}</span>
              </div>

              <div className="space-y-1">
                {SAMORZAD_DOCUMENT_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const count = categoryCounts[cat] || 0;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                        isSelected
                          ? 'bg-blue-50 text-blue-950 font-bold border border-blue-200 shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <span className="whitespace-nowrap">{cat}</span>
                      <span
                        className={`min-w-[24px] h-6 px-1.5 rounded-full text-[10px] font-mono flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-blue-200 text-blue-900 font-bold' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Karta Statutu Samorządu WSKZ */}
            <div className="bg-gradient-to-br from-indigo-900 to-blue-950 rounded-2xl text-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className="text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wide text-indigo-200">
                    Akt Podstawowy
                  </span>
                </div>
                <a
                  href="https://drive.google.com/file/d/1dwE1WhkZPD0V8ervQJkwx2VIDgLxRiHW/view"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition"
                  title="Otwórz plik regulaminu w Google Drive"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              <div>
                <h4 className="text-sm font-bold leading-tight">
                  Statut i Regulaminy Samorządu WSKZ
                </h4>
                <p className="text-[11px] text-indigo-200 mt-1 leading-relaxed">
                  Zatwierdzony przez Senat i Władze Uczelni WSKZ. Określa kompetencje organów, regulaminy i ordynację wyborczą.
                </p>
              </div>
              <div className="pt-2 border-t border-indigo-800/80 flex items-center justify-between text-[11px]">
                <span className="text-emerald-300 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Obowiązujący
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const statutDoc = documents.find((d) => d.code && d.code.includes('STATUT'));
                    setPreviewDoc({
                      ...(statutDoc || {}),
                      id: statutDoc?.id || 'doc_ss_01',
                      code: statutDoc?.code || 'STATUT/SS_WSKZ/2026',
                      title: statutDoc?.title || 'Statut i Regulamin Samorządu Studenckiego WSKZ',
                      file_url: 'https://drive.google.com/file/d/1dwE1WhkZPD0V8ervQJkwx2VIDgLxRiHW/view',
                      driveUrl: 'https://drive.google.com/file/d/1dwE1WhkZPD0V8ervQJkwx2VIDgLxRiHW/view',
                    });
                  }}
                  className="text-white hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Podgląd regulaminu →</span>
                </button>
              </div>
            </div>
          </div>

          {/* Główna tabela dokumentów */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {/* Pasek Wyszukiwania i Filtrów */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Szukaj po sygnaturze, tytule, opisie lub organie..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Filtr organu */}
                <select
                  value={selectedBodyType}
                  onChange={(e) => setSelectedBodyType(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 cursor-pointer focus:outline-none"
                >
                  {SAMORZAD_BODY_TYPES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>

                {/* Filtr statusu */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 cursor-pointer focus:outline-none"
                >
                  {SAMORZAD_DOCUMENT_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabela Aktów Prawnych */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-hidden">
                <table className="w-full table-fixed text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[10.5px]">
                      <th className="w-[16.5%] py-3 pl-2.5 pr-1.5">Sygnatura</th>
                      <th className="w-[29.5%] py-3 px-2.5">Tytuł aktu / Uchwały</th>
                      <th className="w-[11.5%] py-3 px-2.5">Organ</th>
                      <th className="w-[14.5%] py-3 px-2.5">Kategoria</th>
                      <th className="w-[8.5%] py-3 px-2.5 text-center whitespace-nowrap">Data</th>
                      <th className="w-[8.5%] py-3 pl-1 pr-2 text-center whitespace-nowrap">Status</th>
                      <th className="w-[6.5%] py-3 px-1 text-center whitespace-nowrap">Plik</th>
                      <th className="w-[4.5%] min-w-[48px] py-3 pr-3 text-center whitespace-nowrap">Akcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredDocuments.length > 0 ? (
                      filteredDocuments.map((doc) => {
                        const isObowiazujacy = doc.status === 'obowiazujacy';
                        const isProjekt = doc.status === 'w_przygotowaniu';
                        const bodyLabel =
                          SAMORZAD_BODY_TYPES.find((b) => b.id === (doc.body_type || doc.bodyType))?.label ||
                          doc.body_type ||
                          'Zarząd';

                        return (
                          <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 pl-2.5 pr-1.5 font-mono font-bold text-blue-900 whitespace-nowrap text-[11.5px] tracking-tight leading-tight">
                              {doc.code}
                            </td>
                            <td className="py-3 px-2.5">
                              <div className="font-bold text-slate-900 leading-snug">{doc.title}</div>
                              {doc.description && (
                                <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                  {doc.description}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-2.5 whitespace-nowrap text-slate-600 font-medium text-[11px]">
                              {bodyLabel}
                            </td>
                            <td className="py-3 px-2.5 whitespace-nowrap">
                              <span className="inline-block max-w-full truncate px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200">
                                {doc.category}
                              </span>
                            </td>
                            <td className="py-3 px-2.5 text-center whitespace-nowrap font-mono text-slate-600 text-[11px]">
                              {doc.document_date || doc.date}
                            </td>
                            <td className="py-3 pl-1 pr-2 text-center whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isObowiazujacy
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : isProjekt
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {isObowiazujacy
                                  ? 'Obowiązujący'
                                  : isProjekt
                                  ? 'Projekt'
                                  : doc.status || 'Uchylony'}
                              </span>
                            </td>
                            <td className="py-3 px-1 text-center whitespace-nowrap">
                              {doc.file_url || doc.driveUrl || doc.fileUrl || doc.drive_folder_url || doc.driveFolderUrl || doc.original_file_url || doc.originalFileUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="text-blue-700 hover:text-blue-900 font-medium cursor-pointer underline underline-offset-2 text-[11.5px] leading-none whitespace-nowrap"
                                  title="Otwórz podgląd dokumentu"
                                >
                                  Podgląd
                                </button>
                              ) : (
                                <span className="text-slate-400 font-medium text-[11.5px] leading-none whitespace-nowrap">—</span>
                              )}
                            </td>
                            <td className="py-3 pr-3 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingDoc(doc)}
                                  className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                                  title="Edytuj dokument"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteConfirmation({
                                      type: 'document',
                                      id: doc.id,
                                      title: doc.title,
                                      code: doc.code,
                                    })
                                  }
                                  className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                                  title="Usuń dokument"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          Brak dokumentów spełniających wybrane kryteria wyszukiwania.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Podwidok: Protokoły z Posiedzeń ────────────────────────────────── */}
      {activeMainTab === 'protocols' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj w protokołach posiedzeń..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProtocols.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3 hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                      {p.protocol_number}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1 leading-snug">{p.title}</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500 shrink-0">
                    {p.meeting_date}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between">
                    <span>Organ obradujący:</span>
                    <strong>{p.body_type === 'rada_samorzadu' ? 'Rada Samorządu' : 'Zarząd / Prezydium'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Przewodniczący:</span>
                    <strong>{p.chairperson}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Protokolant:</span>
                    <strong>{p.recorder}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Obecnych członków:</span>
                    <strong className="text-emerald-700">{p.attendees_count} os.</strong>
                  </div>
                </div>

                {p.agenda && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                      Porządek obrad:
                    </div>
                    <p className="text-[11px] text-slate-700 whitespace-pre-wrap line-clamp-3 bg-white border border-slate-200 rounded-lg p-2 font-mono">
                      {p.agenda}
                    </p>
                  </div>
                )}

                {p.resolutions_summary && (
                  <div className="pt-2 border-t border-slate-100 text-xs text-indigo-950 font-medium">
                    <span className="font-bold text-indigo-800">Podjęte uchwały: </span>
                    {p.resolutions_summary}
                  </div>
                )}

                {/* Pasek akcji dokumentowych: Dysk uczelni & Plik źródłowy */}
                {(() => {
                  const folderUrl = p.drive_folder_url || p.driveFolderUrl;
                  const fileUrl =
                    p.original_file_url ||
                    p.originalFileUrl ||
                    p.file_url ||
                    p.fileUrl ||
                    (p.drive_url && !p.drive_url.includes('/folders/') ? p.drive_url : null);

                  return (
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      {folderUrl ? (
                        <a
                          href={folderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 transition shadow-2xs"
                          title="Otwórz folder posiedzenia na dysku uczelni w nowej karcie"
                        >
                          <FolderOpen size={14} className="text-blue-700" />
                          <span>Otwórz lokalizację na dysku</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingProtocol(p)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-slate-500 border border-dashed border-slate-300 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
                          title="Dodaj link do folderu w chmurze"
                        >
                          <FolderOpen size={13} className="text-slate-400" />
                          <span>+ Dodaj lokalizację dysku</span>
                        </button>
                      )}

                      {fileUrl ? (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs"
                          title="Otwórz oryginalny plik protokołu w nowej karcie"
                        >
                          <FileText size={14} className="text-emerald-700" />
                          <span>Oryginalny plik protokołu</span>
                          <ExternalLink size={12} className="text-emerald-600" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc({
                              file_url: folderUrl || p.drive_url || '',
                              title: p.title,
                              code: p.protocol_number,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-slate-500 hover:text-blue-700 hover:bg-slate-50 transition cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Podgląd w CRM</span>
                        </button>
                      )}
                    </div>
                  );
                })()}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[11px] font-mono text-slate-400">
                    {p.meeting_code || 'P01'} • Rejestr Kancelarii
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingProtocol(p)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                      title="Edytuj protokół"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirmation({
                          type: 'protocol',
                          id: p.id,
                          title: p.title,
                          code: p.protocol_number,
                        })
                      }
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                      title="Usuń protokół"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal: Bezpieczny Podgląd Dokumentu (Google Drive / PDF / Supabase) ── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileCheck className="text-blue-900" size={20} />
                <div>
                  <h3 className="text-xs font-mono font-bold text-blue-900">
                    {previewDoc.code}
                  </h3>
                  <div className="text-sm font-bold text-slate-900 truncate max-w-xl">
                    {previewDoc.title}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(previewDoc.file_url ||
                  previewDoc.driveUrl ||
                  previewDoc.fileUrl ||
                  previewDoc.drive_folder_url ||
                  previewDoc.driveFolderUrl ||
                  previewDoc.original_file_url ||
                  previewDoc.originalFileUrl) && (
                  <a
                    href={
                      previewDoc.file_url ||
                      previewDoc.driveUrl ||
                      previewDoc.fileUrl ||
                      previewDoc.drive_folder_url ||
                      previewDoc.driveFolderUrl ||
                      previewDoc.original_file_url ||
                      previewDoc.originalFileUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
                    title="Otwórz w nowej karcie"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full bg-slate-100 overflow-hidden relative">
              {(() => {
                const targetUrl =
                  previewDoc.file_url ||
                  previewDoc.driveUrl ||
                  previewDoc.fileUrl ||
                  previewDoc.drive_folder_url ||
                  previewDoc.driveFolderUrl ||
                  previewDoc.original_file_url ||
                  previewDoc.originalFileUrl;
                const folderId = extractGoogleDriveFolderId(targetUrl);
                if (folderId) {
                  return (
                    <div className="w-full h-full flex flex-col">
                      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center justify-between text-xs text-blue-900 shrink-0">
                        <span className="flex items-center gap-1.5 font-medium">
                          <FolderOpen size={16} className="text-blue-700" />
                          Katalog Google Drive z regulaminami i aktami prawnymi WSKZ
                        </span>
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
                        >
                          <ExternalLink size={12} />
                          Otwórz w Google Drive
                        </a>
                      </div>
                      <iframe
                        src={`https://drive.google.com/embeddedfolderview?id=${folderId}#grid`}
                        title={previewDoc.title}
                        className="w-full flex-1 border-0"
                        allow="autoplay"
                      />
                    </div>
                  );
                }

                const driveId = extractGoogleDriveFileId(targetUrl);
                if (driveId) {
                  return (
                    <iframe
                      src={`https://drive.google.com/file/d/${driveId}/preview`}
                      title={previewDoc.title}
                      className="w-full h-full border-0"
                      allow="autoplay"
                    />
                  );
                }
                if (targetUrl) {
                  return (
                    <iframe
                      src={targetUrl}
                      title={previewDoc.title}
                      className="w-full h-full border-0"
                    />
                  );
                }
                return (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <AlertCircle size={36} className="text-slate-400" />
                    <p className="text-sm font-medium text-slate-600">
                      Dokument nie posiada bezpośredniego pliku podglądu online.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Edycja / Nowy Akt Prawny ─────────────────────────────────── */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-300 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 size={16} className="text-[#1e3a8a]" />
                <span>{editingDoc.id ? 'Edycja Aktu Prawnego' : 'Rejestracja Nowego Aktu Prawnego'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveDoc(editingDoc);
              }}
              className="p-5 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Kategoria Aktu
                  </label>
                  <select
                    value={editingDoc.category || 'Uchwały Zarządu'}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setEditingDoc({
                        ...editingDoc,
                        category: newCat,
                        code: generateDocumentSignature({
                          category: newCat,
                          bodyType: editingDoc.body_type,
                          existingDocuments: documents,
                          editingDocId: editingDoc.id,
                        }),
                      });
                    }}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    {SAMORZAD_DOCUMENT_CATEGORIES.filter((c) => c !== 'Wszystkie').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Organ Stanowiący
                  </label>
                  <select
                    value={editingDoc.body_type || 'zarzad'}
                    onChange={(e) => {
                      const newBody = e.target.value;
                      setEditingDoc({
                        ...editingDoc,
                        body_type: newBody,
                        code: generateDocumentSignature({
                          category: editingDoc.category,
                          bodyType: newBody,
                          existingDocuments: documents,
                          editingDocId: editingDoc.id,
                        }),
                      });
                    }}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    {SAMORZAD_BODY_TYPES.filter((b) => b.id !== 'all').map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Sygnatura Aktu (Auto-numeracja)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingDoc.code || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, code: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-blue-900 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Data Uchwalenia
                  </label>
                  <input
                    type="date"
                    required
                    value={editingDoc.document_date || editingDoc.date || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, document_date: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Tytuł Aktu / Przedmiot Uchwały
                </label>
                <input
                  type="text"
                  required
                  value={editingDoc.title || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                  placeholder="np. Uchwała Zarządu w sprawie..."
                  className="w-full p-2 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Status Prawny
                  </label>
                  <select
                    value={editingDoc.status || 'obowiazujacy'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, status: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    {SAMORZAD_DOCUMENT_STATUSES.filter((s) => s.id !== 'all').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Link do pliku / Dysk Google
                  </label>
                  <input
                    type="url"
                    value={editingDoc.file_url || editingDoc.driveUrl || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, file_url: e.target.value, driveUrl: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Opis / Uzasadnienie Aktu
                </label>
                <textarea
                  rows={3}
                  value={editingDoc.description || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, description: e.target.value })}
                  placeholder="Krótki opis celu uchwały, powołanych członków lub skutków prawnych..."
                  className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editingDoc.is_public)}
                    onChange={(e) => setEditingDoc({ ...editingDoc, is_public: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-900 focus:ring-blue-500"
                  />
                  <span>Widoczny publicznie dla studentów WSKZ</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDoc(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1e3a8a] hover:bg-[#1d4ed8]"
                  >
                    Zapisz Akt
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edycja Protokołu z Posiedzenia ───────────────────────────── */}
      {editingProtocol && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-300 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-[#1e3a8a]" />
                <span>{editingProtocol.id ? 'Edycja Protokołu' : 'Nowy Protokół z Posiedzenia'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingProtocol(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveProtocol(editingProtocol);
              }}
              className="p-5 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Numer Protokołu
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProtocol.protocol_number || ''}
                    onChange={(e) => setEditingProtocol({ ...editingProtocol, protocol_number: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Data Posiedzenia
                  </label>
                  <input
                    type="date"
                    required
                    value={editingProtocol.meeting_date || ''}
                    onChange={(e) => setEditingProtocol({ ...editingProtocol, meeting_date: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Godziny Obrad
                  </label>
                  <input
                    type="text"
                    value={editingProtocol.meeting_time || '18:00 - 20:00'}
                    onChange={(e) => setEditingProtocol({ ...editingProtocol, meeting_time: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Tytuł Posiedzenia
                </label>
                <input
                  type="text"
                  required
                  value={editingProtocol.title || ''}
                  onChange={(e) => setEditingProtocol({ ...editingProtocol, title: e.target.value })}
                  placeholder="np. Protokół z I Posiedzenia Zarządu..."
                  className="w-full p-2 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Przewodniczący Posiedzenia
                  </label>
                  <input
                    type="text"
                    value={editingProtocol.chairperson || ''}
                    onChange={(e) => setEditingProtocol({ ...editingProtocol, chairperson: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Protokolant
                  </label>
                  <input
                    type="text"
                    value={editingProtocol.recorder || ''}
                    onChange={(e) => setEditingProtocol({ ...editingProtocol, recorder: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Porządek Obrad (Agenda)
                </label>
                <textarea
                  rows={3}
                  value={editingProtocol.agenda || ''}
                  onChange={(e) => setEditingProtocol({ ...editingProtocol, agenda: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Podjęte Uchwały i Wnioski
                </label>
                <textarea
                  rows={2}
                  value={editingProtocol.resolutions_summary || ''}
                  onChange={(e) => setEditingProtocol({ ...editingProtocol, resolutions_summary: e.target.value })}
                  placeholder="Wpisz listę uchwał podjętych na zebraniu..."
                  className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {/* Sekcja: Linki Zewnętrzne i Dokumentacja */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Link size={14} className="text-blue-700" />
                  <span>Elektroniczne repozytorium i pliki źródłowe protokołu</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pole 1: Lokalizacja na dysku uczelni (Folder) */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase text-slate-600">
                      Lokalizacja na dysku uczelni (Folder)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="url"
                        value={editingProtocol.driveFolderUrl || editingProtocol.drive_folder_url || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingProtocol({
                            ...editingProtocol,
                            driveFolderUrl: val,
                            drive_folder_url: val,
                          });
                        }}
                        placeholder="https://drive.google.com/drive/folders/... lub SharePoint"
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        disabled={!Boolean((editingProtocol.driveFolderUrl || editingProtocol.drive_folder_url || '').trim())}
                        onClick={() => {
                          const url = (editingProtocol.driveFolderUrl || editingProtocol.drive_folder_url || '').trim();
                          if (url) window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition shrink-0 ${
                          Boolean((editingProtocol.driveFolderUrl || editingProtocol.drive_folder_url || '').trim())
                            ? 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 cursor-pointer shadow-2xs'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                        }`}
                        title="Otwórz folder w nowej karcie"
                      >
                        <FolderOpen size={14} />
                        <span>Otwórz folder</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Link do folderu posiedzenia w chmurze uczelnianej
                    </span>
                  </div>

                  {/* Pole 2: Link do oryginalnego pliku protokołu */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase text-slate-600">
                      Link do oryginalnego pliku protokołu
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="url"
                        value={
                          editingProtocol.originalFileUrl ||
                          editingProtocol.original_file_url ||
                          editingProtocol.fileUrl ||
                          editingProtocol.file_url ||
                          editingProtocol.driveUrl ||
                          editingProtocol.drive_url ||
                          ''
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingProtocol({
                            ...editingProtocol,
                            originalFileUrl: val,
                            original_file_url: val,
                            fileUrl: val,
                            file_url: val,
                            drive_url: val,
                          });
                        }}
                        placeholder="https://docs.google.com/document/d/... lub skan PDF"
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        disabled={
                          !Boolean(
                            (
                              editingProtocol.originalFileUrl ||
                              editingProtocol.original_file_url ||
                              editingProtocol.fileUrl ||
                              editingProtocol.file_url ||
                              editingProtocol.driveUrl ||
                              editingProtocol.drive_url ||
                              ''
                            ).trim()
                          )
                        }
                        onClick={() => {
                          const url = (
                            editingProtocol.originalFileUrl ||
                            editingProtocol.original_file_url ||
                            editingProtocol.fileUrl ||
                            editingProtocol.file_url ||
                            editingProtocol.driveUrl ||
                            editingProtocol.drive_url ||
                            ''
                          ).trim();
                          if (url) window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition shrink-0 ${
                          Boolean(
                            (
                              editingProtocol.originalFileUrl ||
                              editingProtocol.original_file_url ||
                              editingProtocol.fileUrl ||
                              editingProtocol.file_url ||
                              editingProtocol.driveUrl ||
                              editingProtocol.drive_url ||
                              ''
                            ).trim()
                          )
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 cursor-pointer shadow-2xs'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                        }`}
                        title="Otwórz plik w nowej karcie"
                      >
                        <FileText size={14} />
                        <span>Otwórz plik</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Plik tekstowy Google Docs lub podpisany skan PDF
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProtocol(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1e3a8a] hover:bg-[#1d4ed8]"
                >
                  Zapisz Protokół
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Potwierdzenia Usunięcia ──────────────────────────────────── */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-300 w-full max-w-md overflow-hidden p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <Trash2 size={24} />
              <h3 className="text-sm font-bold text-slate-900">Potwierdzenie usunięcia</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Czy na pewno chcesz trwale usunąć {deleteConfirmation.type === 'protocol' ? 'protokół' : 'akt'}:{' '}
              <strong className="text-slate-900 font-mono">{deleteConfirmation.code}</strong> — {deleteConfirmation.title}?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmation.type === 'protocol') {
                    handleDeleteProtocol(deleteConfirmation.id);
                  } else {
                    handleDeleteDoc(deleteConfirmation.id);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-800"
              >
                Usuń trwale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
