import React, { useState } from 'react';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Key,
  ArrowLeft,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { checkEmailStatus, activateAccount, loginWithPassword } = useAuth();

  // Step state: 'email' | 'password' | 'activate'
  const [step, setStep] = useState('email');

  // Input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Validation rules for new password during first-time activation
  const hasMinLength = newPassword.length >= 8;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isActivationValid = hasMinLength && passwordsMatch;

  // STEP 1: Verify Email
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Wprowadź adres e-mail.');
      return;
    }

    setLoading(true);
    try {
      const res = checkEmailStatus(cleanEmail);

      if (!res.authorized) {
        setError(res.error || 'Brak uprawnień dostępu. Twój adres nie został dodany przez zarząd koła.');
        setVerifiedUser(null);
        return;
      }

      setVerifiedUser(res.user);

      if (res.isFirstLogin || !res.hasPassword) {
        // First login: No password set yet -> Activation form
        setStep('activate');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        // Returning user: Password already set -> Standard password prompt
        setStep('password');
        setPassword('');
      }
    } catch (err) {
      setError('Wystąpił nieoczekiwany błąd podczas sprawdzania adresu e-mail.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2A: Submit Existing Password
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = loginWithPassword(email.trim(), password);
      if (!res.success) {
        if (res.requiresActivation) {
          setStep('activate');
        } else {
          setError(res.error || 'Nieprawidłowe hasło dostępowe.');
        }
      }
      // On success, AuthContext automatically updates isAuthenticated = true and opens CRM
    } catch (err) {
      setError('Wystąpił nieoczekiwany błąd podczas logowania.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2B: First-Time Account Activation & Set Password
  const handleActivationSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!hasMinLength) {
      setError('Hasło musi zawierać co najmniej 8 znaków.');
      return;
    }
    if (!passwordsMatch) {
      setError('Podane hasła nie są identyczne.');
      return;
    }

    setLoading(true);
    try {
      const res = activateAccount(email.trim(), newPassword, confirmPassword, verifiedUser);
      if (!res.success) {
        setError(res.error || 'Nie udało się zapisać hasła.');
      }
      // On success, AuthContext automatically sets session and unlocks CRM
    } catch (err) {
      setError('Wystąpił błąd podczas aktywacji konta.');
    } finally {
      setLoading(false);
    }
  };

  // Reset to email step
  const handleResetToEmail = () => {
    setStep('email');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-[#0a192f] to-[#0f172a] text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-950/70 text-sky-300 border border-sky-800/50 text-xs font-semibold backdrop-blur-md shadow-inner">
            <span className="text-base leading-none">🏛️</span>
            <span>Samorząd Studentów WSKZ</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Kancelaria & System Ewidencji Zarządczej
          </h1>
          <p className="text-xs text-sky-200/70 max-w-xs mx-auto leading-relaxed">
            Dostęp autoryzowany wyłącznie dla członków Prezydium, Kancelarii oraz uprawnionych organów Samorządu WSKZ
          </p>
        </div>

        {/* Dynamic Card Container */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-sky-900/40 text-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Top Status Header */}
          <div className="flex items-center justify-between pb-3 border-b border-sky-950/60">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                step === 'activate' ? 'bg-amber-950/70 text-amber-300 border border-amber-800/40' : 'bg-sky-950/70 text-sky-300 border border-sky-800/40'
              }`}>
                {step === 'activate' ? <Key size={20} /> : <ShieldCheck size={20} />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  Logowanie do Kancelarii
                </h2>
                <p className="text-[11px] text-sky-200/60">
                  Uwierzytelnij dostęp do zasobów Samorządu
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              step === 'activate' ? 'bg-amber-950/70 text-amber-300 border border-amber-800/40 font-mono' : 'bg-slate-800/80 text-sky-200/80 font-mono border border-slate-700/50'
            }`}>
              {step === 'activate' ? 'Aktywacja' : '2026/2027'}
            </span>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in zoom-in-95 duration-150">
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <p className="font-bold">Odmowa dostępu</p>
                <p className="text-[11px] text-rose-300 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 1: EMAIL INPUT ──────────────── */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} autoComplete="off" className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="auth-email" className="block text-xs font-bold text-sky-200/80">
                  Adres e-mail
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="off"
                    spellCheck="false"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="wpisz adres e-mail (np. imie.nazwisko@samorzad.wskz.pl)"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-950/60 border border-sky-950 rounded-xl focus:bg-slate-950 focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none transition font-medium text-slate-100 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3 px-4 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-bold text-xs shadow-lg shadow-blue-900/30 hover:shadow-blue-700/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] border border-blue-600/30"
              >
                {loading ? (
                  <span>Weryfikacja uprawnień…</span>
                ) : (
                  <>
                    <span>Zaloguj →</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ──────────────── STEP 2A: RETURNING USER LOGIN ──────────────── */}
          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} autoComplete="off" className="space-y-4">
              {/* Account Pill */}
              <div className="p-3 bg-slate-950/60 border border-sky-950 rounded-xl flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-white truncate">{verifiedUser?.name}</p>
                  <p className="text-[11px] text-sky-300/60 font-mono truncate">{email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetToEmail}
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 underline shrink-0 cursor-pointer"
                >
                  Zmień
                </button>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label htmlFor="auth-password" className="block text-xs font-bold text-sky-200/80">
                  Hasło dostępowe
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    autoComplete="current-password"
                    spellCheck="false"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Wprowadź swoje hasło..."
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-950/60 border border-sky-950 rounded-xl focus:bg-slate-950 focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none transition font-medium text-slate-100 font-mono placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !password.trim()}
                className="w-full py-3 px-4 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-bold text-xs shadow-lg shadow-blue-900/30 hover:shadow-blue-700/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99] border border-blue-600/30"
              >
                {loading ? (
                  <span>Logowanie…</span>
                ) : (
                  <>
                    <span>Zaloguj →</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetToEmail}
                className="w-full py-1 text-xs text-sky-300/60 hover:text-sky-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Wróć do wpisywania e-maila</span>
              </button>
            </form>
          )}

          {/* ──────────────── STEP 2B: FIRST-TIME ACTIVATION FORM ──────────────── */}
          {step === 'activate' && (
            <form onSubmit={handleActivationSubmit} autoComplete="off" className="space-y-4">
              
              {/* Account welcome banner */}
              <div className="p-3.5 bg-sky-950/60 border border-sky-800/40 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider">
                    🎉 Pierwsze logowanie do Kancelarii
                  </span>
                  <button
                    type="button"
                    onClick={handleResetToEmail}
                    className="text-[10px] font-semibold text-sky-400 hover:text-sky-200 underline cursor-pointer"
                  >
                    Zmień e-mail
                  </button>
                </div>
                <p className="text-xs font-bold text-white">
                  Witaj, {verifiedUser?.name || 'Użytkowniku'}!
                </p>
                <p className="text-[11px] text-sky-200/80 leading-relaxed">
                  Twoje konto zostało dodane przez Kancelarię Samorządu. Ustaw swoje własne, unikalne hasło dostępowe.
                </p>
              </div>

              {/* New Password field */}
              <div className="space-y-1.5">
                <label htmlFor="activate-password" className="block text-xs font-bold text-sky-200/80">
                  Wpisz hasło
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="activate-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    autoComplete="new-password"
                    spellCheck="false"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 znaków..."
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-950/60 border border-sky-950 rounded-xl focus:bg-slate-950 focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none transition font-medium text-slate-100 font-mono placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password field */}
              <div className="space-y-1.5">
                <label htmlFor="activate-confirm-password" className="block text-xs font-bold text-sky-200/80">
                  Powtórz hasło
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="activate-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    spellCheck="false"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Wpisz ponownie to samo hasło..."
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-950/60 border border-sky-950 rounded-xl focus:bg-slate-950 focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none transition font-medium text-slate-100 font-mono placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Real-time Checklist */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-sky-950 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  {hasMinLength ? (
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-slate-600" />
                  )}
                  <span className={hasMinLength ? 'text-emerald-300 font-semibold' : 'text-slate-400'}>
                    Co najmniej 8 znaków
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {passwordsMatch ? (
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-slate-600" />
                  )}
                  <span className={passwordsMatch ? 'text-emerald-300 font-semibold' : 'text-slate-400'}>
                    Hasła są identyczne
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isActivationValid}
                className="w-full py-3 px-4 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-bold text-xs shadow-lg shadow-blue-900/30 hover:shadow-blue-700/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] border border-blue-600/30"
              >
                {loading ? (
                  <span>Zapisywanie hasła…</span>
                ) : (
                  <>
                    <span>Zapisz hasło i wejdź →</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetToEmail}
                className="w-full py-1 text-xs text-sky-300/60 hover:text-sky-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Wróć do wpisywania e-maila</span>
              </button>
            </form>
          )}

        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-sky-200/50 space-y-1">
          <p>Kancelaria Samorządu Studentów WSKZ | Bezpieczne połączenie szyfrowane</p>
          <p className="text-[10px]">W razie problemów z logowaniem skontaktuj się z administratorem systemu Kancelarii</p>
        </div>

      </div>
    </div>
  );
}
