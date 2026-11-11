import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

export const ROLES = {
  SUPER_ADMIN: {
    id: 'SUPER_ADMIN',
    label: '',
    badgeClass: 'hidden',
    description: 'Pełny dostęp do konfiguracji i ustawień',
  },
  COORDINATOR: {
    id: 'COORDINATOR',
    label: '',
    badgeClass: 'hidden',
    description: 'Dostęp operacyjny',
  },
  VIEWER: {
    id: 'VIEWER',
    label: '',
    badgeClass: 'hidden',
    description: 'Dostęp do ewidencji',
  },
};

export const MASTER_ADMIN_EMAILS = [
  'atomekb73@gmail.com',
  'atonex73@gmail.com',
  'kancelaria@samorzad.wskz.pl',
];

// ─── Bezpieczne skróty kryptograficzne haseł (SHA-256 z unikalną solą) ──────
// W kodzie źródłowym NIE przechowujemy haseł otwartym tekstem!
export const PASSWORD_SALT = 'wskz_samorzad_2026_salt:';

export async function computePasswordHash(password) {
  if (!password) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(PASSWORD_SALT + String(password).trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.error('Błąd haszowania hasła:', e);
    return '';
  }
}

export const MASTER_ADMIN_HASHES = {
  'atomekb73@gmail.com': '032a608d14718f2c5756643fae6f3309b759ac935369777c19e3d03c2c541d24',
  'atonex73@gmail.com': '032a608d14718f2c5756643fae6f3309b759ac935369777c19e3d03c2c541d24',
  'kancelaria@samorzad.wskz.pl': '032a608d14718f2c5756643fae6f3309b759ac935369777c19e3d03c2c541d24',
};

export const DEFAULT_AUTHORIZED_ACCOUNTS = [
  {
    id: 'usr_liliana_01',
    name: 'Liliana Sienkiewicz',
    email: 'lajlasienkiewicz@gmail.com',
    role: 'ADMIN',
    roleLabel: 'Dostęp pełny',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    isFirstLogin: true,
    addedAt: '2026-09-05',
  },
  {
    id: 'usr_katarzyna_02',
    name: 'Katarzyna Kubacka',
    email: 'kasia.j.kubacka@gmail.com',
    role: 'ADMIN',
    roleLabel: 'Dostęp pełny',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    isFirstLogin: true,
    addedAt: '2026-09-05',
  },
  {
    id: 'usr_piotr_03',
    name: 'Piotr Niklas',
    email: 'piotrniklas7@gmail.com',
    role: 'ADMIN',
    roleLabel: 'Dostęp pełny',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    isFirstLogin: true,
    addedAt: '2026-09-05',
  },
  {
    id: 'usr_kancelaria_01',
    name: 'Kancelaria Samorządu Studenckiego WSKZ',
    email: 'kancelaria@samorzad.wskz.pl',
    role: 'ADMIN',
    roleLabel: 'Prezydium / Sekretariat',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    isFirstLogin: true,
    addedAt: '2026-09-05',
  },
];

export const STARTER_HASHES = {
  'lajlasienkiewicz@gmail.com': 'f9844c0c1e853b1d3c01a21bc073fc6ae3c19e77105ffb06c45997eb239c23f3',
  'kasia.j.kubacka@gmail.com': 'b3467f2476a0cd648a79f3c576fb1e3e0614717e0f8698a18e20dee0d796e9f2',
  'piotrniklas7@gmail.com': '7d84b5af56db9e76f1c5cfb684bea5b1f43846f866c96669b62b1a9cfd90d677',
  'kancelaria@samorzad.wskz.pl': 'd18e8112f2d609f3136a91f60bcf6f2a5e201935c1aa3b77e069f7ca1f33668a',
  'koordynator@samorzad.wskz.pl': 'd18e8112f2d609f3136a91f60bcf6f2a5e201935c1aa3b77e069f7ca1f33668a',
  'audytor@samorzad.wskz.pl': 'd18e8112f2d609f3136a91f60bcf6f2a5e201935c1aa3b77e069f7ca1f33668a',
};

export const DEFAULT_USER = {
  email: 'kancelaria@samorzad.wskz.pl',
  name: 'Kancelaria Samorządu Studenckiego WSKZ',
  avatarUrl: '',
  role: 'SUPER_ADMIN',
  accessibleOrgs: ['*'], // Pełne uprawnienia administracyjne
};

export const DEMO_ACCOUNTS = [
  {
    email: 'kancelaria@samorzad.wskz.pl',
    name: 'Kancelaria Samorządu Studenckiego WSKZ',
    role: 'SUPER_ADMIN',
    accessibleOrgs: ['*'],
    description: 'Prezydium Samorządu / Sekretariat (pełne uprawnienia)',
  },
  {
    email: 'koordynator@samorzad.wskz.pl',
    name: 'Koordynator ds. Kół i Projektów',
    role: 'COORDINATOR',
    accessibleOrgs: ['*'],
    description: 'Dostęp operacyjny do ewidencji i korespondencji',
  },
  {
    email: 'audytor@samorzad.wskz.pl',
    name: 'Komisja Rewizyjna / Audyt',
    role: 'VIEWER',
    accessibleOrgs: ['*'],
    description: 'Ewidencja i sprawozdania (tylko odczyt)',
  },
];

const AuthContext = createContext(null);

/** Pobierz zapisany skrót hasła użytkownika */
export function getUserStoredPassword(email) {
  if (!email) return null;
  const clean = email.toLowerCase().trim();
  try {
    const raw = localStorage.getItem('samorzad_user_passwords') || localStorage.getItem('skn_user_passwords');
    if (raw) {
      const passwords = JSON.parse(raw);
      if (passwords && passwords[clean]) {
        return passwords[clean];
      }
    }
  } catch {}
  if (MASTER_ADMIN_HASHES[clean]) {
    return MASTER_ADMIN_HASHES[clean];
  }
  if (STARTER_HASHES[clean]) {
    return STARTER_HASHES[clean];
  }
  return null;
}

/** Sprawdź czy użytkownik loguje się po raz pierwszy */
export function getUserFirstLoginStatus(email, userRecord = null) {
  if (!email) return true;
  const cleanEmail = email.toLowerCase().trim();

  // Konto nadrzędne atomekb73@gmail.com / Master Admin ma stały bezpośredni dostęp bez wymuszenia zmiany hasła
  if (MASTER_ADMIN_EMAILS.some(e => e.toLowerCase() === cleanEmail)) {
    return false;
  }

  try {
    const raw = localStorage.getItem('samorzad_user_first_login_status') || localStorage.getItem('skn_user_first_login_status');
    if (raw) {
      const statusMap = JSON.parse(raw);
      if (statusMap && cleanEmail in statusMap) {
        return !!statusMap[cleanEmail];
      }
    }
  } catch {}

  // Jeśli użytkownik ma już zapisane własne hasło w samorzad_user_passwords, to nie jest pierwsze logowanie
  try {
    const rawPass = localStorage.getItem('samorzad_user_passwords') || localStorage.getItem('skn_user_passwords');
    if (rawPass) {
      const passwords = JSON.parse(rawPass);
      if (passwords && passwords[cleanEmail]) {
        return false;
      }
    }
  } catch {}

  // Jeśli rekord użytkownika ma jawnie isFirstLogin: false
  if (userRecord && userRecord.isFirstLogin === false) {
    return false;
  }

  // Domyślnie nowe konta wymagają zmiany hasła przy pierwszym wejściu
  return true;
}

/** Prosty dekoder JWT Payload dla Google OAuth 2.0 Identity Services */
function parseJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Błąd dekodowania JWT:', e);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const sessionRaw = localStorage.getItem('crm_samorzad_auth_session') || localStorage.getItem('crm_psychoonkologia_auth_session');
      const savedRaw = localStorage.getItem('crm_samorzad_auth_user') || localStorage.getItem('crm_psychoonkologia_auth_user');
      if (sessionRaw && savedRaw) {
        const session = JSON.parse(sessionRaw);
        // Maksymalny czas ważności sesji (24h)
        if (session && session.timestamp && (Date.now() - session.timestamp > 24 * 60 * 60 * 1000)) {
          localStorage.removeItem('crm_samorzad_auth_session');
          localStorage.removeItem('crm_samorzad_auth_user');
          return null;
        }

        const parsed = JSON.parse(savedRaw);
        if (parsed && parsed.email) {
          const email = (parsed.email || '').toLowerCase();
          const name = (parsed.name || '').toLowerCase();
          if (name.includes('bratkowski') && !parsed.token) {
            return DEFAULT_USER;
          }
          return {
            ...parsed,
            name: (email.includes('atomek') || email.includes('atonex') || name.includes('bratkowski') || name.includes('tomasz'))
              ? 'Tomasz Bratkowski'
              : MASTER_ADMIN_EMAILS.some(m => m.toLowerCase() === email)
              ? 'Kancelaria Samorządu Studenckiego WSKZ'
              : (parsed.name || 'Tomasz Bratkowski'),
          };
        }
      }
    } catch {}
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const sessionRaw = localStorage.getItem('crm_samorzad_auth_session') || localStorage.getItem('crm_psychoonkologia_auth_session');
      const savedRaw = localStorage.getItem('crm_samorzad_auth_user') || localStorage.getItem('crm_psychoonkologia_auth_user');
      if (sessionRaw && savedRaw) {
        const session = JSON.parse(sessionRaw);
        if (session && session.timestamp && (Date.now() - session.timestamp > 24 * 60 * 60 * 1000)) {
          return false;
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  const [sessionTimeoutNotice, setSessionTimeoutNotice] = useState(null);

  /** Wylogowanie */
  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('crm_samorzad_auth_session');
      localStorage.removeItem('crm_samorzad_auth_user');
      localStorage.removeItem('crm_psychoonkologia_auth_session');
      localStorage.removeItem('crm_psychoonkologia_auth_user');
      localStorage.removeItem('crm_auth_user');
    } catch {}
  }, []);

  // Automatyczne wylogowanie po 20 minutach bezczynności (ochrona danych studentów na współdzielonych stacjach)
  useEffect(() => {
    if (!isAuthenticated) return;

    let lastActivity = Date.now();
    const handleUserActivity = () => {
      lastActivity = Date.now();
    };

    const trackedEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    trackedEvents.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    const INACTIVITY_LIMIT_MS = 20 * 60 * 1000; // 20 minut
    const timerInterval = setInterval(() => {
      if (Date.now() - lastActivity >= INACTIVITY_LIMIT_MS) {
        logout();
        setSessionTimeoutNotice('Sesja została automatycznie zakończona ze względów bezpieczeństwa (20 minut bezczynności na stanowisku). Zaloguj się ponownie.');
      }
    }, 30000);

    return () => {
      trackedEvents.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      clearInterval(timerInterval);
    };
  }, [isAuthenticated, logout]);

  useEffect(() => {
    try {
      if (user && isAuthenticated) {
        localStorage.setItem('crm_samorzad_auth_user', JSON.stringify(user));
        localStorage.setItem('crm_samorzad_auth_session', JSON.stringify({
          email: user.email,
          name: user.name,
          role: user.role,
          timestamp: Date.now(),
        }));
      } else if (!isAuthenticated) {
        localStorage.removeItem('crm_samorzad_auth_user');
        localStorage.removeItem('crm_samorzad_auth_session');
        localStorage.removeItem('crm_psychoonkologia_auth_user');
        localStorage.removeItem('crm_psychoonkologia_auth_session');
      }
    } catch (err) {
      console.error('Błąd zapisu sesji auth:', err);
    }
  }, [user, isAuthenticated]);

  const isMasterUser = useMemo(() => {
    const userEmail = (user?.email || '').toLowerCase().trim();
    return MASTER_ADMIN_EMAILS.some(mEmail => mEmail.toLowerCase().trim() === userEmail);
  }, [user]);

  /** Weryfikacja czy użytkownik ma uprawnienia do danego koła */
  const canAccessOrg = useCallback((orgId) => {
    if (!user || !isAuthenticated) return false;
    if (isMasterUser || user.role === 'SUPER_ADMIN') return true;
    if (Array.isArray(user.accessibleOrgs)) {
      return user.accessibleOrgs.includes('*') || user.accessibleOrgs.includes(orgId);
    }
    return false;
  }, [user, isAuthenticated, isMasterUser]);

  const isSuperAdmin = isMasterUser || user?.role === 'SUPER_ADMIN';
  const isCoordinator = user?.role === 'COORDINATOR' || isSuperAdmin;
  const isViewer = user?.role === 'VIEWER';

  /** Sprawdzenie uprawnień adresu e-mail i stanu hasła */
  const checkEmailStatus = useCallback((inputEmail) => {
    if (!inputEmail || !inputEmail.trim()) {
      return { authorized: false, error: 'Wprowadź adres e-mail.' };
    }

    const cleanEmail = inputEmail.trim().toLowerCase();

    // 1. Sprawdź czy konto jest w bazie uprawnionych
    const isMaster = MASTER_ADMIN_EMAILS.some(e => e.toLowerCase() === cleanEmail);
    const isDefaultBoard = cleanEmail === 'kancelaria@samorzad.wskz.pl' || cleanEmail === 'samorzad@wskz.pl';
    const demoMatch = DEMO_ACCOUNTS.find(d => d.email.toLowerCase() === cleanEmail);
    const defaultAuthMatch = DEFAULT_AUTHORIZED_ACCOUNTS.find(d => d.email.toLowerCase() === cleanEmail);

    let accessUsers = [];
    try {
      const savedUsers = localStorage.getItem('samorzad_access_users') || localStorage.getItem('skn_access_users');
      if (savedUsers) {
        accessUsers = JSON.parse(savedUsers);
      }
    } catch {}

    const accessMatch = (Array.isArray(accessUsers) ? accessUsers : DEFAULT_AUTHORIZED_ACCOUNTS)
      .find(u => (u?.email || '').toLowerCase() === cleanEmail) || defaultAuthMatch;

    if (!isMaster && !isDefaultBoard && !demoMatch && !accessMatch) {
      return {
        authorized: false,
        error: 'Brak uprawnień dostępu. Twój adres nie został dodany przez Kancelarię Samorządu.',
      };
    }

    // 2. Utwórz profil użytkownika
    let role = 'COORDINATOR';
    let name = cleanEmail.split('@')[0];
    let accessibleOrgs = ['*'];

    if (isMaster) {
      role = 'SUPER_ADMIN';
      name = (cleanEmail.includes('atomek') || cleanEmail.includes('atonex'))
        ? 'Tomasz Bratkowski'
        : 'Kancelaria Samorządu Studenckiego WSKZ';
    } else if (isDefaultBoard) {
      role = 'SUPER_ADMIN';
      name = 'Kancelaria Samorządu Studenckiego WSKZ';
    } else if (accessMatch) {
      role = accessMatch.role === 'ADMIN' ? 'SUPER_ADMIN' : (accessMatch.role || 'COORDINATOR');
      name = accessMatch.name || cleanEmail.split('@')[0];
    } else if (demoMatch) {
      role = demoMatch.role || 'COORDINATOR';
      name = demoMatch.name;
    }

    const authUser = {
      email: cleanEmail,
      name,
      role,
      accessibleOrgs,
      loggedAt: new Date().toISOString(),
    };

    // 3. Sprawdź czy użytkownik ma już zdefiniowane hasło
    const storedPass = getUserStoredPassword(cleanEmail);
    const hasPassword = Boolean(storedPass);
    const isFirstLogin = !hasPassword;

    return {
      authorized: true,
      hasPassword,
      isFirstLogin,
      user: authUser,
    };
  }, []);

  /** Aktywacja nowego konta na pierwszym logowaniu i nadanie własnego hasła (SHA-256) */
  const activateAccount = useCallback(async (email, newPassword, confirmPassword, userData = null) => {
    if (!email || !newPassword || !confirmPassword) {
      return { success: false, error: 'Wypełnij wszystkie pola formularza.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const p1 = newPassword.trim();
    const p2 = confirmPassword.trim();

    if (p1.length < 8) {
      return { success: false, error: 'Hasło musi zawierać co najmniej 8 znaków.' };
    }

    if (p1 !== p2) {
      return { success: false, error: 'Wprowadzone hasła nie są identyczne.' };
    }

    try {
      // Bezpieczny skrót SHA-256 z solą
      const passwordHash = await computePasswordHash(p1);

      // 1. Zapisz skrót hasła w rejestrze (nigdy w otwartym tekście!)
      let passwords = {};
      try {
        const rawPass = localStorage.getItem('samorzad_user_passwords') || localStorage.getItem('skn_user_passwords');
        if (rawPass) passwords = JSON.parse(rawPass);
      } catch {}
      passwords[cleanEmail] = passwordHash;
      localStorage.setItem('samorzad_user_passwords', JSON.stringify(passwords));

      // 2. Oznacz isFirstLogin jako false
      let statusMap = {};
      try {
        const rawStatus = localStorage.getItem('samorzad_user_first_login_status') || localStorage.getItem('skn_user_first_login_status');
        if (rawStatus) statusMap = JSON.parse(rawStatus);
      } catch {}
      statusMap[cleanEmail] = false;
      localStorage.setItem('samorzad_user_first_login_status', JSON.stringify(statusMap));

      // 3. Zaktualizuj rekord w samorzad_access_users jeśli istnieje
      try {
        const rawUsers = localStorage.getItem('samorzad_access_users') || localStorage.getItem('skn_access_users');
        if (rawUsers) {
          const accessUsers = JSON.parse(rawUsers);
          if (Array.isArray(accessUsers)) {
            const updatedUsers = accessUsers.map(u => {
              if ((u?.email || '').toLowerCase() === cleanEmail) {
                return { ...u, isFirstLogin: false, tempPassword: null };
              }
              return u;
            });
            localStorage.setItem('samorzad_access_users', JSON.stringify(updatedUsers));
          }
        }
      } catch {}

      // 4. Utwórz profil i zaloguj bezpośrednio do CRM
      const authUser = userData || {
        email: cleanEmail,
        name: cleanEmail.includes('kancelaria') ? 'Kancelaria Samorządu Studenckiego WSKZ' : cleanEmail.split('@')[0],
        role: cleanEmail.includes('kancelaria') ? 'SUPER_ADMIN' : 'COORDINATOR',
        accessibleOrgs: ['*'],
        loggedAt: new Date().toISOString(),
      };

      setUser(authUser);
      setIsAuthenticated(true);
      setSessionTimeoutNotice(null);

      localStorage.setItem('crm_samorzad_auth_session', JSON.stringify({
        email: cleanEmail,
        name: authUser.name,
        role: authUser.role,
        timestamp: Date.now(),
      }));
      localStorage.setItem('crm_samorzad_auth_user', JSON.stringify(authUser));

      return { success: true, user: authUser };
    } catch (e) {
      console.error('Błąd aktywacji konta:', e);
      return { success: false, error: 'Wystąpił błąd podczas zapisywania hasła.' };
    }
  }, []);

  /** Logowanie z hasłem (weryfikacja kryptograficzna SHA-256) */
  const loginWithPassword = useCallback(async (inputEmail, inputPassword) => {
    if (!inputEmail || !inputPassword) {
      return { success: false, error: 'Wypełnij wszystkie pola formularza.' };
    }

    const cleanEmail = inputEmail.trim().toLowerCase();
    const cleanPassword = inputPassword.trim();

    const status = checkEmailStatus(cleanEmail);
    if (!status.authorized) {
      return { success: false, error: status.error };
    }

    if (!status.hasPassword) {
      return {
        success: false,
        requiresActivation: true,
        user: status.user,
        error: 'Konto nie posiada jeszcze nadanego hasła. Uzupełnij formularz aktywacji.',
      };
    }

    const storedPassOrHash = getUserStoredPassword(cleanEmail);
    const inputHash = await computePasswordHash(cleanPassword);

    const isMatch = (storedPassOrHash === inputHash) || (storedPassOrHash === cleanPassword);
    if (!storedPassOrHash || !isMatch) {
      return { success: false, error: 'Nieprawidłowe hasło dostępowe.' };
    }

    // Automatyczna migracja: jeśli w localStorage zalegał stary jawny tekst, zastąp go bezpiecznym skrótem
    if (storedPassOrHash === cleanPassword && storedPassOrHash !== inputHash) {
      try {
        const rawPass = localStorage.getItem('samorzad_user_passwords');
        let passwords = rawPass ? JSON.parse(rawPass) : {};
        passwords[cleanEmail] = inputHash;
        localStorage.setItem('samorzad_user_passwords', JSON.stringify(passwords));
      } catch {}
    }

    setUser(status.user);
    setIsAuthenticated(true);
    setSessionTimeoutNotice(null);

    try {
      localStorage.setItem('crm_samorzad_auth_session', JSON.stringify({
        email: cleanEmail,
        name: status.user.name,
        role: status.user.role,
        timestamp: Date.now(),
      }));
      localStorage.setItem('crm_samorzad_auth_user', JSON.stringify(status.user));
    } catch (e) {
      console.warn('Błąd zapisu sesji:', e);
    }

    return { success: true };
  }, [checkEmailStatus]);

  /** Logowanie z weryfikacją adresu e-mail i hasła (kompatybilność wsteczna) */
  const loginWithCredentials = useCallback((inputEmail, inputPassword) => {
    return loginWithPassword(inputEmail, inputPassword);
  }, [loginWithPassword]);

  /** Zmiana hasła przy pierwszym logowaniu lub na żądanie (zapis bezpiecznego skrótu SHA-256) */
  const changePassword = useCallback(async (email, newPassword, confirmPassword, userData = null) => {
    if (!email || !newPassword || !confirmPassword) {
      return { success: false, error: 'Wypełnij wszystkie pola formularza.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const p1 = newPassword.trim();
    const p2 = confirmPassword.trim();

    if (p1.length < 8) {
      return { success: false, error: 'Nowe hasło musi zawierać co najmniej 8 znaków.' };
    }

    if (p1 !== p2) {
      return { success: false, error: 'Wprowadzone hasła nie są identyczne.' };
    }

    const inputHash = await computePasswordHash(p1);
    if (STARTER_HASHES[cleanEmail] === inputHash) {
      return { success: false, error: 'Nowe hasło nie może być hasłem startowym. Wybierz inne, bezpieczne hasło.' };
    }

    try {
      // 1. Zapisz skrót hasła w rejestrze haseł użytkowników
      let passwords = {};
      try {
        const rawPass = localStorage.getItem('samorzad_user_passwords') || localStorage.getItem('skn_user_passwords');
        if (rawPass) passwords = JSON.parse(rawPass);
      } catch {}
      passwords[cleanEmail] = inputHash;
      localStorage.setItem('samorzad_user_passwords', JSON.stringify(passwords));

      // 2. Oznacz isFirstLogin jako false
      let statusMap = {};
      try {
        const rawStatus = localStorage.getItem('samorzad_user_first_login_status') || localStorage.getItem('skn_user_first_login_status');
        if (rawStatus) statusMap = JSON.parse(rawStatus);
      } catch {}
      statusMap[cleanEmail] = false;
      localStorage.setItem('samorzad_user_first_login_status', JSON.stringify(statusMap));

      // 3. Zaktualizuj rekord w samorzad_access_users jeśli istnieje
      try {
        const rawUsers = localStorage.getItem('samorzad_access_users') || localStorage.getItem('skn_access_users');
        if (rawUsers) {
          const accessUsers = JSON.parse(rawUsers);
          if (Array.isArray(accessUsers)) {
            const updatedUsers = accessUsers.map(u => {
              if ((u?.email || '').toLowerCase() === cleanEmail) {
                return { ...u, isFirstLogin: false, tempPassword: null };
              }
              return u;
            });
            localStorage.setItem('samorzad_access_users', JSON.stringify(updatedUsers));
          }
        }
      } catch {}

      // 4. Utwórz obiekt zautoryzowanego użytkownika
      const authUser = userData || {
        email: cleanEmail,
        name: cleanEmail.includes('kancelaria') ? 'Kancelaria Samorządu Studenckiego WSKZ' : cleanEmail.split('@')[0],
        role: cleanEmail.includes('kancelaria') ? 'SUPER_ADMIN' : 'COORDINATOR',
        accessibleOrgs: ['*'],
        loggedAt: new Date().toISOString(),
      };

      setUser(authUser);
      setIsAuthenticated(true);
      setSessionTimeoutNotice(null);

      localStorage.setItem('crm_samorzad_auth_session', JSON.stringify({
        email: cleanEmail,
        name: authUser.name,
        role: authUser.role,
        timestamp: Date.now(),
      }));
      localStorage.setItem('crm_samorzad_auth_user', JSON.stringify(authUser));

      return { success: true };
    } catch (e) {
      console.error('Błąd podczas zapisywania nowego hasła:', e);
      return { success: false, error: 'Wystąpił błąd podczas zapisywania hasła.' };
    }
  }, []);

  /** Logowanie za pomocą Google OAuth 2.0 (Google Identity Services / @react-oauth/google ready) */
  const loginWithGoogle = useCallback((credentialResponse) => {
    if (!credentialResponse?.credential) {
      console.error('Brak tokenu w odpowiedzi Google OAuth');
      return;
    }

    const payload = parseJwtPayload(credentialResponse.credential);
    if (!payload || !payload.email) {
      console.error('Nieprawidłowy payload Google OAuth');
      return;
    }

    const email = payload.email.toLowerCase().trim();
    const isMaster = MASTER_ADMIN_EMAILS.some(mEmail => mEmail.toLowerCase().trim() === email);

    const newUser = {
      email,
      name: (email.includes('atomek') || email.includes('atonex') || email.includes('bratkowski'))
        ? 'Tomasz Bratkowski'
        : isMaster
        ? 'Kancelaria Samorządu Studenckiego WSKZ'
        : (payload.name || payload.given_name || email.split('@')[0]),
      avatarUrl: payload.picture || '',
      role: isMaster ? 'SUPER_ADMIN' : 'COORDINATOR',
      accessibleOrgs: ['*'],
      token: credentialResponse.credential,
    };

    setUser(newUser);
    setIsAuthenticated(true);
  }, []);

  /** Przełącz profil demonstracyjny */
  const switchDemoAccount = useCallback((account) => {
    const updated = {
      ...account,
      avatarUrl: account.avatarUrl || '',
    };
    setUser(updated);
    setIsAuthenticated(true);
  }, []);

  /** Zmiana hasła przez zalogowanego użytkownika (z weryfikacją kryptograficzną) */
  const changeUserPassword = useCallback(async (currentPassword, newPassword, confirmPassword) => {
    if (!user || !user.email) {
      return { success: false, error: 'Brak aktywnej sesji użytkownika.' };
    }

    const cleanEmail = user.email.trim().toLowerCase();
    const curPass = (currentPassword || '').trim();
    const p1 = (newPassword || '').trim();
    const p2 = (confirmPassword || '').trim();

    if (!curPass || !p1 || !p2) {
      return { success: false, error: 'Wypełnij wszystkie pola formularza.' };
    }

    // 1. Weryfikacja aktualnego hasła
    const customPassOrHash = getUserStoredPassword(cleanEmail);
    const curHash = await computePasswordHash(curPass);
    let isCurrentValid = (customPassOrHash === curHash) || (customPassOrHash === curPass);

    if (!isCurrentValid) {
      return { success: false, error: 'Wprowadzone dotychczasowe hasło jest nieprawidłowe.' };
    }

    // 2. Wywołaj właściwą procedurę zmiany hasła
    return changePassword(cleanEmail, p1, p2, user);
  }, [user, changePassword]);

  const value = useMemo(() => ({
    user,
    isAuthenticated,
    sessionTimeoutNotice,
    clearSessionTimeoutNotice: () => setSessionTimeoutNotice(null),
    isSuperAdmin,
    isCoordinator,
    isViewer,
    canAccessOrg,
    checkEmailStatus,
    activateAccount,
    loginWithPassword,
    loginWithCredentials,
    changePassword,
    changeUserPassword,
    loginWithGoogle,
    switchDemoAccount,
    logout,
    setUser,
  }), [
    user,
    isAuthenticated,
    sessionTimeoutNotice,
    isSuperAdmin,
    isCoordinator,
    isViewer,
    canAccessOrg,
    checkEmailStatus,
    activateAccount,
    loginWithPassword,
    loginWithCredentials,
    changePassword,
    changeUserPassword,
    loginWithGoogle,
    switchDemoAccount,
    logout,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

