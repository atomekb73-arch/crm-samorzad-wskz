/**
 * Centralny słownik 14 Kół Naukowych WSKZ oraz rejestr kalendarzy Teamup.
 * Spójny 1:1 z CRM SKN MultiHub oraz Generatorem Formularzy.
 */

export const SAMORZAD_SUBCALENDAR_ID = 15573137;

export const EXCLUDED_SUBCALENDAR_IDS = [
  15572962,
  15572975,
  15572979,
  15572992,
  15572997,
  15573005,
  15582961,
];

export const WSKZ_CLUBS = [
  {
    number: "01",
    orgId: "skn_psychologii_klinicznej",
    name: "01 SKN Psychologii Klinicznej",
    shortName: "SKN Psychologii Klinicznej",
    subcalendarId: 14518769,
    icon: "Brain",
    color: "#6D28D9",
    faculty: "Wydział Nauk Społecznych",
    aliasKeywords: ["kliniczna", "klinicznej", "psychologii klinicznej", "14518769"],
  },
  {
    number: "02",
    orgId: "skn_psychotraumatologii",
    name: "02 SKN Psychotraumatologii - Integrum",
    shortName: "SKN Psychotraumatologii (Integrum)",
    subcalendarId: 15289290,
    icon: "Puzzle",
    color: "#BE185D",
    faculty: "Wydział Nauk Społecznych",
    aliasKeywords: ["integrum", "trauma", "psychotraumatologii", "15289290"],
  },
  {
    number: "03",
    orgId: "skn_psychoterapii",
    name: "03 SKN Psychoterapii",
    shortName: "SKN Psychoterapii",
    subcalendarId: null,
    icon: "Armchair",
    color: "#DB2777",
    faculty: "Wydział Nauk Społecznych",
    aliasKeywords: ["psychoterapii", "psychoterapia"],
  },
  {
    number: "04",
    orgId: "skn_psychologii_kryminalnej",
    name: "04 SKN Psychologii Kryminalnej",
    shortName: "SKN Psychologii Kryminalnej",
    subcalendarId: 15106247,
    icon: "Search",
    color: "#B45309",
    faculty: "Wydział Prawa i Administracji",
    aliasKeywords: ["kryminalna", "kryminalnej", "15106247"],
  },
  {
    number: "05",
    orgId: "uzaleznienia",
    name: "05 SKN Psychologii Zachowań Ryzykownych i Uzależnień",
    shortName: "SKN Uzależnień i Zachowań Ryzykownych",
    subcalendarId: 15520561,
    icon: "Flame",
    color: "#C2410C",
    faculty: "Wydział Nauk Społecznych",
    aliasKeywords: ["uzaleznienia", "uzależnień", "ryzykownych", "15520561"],
  },
  {
    number: "06",
    orgId: "skn_spolecznej_ewolucyjnej",
    name: "06 SKN Psychologii Społecznej i Ewolucyjnej",
    shortName: "SKN Społecznej i Ewolucyjnej",
    subcalendarId: 15558004,
    icon: "Dna",
    color: "#D97706",
    faculty: "Wydział Nauk Społecznych",
    aliasKeywords: ["społecznej", "ewolucyjnej", "15558004"],
  },
  {
    number: "07",
    orgId: "psychoonkologia",
    name: "07 SKN Psychoonkologii",
    shortName: "SKN Psychoonkologii",
    subcalendarId: 15520558,
    icon: "Ribbon",
    color: "#0284C7",
    faculty: "Wydział Nauk Społecznych",
    aliasKeywords: ["psychoonkologia", "psychoonkologii", "15520558"],
  },
  {
    number: "08",
    orgId: "skn_psychofizjologii",
    name: "08 SKN Psychofizjologii",
    shortName: "SKN Psychofizjologii",
    subcalendarId: 15289330,
    icon: "Zap",
    color: "#0D9488",
    faculty: "Wydział Nauk Społecznych",
    aliasKeywords: ["psychofizjologii", "psychofizjologia", "15289330"],
  },
  {
    number: "09",
    orgId: "skn_zdrowia_srodowiska",
    name: "09 SKN Psychologii Zdrowia i Środowiska",
    shortName: "SKN Zdrowia i Środowiska",
    subcalendarId: 14519898,
    icon: "Leaf",
    color: "#059669",
    faculty: "Wydział Nauk Społecznych",
    aliasKeywords: ["zdrowia", "środowiska", "srodowiska", "14519898"],
  },
  {
    number: "10",
    orgId: "skn_seksuologii",
    name: "10 SKN Seksuologii",
    shortName: "SKN Seksuologii",
    subcalendarId: 14518766,
    icon: "Heart",
    color: "#16A34A",
    faculty: "Wydział Nauk Społecznych",
    aliasKeywords: ["seksuologii", "seksuologia", "14518766"],
  },
  {
    number: "11",
    orgId: "skn_rozwoju_dzieci",
    name: "11 SKN Psychologii Rozwoju Dzieci i Młodzieży",
    shortName: "SKN Rozwoju Dzieci i Młodzieży",
    subcalendarId: 15520555,
    icon: "Sparkles",
    color: "#A21CAF",
    faculty: "Wydział Nauk Pedagogicznych",
    aliasKeywords: ["dzieci", "młodzieży", "mlodziezy", "rozwoju", "15520555"],
  },
  {
    number: "12",
    orgId: "skn_krytycznego_myslenia",
    name: "12 SKN Warsztat Krytycznego Myślenia",
    shortName: "SKN Krytycznego Myślenia",
    subcalendarId: 15656474,
    icon: "HelpCircle",
    color: "#7E22CE",
    faculty: "Wydział Nauk Społecznych",
    aliasKeywords: ["krytycznego", "myślenia", "myslenia", "warsztat krytycznego", "15656474"],
  },
  {
    number: "13",
    orgId: "skn_reklamy_pr",
    name: "13 SKN Reklamy, PR i Marketingu",
    shortName: "SKN Reklamy, PR i Marketingu",
    subcalendarId: 14518764,
    icon: "Target",
    color: "#E11D48",
    faculty: "Wydział Zarządzania i Komunikacji",
    aliasKeywords: ["reklamy", "marketing", "pr", "marketingu", "14518764"],
  },
  {
    number: "14",
    orgId: "skn_startupow",
    name: "14 SKN Nowoczesnego Zarządzania i Start-upów",
    shortName: "SKN Start-upów i Zarządzania",
    subcalendarId: null,
    icon: "Rocket",
    color: "#10B981",
    faculty: "Wydział Zarządzania",
    aliasKeywords: ["startup", "start-up", "start-upów", "zarządzania"],
  },
];

/**
 * Zwraca koło po ID organizacji (np. 'skn_seksuologii')
 */
export function getClubByOrgId(orgId) {
  if (!orgId) return null;
  const clean = String(orgId).trim().toLowerCase().replace(/-/g, '_');
  return WSKZ_CLUBS.find(c => c.orgId === clean || c.orgId.replace(/-/g, '_') === clean) || null;
}

/**
 * Zwraca koło po ID podkalendarza Teamup
 */
export function getClubBySubcalendarId(subcalendarId) {
  if (!subcalendarId) return null;
  const numId = Number(subcalendarId);
  return WSKZ_CLUBS.find(c => c.subcalendarId === numId) || null;
}

/**
 * Dopasowuje koła naukowe do tekstu (np. tytułu wydarzenia, opisu, subcalendar_ids)
 */
export function matchClubsForEvent(event) {
  const matched = new Set();
  const subIds = Array.isArray(event.subcalendar_ids) ? event.subcalendar_ids : [event.subcalendar_id].filter(Boolean);

  // 1. Dopasowanie po subcalendar_ids
  for (const sId of subIds) {
    const club = getClubBySubcalendarId(sId);
    if (club) matched.add(club);
  }

  // 2. Dopasowanie po słowach kluczowych w tytule
  const title = (event.title || '').toLowerCase();
  for (const club of WSKZ_CLUBS) {
    if (club.aliasKeywords.some(kw => title.includes(kw))) {
      matched.add(club);
    }
  }

  return Array.from(matched);
}
