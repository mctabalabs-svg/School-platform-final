import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  CircleHelp,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

export interface UserSession {
  id: string;
  school_id: string;
  school_name?: string;
  email: string;
  name: string;
  role:
    | 'platform_admin'
    | 'admin'
    | 'super_admin'
    | 'principal'
    | 'teacher'
    | 'parent'
    | 'student'
    | 'accountant';
  profile_id: string | null;
  token?: string;
  profile?: any;
}

interface LoginModalProps {
  isOpen: boolean;
  canClose?: boolean;
  onClose: () => void;
  onLoginSuccess: (session: UserSession) => void;
}

export function LoginModal({ isOpen, canClose = true, onClose, onLoginSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please verify your credentials.');
      }

      const session: UserSession = {
        id: data.user.id,
        school_id: data.user.school_id,
        school_name: data.user.school_name,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        profile_id: data.user.profile_id,
        token: data.token,
        profile: data.user.profile,
      };

      localStorage.setItem('ga_auth_token', data.token);
      localStorage.setItem('ga_user_session', JSON.stringify(session));

      onLoginSuccess(session);
      onClose();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Login request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg(null);
  };

  return (
    <main className="school-login min-h-screen bg-[#f7f8f5] text-slate-900">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="login-story relative flex min-h-[440px] flex-col overflow-hidden px-6 pb-8 pt-6 text-white sm:px-10 sm:pt-8 lg:min-h-screen lg:px-14 lg:pb-12 lg:pt-10">
          <div className="login-orbit login-orbit-one" aria-hidden="true" />
          <div className="login-orbit login-orbit-two" aria-hidden="true" />
          <header className="relative z-10 flex items-center justify-between">
            <a className="flex items-center gap-3" href="/" aria-label="Schoolhouse home">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e6b86a] text-[#173c32] shadow-lg shadow-black/10">
                <GraduationCap className="h-6 w-6" strokeWidth={2.2} />
              </span>
              <span>
                <span className="block text-[17px] font-bold leading-tight tracking-tight">Schoolhouse</span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100/65">
                  School management
                </span>
              </span>
            </a>
            <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-emerald-50/80 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a7d8a1]" />
              A brighter way to learn
            </div>
          </header>

          <div className="relative z-10 my-auto max-w-[570px] py-12 lg:py-16">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d6b879]/25 bg-[#d6b879]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f0d7a4]">
              <Sparkles className="h-3.5 w-3.5" />
              One home for your school community
            </div>
            <h1 className="max-w-[540px] text-[clamp(2.6rem,5.2vw,4.6rem)] font-semibold leading-[1.04] tracking-[-0.055em] text-[#fbfaf4]">
              Great things
              <br />
              happen <span className="font-serif italic font-normal text-[#e7c37f]">together.</span>
            </h1>
            <p className="mt-6 max-w-[440px] text-sm leading-7 text-emerald-50/70 sm:text-base">
              Keep attendance, assignments, fees and school updates connected in one clear place for your whole community.
            </p>

            <div className="mt-9 grid max-w-[450px] grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4ba70]/15 text-[#e7c37f]">
                  <BookOpen className="h-[18px] w-[18px]" />
                </div>
                <p className="text-sm font-semibold text-white">The school day, connected</p>
                <p className="mt-1 text-xs leading-5 text-emerald-50/55">Classes, attendance and learning progress in one view.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4ba70]/15 text-[#e7c37f]">
                  <ShieldCheck className="h-[18px] w-[18px]" />
                </div>
                <p className="text-sm font-semibold text-white">One school community</p>
                <p className="mt-1 text-xs leading-5 text-emerald-50/55">A dedicated workspace for staff, families and learners.</p>
              </div>
            </div>
          </div>

          <footer className="relative z-10 flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-[11px] text-emerald-50/50">
            <span>Made for every part of school life</span>
            <span className="hidden sm:inline">© {new Date().getFullYear()} Schoolhouse</span>
          </footer>
        </section>

        <section className="school-login-panel relative flex items-center justify-center overflow-hidden px-5 py-9 sm:px-10 lg:px-12 lg:py-12">
          <div className="w-full max-w-[430px]">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#edf2eb] text-[#315d4a]">
                  <Building2 className="h-3.5 w-3.5" />
                </span>
                School community portal
              </div>
              {canClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close sign-in"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mb-7">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#52735c]">
                Welcome back
              </p>
              <h2 className="text-[30px] font-semibold tracking-[-0.04em] text-[#172a21] sm:text-[34px]">
                Sign in to your school
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter the email and password linked to your school account.
              </p>
            </div>

            <div className="mb-6 rounded-2xl border border-[#dce5d8] bg-white p-3.5 shadow-[0_8px_24px_rgba(27,54,40,0.04)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf4eb] text-[#315d4a]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[#23372b]">Your school workspace</p>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Your school is matched securely from your account.</p>
                </div>
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#4f8054]" />
              </div>
              <div className="mt-3 flex items-start gap-2 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-500">
                <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#68806c]" />
                <span>
                  School accounts are created by the platform administrator. If your school is not set up yet, ask them to provision your workspace.
                </span>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs leading-5 text-rose-800"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">
                  !
                </span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="school-login-email" className="mb-1.5 block text-xs font-semibold text-[#35463a]">
                  School email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="school-login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@school.edu"
                    autoComplete="username"
                    className="h-12 w-full rounded-xl border border-[#dce2da] bg-white pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#52775d] focus:ring-4 focus:ring-[#52775d]/10"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="school-login-password" className="text-xs font-semibold text-[#35463a]">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400">Forgot password? Contact your school</span>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="school-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border border-[#dce2da] bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#52775d] focus:ring-4 focus:ring-[#52775d]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#204c3a] px-4 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(32,76,58,0.16)] transition hover:bg-[#183d2e] focus:outline-none focus:ring-4 focus:ring-[#52775d]/20 disabled:cursor-wait disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                ) : (
                  <>
                    Sign in to your workspace
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            {import.meta.env.DEV && (
              <div className="mt-6 border-t border-slate-200 pt-5">
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Development demo accounts
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'School admin', email: 'admin@greenfield.edu', password: 'Admin@2026!' },
                    { label: 'Teacher', email: 'e.vance@greenfield.edu', password: 'Teacher@2026!' },
                    { label: 'Parent', email: 'carlos.martinez@gmail.com', password: 'Parent@2026!' },
                    { label: 'Student', email: 's.martinez@greenfield.edu', password: 'Student@2026!' },
                  ].map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => handleQuickSelect(account.email, account.password)}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:border-[#afc3ad] hover:bg-[#f5f8f3] hover:text-[#294b36]"
                    >
                      {account.label}
                      <ArrowUpRight className="h-3 w-3 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-[#6b8d70]" />
              Sign-in for your school community
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
