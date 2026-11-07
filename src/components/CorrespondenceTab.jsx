import React, { useState, useMemo, useEffect, useCallback, startTransition } from 'react';
import { createPortal } from 'react-dom';
import {
  Mail,
  Search,
  Filter,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  FileText,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Download,
  Share2,
  Calendar,
  Building,
  User,
  Hash,
  ShieldCheck,
  Sparkles,
  Zap,
  Check,
  Edit3,
  Save,
  Trash2,
  Printer,
  Award,
} from 'lucide-react';

import {
  formatTableDate,
  formatTableDateTime,
  parseToDateTimeLocalString,
  getCurrentLocalDateTimeString,
  parseDateToTimestamp,
  formatForDateTimeInput,
  prepareDateTimeForPayload,
  normalizeDateTimeForBackend,
} from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import { sendToBackend } from '../services/googleSheets';

// ── Oficjalne stopki podpisów Samorządu Studenckiego WSKZ (Kadencja 2026-2028) ───
export const OFFICIAL_SIGNATURE_PROFILES = [
  {
    id: 'agnieszka_rusnarczyk',
    name: 'Agnieszka Rusnarczyk',
    title: 'Przewodnicząca Samorządu Studenckiego',
    organization: 'Wyższa Szkoła Kształcenia Zawodowego',
    term: 'Kadencja 2026-2028',
    email: 'samorzad@wskz.pl',
    website: 'https://studia-wroclaw.pl/samorzad-studencki/',
    websiteUrl: 'https://wskz.pl',
    closing: 'Z wyrazami szacunku,',
  },
  {
    id: 'aleksandra_zerdzinska',
    name: 'Aleksandra Żerdzińska',
    title: 'Zastępca Przewodniczącej Samorządu Studenckiego',
    organization: 'Wyższa Szkoła Kształcenia Zawodowego',
    term: 'Kadencja 2026-2028',
    email: 'samorzad@wskz.pl',
    website: 'https://studia-wroclaw.pl/samorzad-studencki/',
    websiteUrl: 'https://wskz.pl',
    closing: 'Z wyrazami szacunku,',
  },
  {
    id: 'tomasz_bratkowski',
    name: 'Tomasz Bratkowski',
    title: 'Sekretarz Samorządu Studenckiego',
    organization: 'Wyższa Szkoła Kształcenia Zawodowego',
    term: 'Kadencja 2026-2028',
    email: 'samorzad@wskz.pl',
    website: 'https://studia-wroclaw.pl/samorzad-studencki/',
    websiteUrl: 'https://wskz.pl',
    closing: 'Z wyrazami szacunku,',
  },
];

export const DEFAULT_OFFICIAL_SIGNATURE = OFFICIAL_SIGNATURE_PROFILES[0];

export function findSignatureProfile(nameOrId) {
  if (!nameOrId) return null;
  const query = String(nameOrId).toLowerCase().trim();
  return OFFICIAL_SIGNATURE_PROFILES.find(
    (p) =>
      p.id.toLowerCase() === query ||
      p.name.toLowerCase() === query ||
      query.includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(query)
  ) || null;
}

export function parseIncomingEmailText(rawText) {
  if (!rawText) return null;
  const text = rawText.trim();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let sender = "";
  let recipient = "";
  let subject = "";
  let dateVal = "";
  let bodyLines = [];
  let isBody = false;

  // Wyrażenia regularne dopasowane do webmaila (z dwukropkiem lub bez)
  const fromRegex = /^(?:Od|From|Nadawca)[:\s]+(.+)$/i;
  const toRegex = /^(?:Do|To|Odbiorca|Adresat)[:\s]+(.+)$/i;
  const subjectRegex = /^(?:Temat|Subject|Dotyczy)[:\s]+(.+)$/i;
  const dateRegex = /^(?:Data|Date|Wysłano|Sent)[:\s]+(.+)$/i;
  
  // Frazy śmieciowe z interfejsów pocztowych do odfiltrowania
  const junkRegex = /^(Zdjęcie kontaktu|Ogólne Nagłówki|Zwykły tekst|Pokaż szczegóły|Ukryj szczegóły)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (junkRegex.test(line)) {
      continue; // Pomiń śmieci interfejsu
    }

    if (!isBody) {
      const fromMatch = line.match(fromRegex);
      if (fromMatch && !sender) {
        sender = fromMatch[1].trim();
        continue;
      }

      const toMatch = line.match(toRegex);
      if (toMatch && !recipient) {
        recipient = toMatch[1].trim();
        continue;
      }

      const subjMatch = line.match(subjectRegex);
      if (subjMatch && !subject) {
        subject = subjMatch[1].trim();
        continue;
      }

      const dtMatch = line.match(dateRegex);
      if (dtMatch && !dateVal) {
        dateVal = dtMatch[1].trim();
        continue;
      }

      // Jeśli pierwsza linia nie jest nagłówkiem i nie mamy tematu, traktuj jako temat
      if (i === 0 && !fromMatch && !toMatch && !subjMatch && !dtMatch) {
        subject = line;
        continue;
      }

      // Pierwsza linia treści (np. "Szanowni Państwo," lub zwrot grzecznościowy) rozpoczyna właściwy korpus
      if (
        /^(Szanowni|Dzień dobry|Cześć|Witam|W nawiązaniu|Zwracam się|Proszę|Informuję)/i.test(line) ||
        (!fromRegex.test(line) && !toRegex.test(line) && !subjectRegex.test(line) && !dateRegex.test(line) && i > 3)
      ) {
        isBody = true;
        bodyLines.push(line);
      }
    } else {
      bodyLines.push(line);
    }
  }

  const isIncoming = (recipient.toLowerCase().includes("samorzad") || recipient.toLowerCase().includes("wskz") || !sender.toLowerCase().includes("samorzad"));
  const parsedDateTime = parseToDateTimeLocalString(dateVal);
  const currentNow = getCurrentLocalDateTimeString();

  return {
    nadawca: sender || "Nieznany nadawca",
    odbiorca: recipient || "Kancelaria Samorządu Studenckiego",
    temat: subject || (bodyLines[0] ? bodyLines[0].slice(0, 80) : "Korespondencja wpływająca"),
    tresc: bodyLines.join('\n\n').trim(),
    kierunek: isIncoming ? "IN" : "OUT",
    dataWyslania: parsedDateTime || currentNow,
    dataWplywu: parsedDateTime || currentNow,
    rawDate: dateVal,
  };
}

// ── Memoizowany wiersz tabeli pism (zapobiega re-renderowaniu całej tabeli) ───
const CorrespondenceTableRow = React.memo(function CorrespondenceTableRow({ item, isSelected, onSelect }) {
  const isIncoming = item.direction === 'IN';
  const currentStatus = item.statusUjednolicenia || item.status || 'Ujednolicone';
  const currentFormal = item.weryfikacjaFormalna || 'Zatwierdzone';

  const handleClick = useCallback(() => {
    onSelect(item);
  }, [onSelect, item]);

  return (
    <tr
      onClick={handleClick}
      className={`hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-200 ${
        isSelected ? 'bg-blue-50/70 font-semibold' : ''
      }`}
    >
      {/* Sygnatura */}
      <td className="w-36 py-3 px-3 font-mono font-bold text-[#1e3a8a] truncate" title={item.id}>
        {item.id}
      </td>

      {/* Data wpływu */}
      <td className="w-32 py-3 px-2.5 whitespace-nowrap">
        {(() => {
          const dt = formatTableDateTime(item.dataWplywu || item.data || item.date || item.Data_Wplywu);
          return (
            <span className="text-[11px] font-mono font-medium text-slate-800">
              {dt.time ? `${dt.date} ${dt.time}` : dt.date}
            </span>
          );
        })()}
      </td>

      {/* Typ (Badge) */}
      <td className="w-24 py-3 px-2.5 whitespace-nowrap">
        {isIncoming ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <ArrowDownLeft size={11} /> Wchodz.
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ArrowUpRight size={11} /> Wychodz.
          </span>
        )}
      </td>

      {/* Nadawca */}
      <td className="w-40 py-3 px-3 text-slate-800 font-medium truncate" title={item.sender || item.nadawca}>
        {item.sender || item.nadawca}
      </td>

      {/* Odbiorca/DW */}
      <td className="w-40 py-3 px-3 text-slate-800 font-medium truncate" title={item.recipient || item.odbiorca}>
        {item.recipient || item.odbiorca}
      </td>

      {/* Temat */}
      <td className="w-auto py-3 px-3 text-slate-900 font-semibold truncate" title={item.subject || item.przedmiot}>
        {item.subject || item.przedmiot}
      </td>

      {/* Status */}
      <td className="w-32 py-3 px-2.5" title={currentStatus}>
        <span className={`block max-w-full truncate px-2 py-0.5 rounded-md text-[10px] font-semibold text-center ${
          currentStatus === 'Ujednolicone' || currentStatus === 'Zatwierdzone'
            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            : currentStatus === 'W trakcie' || currentStatus === 'W toku'
            ? 'bg-amber-100 text-amber-900 border border-amber-300'
            : 'bg-slate-100 text-slate-700 border border-slate-300'
        }`}>
          {currentStatus}
        </span>
      </td>

      {/* Weryfikacja Formalna */}
      <td className="w-28 py-3 px-2.5 text-center" title={currentFormal}>
        <span className={`inline-flex items-center justify-center gap-1 max-w-full truncate px-2 py-0.5 rounded-md text-[10px] font-semibold shadow-2xs ${
          currentFormal === 'Zatwierdzone' || currentFormal === 'Zgodna ze statutem'
            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            : 'bg-sky-100 text-sky-900 border border-sky-300'
        }`}>
          <ShieldCheck size={11} className="text-emerald-700 shrink-0" />
          <span className="truncate">{currentFormal}</span>
        </span>
      </td>
    </tr>
  );
});

export default function CorrespondenceTab({
  correspondence = [],
  allCorrespondence = [],
  academicYear = '2026/2027',
  onAddCorrespondence = () => {},
  onEditCorrespondence = () => {},
  onDeleteCorrespondence = () => {},
  onChangeStatus = () => {},
  onRefreshData = () => {},
  selectedItem = null,
  onSelectItem = () => {},
}) {
  const { user } = useAuth();
  const currentUserName = user?.name || user?.email || 'Agnieszka (Samorząd)';

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, IN, OUT
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, Zatwierdzone, W toku, Weryfikacja
  const [activeDrawerItem, setActiveDrawerItem] = useState(selectedItem);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [generateDocNotice, setGenerateDocNotice] = useState(null);
  const [previewLetterItem, setPreviewLetterItem] = useState(null);
  const [isPreviewEditable, setIsPreviewEditable] = useState(false);
  const [previewFields, setPreviewFields] = useState({
    miejsceData: '',
    sygnatura: '',
    nadawca: '',
    odbiorca: '',
    temat: '',
    tresc: '',
    autor: '',
    stanowisko: 'Prezydium Samorządu Studenckiego WSKZ',
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('parser'); // 'parser' | 'form'
  const [rawPastedText, setRawPastedText] = useState('');
  const [parseNotice, setParseNotice] = useState(null);

  // Helper do inicjalizacji stanu formularza edycji
  const initEditForm = useCallback((item) => {
    if (!item) return;
    const typ = item.typ || (item.direction === 'OUT' ? 'Wychodzące' : 'Wchodzące');
    const dWplywu = formatForDateTimeInput(item.dataWplywu || item.data || item.date || item.Data_Wplywu);
    const dWyslania = formatForDateTimeInput(item.dataWyslania);
    setEditForm({
      sygnatura: item.sygnatura || item.id || '',
      id: item.id || item.sygnatura || '',
      przedmiot: item.subject || item.przedmiot || item.temat || '',
      temat: item.subject || item.przedmiot || item.temat || '',
      subject: item.subject || item.przedmiot || item.temat || '',
      nadawca: item.sender || item.nadawca || '',
      sender: item.sender || item.nadawca || '',
      odbiorca: item.recipient || item.odbiorca || '',
      recipient: item.recipient || item.odbiorca || '',
      autor: item.autor || currentUserName,
      tresc: item.summary || item.tresc || '',
      summary: item.summary || item.tresc || '',
      dataWplywu: dWplywu,
      dataWyslania: dWyslania,
      typ: typ,
      direction: item.direction || (typ === 'Wychodzące' ? 'OUT' : 'IN'),
      status: item.status || 'W toku',
      statusUjednolicenia: item.statusUjednolicenia || item.status || 'W toku',
      lokalizacjaDrive: item.lokalizacjaDrive || '',
      sourceCitation: item.sourceCitation || '',
      notes: item.notes || '',
    });
  }, [currentUserName]);

  useEffect(() => {
    if (selectedItem) {
      setActiveDrawerItem(selectedItem);
      setIsEditing(false);
      initEditForm(selectedItem);
    }
  }, [selectedItem, initEditForm]);

  // Form state for adding new correspondence
  const [newEntry, setNewEntry] = useState({
    direction: 'IN',
    sender: '',
    recipient: 'Kancelaria Samorządu Studenckiego WSKZ',
    autor: currentUserName,
    subject: '',
    summary: '',
    status: 'W toku',
    statusUjednolicenia: 'W trakcie',
    weryfikacjaFormalna: 'Weryfikacja',
    sourceCitation: '',
    lokalizacjaDrive: '',
    notes: '',
    dataWyslania: '',
    dataWplywu: getCurrentLocalDateTimeString(),
  });

  // ── Helper do pobierania poprawnego pola daty ─────────────────────────────
  const getItemDate = (item) => {
    if (!item) return "";
    return formatTableDate(item.dataWplywu || item.data || item.date || item.Data_Wplywu);
  };

  // ── Stan i obsługa sortowania wielokolumnowego ────────────────────────────
  const [sortConfig, setSortConfig] = useState({ key: 'dataWplywu', direction: 'desc' });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Filtered correspondence
  const filteredList = useMemo(() => {
    return correspondence.filter(item => {
      // Type filter
      if (typeFilter !== 'ALL' && item.direction !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Zatwierdzone' && item.status !== 'Zatwierdzone') return false;
        if (statusFilter === 'W toku' && item.status !== 'W toku') return false;
        if (statusFilter === 'Weryfikacja' && item.weryfikacjaFormalna !== 'Weryfikacja' && item.status !== 'Weryfikacja') return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const searchable = `${item.id || ''} ${item.subject || ''} ${item.sender || ''} ${item.recipient || ''} ${item.summary || ''} ${item.sourceCitation || ''}`.toLowerCase();
        if (!searchable.includes(term)) return false;
      }

      return true;
    });
  }, [correspondence, typeFilter, statusFilter, searchTerm]);

  // Posortowane dane przed renderem
  const sortedData = useMemo(() => {
    let sortableItems = [...filteredList];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        // Jeśli sortujemy po dacie, porównaj timestampy chronologicznie (wraz z godziną i minutą)
        if (sortConfig.key === 'dataWplywu') {
          const rawA = a.dataWplywu || a.data || a.date || a.Data_Wplywu || "";
          const rawB = b.dataWplywu || b.data || b.date || b.Data_Wplywu || "";
          const timeA = parseDateToTimestamp(rawA);
          const timeB = parseDateToTimestamp(rawB);
          return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
        }

        let aVal = a[sortConfig.key] || "";
        let bVal = b[sortConfig.key] || "";

        if (sortConfig.key === 'nadawca') {
          aVal = a.nadawca || a.sender || "";
          bVal = b.nadawca || b.sender || "";
        } else if (sortConfig.key === 'odbiorca') {
          aVal = a.odbiorca || a.recipient || "";
          bVal = b.odbiorca || b.recipient || "";
        } else if (sortConfig.key === 'temat') {
          aVal = a.temat || a.przedmiot || a.subject || "";
          bVal = b.temat || b.przedmiot || b.subject || "";
        } else if (sortConfig.key === 'sygnatura') {
          aVal = a.sygnatura || a.id || "";
          bVal = b.sygnatura || b.id || "";
        } else if (sortConfig.key === 'typ') {
          aVal = a.direction || a.typ || "";
          bVal = b.direction || b.typ || "";
        } else if (sortConfig.key === 'status') {
          aVal = a.statusUjednolicenia || a.status || "";
          bVal = b.statusUjednolicenia || b.status || "";
        } else if (sortConfig.key === 'weryfikacja') {
          aVal = a.weryfikacjaFormalna || "";
          bVal = b.weryfikacjaFormalna || "";
        }

        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredList, sortConfig]);

  const handleOpenDrawer = useCallback((item) => {
    startTransition(() => {
      setActiveDrawerItem(item);
      setIsEditing(false);
      initEditForm(item);
    });
    onSelectItem(item);
  }, [initEditForm, onSelectItem]);

  const handleCloseDrawer = useCallback(() => {
    startTransition(() => {
      setActiveDrawerItem(null);
      setIsEditing(false);
    });
    onSelectItem(null);
  }, [onSelectItem]);

  const handleStartEdit = useCallback((item) => {
    startTransition(() => {
      initEditForm(item || activeDrawerItem);
      setIsEditing(true);
    });
  }, [initEditForm, activeDrawerItem]);

  const handleCancelEdit = useCallback(() => {
    startTransition(() => {
      initEditForm(activeDrawerItem);
      setIsEditing(false);
    });
  }, [initEditForm, activeDrawerItem]);

  const handleSaveEdit = async () => {
    if (!activeDrawerItem) return;
    setIsSaving(true);

    const sygnatura = activeDrawerItem.sygnatura || activeDrawerItem.id;
    const typ = editForm.typ || (editForm.direction === 'OUT' ? 'Wychodzące' : 'Wchodzące');
    const direction = typ === 'Wychodzące' ? 'OUT' : 'IN';
    const normDataWplywu = prepareDateTimeForPayload(editForm.dataWplywu);
    const normDataWyslania = prepareDateTimeForPayload(editForm.dataWyslania);
    const displayDate = normDataWplywu.slice(0, 10);

    const updatedEntry = {
      ...activeDrawerItem,
      action: "edytuj_pismo",
      sygnatura: sygnatura,
      id: sygnatura,
      przedmiot: editForm.przedmiot || editForm.temat || editForm.subject || '',
      temat: editForm.przedmiot || editForm.temat || editForm.subject || '',
      subject: editForm.przedmiot || editForm.temat || editForm.subject || '',
      nadawca: editForm.nadawca || editForm.sender || '',
      sender: editForm.nadawca || editForm.sender || '',
      odbiorca: editForm.odbiorca || editForm.recipient || '',
      recipient: editForm.odbiorca || editForm.recipient || '',
      autor: editForm.autor || activeDrawerItem.autor || currentUserName,
      tresc: editForm.tresc || editForm.summary || '',
      summary: editForm.tresc || editForm.summary || '',
      dataWplywu: normDataWplywu,
      dataWyslania: normDataWyslania,
      date: displayDate || activeDrawerItem.date,
      data: normDataWplywu || activeDrawerItem.data,
      typ: typ,
      direction: direction,
      status: editForm.status || 'W toku',
      statusUjednolicenia: editForm.status || 'W toku',
      lokalizacjaDrive: editForm.lokalizacjaDrive || '',
      sourceCitation: editForm.sourceCitation || '',
      notes: editForm.notes || '',
    };

    // Optimistic UI update inside transition
    startTransition(() => {
      setActiveDrawerItem(updatedEntry);
      setIsEditing(false);
    });

    try {
      if (onEditCorrespondence) {
        await onEditCorrespondence(updatedEntry);
      }
    } catch (err) {
      console.error('Błąd zapisu edycji pisma:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (item) => {
    if (!item) return;
    const sygnatura = item.sygnatura || item.id;
    if (!window.confirm("Czy na pewno chcesz bezpowrotnie usunąć ten wpis z rejestru?")) {
      return;
    }

    try {
      if (onDeleteCorrespondence) {
        await onDeleteCorrespondence(sygnatura);
      }
    } catch (err) {
      console.error('Błąd usuwania pisma:', err);
    } finally {
      handleCloseDrawer();
    }
  };

  const handleOpenPrintPreview = useCallback((item) => {
    if (!item) return;
    const rawDate = (item.dataWplywu || item.data || item.date || new Date().toISOString()).slice(0, 10);
    const rawBody = (item.tresc || item.summary || '').trim();
    const rawSubj = (item.przedmiot || item.subject || item.temat || 'Sprawa urzędowa').trim();
    const defaultBody = (!rawBody || rawBody === rawSubj)
      ? `Szanowni Państwo,\n\nDziałając w imieniu Samorządu Studenckiego Wyższej Szkoły Kształcenia Zawodowego we Wrocławiu, zwracamy się w sprawie: ${rawSubj}.\n\nUprzejmie prosimy o weryfikację przedstawionego zagadnienia oraz poinformowanie Kancelarii Samorządu Studenckiego o podjętych ustaleniach i dalszym toku postępowania.`
      : rawBody;

    const initialAuthor = item.autor || currentUserName || DEFAULT_OFFICIAL_SIGNATURE.name;
    const matchedProfile = findSignatureProfile(initialAuthor) || DEFAULT_OFFICIAL_SIGNATURE;

    setPreviewFields({
      miejsceData: `Wrocław, dnia ${rawDate} r.`,
      sygnatura: item.sygnatura || item.id || 'DK/2026/11/01',
      nadawca: item.nadawca || item.sender || 'Kancelaria Samorządu Studenckiego WSKZ',
      odbiorca: item.odbiorca || item.recipient || 'Dziekanat WNS / Władze Uczelni WSKZ',
      temat: rawSubj,
      tresc: defaultBody,
      selectedSignatureId: matchedProfile ? matchedProfile.id : 'custom',
      autor: matchedProfile ? matchedProfile.name : initialAuthor,
      stanowisko: matchedProfile ? matchedProfile.title : 'Samorząd Studencki WSKZ',
      uczelnia: matchedProfile ? matchedProfile.organization : 'Wyższa Szkoła Kształcenia Zawodowego',
      kadencja: matchedProfile ? matchedProfile.term : 'Kadencja 2026-2028',
      email: matchedProfile ? matchedProfile.email : 'samorzad@wskz.pl',
      website: matchedProfile ? matchedProfile.website : 'https://studia-wroclaw.pl/samorzad-studencki/',
      websiteUrl: matchedProfile ? matchedProfile.websiteUrl : 'https://wskz.pl',
      closing: matchedProfile ? matchedProfile.closing : 'Z wyrazami szacunku,',
      isCustomAuthor: !matchedProfile,
    });
    setIsPreviewEditable(false);
    setPreviewLetterItem(item);
  }, [currentUserName]);

  const handleSelectSignatureProfile = (profileId) => {
    if (profileId === 'custom') {
      setPreviewFields((prev) => ({
        ...prev,
        selectedSignatureId: 'custom',
        isCustomAuthor: true,
      }));
      return;
    }

    const profile = OFFICIAL_SIGNATURE_PROFILES.find((p) => p.id === profileId);
    if (!profile) return;

    setPreviewFields((prev) => ({
      ...prev,
      selectedSignatureId: profile.id,
      autor: profile.name,
      stanowisko: profile.title,
      uczelnia: profile.organization,
      kadencja: profile.term,
      email: profile.email,
      website: profile.website,
      websiteUrl: profile.websiteUrl,
      closing: profile.closing,
      isCustomAuthor: false,
    }));
  };

  const handleSavePreviewChanges = async () => {
    if (!previewLetterItem) return;
    const updated = {
      ...previewLetterItem,
      przedmiot: previewFields.temat,
      temat: previewFields.temat,
      subject: previewFields.temat,
      nadawca: previewFields.nadawca,
      sender: previewFields.nadawca,
      odbiorca: previewFields.odbiorca,
      recipient: previewFields.odbiorca,
      tresc: previewFields.tresc,
      summary: previewFields.tresc,
      autor: previewFields.autor,
    };
    setPreviewLetterItem(updated);
    if (activeDrawerItem && (activeDrawerItem.id === updated.id || activeDrawerItem.sygnatura === updated.sygnatura)) {
      setActiveDrawerItem(updated);
    }
    setIsPreviewEditable(false);
    if (onEditCorrespondence) {
      await onEditCorrespondence(updated);
    }
  };

  const handleGenerateDoc = async (item) => {
    if (!item) return;
    const sygnatura = item.sygnatura || item.id;
    const authorToUse = item.autor || currentUserName || 'Kancelaria Samorządu';

    setIsGeneratingDoc(true);
    setGenerateDocNotice({ type: 'info', text: 'Trwa wypalanie pisma na oficjalnym szablonie w Google Docs...' });

    try {
      const payload = {
        action: "generuj_pismo_drive",
        sygnatura: sygnatura,
        id: sygnatura,
        autor: authorToUse,
        data: item.dataWplywu || item.data || item.date || getCurrentLocalDateTimeString(),
        dataWplywu: item.dataWplywu || item.data || item.date || getCurrentLocalDateTimeString(),
        nadawca: item.sender || item.nadawca || 'Kancelaria Samorządu Studenckiego WSKZ',
        odbiorca: item.recipient || item.odbiorca || 'Dziekanat / Samorząd',
        temat: item.subject || item.przedmiot || item.temat || 'Pismo urzędowe',
        przedmiot: item.subject || item.przedmiot || item.temat || 'Pismo urzędowe',
        tresc: item.summary || item.tresc || '',
        typ: item.typ || (item.direction === 'OUT' ? 'Wychodzące' : 'Wchodzące'),
        direction: item.direction || (item.typ === 'Wychodzące' ? 'OUT' : 'IN'),
      };

      const result = await sendToBackend(payload);
      if (result && result.docUrl) {
        const updated = {
          ...item,
          lokalizacjaDrive: result.docUrl,
          autor: authorToUse,
        };
        startTransition(() => {
          setActiveDrawerItem(updated);
        });
        if (onEditCorrespondence) {
          await onEditCorrespondence(updated);
        }
        try {
          window.open(result.docUrl, '_blank');
        } catch (e) {
          console.warn('Nie udało się automatycznie otworzyć karty:', e);
        }
        setGenerateDocNotice({
          type: 'success',
          text: `Dokument dla ${sygnatura} został pomyślnie wygenerowany na Dysku!`,
          url: result.docUrl,
        });
      } else {
        throw new Error(result?.message || 'Brak zwrotnego adresu URL dokumentu');
      }
    } catch (err) {
      console.error('Błąd generowania dokumentu:', err);
      setGenerateDocNotice({
        type: 'error',
        text: `Otwarto wbudowany druk A4 w aplikacji (status chmury Drive: ${err.message}). Możesz od razu wydrukować lub zapisać pismo jako PDF.`,
      });
      handleOpenPrintPreview(item);
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleParsePastedText = () => {
    if (!rawPastedText.trim()) return;

    const parsed = parseIncomingEmailText(rawPastedText);
    if (!parsed) return;

    const parsedDate = parsed.dataWplywu || parsed.dataWyslania;
    const fallbackNow = getCurrentLocalDateTimeString();

    setNewEntry(prev => ({
      ...prev,
      direction: parsed.kierunek === "OUT" ? "OUT" : "IN",
      sender: parsed.nadawca || prev.sender,
      recipient: parsed.odbiorca || prev.recipient,
      subject: parsed.temat || prev.subject,
      summary: parsed.tresc || prev.summary,
      status: "W toku",
      dataWplywu: parsedDate ? formatForDateTimeInput(parsedDate) : (prev.dataWplywu || fallbackNow),
      dataWyslania: parsedDate ? formatForDateTimeInput(parsedDate) : (prev.dataWyslania || fallbackNow),
    }));

    setParseNotice('Pomyślnie rozpoznano dane wiadomości! Formularz został uzupełniony.');
    setModalMode('form');
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newEntry.subject || !newEntry.sender) return;

    const typ = newEntry.direction === 'OUT' ? 'Wychodzące' : 'Wchodzące';
    const nextId = `DK/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(correspondence.length + 1).padStart(2, '0')}`;
    
    const formattedDataWyslania = prepareDateTimeForPayload(newEntry.dataWyslania);
    const formattedDataWplywu = prepareDateTimeForPayload(newEntry.dataWplywu || getCurrentLocalDateTimeString());
    const displayDate = formattedDataWplywu.slice(0, 10);

    const entryToSave = {
      action: "zarejestruj_pismo",
      sygnatura: nextId,
      id: nextId,
      typ,
      direction: newEntry.direction,
      dataWyslania: formattedDataWyslania,
      dataWplywu: formattedDataWplywu,
      nadawca: newEntry.sender,
      sender: newEntry.sender,
      odbiorca: newEntry.recipient || (newEntry.direction === 'OUT' ? 'Dziekanat / Samorząd' : 'Kancelaria Samorządu Studenckiego WSKZ'),
      recipient: newEntry.recipient || (newEntry.direction === 'OUT' ? 'Dziekanat / Samorząd' : 'Kancelaria Samorządu Studenckiego WSKZ'),
      autor: newEntry.autor || currentUserName,
      przedmiot: newEntry.subject,
      subject: newEntry.subject,
      tresc: newEntry.summary,
      summary: newEntry.summary,
      status: newEntry.status || "W toku",
      statusUjednolicenia: newEntry.status || "W toku",
      weryfikacjaFormalna: "Zatwierdzone",
      lokalizacjaDrive: newEntry.lokalizacjaDrive || "",
      notes: newEntry.notes,
      sourceCitation: newEntry.sourceCitation,
      date: displayDate,
      data: formattedDataWplywu,
      createdAt: new Date().toISOString(),
      attachments: newEntry.lokalizacjaDrive ? [{ name: 'Dokument Google Drive', url: newEntry.lokalizacjaDrive }] : [],
      hash: `${nextId}_${Date.now()}`,
    };

    const isDocMode = modalMode === 'createDoc';
    onAddCorrespondence(entryToSave);
    setIsAddModalOpen(false);
    setParseNotice(null);
    setRawPastedText('');
    setModalMode('parser');
    setNewEntry({
      direction: 'IN',
      sender: '',
      recipient: 'Kancelaria Samorządu Studenckiego WSKZ',
      autor: currentUserName,
      subject: '',
      summary: '',
      status: 'W toku',
      statusUjednolicenia: 'W trakcie',
      weryfikacjaFormalna: 'Weryfikacja',
      sourceCitation: '',
      lokalizacjaDrive: '',
      notes: '',
      dataWyslania: '',
      dataWplywu: getCurrentLocalDateTimeString(),
    });

    if (isDocMode) {
      handleGenerateDoc(entryToSave);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Top Header & Actions ────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-900">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Mail className="text-[#1e3a8a]" size={20} />
              Dziennik Korespondencji Kancelarii Samorządu
            </h2>
            {academicYear && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#1e3a8a] border border-blue-200">
                <Calendar size={12} className="text-[#1e3a8a]" />
                <span>Rok {academicYear === 'ALL' ? 'Wszystkie lata' : academicYear}</span>
                {academicYear === '2026/2027' && (
                  <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 text-[9px] font-extrabold uppercase">
                    Bieżący
                  </span>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Oficjalny rejestr pism przychodzących i wychodzących z weryfikacją formalną i statusem ujednolicenia
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setNewEntry(prev => ({
                ...prev,
                direction: 'OUT',
                sender: 'Kancelaria Samorządu Studenckiego WSKZ',
                recipient: 'Dziekanat WNS / Władze Uczelni WSKZ',
                autor: currentUserName,
                subject: '',
                summary: '',
                status: 'W toku',
                dataWplywu: getCurrentLocalDateTimeString(),
                dataWyslania: getCurrentLocalDateTimeString(),
              }));
              setModalMode('createDoc');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            title="Utwórz nowe oficjalne pismo wypalone z szablonu w Google Docs"
          >
            <Sparkles size={15} className="text-amber-300" />
            <span>Utwórz pismo (Google Docs)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalMode('form');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Zarejestruj pismo</span>
          </button>
        </div>
      </div>

      {/* ── Filters and Search Bar ───────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <label htmlFor="kancelaria-search" className="sr-only">
            Szukaj korespondencji
          </label>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="kancelaria-search"
            name="kancelariaSearch"
            type="text"
            placeholder="Szukaj po sygnaturze, temacie, nadawcy, odbiorcy lub cytacie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-500 transition"
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

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl text-xs font-medium border border-slate-300">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                typeFilter === 'ALL' ? 'bg-[#1e3a8a] font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Wszystkie
            </button>
            <button
              onClick={() => setTypeFilter('IN')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                typeFilter === 'IN' ? 'bg-blue-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <ArrowDownLeft size={12} /> Wchodzące
            </button>
            <button
              onClick={() => setTypeFilter('OUT')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                typeFilter === 'OUT' ? 'bg-emerald-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <ArrowUpRight size={12} /> Wychodzące
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl text-xs font-medium border border-slate-300">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-[#1e3a8a] font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Status: Wszystkie
            </button>
            <button
              onClick={() => setStatusFilter('Zatwierdzone')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'Zatwierdzone' ? 'bg-emerald-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Zatwierdzone
            </button>
            <button
              onClick={() => setStatusFilter('W toku')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'W toku' ? 'bg-amber-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              W toku
            </button>
            <button
              onClick={() => setStatusFilter('Weryfikacja')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'Weryfikacja' ? 'bg-sky-600 font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weryfikacja
            </button>
          </div>
        </div>
      </div>

      {/* ── Correspondence Data Table ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-300 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                {/* SYGNATURA */}
                <th
                  onClick={() => handleSort('sygnatura')}
                  className="w-36 cursor-pointer select-none hover:bg-slate-200/70 transition-colors py-3 px-3 text-slate-700 font-semibold text-xs uppercase tracking-wider text-left truncate"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span>SYGNATURA</span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {sortConfig.key === 'sygnatura' ? (
                        sortConfig.direction === 'desc' ? '▼' : '▲'
                      ) : (
                        <span className="opacity-40 hover:opacity-100">↕</span>
                      )}
                    </span>
                  </div>
                </th>

                {/* DATA WPŁYWU */}
                <th
                  onClick={() => handleSort('dataWplywu')}
                  className="w-32 cursor-pointer select-none hover:bg-slate-200/70 transition-colors py-3 px-2.5 text-slate-700 font-semibold text-xs uppercase tracking-wider text-left whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>DATA WPŁYWU</span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {sortConfig.key === 'dataWplywu' ? (
                        sortConfig.direction === 'desc' ? '▼' : '▲'
                      ) : (
                        <span className="opacity-40 hover:opacity-100">↕</span>
                      )}
                    </span>
                  </div>
                </th>

                {/* TYP */}
                <th
                  onClick={() => handleSort('typ')}
                  className="w-24 cursor-pointer select-none hover:bg-slate-200/70 transition-colors py-3 px-2.5 text-slate-700 font-semibold text-xs uppercase tracking-wider text-left whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>TYP</span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {sortConfig.key === 'typ' ? (
                        sortConfig.direction === 'desc' ? '▼' : '▲'
                      ) : (
                        <span className="opacity-40 hover:opacity-100">↕</span>
                      )}
                    </span>
                  </div>
                </th>

                {/* NADAWCA */}
                <th
                  onClick={() => handleSort('nadawca')}
                  className="w-40 cursor-pointer select-none hover:bg-slate-200/70 transition-colors py-3 px-3 text-slate-700 font-semibold text-xs uppercase tracking-wider text-left truncate"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span>NADAWCA</span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {sortConfig.key === 'nadawca' ? (
                        sortConfig.direction === 'desc' ? '▼' : '▲'
                      ) : (
                        <span className="opacity-40 hover:opacity-100">↕</span>
                      )}
                    </span>
                  </div>
                </th>

                {/* ODBIORCA / DW */}
                <th
                  onClick={() => handleSort('odbiorca')}
                  className="w-40 cursor-pointer select-none hover:bg-slate-200/70 transition-colors py-3 px-3 text-slate-700 font-semibold text-xs uppercase tracking-wider text-left truncate"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span>ODBIORCA / DW</span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {sortConfig.key === 'odbiorca' ? (
                        sortConfig.direction === 'desc' ? '▼' : '▲'
                      ) : (
                        <span className="opacity-40 hover:opacity-100">↕</span>
                      )}
                    </span>
                  </div>
                </th>

                {/* TEMAT */}
                <th
                  onClick={() => handleSort('temat')}
                  className="w-auto cursor-pointer select-none hover:bg-slate-200/70 transition-colors py-3 px-3 text-slate-700 font-semibold text-xs uppercase tracking-wider text-left truncate"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span>TEMAT</span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {sortConfig.key === 'temat' ? (
                        sortConfig.direction === 'desc' ? '▼' : '▲'
                      ) : (
                        <span className="opacity-40 hover:opacity-100">↕</span>
                      )}
                    </span>
                  </div>
                </th>

                {/* STATUS */}
                <th
                  onClick={() => handleSort('status')}
                  className="w-32 cursor-pointer select-none hover:bg-slate-200/70 transition-colors py-3 px-2.5 text-slate-700 font-semibold text-xs uppercase tracking-wider text-left whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>STATUS</span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {sortConfig.key === 'status' ? (
                        sortConfig.direction === 'desc' ? '▼' : '▲'
                      ) : (
                        <span className="opacity-40 hover:opacity-100">↕</span>
                      )}
                    </span>
                  </div>
                </th>

                {/* WERYFIKACJA FORMALNA */}
                <th
                  onClick={() => handleSort('weryfikacja')}
                  className="w-28 cursor-pointer select-none hover:bg-slate-200/70 transition-colors py-3 px-2.5 text-slate-700 font-semibold text-xs uppercase tracking-wider text-center whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>WERYFIKACJA</span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {sortConfig.key === 'weryfikacja' ? (
                        sortConfig.direction === 'desc' ? '▼' : '▲'
                      ) : (
                        <span className="opacity-40 hover:opacity-100">↕</span>
                      )}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                    <div className="max-w-md mx-auto space-y-2">
                      <p className="text-sm font-semibold text-slate-700">
                        Brak pism zarejestrowanych w roku akademickim {academicYear === 'ALL' ? 'wszystkich' : academicYear}
                      </p>
                      <p className="text-xs text-slate-400">
                        {academicYear === '2026/2027'
                          ? 'Kliknij przycisk „Zarejestruj pismo”, aby dodać pierwszą sprawę w bieżącym roku, lub przełącz na 2025/2026 w nagłówku, aby przejrzeć historię.'
                          : 'Brak pism spełniających wybrane kryteria wyszukiwania.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedData.map((item) => (
                  <CorrespondenceTableRow
                    key={item.id}
                    item={item}
                    isSelected={activeDrawerItem?.id === item.id}
                    onSelect={handleOpenDrawer}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="py-2.5 px-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Wyświetlono <strong className="text-slate-900">{sortedData.length}</strong> z <strong className="text-slate-900">{correspondence.length}</strong> zarejestrowanych pism</span>
          <span className="text-[11px] text-slate-400">Kliknij dowolny wiersz, aby otworzyć panel sprawy</span>
        </div>
      </div>

      {/* ── Slide-over Drawer: Szczegóły sprawy i cytaty źródłowe ─────────── */}
      {activeDrawerItem && (
        <div className="fixed inset-0 z-50 overflow-hidden print:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={handleCloseDrawer}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="drawer-title"
              className="w-screen max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200"
            >
              
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-extrabold text-[#1e3a8a] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                      {activeDrawerItem.sygnatura || activeDrawerItem.id}
                    </span>
                    {!isEditing ? (
                      activeDrawerItem.direction === 'IN' || activeDrawerItem.typ === 'Wchodzące' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                          Wchodzące
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Wychodzące
                        </span>
                      )
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Edit3 size={11} className="text-amber-800 shrink-0" /> Tryb edycji
                      </span>
                    )}
                  </div>
                  {!isEditing ? (
                    <h3 id="drawer-title" className="text-base font-bold text-slate-900 leading-snug">
                      {activeDrawerItem.subject || activeDrawerItem.przedmiot || activeDrawerItem.temat}
                    </h3>
                  ) : (
                    <p id="drawer-title" className="text-xs text-slate-500">
                      Edycja wpisu w Dzienniku Korespondencji Kancelarii
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenPrintPreview(activeDrawerItem)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
                        title="Otwórz wbudowany podgląd oficjalnego druku A4 Samorządu (Drukuj / PDF)"
                      >
                        <Printer size={13} className="text-indigo-700" />
                        <span>Druk A4 / PDF</span>
                      </button>
                      {activeDrawerItem.lokalizacjaDrive ? (
                        <a
                          href={activeDrawerItem.lokalizacjaDrive}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                          title="Otwórz oficjalne pismo w Google Docs"
                        >
                          <ExternalLink size={13} />
                          <span>Google Docs</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled={isGeneratingDoc}
                          onClick={() => handleGenerateDoc(activeDrawerItem)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                          title="Wypal oficjalne pismo z szablonu w Google Docs"
                        >
                          <Sparkles size={13} className="text-amber-300" />
                          <span>{isGeneratingDoc ? 'Wypalanie...' : 'Wypal w Google Docs'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(activeDrawerItem)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-xs font-medium shadow-2xs"
                      >
                        <Edit3 size={14} className="text-slate-700 shrink-0" />
                        <span>Edytuj sprawę</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="border border-slate-300 text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        Anuluj
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="bg-blue-900 hover:bg-blue-950 text-white font-semibold px-4 py-2 rounded-lg shadow-sm text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      >
                        <Save size={14} className="shrink-0" />
                        <span>Zapisz zmiany</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleCloseDrawer}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer ml-1"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              {!isEditing ? (
                <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                  {/* Meta Grid */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 font-medium">Data wpływu (doręczenia):</span>
                      <p className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5 font-mono text-xs">
                        <Calendar size={13} className="text-slate-400" />
                        {(() => {
                          const dt = formatTableDateTime(activeDrawerItem.dataWplywu || activeDrawerItem.data || activeDrawerItem.date || activeDrawerItem.Data_Wplywu);
                          return dt.time ? `${dt.date} ${dt.time}` : dt.date;
                        })()}
                      </p>
                      {activeDrawerItem.dataWyslania && (
                        <p className="text-[10.5px] text-slate-500 mt-1 font-mono">
                          Wysłano przez nadawcę: {(() => {
                            const dtW = formatTableDateTime(activeDrawerItem.dataWyslania);
                            return dtW.time ? `${dtW.date} ${dtW.time}` : dtW.date;
                          })()}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="drawer-quick-status" className="block text-slate-500 font-medium">Status sprawy:</label>
                      <div className="mt-0.5 flex items-center gap-2">
                        <select
                          id="drawer-quick-status"
                          name="drawerQuickStatus"
                          value={activeDrawerItem.status || 'W toku'}
                          onChange={(e) => {
                            const newSt = e.target.value;
                            setActiveDrawerItem(prev => ({ ...prev, status: newSt }));
                            onChangeStatus(activeDrawerItem.id || activeDrawerItem.sygnatura, newSt);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-800 shadow-2xs focus:ring-2 focus:ring-[#1e3a8a]/20 cursor-pointer"
                        >
                          <option value="W toku">W toku</option>
                          <option value="Zatwierdzone">Zatwierdzone</option>
                          <option value="Weryfikacja">Weryfikacja</option>
                          <option value="Przekazano wg właściwości">Przekazano wg właściwości</option>
                          <option value="Zakończone">Zakończone</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Nadawca:</span>
                      <p className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Building size={13} className="text-slate-400" /> {activeDrawerItem.sender || activeDrawerItem.nadawca}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Odbiorca:</span>
                      <p className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                        <User size={13} className="text-slate-400" /> {activeDrawerItem.recipient || activeDrawerItem.odbiorca}
                      </p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Sporządził(a) / Autor:</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <User size={13} className="text-[#1e3a8a]" />
                        {activeDrawerItem.autor || currentUserName}
                      </span>
                    </div>
                  </div>

                  {/* Streszczenie / Treść sprawy */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <FileText size={14} className="text-[#1e3a8a]" /> Streszczenie sprawy / Pełna treść
                    </h4>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {activeDrawerItem.summary || activeDrawerItem.tresc || 'Brak dodatkowego streszczenia sprawy.'}
                    </div>
                  </div>

                  {/* Cytat źródłowy / Podstawa prawna */}
                  {activeDrawerItem.sourceCitation && (
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Paperclip size={14} className="text-[#1e3a8a]" /> Cytat źródłowy / Oznaczenie pisma
                      </h4>
                      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-[#1e3a8a] font-mono text-[11px]">
                        &ldquo;{activeDrawerItem.sourceCitation}&rdquo;
                      </div>
                    </div>
                  )}

                  {/* Notatki kancelaryjne */}
                  {activeDrawerItem.notes && (
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-amber-600" /> Dyspozycje i notatki kancelaryjne
                      </h4>
                      <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-900 whitespace-pre-wrap">
                        {activeDrawerItem.notes}
                      </div>
                    </div>
                  )}

                  {/* Załączniki / Dysk Google & Generator Szablonu */}
                  <div className="space-y-3">
                    {/* Wypalanie pisma na oficjalnym szablonie Samorządu */}
                    {activeDrawerItem.lokalizacjaDrive ? (
                      <div className="border border-emerald-300 bg-emerald-50/70 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold uppercase text-emerald-900 flex items-center gap-1.5">
                            <FileText size={15} className="text-emerald-700" />
                            Oficjalne Pismo w Google Docs (Drive)
                          </label>
                          <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                            Wypalony z szablonu
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Dokument w folderze Kancelarii. Sporządził(a): <strong className="text-slate-900">{activeDrawerItem.autor || currentUserName}</strong>
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <a
                            href={activeDrawerItem.lokalizacjaDrive}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
                          >
                            <ExternalLink size={14} />
                            <span>Otwórz dokument na Drive</span>
                          </a>
                          <button
                            type="button"
                            disabled={isGeneratingDoc}
                            onClick={() => handleGenerateDoc(activeDrawerItem)}
                            className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-semibold hover:underline cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles size={13} />
                            <span>{isGeneratingDoc ? 'Generowanie...' : 'Wygeneruj ponownie'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-blue-200 bg-blue-50/60 rounded-xl p-4 space-y-2.5">
                        <div className="flex items-start gap-2.5">
                          <Sparkles className="text-blue-700 shrink-0 mt-0.5" size={18} />
                          <div>
                            <h5 className="text-xs font-bold text-slate-900">
                              Wypal oficjalne pismo w Google Docs (szablon Samorządu)
                            </h5>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                              Tworzy sformatowany dokument w folderze Dysku Samorządu z Twoim nazwiskiem jako autora (<strong className="text-slate-800">{activeDrawerItem.autor || currentUserName}</strong>) oraz sygnaturą sprawy.
                            </p>
                          </div>
                        </div>
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenPrintPreview(activeDrawerItem)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white shadow-xs transition cursor-pointer"
                          >
                            <Printer size={14} />
                            <span>Podgląd druku A4 / PDF (w aplikacji)</span>
                          </button>
                          <button
                            type="button"
                            disabled={isGeneratingDoc}
                            onClick={() => handleGenerateDoc(activeDrawerItem)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-blue-50 text-[#1e3a8a] border border-blue-300 shadow-2xs transition cursor-pointer disabled:opacity-50"
                          >
                            {isGeneratingDoc ? (
                              <>
                                <Clock size={14} className="animate-spin" />
                                <span>Wypalanie pisma na Drive...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={14} />
                                <span>Wypal w Google Docs (Drive)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {generateDocNotice && (
                      <div className={`p-3 rounded-xl text-xs ${
                        generateDocNotice.type === 'success'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : generateDocNotice.type === 'error'
                          ? 'bg-red-100 text-red-900 border border-red-300'
                          : 'bg-blue-100 text-blue-900 border border-blue-300'
                      }`}>
                        <p className="font-medium">{generateDocNotice.text}</p>
                        {generateDocNotice.url && (
                          <a
                            href={generateDocNotice.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1.5 font-bold text-emerald-950 underline"
                          >
                            <ExternalLink size={12} />
                            <span>Kliknij tutaj, aby otworzyć dokument na Google Drive</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Pozostałe załączniki */}
                    {((activeDrawerItem.attachments && activeDrawerItem.attachments.length > 0) || !activeDrawerItem.lokalizacjaDrive) && (
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Paperclip size={14} className="text-slate-500" /> Załączniki do sprawy / Dokumentacja
                        </h4>
                        <div className="space-y-1.5">
                          {(activeDrawerItem.attachments && activeDrawerItem.attachments.length > 0) ? (
                            activeDrawerItem.attachments.map((att, idx) => {
                              const attName = typeof att === 'string' ? att : (att.name || 'Dokument');
                              const attUrl = typeof att === 'object' ? att.url : null;
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium"
                                >
                                  <span className="font-mono text-xs truncate max-w-xs">{attName}</span>
                                  {attUrl ? (
                                    <a
                                      href={attUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-700 font-semibold hover:underline"
                                    >
                                      Otwórz
                                    </a>
                                  ) : (
                                    <span className="text-xs text-blue-700 font-semibold cursor-pointer hover:underline">
                                      Pobierz
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          ) : !activeDrawerItem.lokalizacjaDrive && (
                            <p className="text-slate-500 italic">Brak zarejestrowanych załączników cyfrowych.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sygnatura cyfrowa & Audit Trail */}
                  <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200 text-[10.5px] text-slate-600 space-y-1">
                    <p><strong className="text-slate-800">Identyfikator cyfrowy:</strong> {activeDrawerItem.hash || activeDrawerItem.id || activeDrawerItem.sygnatura}</p>
                    <p><strong className="text-slate-800">Zarejestrowano w:</strong> Kancelaria Samorządu Studenckiego WSKZ</p>
                  </div>
                </div>
              ) : (
                /* Drawer Body in Edit Mode */
                <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                  {/* Temat / Przedmiot */}
                  <div>
                    <label htmlFor="edit-przedmiot" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Temat / Przedmiot sprawy *
                    </label>
                    <input
                      id="edit-przedmiot"
                      name="editPrzedmiot"
                      type="text"
                      required
                      value={editForm.przedmiot || ''}
                      onChange={(e) => setEditForm({ ...editForm, przedmiot: e.target.value, temat: e.target.value, subject: e.target.value })}
                      placeholder="Krótki, precyzyjny tytuł pisma"
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Daty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <label htmlFor="edit-data-wplywu" className="block text-slate-800 font-semibold text-[11px] tracking-wide uppercase mb-1">
                        Data wpływu (doręczenia) *
                      </label>
                      <input
                        id="edit-data-wplywu"
                        name="editDataWplywu"
                        type="datetime-local"
                        value={editForm.dataWplywu || ''}
                        onChange={(e) => setEditForm({ ...editForm, dataWplywu: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 font-semibold"
                      />
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                        Data doręczenia / rejestracji w Kancelarii
                      </p>
                    </div>

                    <div>
                      <label htmlFor="edit-data-wyslania" className="block text-slate-800 font-semibold text-[11px] tracking-wide uppercase mb-1">
                        Data wysłania (nadawca)
                      </label>
                      <input
                        id="edit-data-wyslania"
                        name="editDataWyslania"
                        type="datetime-local"
                        value={editForm.dataWyslania || ''}
                        onChange={(e) => setEditForm({ ...editForm, dataWyslania: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                        Data wysłania przez nadawcę
                      </p>
                    </div>
                  </div>

                  {/* Kierunek & Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="edit-typ" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                        Kierunek pisma
                      </label>
                      <select
                        id="edit-typ"
                        name="editTyp"
                        value={editForm.typ || 'Wchodzące'}
                        onChange={(e) => setEditForm({ ...editForm, typ: e.target.value, direction: e.target.value === 'Wychodzące' ? 'OUT' : 'IN' })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="Wchodzące">Wchodzące (Wpływ)</option>
                        <option value="Wychodzące">Wychodzące (Wysłane)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="edit-status" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                        Status sprawy
                      </label>
                      <select
                        id="edit-status"
                        name="editStatus"
                        value={editForm.status || 'W toku'}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="W toku">W toku</option>
                        <option value="Zatwierdzone">Zatwierdzone</option>
                        <option value="Weryfikacja">Weryfikacja formalna</option>
                        <option value="Przekazano wg właściwości">Przekazano wg właściwości</option>
                        <option value="Zakończone">Zakończone</option>
                      </select>
                    </div>
                  </div>

                  {/* Nadawca & Odbiorca */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="edit-nadawca" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                        Nadawca *
                      </label>
                      <input
                        id="edit-nadawca"
                        name="editNadawca"
                        type="text"
                        required
                        value={editForm.nadawca || ''}
                        onChange={(e) => setEditForm({ ...editForm, nadawca: e.target.value, sender: e.target.value })}
                        placeholder="np. Dziekanat WNS"
                        className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="edit-odbiorca" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                        Odbiorca / DW *
                      </label>
                      <input
                        id="edit-odbiorca"
                        name="editOdbiorca"
                        type="text"
                        required
                        value={editForm.odbiorca || ''}
                        onChange={(e) => setEditForm({ ...editForm, odbiorca: e.target.value, recipient: e.target.value })}
                        placeholder="np. Kancelaria Samorządu"
                        className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Streszczenie / Treść sprawy */}
                  <div>
                    <label htmlFor="edit-tresc" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Streszczenie / Pełna treść sprawy
                    </label>
                    <textarea
                      id="edit-tresc"
                      name="editTresc"
                      rows={6}
                      value={editForm.tresc || ''}
                      onChange={(e) => setEditForm({ ...editForm, tresc: e.target.value, summary: e.target.value })}
                      placeholder="Kluczowe ustalenia, opis sprawy, treść pisma..."
                      className="w-full p-3 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 leading-relaxed"
                    />
                  </div>

                  {/* Cytat źródłowy */}
                  <div>
                    <label htmlFor="edit-source-citation" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Cytat źródłowy / Oznaczenie pisma
                    </label>
                    <input
                      id="edit-source-citation"
                      name="editSourceCitation"
                      type="text"
                      value={editForm.sourceCitation || ''}
                      onChange={(e) => setEditForm({ ...editForm, sourceCitation: e.target.value })}
                      placeholder="np. Pismo D-WNS/412/2026"
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Dyspozycje i notatki kancelaryjne */}
                  <div>
                    <label htmlFor="edit-notes" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Dyspozycje i notatki kancelaryjne
                    </label>
                    <textarea
                      id="edit-notes"
                      name="editNotes"
                      rows={3}
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="Wewnętrzne notatki, przydział do osoby..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Sporządził(a) / Autor */}
                  <div>
                    <label htmlFor="edit-autor" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Sporządził(a) / Autor wpisu
                    </label>
                    <div className="space-y-2">
                      <select
                        value={OFFICIAL_SIGNATURE_PROFILES.some((p) => p.name === editForm.autor) ? editForm.autor : 'custom'}
                        onChange={(e) => {
                          if (e.target.value !== 'custom') {
                            setEditForm({ ...editForm, autor: e.target.value });
                          }
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {OFFICIAL_SIGNATURE_PROFILES.map((prof) => (
                          <option key={prof.id} value={prof.name}>
                            {prof.name} — {prof.title}
                          </option>
                        ))}
                        <option value="custom">✏️ Inna osoba / Wpisz ręcznie poniżej...</option>
                      </select>

                      <input
                        id="edit-autor"
                        name="editAutor"
                        type="text"
                        value={editForm.autor || ''}
                        onChange={(e) => setEditForm({ ...editForm, autor: e.target.value })}
                        placeholder="Imię i nazwisko osoby sporządzającej wpis"
                        className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Lokalizacja Drive */}
                  <div>
                    <label htmlFor="edit-lokalizacja-drive" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Lokalizacja Drive / Link do skanu
                    </label>
                    <input
                      id="edit-lokalizacja-drive"
                      name="editLokalizacjaDrive"
                      type="url"
                      value={editForm.lokalizacjaDrive || ''}
                      onChange={(e) => setEditForm({ ...editForm, lokalizacjaDrive: e.target.value })}
                      placeholder="https://drive.google.com/..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
                {!isEditing ? (
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCloseDrawer}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                      >
                        Zamknij
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(activeDrawerItem)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Usuń to pismo lub dubel z rejestru"
                      >
                        <Trash2 size={14} className="shrink-0 text-red-500" />
                        <span>Usuń pismo</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(activeDrawerItem)}
                        className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-xs font-medium"
                      >
                        <Edit3 size={14} className="text-slate-700 shrink-0" />
                        <span>Edytuj sprawę</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPrintPreview(activeDrawerItem)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition cursor-pointer"
                      >
                        <Printer size={14} className="text-indigo-700" />
                        <span>Druk A4 / PDF</span>
                      </button>
                      {activeDrawerItem.lokalizacjaDrive ? (
                        <a
                          href={activeDrawerItem.lokalizacjaDrive}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
                        >
                          <ExternalLink size={14} />
                          <span>Otwórz w Google Docs</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled={isGeneratingDoc}
                          onClick={() => handleGenerateDoc(activeDrawerItem)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                        >
                          {isGeneratingDoc ? (
                            <>
                              <Clock size={14} className="animate-spin" />
                              <span>Wypalanie pisma...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} className="text-amber-300" />
                              <span>Wypal w Google Docs</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition cursor-pointer"
                      >
                        Anuluj
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(activeDrawerItem)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Usuń to pismo lub dubel z rejestru"
                      >
                        <Trash2 size={14} className="shrink-0 text-red-500" />
                        <span>Usuń</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={handleSaveEdit}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-900 hover:bg-blue-950 text-white shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Save size={14} className="shrink-0" />
                        <span>Zapisz zmiany</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Rejestracja Nowego Pisma ──────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-white flex items-center justify-between">
              <h3 id="modal-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
                {modalMode === 'createDoc' ? (
                  <>
                    <Sparkles size={18} className="text-[#1e3a8a]" />
                    <span>Nowe oficjalne pismo Samorządu (Google Docs)</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} className="text-[#1e3a8a]" />
                    <span>Rejestracja nowego pisma w Dzienniku Korespondencji</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setParseNotice(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Segmented Switcher */}
            <div className="px-5 pt-4 pb-2 bg-white">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => {
                    setNewEntry(prev => ({
                      ...prev,
                      direction: 'OUT',
                      sender: 'Kancelaria Samorządu Studenckiego WSKZ',
                      recipient: prev.recipient && prev.recipient !== 'Kancelaria Samorządu Studenckiego WSKZ' ? prev.recipient : 'Dziekanat WNS / Władze Uczelni WSKZ',
                      autor: prev.autor || currentUserName,
                    }));
                    setModalMode('createDoc');
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    modalMode === 'createDoc'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles size={14} className={modalMode === 'createDoc' ? 'text-amber-300' : 'text-slate-400'} />
                  <span>📄 Utwórz pismo (Docs)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('parser')}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    modalMode === 'parser'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText size={14} className={modalMode === 'parser' ? 'text-blue-600' : 'text-slate-400'} />
                  <span>📋 Parser ze schowka</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('form')}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    modalMode === 'form'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>✍️ Rejestracja pisma</span>
                  {newEntry.subject && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  )}
                </button>
              </div>
            </div>

            {parseNotice && (
              <div className="mx-5 my-2 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-medium flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Check size={15} className="text-emerald-600 shrink-0" />
                  {parseNotice}
                </span>
                <button
                  type="button"
                  onClick={() => setParseNotice(null)}
                  className="text-emerald-600 hover:text-emerald-800 text-xs font-bold ml-2 cursor-pointer"
                >
                  &times;
                </button>
              </div>
            )}

            {/* TAB 1: PARSER KOLESPONDENCJI */}
            {modalMode === 'parser' ? (
              <div className="p-5 pt-2 space-y-4 text-xs">
                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 text-slate-800 space-y-1">
                  <p className="font-semibold text-[#1e3a8a] flex items-center gap-1.5">
                    <Zap size={14} className="text-blue-600" />
                    Automatyczne rozpoznawanie treści pism i wiadomości
                  </p>
                  <p className="text-slate-600 leading-relaxed text-[11.5px]">
                    Wklej poniżej surową treść otrzymanego maila, pismo urzędowe lub zgłoszenie. Parser automatycznie wyodrębni nadawcę, adresata, temat, sygnaturę oraz treść.
                  </p>
                </div>

                <div>
                  <label htmlFor="parser-raw-text" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                    Treść do rozpoznania
                  </label>
                  <textarea
                    id="parser-raw-text"
                    name="parserRawText"
                    rows={6}
                    value={rawPastedText}
                    onChange={(e) => setRawPastedText(e.target.value)}
                    placeholder="Wklej tutaj surową treść maila, nagłówek pisma urzędowego lub zgłoszenie (np. Od: Dziekanat, Do: Samorząd, Temat: ..., Sygnatura: ...)..."
                    className="w-full min-h-[140px] p-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 text-xs leading-relaxed"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRawPastedText(`Od Anna Tomczyk <anna.tomczyk@wskz.pl>\nDo samorzad@wskz.pl, magdalena.moszninska@gmail.com\nTemat Erasmus - nabór na wyjazdy dla studentów\nData 12 marca 2026 14:30\n\nSzanowni Państwo,\nZwracam się z uprzejmą prośbą o przekazanie studentom informacji o rozpoczęciu naboru wniosków stypendialnych w programie Erasmus+ na rok akademicki 2026/2027.`);
                    }}
                    className="text-[11px] text-[#1e3a8a] font-semibold hover:underline cursor-pointer"
                  >
                    Wstaw przykładową treść
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddModalOpen(false);
                        setParseNotice(null);
                      }}
                      className="px-4 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-300 font-medium transition cursor-pointer"
                    >
                      Anuluj
                    </button>
                    <button
                      type="button"
                      disabled={!rawPastedText.trim()}
                      onClick={handleParsePastedText}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-xs transition cursor-pointer"
                    >
                      <Zap size={14} />
                      <span>⚡ Rozpoznaj i Wypełnij Pola</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: FORMULARZ RĘCZNY / GENERATOR DOCS */
              <form onSubmit={handleCreateSubmit} className="p-5 pt-2 space-y-4 text-xs">
                {modalMode === 'createDoc' && (
                  <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                      <Sparkles size={14} className="text-amber-500" />
                      <span>Oficjalny Szablon Samorządu Studenckiego WSKZ</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Po zatwierdzeniu pismo zostanie zarejestrowane w CRM oraz wypalone w dedykowanym folderze na Dysku Google Kancelarii Samorządu z Twoim nazwiskiem w stopce dokumentu.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-direction" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Kierunek pisma
                    </label>
                    <select
                      id="new-direction"
                      name="newDirection"
                      value={newEntry.direction}
                      onChange={(e) => setNewEntry({ ...newEntry, direction: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="IN">Wchodzące (Wpływ do Kancelarii)</option>
                      <option value="OUT">Wychodzące (Wysłane z Kancelarii)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="new-status" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Status sprawy
                    </label>
                    <select
                      id="new-status"
                      name="newStatus"
                      value={newEntry.status}
                      onChange={(e) => setNewEntry({ ...newEntry, status: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="W toku">W toku</option>
                      <option value="Zatwierdzone">Zatwierdzone</option>
                      <option value="Weryfikacja">Weryfikacja formalna</option>
                    </select>
                  </div>
                </div>

                {/* ── Dwukolumnowy blok czasowy z dokładnością do minuty ─────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label htmlFor="new-data-wyslania" className="block text-slate-800 font-semibold text-[11px] tracking-wide uppercase mb-1">
                      DATA I GODZINA WYSŁANIA (NADAWCA)
                    </label>
                    <input
                      id="new-data-wyslania"
                      name="newDataWyslania"
                      type="datetime-local"
                      value={newEntry.dataWyslania || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, dataWyslania: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Data i godzina wysłania przez nadawcę (wg stempla/nagłówka poczty)
                    </p>
                  </div>

                  <div>
                    <label htmlFor="new-data-wplywu" className="block text-slate-800 font-semibold text-[11px] tracking-wide uppercase mb-1">
                      DATA I GODZINA WPŁYWU (DORĘCZENIA) *
                    </label>
                    <input
                      id="new-data-wplywu"
                      name="newDataWplywu"
                      type="datetime-local"
                      required
                      value={newEntry.dataWplywu || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, dataWplywu: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 font-semibold"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Data i godzina doręczenia / rejestracji w Kancelarii
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-sender" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Nadawca *
                    </label>
                    <input
                      id="new-sender"
                      name="newSender"
                      type="text"
                      required
                      placeholder="np. Dziekanat WNS / Koło Naukowe"
                      value={newEntry.sender}
                      onChange={(e) => setNewEntry({ ...newEntry, sender: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="new-recipient" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Odbiorca / DW *
                    </label>
                    <input
                      id="new-recipient"
                      name="newRecipient"
                      type="text"
                      required
                      placeholder="np. Kancelaria Samorządu Studenckiego WSKZ"
                      value={newEntry.recipient}
                      onChange={(e) => setNewEntry({ ...newEntry, recipient: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="new-subject" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                    Temat sprawy *
                  </label>
                  <input
                    id="new-subject"
                    name="newSubject"
                    type="text"
                    required
                    placeholder="Krótki, precyzyjny tytuł pisma lub wniosku"
                    value={newEntry.subject}
                    onChange={(e) => setNewEntry({ ...newEntry, subject: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="new-autor" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                    Sporządził(a) / Autor pisma *
                  </label>
                  <div className="space-y-2">
                    <select
                      value={OFFICIAL_SIGNATURE_PROFILES.some((p) => p.name === newEntry.autor) ? newEntry.autor : 'custom'}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          // zostaw dotychczasowy lub czyść
                        } else {
                          setNewEntry({ ...newEntry, autor: e.target.value });
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {OFFICIAL_SIGNATURE_PROFILES.map((prof) => (
                        <option key={prof.id} value={prof.name}>
                          {prof.name} — {prof.title}
                        </option>
                      ))}
                      <option value="custom">✏️ Inna osoba / Wpisz ręcznie poniżej...</option>
                    </select>

                    <input
                      id="new-autor"
                      name="newAutor"
                      type="text"
                      required
                      placeholder="Imię i nazwisko osoby sporządzającej (lub wybierz z listy powyżej)"
                      value={newEntry.autor || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, autor: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Imię i nazwisko osoby sporządzającej pismo (zostanie trwale wypalone w stopce dokumentu Google Docs oraz w rejestrze).
                  </p>
                </div>

                <div>
                  <label htmlFor="new-summary" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                    Streszczenie / Treść
                  </label>
                  <textarea
                    id="new-summary"
                    name="newSummary"
                    rows={3}
                    placeholder="Kluczowe ustalenia, opis sprawy, wnioski..."
                    value={newEntry.summary}
                    onChange={(e) => setNewEntry({ ...newEntry, summary: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-source-citation" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Cytat źródłowy / Sygnatura oryginału
                    </label>
                    <input
                      id="new-source-citation"
                      name="newSourceCitation"
                      type="text"
                      placeholder="np. Pismo D-WNS/412/2026"
                      value={newEntry.sourceCitation}
                      onChange={(e) => setNewEntry({ ...newEntry, sourceCitation: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="new-lokalizacja-drive" className="block text-slate-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                      Lokalizacja Drive / Link do skanu
                    </label>
                    <input
                      id="new-lokalizacja-drive"
                      name="newDriveLocation"
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={newEntry.lokalizacjaDrive}
                      onChange={(e) => setNewEntry({ ...newEntry, lokalizacjaDrive: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setParseNotice(null);
                    }}
                    className="px-4 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 transition cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white shadow-sm transition cursor-pointer"
                  >
                    {modalMode === 'createDoc' ? (
                      <>
                        <Sparkles size={15} className="text-amber-300" />
                        <span>Wypal i otwórz pismo</span>
                      </>
                    ) : (
                      <span>Zarejestruj pismo</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Wbudowany Podgląd i Druk Oficjalnego Pisma A4 (PDF / Print) ── */}
      {previewLetterItem &&
        createPortal(
          <div
            id="official-letter-a4-modal-backdrop"
            className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex flex-col items-center p-3 sm:p-6"
          >
            <style>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 8mm 12mm;
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  overflow: visible !important;
                  background: #ffffff !important;
                }
                #root,
                #official-letter-a4-top-bar {
                  display: none !important;
                }
                #official-letter-a4-modal-backdrop {
                  position: static !important;
                  display: block !important;
                  overflow: visible !important;
                  width: 100% !important;
                  height: auto !important;
                  background: transparent !important;
                  backdrop-filter: none !important;
                  -webkit-backdrop-filter: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                #official-letter-a4-print-area {
                  position: static !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  height: 98vh !important;
                  min-height: 98vh !important;
                  max-height: 98vh !important;
                  margin: 0 !important;
                  padding: 2mm 4mm !important;
                  box-sizing: border-box !important;
                  box-shadow: none !important;
                  border: none !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
              }
            `}</style>

            {/* Top Action Bar (Hidden in Print) */}
            <div
              id="official-letter-a4-top-bar"
              className="w-full max-w-[794px] bg-white rounded-2xl border border-slate-300 shadow-lg p-3.5 mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#3164d4] text-white flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Szablon dokumentu WSKZ (.DOCX / Format A4)
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Sygnatura: <strong>{previewFields.sygnatura}</strong> • Sporządził(a): <strong>{previewFields.autor}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {!isPreviewEditable ? (
                  <button
                    type="button"
                    onClick={() => setIsPreviewEditable(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition cursor-pointer"
                  >
                    <Edit3 size={14} />
                    <span>Edytuj treść na druku</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSavePreviewChanges}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs transition cursor-pointer"
                  >
                    <Save size={14} />
                    <span>Zapisz treść pisma</span>
                  </button>
                )}

                {/* Przycisk zapisu do Google Docs / Drive z poziomu podglądu druku */}
                <button
                  type="button"
                  disabled={isGeneratingDoc}
                  onClick={() => handleGenerateDoc(previewLetterItem)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs transition cursor-pointer disabled:opacity-50"
                  title="Wypal sformatowane pismo na oficjalnym szablonie w Google Docs na Twoim Dysku Google"
                >
                  {isGeneratingDoc ? (
                    <>
                      <Clock size={14} className="animate-spin text-emerald-600" />
                      <span>Wypalanie w Docs...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink size={14} className="text-emerald-700" />
                      <span>Zapisz w Google Docs</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#3164d4] hover:bg-[#254fb0] shadow-sm transition cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Drukuj / Zapisz PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewLetterItem(null)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                  title="Zamknij podgląd"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* A4 Sheet Area — 1:1 Szablon dokumentu WSKZ .DOCX */}
            <div
              id="official-letter-a4-print-area"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
              className="w-full max-w-[794px] min-h-[1123px] bg-white text-slate-900 rounded-xs shadow-2xl border border-slate-300 px-12 sm:px-16 pt-10 pb-8 flex flex-col justify-between relative select-text"
            >
              {/* TOP & BODY SECTION */}
              <div>
                {/* 1:1 WSKZ Header Image */}
                <div className="pb-2 select-none">
                  <img
                    src="/wskz-header.png"
                    alt="Wyższa Szkoła Kształcenia Zawodowego — Nagłówek oficjalny"
                    className="w-full h-auto block object-contain"
                  />
                </div>

                {/* Document Content Area (Clean Arial 11pt layout matching Google Docs) */}
                <div className="pt-5 space-y-5 text-[11pt] leading-[1.5] text-[#111827]">
                  {/* Place, Date & Reference Number */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Sender info on left */}
                    <div className="text-[10.5pt] leading-[1.45] text-[#1f2937]">
                      {isPreviewEditable ? (
                        <input
                          type="text"
                          value={previewFields.nadawca}
                          onChange={(e) => setPreviewFields({ ...previewFields, nadawca: e.target.value })}
                          className="w-full border border-blue-400 rounded px-2 py-0.5 text-[10.5pt] font-bold bg-blue-50/30 mb-1"
                        />
                      ) : (
                        <div className="font-bold text-[#111827]">{previewFields.nadawca}</div>
                      )}
                      <div>Wyższa Szkoła Kształcenia Zawodowego</div>
                      <div className="text-[9.5pt] text-[#4b5563]">
                        Sygn. akt: <strong className="text-[#111827]">{previewFields.sygnatura}</strong>
                      </div>
                    </div>

                    {/* Place & Date on right */}
                    <div className="text-right text-[10.5pt]">
                      {isPreviewEditable ? (
                        <input
                          type="text"
                          value={previewFields.miejsceData}
                          onChange={(e) => setPreviewFields({ ...previewFields, miejsceData: e.target.value })}
                          className="border border-blue-400 rounded px-2 py-0.5 text-[10.5pt] text-right bg-blue-50/30"
                        />
                      ) : (
                        <div>{previewFields.miejsceData}</div>
                      )}
                    </div>
                  </div>

                  {/* Recipient Block (Right-aligned in classic Polish official style) */}
                  <div className="flex justify-end pt-1">
                    <div className="w-full sm:w-[52%] text-[10.5pt] leading-[1.45]">
                      <div className="text-[9.5pt] text-[#6b7280] uppercase tracking-wider mb-0.5">
                        Adresat:
                      </div>
                      {isPreviewEditable ? (
                        <input
                          type="text"
                          value={previewFields.odbiorca}
                          onChange={(e) => setPreviewFields({ ...previewFields, odbiorca: e.target.value })}
                          className="w-full border border-blue-400 rounded px-2 py-1 text-[10.5pt] font-bold bg-blue-50/30"
                        />
                      ) : (
                        <div className="font-bold text-[#111827]">
                          Sz. P. {previewFields.odbiorca}
                        </div>
                      )}
                      <div className="text-[#374151]">
                        Wyższa Szkoła Kształcenia Zawodowego we Wrocławiu
                      </div>
                    </div>
                  </div>

                  {/* Subject (Dotyczy) */}
                  <div className="pt-1">
                    {isPreviewEditable ? (
                      <div>
                        <span className="text-[9.5pt] font-bold uppercase text-[#3164d4] block mb-1">
                          Dotyczy sprawy:
                        </span>
                        <input
                          type="text"
                          value={previewFields.temat}
                          onChange={(e) => setPreviewFields({ ...previewFields, temat: e.target.value })}
                          className="w-full border border-blue-400 rounded px-2.5 py-1 text-[11pt] font-bold text-[#111827] bg-blue-50/30"
                        />
                      </div>
                    ) : (
                      <div className="font-bold text-[11pt] text-[#111827]">
                        <span className="underline">Dotyczy:</span> {previewFields.temat}
                      </div>
                    )}
                  </div>

                  {/* Main Letter Body */}
                  <div className="pt-1 text-[11pt] leading-[1.6] text-[#111827]">
                    {isPreviewEditable ? (
                      <div className="space-y-1.5">
                        <label className="text-[9.5pt] font-bold uppercase text-[#3164d4] block">
                          Treść pisma (edytowalna):
                        </label>
                        <textarea
                          rows={10}
                          value={previewFields.tresc}
                          onChange={(e) => setPreviewFields({ ...previewFields, tresc: e.target.value })}
                          className="w-full border border-blue-400 rounded-lg p-3 text-[11pt] leading-[1.6] text-[#111827] bg-blue-50/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-justify min-h-[220px] print:min-h-0">
                        {previewFields.tresc}
                      </div>
                    )}
                  </div>

                  {/* Signature Block */}
                  <div className="pt-6 flex justify-end break-inside-avoid">
                    <div className="w-80 text-right space-y-1">
                      <p className="text-[10.5pt] italic text-[#374151] mb-2">{previewFields.closing || 'Z wyrazami szacunku,'}</p>
                      
                      {/* Wybór podpisu na druku (niewidoczny na wydruku, widoczny w trybie edycji/podglądu) */}
                      <div className="print:hidden pb-1 text-left">
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                          Wybierz podpiszącego z listy lub wpisz ręcznie:
                        </label>
                        <select
                          value={previewFields.selectedSignatureId || 'custom'}
                          onChange={(e) => handleSelectSignatureProfile(e.target.value)}
                          className="w-full text-xs font-semibold p-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {OFFICIAL_SIGNATURE_PROFILES.map((prof) => (
                            <option key={prof.id} value={prof.id}>
                              {prof.name} — {prof.title}
                            </option>
                          ))}
                          <option value="custom">✏️ Inna osoba / Wpisz ręcznie...</option>
                        </select>
                      </div>

                      {/* Dane osoby podpisującej */}
                      <div className="space-y-0.5 text-right font-sans">
                        {isPreviewEditable || previewFields.isCustomAuthor ? (
                          <div className="space-y-1 pt-1">
                            <input
                              type="text"
                              value={previewFields.autor}
                              onChange={(e) => setPreviewFields({ ...previewFields, autor: e.target.value })}
                              placeholder="Imię i nazwisko"
                              className="w-full border border-blue-400 rounded px-2 py-0.5 text-[11pt] font-bold text-right bg-blue-50/30"
                            />
                            <input
                              type="text"
                              value={previewFields.stanowisko}
                              onChange={(e) => setPreviewFields({ ...previewFields, stanowisko: e.target.value })}
                              placeholder="Stanowisko / funkcja"
                              className="w-full border border-blue-400 rounded px-2 py-0.5 text-[10pt] text-right bg-blue-50/30"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="text-[11.5pt] font-bold text-[#111827] leading-tight">
                              {previewFields.autor}
                            </div>
                            <div className="text-[10pt] font-medium text-[#1e3a8a] leading-tight">
                              {previewFields.stanowisko}
                            </div>
                          </>
                        )}
                        <div className="text-[9.5pt] text-[#374151] leading-tight">
                          {previewFields.uczelnia || 'Wyższa Szkoła Kształcenia Zawodowego'}
                        </div>
                        <div className="text-[9pt] text-[#6b7280] leading-tight">
                          {previewFields.kadencja || 'Kadencja 2026-2028'}
                        </div>
                        <div className="text-[8.5pt] text-[#4b5563] pt-0.5 leading-tight">
                          E-mail: <a href={`mailto:${previewFields.email || 'samorzad@wskz.pl'}`} className="text-[#3164d4] hover:underline">{previewFields.email || 'samorzad@wskz.pl'}</a>
                        </div>
                        <div className="text-[8.5pt] text-[#4b5563] leading-tight">
                          WWW: <a href={previewFields.websiteUrl || 'https://wskz.pl'} target="_blank" rel="noopener noreferrer" className="text-[#3164d4] hover:underline">{previewFields.website || 'https://studia-wroclaw.pl/samorzad-studencki/'}</a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1:1 WSKZ FOOTER SECTION */}
              <div className="pt-4 mt-4 break-inside-avoid select-none">
                {/* Subtle Author & Registry Attribution above the WSKZ footer image */}
                <div className="flex items-center justify-between text-[8.5pt] text-[#9ca3af] mb-1.5 px-1">
                  <span>
                    Sporządził(a): <strong className="text-[#6b7280] font-normal">{previewFields.autor}</strong>
                  </span>
                  <span>
                    Sygn.: {previewFields.sygnatura}
                  </span>
                </div>

                {/* Official WSKZ Footer Image */}
                <img
                  src="/wskz-footer.png"
                  alt="Wyższa Szkoła Kształcenia Zawodowego — Stopka oficjalna"
                  className="w-full h-auto block object-contain"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
