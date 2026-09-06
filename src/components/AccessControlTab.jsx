import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Database,
  RefreshCw,
  Lock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  HardDrive,
  Trash2,
} from 'lucide-react';
import { PUBLIC_SHEET_GID, SAMORZAD_GIDS, SHEET_ID, testSheetConnection } from '../services/googleSheets';

export default function AccessControlTab({
  onRefreshData = () => {},
}) {
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSheetConnection(SHEET_ID, 6000);
      setTestResult(res);
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTesting(false);
    }
  };

  const roles = [
    {
      name: 'Administrator Kancelarii',
      badge: 'Pełny dostęp (Read / Write / Delete)',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Zarządzanie Dziennikiem Korespondencji, Rejestrem Wad IT, Ugodami i Ustaleniemi, synchronizacja z Google Sheets.',
      permissions: ['Tworzenie i edycja pism', 'Weryfikacja formalna', 'Zgłaszanie i eskalacja wad IT', 'Dostęp do kluczy API'],
    },
    {
      name: 'Członek Prezydium Samorządu',
      badge: 'Dostęp operacyjny (Read / Write)',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Opiniowanie wniosków, wprowadzanie ustaleń operacyjnych, wgląd do pism wpływających i ewidencji kół.',
      permissions: ['Wgląd do korespondencji', 'Dodawanie ustaleń operacyjnych', 'Zgłaszanie wad IT'],
    },
    {
      name: 'Zarząd Koła Naukowego',
      badge: 'Dostęp dedykowany (Koła)',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'Składanie sprawozdań rocznych, wniosków o dofinansowanie, aktualizacja składu członkowskiego.',
      permissions: ['Edycja danych własnego koła', 'Wysyłanie pism do Kancelarii'],
    },
    {
      name: 'Audytor / Obserwator',
      badge: 'Tylko odczyt (Read Only)',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'Przeglądanie jawnych rejestrów uchwał, sprawozdań i statystyk kancelaryjnych.',
      permissions: ['Przeglądanie statystyk', 'Eksport zestawień'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs text-slate-900">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="text-[#1e3a8a]" size={20} />
          Zarządzanie Dostępem, Uprawnieniami i Synchronizacją
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Konfiguracja bezpieczeństwa, obfuskacji kluczy, ról użytkowników oraz połączenia z arkuszem Kancelarii Samorządu
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Box 1: Integracja z Arkuszem Google (Zabezpieczenie ID) ─────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 text-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Database size={17} className="text-[#1e3a8a]" />
            <h3 className="text-sm font-bold text-slate-900">
              Parametry Synchronizacji z Arkuszem Google
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Klucz arkusza:</span>
                <span className="font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Zaszyfrowany w locie (Base64)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Protokół odpytywania:</span>
                <span className="font-mono text-slate-800">Google Visualization API (tq/gviz)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Limit czasu odpowiedzi (Timeout):</span>
                <span className="font-mono text-slate-800">8 000 ms (AbortController)</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-700 mb-2">Zunifikowana Fasada Danych (Public API):</h4>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-200">
                  <span className="text-slate-800 font-semibold">Kancelaria_API_Public:</span>
                  <span className="font-bold text-[#1e3a8a]">gid={PUBLIC_SHEET_GID}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[10px] leading-relaxed">
                  Agreguje kategorie: Korespondencja, Ustalenia Operacyjne, Zgłoszenia IT, Koła i Organizacje, Projekty i Kampanie.
                </div>
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3.5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <RefreshCw size={13} className={testing ? 'animate-spin' : ''} />
                <span>{testing ? 'Testowanie połączenia...' : 'Testuj połączenie z arkuszem'}</span>
              </button>

              <button
                onClick={onRefreshData}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer border border-slate-200"
              >
                Wymuś synchronizację
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl border text-xs ${
                testResult.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {testResult.ok ? (
                  <p className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    {testResult.message}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    {testResult.error} (Aktywny tryb Mock Fallback)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Box 2: Role i Matryca Uprawnień ──────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 text-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <KeyRound size={17} className="text-[#1e3a8a]" />
            <h3 className="text-sm font-bold text-slate-900">
              Role i Uprawnienia w Kancelarii
            </h3>
          </div>

          <div className="space-y-3">
            {roles.map((role, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">{role.name}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-blue-50 text-[#1e3a8a] border-blue-200">
                    {role.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{role.description}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {role.permissions.map((perm, pIdx) => (
                    <span key={pIdx} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
