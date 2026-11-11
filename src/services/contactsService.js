import { sendToBackend } from './googleSheets';

export const CONTACTS_SPREADSHEET_ID = "1g4z2pTCLoQy2I5Jfwanv7yCJsFrBX36D-qxwLBbd1yo";

// ─── Oficjalna Baza Starostów Samorządu WSKZ (SSOT Seed - zanonimizowana wg RODO) ───
// Uwaga: Plik szablonu publicznego nie zawiera prywatnych numerów telefonów ani prywatnych
// adresów e-mail studentów (zgodnie z Art. 5 ust. 1 lit. f oraz Art. 25 RODO).
// Pełne dane teleadresowe pobierane są dynamicznie z bazy Google Sheets lub pamięci lokalnej.
export const SEED_STAROSTOWIE = [
  {
    id: "ST-001",
    category: "starostowie",
    name: "Marta Szewczyk",
    role: "Starosta Grupy",
    field: "Administracja",
    mode: "Niestacjonarne (I stopnia)",
    year: "III rok",
    semester: "Semestr 5",
    group: "5-1",
    phone: "+48 690 ••• •••",
    emailUczelniany: "starosta.adm51@samorzad.wskz.pl",
    emailPrywatny: "",
    email: "starosta.adm51@samorzad.wskz.pl",
    rodoStatus: "Zgoda aktywna",
    startDate: "2026-10-25",
    endDate: "",
    notes: "Zgłoszenie z dokumentu Starosta grupy 5.1"
  },
  {
    id: "ST-002",
    category: "starostowie",
    name: "Tomasz Ryszanek",
    role: "Starosta Grupy",
    field: "Administracja publiczna",
    mode: "Niestacjonarne (II stopnia)",
    year: "II rok",
    semester: "Semestr 5",
    group: "5-2",
    phone: "+48 723 ••• •••",
    emailUczelniany: "starosta.adm52@samorzad.wskz.pl",
    emailPrywatny: "",
    email: "starosta.adm52@samorzad.wskz.pl",
    rodoStatus: "Zgoda aktywna",
    startDate: "2026-10-24",
    endDate: "",
    notes: "Zgłoszenie z dokumentu Starosta grupy 5.2"
  },
  {
    id: "ST-003",
    category: "starostowie",
    name: "Karolina Mruzik",
    role: "Starosta Grupy",
    field: "Administracja",
    mode: "Niestacjonarne (I stopnia)",
    year: "II rok",
    semester: "Semestr 3",
    group: "Grupa administracyjna",
    phone: "+48 486 ••• •••",
    emailUczelniany: "starosta.adm3@samorzad.wskz.pl",
    emailPrywatny: "",
    email: "starosta.adm3@samorzad.wskz.pl",
    rodoStatus: "Zgoda aktywna",
    startDate: "2026-10-24",
    endDate: "",
    notes: "Zgłoszenie oświadczenia starosty"
  },
  {
    id: "ST-004",
    category: "starostowie",
    name: "Aleksandra Gadalińska",
    role: "Starosta Grupy",
    field: "Psychologia (psychologia sądowa)",
    mode: "Niestacjonarne (I stopnia)",
    year: "III rok",
    semester: "Semestr 6",
    group: "PS_PS 6-1 26_27Z",
    phone: "+48 792 ••• •••",
    emailUczelniany: "starosta.ps61@samorzad.wskz.pl",
    emailPrywatny: "",
    email: "starosta.ps61@samorzad.wskz.pl",
    rodoStatus: "Oczekuje na podpis",
    startDate: "",
    endDate: "",
    notes: "Psychologia sądowa (licencjackie, ostatni semestr, sygn. DK/2026/10/27)"
  },
  {
    id: "ST-005",
    category: "starostowie",
    name: "Beata Bytof-Szpera",
    role: "Starosta Grupy",
    field: "Administracja i Turystyka",
    mode: "Niestacjonarne (I stopnia)",
    year: "III rok",
    semester: "Semestr 5",
    group: "ADM_TiR 5-1 26_27Z",
    phone: "+48 502 ••• •••",
    emailUczelniany: "starosta.tir51@samorzad.wskz.pl",
    emailPrywatny: "",
    email: "starosta.tir51@samorzad.wskz.pl",
    rodoStatus: "Oczekuje na podpis",
    startDate: "",
    endDate: "",
    notes: "Zgłoszenie przekazane przez Prodziekan (sygn. DK/2026/10/21)"
  },
  {
    id: "ST-006",
    category: "starostowie",
    name: "Natalia Wiśniewska",
    role: "Starosta Grupy",
    field: "Administracja i Turystyka",
    mode: "Niestacjonarne (I stopnia)",
    year: "III rok",
    semester: "Semestr 6",
    group: "ADM_TiR 6-1 26_27Z",
    phone: "",
    emailUczelniany: "starosta.tir61@samorzad.wskz.pl",
    emailPrywatny: "",
    email: "starosta.tir61@samorzad.wskz.pl",
    rodoStatus: "Oczekuje na podpis",
    startDate: "",
    endDate: "",
    notes: "Zgłoszenie przekazane przez Prodziekan (sygn. DK/2026/10/20)"
  },
  {
    id: "ST-007",
    category: "starostowie",
    name: "Paula Bereś",
    role: "Starosta Grupy",
    field: "Zarządzanie",
    mode: "Niestacjonarne (I stopnia)",
    year: "I rok",
    semester: "Semestr 1",
    group: "ZR1-6",
    phone: "+48 574 ••• •••",
    emailUczelniany: "starosta.zr16@samorzad.wskz.pl",
    emailPrywatny: "",
    email: "starosta.zr16@samorzad.wskz.pl",
    rodoStatus: "Zgoda aktywna",
    startDate: "2026-10-17",
    endDate: "",
    notes: "Zgłoszenie z oświadczenia starosty gr ZR1-6"
  },
  {
    id: "ST-008",
    category: "starostowie",
    name: "Michał Worek",
    role: "Starosta Grupy",
    field: "Zarządzanie / Finanse i rachunkowość",
    mode: "Niestacjonarne (I stopnia)",
    year: "I rok",
    semester: "Semestr 1",
    group: "ZR1-5",
    phone: "+48 798 ••• •••",
    emailUczelniany: "starosta.zr15@samorzad.wskz.pl",
    emailPrywatny: "",
    email: "starosta.zr15@samorzad.wskz.pl",
    rodoStatus: "Zgoda aktywna",
    startDate: "2026-10-17",
    endDate: "",
    notes: "Zgłoszenie z oświadczenia starosty gr ZR1-5"
  },
  {
    id: "ST-009",
    category: "starostowie",
    name: "Maja Piecka",
    role: "Starosta Grupy",
    field: "Turystyka i rekreacja",
    mode: "Niestacjonarne (I stopnia)",
    year: "I rok",
    semester: "Semestr 1",
    group: "TiR 1",
    phone: "+48 431 ••• •••",
    emailUczelniany: "starosta.tir1@samorzad.wskz.pl",
    emailPrywatny: "",
    email: "starosta.tir1@samorzad.wskz.pl",
    rodoStatus: "Zgoda aktywna",
    startDate: "2026-10-18",
    endDate: "",
    notes: "Zgłoszenie z dokumentu wyboru starosty"
  }
];

// ─── Oficjalna Baza Władz Uczelni, Dziekanatów i Instytutów WSKZ ─────────────
export const SEED_FACULTY_CONTACTS = [
  {
    id: "FAC-001",
    category: "faculty",
    name: "dr Bogna Bartosz",
    title: "Prorektor ds. Studenckich",
    unit: "Rektorat WSKZ",
    email: "bogna.bartosz@wskz.pl",
    phone: "+48 71 395 84 00",
    officeHours: "Środy 12:00 - 14:00 (po uprzednim zapisie)",
    relatedFields: "Wszystkie wydziały i kierunki studiów",
    notes: "Nadzór nad sprawami studenckimi, stypendiami i samorządem"
  },
  {
    id: "FAC-002",
    category: "faculty",
    name: "dr Łukasz Cymbaluk",
    title: "Prodziekan ds. Studenckich",
    unit: "Wydział Administracji, Zarządzania i Informatyki (WAZI)",
    email: "lukasz.cymbaluk@wskz.pl",
    phone: "+48 739 152 840",
    officeHours: "Czwartki 14:00 - 16:00 / soboty zjazdowe",
    relatedFields: "Administracja, Zarządzanie, Informatyka",
    notes: "Bezpośredni kontakt dla Samorządu i Starostów WAZI"
  },
  {
    id: "FAC-003",
    category: "faculty",
    name: "dr Krzysztof Siuda",
    title: "Prodziekan ds. Jakości Kształcenia",
    unit: "Wydział Psychologii",
    email: "krzysztof.siuda@wskz.pl",
    phone: "+48 71 395 84 15",
    officeHours: "Wtorki 10:00 - 12:00",
    relatedFields: "Psychologia (jednolite magisterskie, licencjat, specjalności)",
    notes: "Opiniowanie wniosków o urlopy dziekańskie i indywidualną organizację studiów"
  },
  {
    id: "FAC-004",
    category: "faculty",
    name: "dr Sylwia Zakrzewska",
    title: "Prodziekan",
    unit: "Wydział Prawa, Bezpieczeństwa i Kryminologii (WPBik)",
    email: "sylwia.zakrzewska@wskz.pl",
    phone: "+48 71 395 84 20",
    officeHours: "Poniedziałki 11:00 - 13:00",
    relatedFields: "Prawo, Bezpieczeństwo wewnętrzne, Kryminologia",
    notes: "Uzgodnienia dotyczące harmonogramów i informatorów studenckich"
  },
  {
    id: "FAC-005",
    category: "faculty",
    name: "dr Magdalena El Ghamari",
    title: "Prodziekan WPBik",
    unit: "Wydział Prawa, Bezpieczeństwa i Kryminologii (WPBik)",
    email: "magdalena.elghamari@wskz.pl",
    phone: "+48 71 395 84 22",
    officeHours: "Piątki 13:00 - 15:00",
    relatedFields: "Kryminologia, Peacebuilding, Bezpieczeństwo",
    notes: "Koordynacja programów międzynarodowych i wykładów otwartych"
  },
  {
    id: "FAC-006",
    category: "faculty",
    name: "dr Kamil Stępniak",
    title: "Dziekan Wydziału",
    unit: "Wydział Nauk Społecznych i Technicznych (WNS)",
    email: "kamil.stepniak@wskz.pl",
    phone: "+48 71 395 84 05",
    officeHours: "Do uzgodnienia przez sekretariat",
    relatedFields: "Kierunki społeczne i humanistyczne WNS",
    notes: "Procedury wyborcze, ordynacja wyborcza starostów"
  },
  {
    id: "FAC-007",
    category: "faculty",
    name: "dr Katarzyna Majchrzak",
    title: "Adiunkt / Koordynator",
    unit: "Instytut Administracji i Nauk o Polityce",
    email: "katarzyna.majchrzak@wskz.pl",
    phone: "",
    officeHours: "Dyżury zjazdowe",
    relatedFields: "Administracja i Turystyka",
    notes: "Koordynacja zgłoszeń starostów kierunku Administracja i Turystyka"
  },
  {
    id: "FAC-008",
    category: "faculty",
    name: "Biuro Dziekana Wydz. AdmZarzInf",
    title: "Biuro Dziekana (WAZI)",
    unit: "Wydział Administracji, Zarządzania i Informatyki",
    email: "biuro.dziekanawazi@wskz.pl",
    phone: "+48 71 395 84 10",
    officeHours: "Pn-Pt 08:00 - 16:00, Sob-Ndz zjazdowe 08:00 - 15:00",
    relatedFields: "Administracja, Zarządzanie, Informatyka",
    notes: "Oficjalny kanał kancelaryjny dziekanatu WAZI"
  },
  {
    id: "FAC-009",
    category: "faculty",
    name: "Biuro Dziekana Wydz. PrBezpKrym",
    title: "Biuro Dziekana (WPBik)",
    unit: "Wydział Prawa, Bezpieczeństwa i Kryminologii",
    email: "biuro.dziekanawpbik@wskz.pl",
    phone: "+48 71 395 84 12",
    officeHours: "Pn-Pt 08:00 - 16:00, Sob-Ndz zjazdowe 08:00 - 15:00",
    relatedFields: "Prawo, Bezpieczeństwo wewnętrzne, Kryminologia",
    notes: "Oficjalny kanał kancelaryjny dziekanatu WPBik"
  },
  {
    id: "FAC-010",
    category: "faculty",
    name: "Dziekanat Wydziału Psychologii",
    title: "Dziekanat Psychologii",
    unit: "Wydział Psychologii WSKZ",
    email: "dziekanat.psychologia@wskz.pl",
    phone: "+48 71 395 84 14",
    officeHours: "Pn-Pt 08:00 - 16:00, Sob-Ndz zjazdowe 08:00 - 15:00",
    relatedFields: "Psychologia",
    notes: "Obsługa toku studiów psychologicznych"
  },
  {
    id: "FAC-011",
    category: "faculty",
    name: "Dział Wsparcia IT WSKZ",
    title: "Helpdesk IT",
    unit: "Dział IT / Platforma E-learningowa",
    email: "it@wskz.pl",
    phone: "+48 71 395 84 50",
    officeHours: "Pn-Pt 07:00 - 20:00, Sob-Ndz 08:00 - 18:00",
    relatedFields: "Wszystkie kierunki (platforma, konta studenckie, testy)",
    notes: "Zgłoszenia awarii technicznych, dostępów i platformy e-learningowej"
  }
];

// ─── Oficjalna Baza Kół Naukowych WSKZ (18 Kół) ──────────────────────────────
export const SEED_CLUBS_CONTACTS = [
  {
    id: "KN-001",
    category: "clubs",
    name: "SKN Psychologii Klinicznej",
    faculty: "Wydział Psychologii",
    supervisor: "mgr Tymoteusz Czerhoniak",
    email: "skn.kliniczna@wskz.pl",
    description: "Diagnoza psychologiczna, nozologia zaburzeń psychicznych, metody pomocy psychologicznej oraz studia przypadków klinicznych.",
    status: "Aktywne",
    notes: ""
  },
  {
    id: "KN-002",
    category: "clubs",
    name: "SKN Psychotraumatologii - Integrum",
    faculty: "Wydział Psychologii",
    supervisor: "dr hab. Grażyna Dolińska-Zygmunt",
    email: "kolo.integrum@wskz.pl",
    description: "Badania nad traumą psychiczną, PTSD i CPTSD, interwencja kryzysowa, seminaria psychotraumatologii klinicznej oraz psychoedukacja.",
    status: "Aktywne",
    notes: ""
  },
  {
    id: "KN-003",
    category: "clubs",
    name: "SKN Psychoterapii",
    faculty: "Wydział Psychologii",
    supervisor: "dr Agnieszka Turkiewicz-Maligranda",
    email: "kolo.psychoterapia@gmail.com",
    description: "Rozwój warsztatu terapeutycznego, praca kliniczna w różnych nurtach psychoterapii, studia przypadków i warsztaty praktyczne.",
    status: "Zawieszone",
    notes: "Działalność koła zawieszona"
  },
  {
    id: "KN-004",
    category: "clubs",
    name: "SKN Psychologii Kryminalnej",
    faculty: "Wydział Psychologii",
    supervisor: "Wakat (w trakcie powoływania)",
    email: "skn.kryminalna@wskz.pl",
    description: "Profilowanie sprawców, wiktymologia, psychologia zeznań świadków, motywacja zachowań przestępczych oraz psychologia sądowa.",
    status: "Aktywne",
    notes: ""
  },
  {
    id: "KN-005",
    category: "clubs",
    name: "SKN Psychologii Zachowań Ryzykownych i Uzależnień",
    faculty: "Wydział Psychologii",
    supervisor: "Wakat (w trakcie powoływania)",
    email: "skn.uzaleznienia@wskz.pl",
    description: "Mechanizmy uzależnień behawioralnych i chemicznych, profilaktyka zachowań ryzykownych oraz strategie redukcji szkód.",
    status: "Aktywne",
    notes: ""
  },
  {
    id: "KN-006",
    category: "clubs",
    name: "SKN Psychologii Społecznej i Ewolucyjnej",
    faculty: "Wydział Psychologii",
    supervisor: "dr Wiktoria Jędryczka",
    email: "skn.spoleczna@wskz.pl",
    description: "Badanie mechanizmów wpływu społecznego, psychologia ewolucyjna zachowań interpersonalnych, procesy grupowe i normy kulturowe.",
    status: "Aktywne",
    notes: "Nowy opiekun: dr Wiktoria Jędryczka"
  },
  {
    id: "KN-007",
    category: "clubs",
    name: "SKN Psychoonkologii",
    faculty: "Wydział Psychologii",
    supervisor: "mgr Joanna Głowacka",
    email: "skn.psychoonkologia@wskz.pl",
    description: "Wsparcie psychologiczne pacjentów onkologicznych i ich rodzin, adaptacja do choroby przewlekłej oraz profilaktyka wypalenia.",
    status: "Aktywne",
    notes: ""
  },
  {
    id: "KN-008",
    category: "clubs",
    name: "SKN Psychofizjologii",
    faculty: "Wydział Psychologii",
    supervisor: "Wakat (w trakcie powoływania)",
    email: "skn.psychofizjologia@wskz.pl",
    description: "Biologiczne podstawy procesów psychicznych, biofeedback, neuroobrazowanie oraz reakcje fizjologiczne na stres i emocje.",
    status: "Aktywne",
    notes: ""
  },
  {
    id: "KN-009",
    category: "clubs",
    name: "SKN Psychologii Zdrowia i Środowiska",
    faculty: "Wydział Psychologii",
    supervisor: "mgr Joanna Głowacka",
    email: "psychologia.zdrowia@wskz.pl",
    description: "Wpływ środowiska i stresu na zdrowie psychosomatyczne, profilaktyka zdrowia psychicznego, psychologia ekologiczna i dobrostan.",
    status: "Aktywne",
    notes: ""
  },
  {
    id: "KN-010",
    category: "clubs",
    name: "SKN Seksuologii",
    faculty: "Wydział Psychologii",
    supervisor: "dr Martyna Dziekan, dr Ewa Skupińska",
    email: "kn.seksuologii@wskz.pl",
    description: "Badania nad seksualnością, zdrowiem psychoseksualnym i terapią par (EBP); organizacja konferencji, warsztatów naukowych i Journal Club.",
    status: "Aktywne",
    notes: "Opiekunowie: dr M. Dziekan, dr E. Skupińska"
  },
  {
    id: "KN-011",
    category: "clubs",
    name: "SKN Psychologii Rozwoju Dzieci i Młodzieży",
    faculty: "Wydział Psychologii",
    supervisor: "Wakat (w trakcie powoływania)",
    email: "skn.rozwoj@wskz.pl",
    description: "Prawidłowości i zaburzenia rozwoju poznawczo-emocjonalnego dzieci i młodzieży, metody wsparcia oraz psychologia wychowawcza.",
    status: "Aktywne",
    notes: "Pierwsze spotkanie 13.11"
  },
  {
    id: "KN-012",
    category: "clubs",
    name: "SKN Warsztat Krytycznego Myślenia",
    faculty: "Wydział Psychologii",
    supervisor: "mgr Liwiusz Piurko",
    email: "warsztat.krytycznego@wskz.pl",
    description: "Krytyczna analiza informacji, weryfikacja źródeł naukowych, Journal Club, Klub Książki oraz zwalczanie dezinformacji.",
    status: "Aktywne",
    notes: "Nowy opiekun: mgr Liwiusz Piurko"
  },
  {
    id: "KN-013",
    category: "clubs",
    name: "SKN Reklamy, PR i Marketingu",
    faculty: "Wydział Psychologii",
    supervisor: "Wakat (w trakcie powoływania)",
    email: "kolo.pr@wskz.pl",
    description: "Psychologia w reklamie i marketingu, zachowania konsumenckie, employer branding, wizerunek w social mediach i etyka komunikacji.",
    status: "Aktywne",
    notes: ""
  },
  {
    id: "KN-014",
    category: "clubs",
    name: "KN Geopolitica",
    faculty: "Wydział Nauk Społecznych i Technicznych (WNS)",
    supervisor: "dr Łukasz Cymbaluk",
    email: "geopolitica@wskz.pl",
    description: "Analiza procesów geopolitycznych, bezpieczeństwa międzynarodowego, dyplomacji i konfliktów na świecie; debaty eksperckie oraz seminaria.",
    status: "Aktywne",
    notes: "Opiekun: dr Łukasz Cymbaluk"
  },
  {
    id: "KN-015",
    category: "clubs",
    name: "KN Cyber-AI / Human-AI - Fusion",
    faculty: "Wydział Nauk Społecznych i Technicznych (WNS)",
    supervisor: "Wakat (w trakcie powoływania)",
    email: "cyber.ai@wskz.pl",
    description: "Wpływ sztucznej inteligencji na człowieka i społeczeństwo, interakcja człowiek-komputer (HCI), etyka AI oraz cyberbezpieczeństwo.",
    status: "Aktywne",
    notes: ""
  },
  {
    id: "KN-016",
    category: "clubs",
    name: "KN Prawa Karnego",
    faculty: "Wydział Nauk Społecznych i Technicznych (WNS)",
    supervisor: "Wakat (w trakcie powoływania)",
    email: "kolo.pk@wskz.pl",
    description: "Materialne i procesowe prawo karne, kryminalistyka, symulacje rozpraw sądowych (moot court) oraz analiza orzecznictwa.",
    status: "Aktywne",
    notes: ""
  },
  {
    id: "KN-017",
    category: "clubs",
    name: "KN Administracji Samorządowej",
    faculty: "Wydział Nauk Społecznych i Technicznych (WNS)",
    supervisor: "Wakat (w trakcie powoływania)",
    email: "kolo.ansso@wskz.pl",
    description: "Funkcjonowanie jednostek samorządu terytorialnego, prawo administracyjne, rozwój lokalny i partycypacja obywatelska.",
    status: "Aktywne",
    notes: ""
  },
  {
    id: "KN-018",
    category: "clubs",
    name: "KN HR Next",
    faculty: "Wydział Nauk Społecznych i Technicznych (WNS)",
    supervisor: "Wakat (w trakcie powoływania)",
    email: "hrnext@wskz.pl",
    description: "Nowoczesne zarządzanie zasobami ludzkimi, rekrutacja i talent management, psychologia pracy oraz narzędzia People Analytics.",
    status: "Aktywne",
    notes: ""
  }
];

// ─── Pamięć lokalna (LocalStorage) ──────────────────────────────────────────
const STORAGE_KEY_STAROSTOWIE = 'kanc_contacts_starostowie_v1';
const STORAGE_KEY_FACULTY = 'kanc_contacts_faculty_v1';
const STORAGE_KEY_CLUBS = 'kanc_contacts_clubs_v1';

export function getLocalContacts() {
  try {
    const rawStarostowie = localStorage.getItem(STORAGE_KEY_STAROSTOWIE);
    const rawFaculty = localStorage.getItem(STORAGE_KEY_FACULTY);
    const rawClubs = localStorage.getItem(STORAGE_KEY_CLUBS);

    const starostowie = rawStarostowie ? JSON.parse(rawStarostowie) : SEED_STAROSTOWIE;
    const faculty = rawFaculty ? JSON.parse(rawFaculty) : SEED_FACULTY_CONTACTS;
    const clubs = rawClubs ? JSON.parse(rawClubs) : SEED_CLUBS_CONTACTS;

    return { starostowie, faculty, clubs };
  } catch (e) {
    console.warn("Błąd odczytu kontaktów z localStorage:", e);
    return {
      starostowie: SEED_STAROSTOWIE,
      faculty: SEED_FACULTY_CONTACTS,
      clubs: SEED_CLUBS_CONTACTS,
    };
  }
}

export function saveLocalContact(category, contact) {
  const current = getLocalContacts();
  let key = STORAGE_KEY_STAROSTOWIE;
  let list = [...current.starostowie];

  if (category === 'faculty') {
    key = STORAGE_KEY_FACULTY;
    list = [...current.faculty];
  } else if (category === 'clubs') {
    key = STORAGE_KEY_CLUBS;
    list = [...current.clubs];
  }

  const existingIdx = list.findIndex(c => c.id === contact.id);
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...contact };
  } else {
    list.unshift(contact);
  }

  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.warn("Błąd zapisu kontaktu do localStorage:", e);
  }

  // Wyślij w tle do Google Apps Script
  sendToBackend({
    action: "zapisz_kontakt",
    kategoria: category,
    kontakt: contact
  }).catch(err => {
    console.warn("Zapis kontaktu do chmury nie powiódł się (zapisano lokalnie):", err);
  });

  return list;
}

// ─── Pomocnik autouzupełniania dla Dziennika Korespondencji ──────────────────
export function getAddressBookAutocompleteOptions() {
  const { starostowie, faculty, clubs } = getLocalContacts();
  const options = [];

  // Władze i Administracja
  faculty.forEach(f => {
    options.push({
      label: `${f.name} (${f.title})`,
      searchStr: `${f.name} ${f.title} ${f.unit} ${f.email}`.toLowerCase(),
      recipientName: `${f.name} (${f.title})`,
      institution: f.unit || "Wyższa Szkoła Kształcenia Zawodowego we Wrocławiu",
      email: f.email,
      phone: f.phone,
      type: "faculty",
      badge: "Władze / Administracja"
    });
  });

  // Starostowie
  starostowie.forEach(s => {
    const groupStr = s.group ? `gr. ${s.group}` : '';
    const fieldStr = s.field ? s.field : '';
    const label = `${s.name} (${s.role || 'Starosta'}${groupStr ? `, ${groupStr}` : ''}${fieldStr ? `, ${fieldStr}` : ''})`;
    options.push({
      label,
      searchStr: `${s.name} ${s.role} ${s.field} ${s.group} ${s.email || ''} ${s.phone || ''}`.toLowerCase(),
      recipientName: label,
      institution: `Wyższa Szkoła Kształcenia Zawodowego • ${s.field || 'Student'}`,
      email: s.email || s.emailPrywatny || s.emailUczelniany,
      phone: s.phone,
      type: "starosta",
      badge: "Starosta"
    });
  });

  // Koła Naukowe
  clubs.forEach(c => {
    const supervisorStr = c.supervisor ? `opiekun: ${c.supervisor}` : '';
    const label = `${c.name} (${supervisorStr || c.faculty})`;
    options.push({
      label,
      searchStr: `${c.name} ${c.supervisor || ''} ${c.faculty || ''} ${c.email || ''}`.toLowerCase(),
      recipientName: label,
      institution: `Koło Naukowe WSKZ • ${c.faculty || ''}`,
      email: c.email,
      type: "club",
      badge: "Koło Naukowe"
    });
  });

  return options;
}
