import React, { useState } from 'react';
import { Lock, Mail, KeyRound, AlertCircle, CheckCircle2, ShieldCheck, UserCheck, ArrowRight, X } from 'lucide-react';

export interface UserSession {
  id: string;
  school_id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin' | 'principal' | 'teacher' | 'parent' | 'student' | 'accountant';
  profile_id: string | null;
  token?: string;
  profile?: any;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: UserSession) => void;
}

export function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('admin@greenfield.edu');
  const [password, setPassword] = useState('Admin@2026!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      const session: UserSession = {
        id: data.user.id,
        school_id: data.user.school_id,
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Login request failed.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="login-modal-dialog"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Secure Account Access</h3>
              <p className="text-xs text-indigo-200">Greenfield Academy Multi-Role Portal</p>
            </div>
          </div>
        </div>

        {/* Modal Body Form */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work / Institutional Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@greenfield.edu"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Secure Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Picker for Testing */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Instant Demo Credentials:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickSelect('admin@greenfield.edu', 'Admin@2026!')}
                className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg transition-all"
              >
                <div className="font-semibold text-indigo-900">1. Admin (Arthur)</div>
                <div className="text-[10px] text-slate-500 truncate">admin@greenfield.edu</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('e.vance@greenfield.edu', 'Teacher@2026!')}
                className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg transition-all"
              >
                <div className="font-semibold text-indigo-900">2. Teacher (Dr. Vance)</div>
                <div className="text-[10px] text-slate-500 truncate">e.vance@greenfield.edu</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('carlos.martinez@gmail.com', 'Parent@2026!')}
                className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg transition-all"
              >
                <div className="font-semibold text-indigo-900">3. Parent (Carlos M.)</div>
                <div className="text-[10px] text-slate-500 truncate">carlos.martinez@gmail.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('s.martinez@greenfield.edu', 'Student@2026!')}
                className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg transition-all"
              >
                <div className="font-semibold text-indigo-900">4. Student (Sophia M.)</div>
                <div className="text-[10px] text-slate-500 truncate">s.martinez@greenfield.edu</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
