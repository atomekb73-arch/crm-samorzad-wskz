import React from 'react';
import {
  LayoutDashboard,
  Mail,
  AlertTriangle,
  FileText,
  Users,
  ShieldCheck,
} from 'lucide-react';

export const MAIN_TABS = [
  { id: 'dashboard',       label: 'Pulpit Kancelarii',      icon: LayoutDashboard, aliases: [] },
  { id: 'correspondence',  label: 'Dziennik Korespondencji', icon: Mail,            aliases: ['mail', 'poczta'] },
  { id: 'it_issues',       label: 'Rejestr Wad IT',          icon: AlertTriangle,   aliases: ['wady', 'it'] },
  { id: 'decisions',       label: 'Ustalenia Operacyjne',    icon: FileText,        aliases: ['protokoly', 'ustalenia'] },
  { id: 'organizations',   label: 'Koła i Organizacje',      icon: Users,           aliases: ['kola', 'clubs', 'members'] },
  { id: 'access_control',  label: 'Dostęp i Uprawnienia',    icon: ShieldCheck,     aliases: ['settings', 'uprawnienia', 'settings_tools'] },
];

export default function Navbar({
  activeTab = 'dashboard',
  setActiveTab = () => {},
  pendingCorrespondenceCount = 0,
  pendingItCount = 0,
}) {
  const isTabActive = (tab) => {
    if (activeTab === tab.id) return true;
    if (tab.aliases && tab.aliases.includes(activeTab)) return true;
    return false;
  };

  return (
    <nav className="w-full flex items-center gap-1.5 justify-start overflow-x-auto py-1.5 px-2 bg-white rounded-2xl border border-slate-200 shadow-xs print:hidden">
      {MAIN_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = isTabActive(tab);
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 text-xs md:text-sm font-medium px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer group ${
              isActive
                ? 'bg-[#1e3a8a] text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Icon
              size={17}
              className={
                isActive
                  ? 'text-white shrink-0'
                  : 'text-slate-400 group-hover:text-slate-600 shrink-0'
              }
            />
            <span>{tab.label}</span>

            {/* Notification Badges */}
            {tab.id === 'correspondence' && pendingCorrespondenceCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold shadow-xs ${
                isActive ? 'bg-sky-400 text-slate-950' : 'bg-blue-600 text-white'
              }`}>
                {pendingCorrespondenceCount}
              </span>
            )}
            {tab.id === 'it_issues' && pendingItCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-xs animate-pulse">
                {pendingItCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
