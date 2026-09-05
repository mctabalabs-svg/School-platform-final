import React, { useState } from 'react';
import axios from 'axios';
import {
  UserPlus,
  Mail,
  Lock,
  Phone,
  User,
  ShieldCheck,
  IdCard,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  X,
  Sparkles,
} from 'lucide-react';

export interface ParentAccount {
  user_id: string;
  parent_id: string;
  school_id?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  national_id?: string;
  occupation?: string;
  status: string;
  children_count?: number;
  linked_children?: any[];
}

interface ParentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newParent: ParentAccount) => void;
}

export function ParentRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
}: ParentRegistrationModalProps) {
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [occupation, setOccupation] = useState('Parent/Guardian');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Client-Side Field Validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Full Name validation
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      errs.fullName = 'Full Name is required.';
    } else if (trimmedName.split(/\s+/).length < 2) {
      errs.fullName = 'Please provide both first and last name.';
    }

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      errs.email = 'Please enter a valid email address (e.g. parent@domain.com).';
    }

    // 3. Password validation
    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters long.';
    }

    // 4. Phone validation
    const phoneClean = phone.replace(/[\s\-()]/g, '');
    if (!phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (phoneClean.length < 9) {
      errs.phone = 'Please enter a valid telephone number (e.g. +254 700 123456).';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler using Axios POST /api/admin/parents
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMsg(null);

    // Validate fields before dispatching request
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Retrieve Bearer Token from localStorage or fallback to active session
      let token = localStorage.getItem('ga_auth_token');
      if (!token) {
        // Fetch demo admin token for seamless authorization
        const tokenRes = await axios.post('/api/auth/demo-token', { role: 'admin' });
        token = tokenRes.data.token;
        if (token) localStorage.setItem('ga_auth_token', token);
      }

      // Split full name into first and last name
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'Parent';

      const payload = {
        name: fullName.trim(),
        first_name: firstName,
        last_name: lastName,
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        national_id: nationalId.trim() || undefined,
        occupation: occupation.trim() || 'Parent/Guardian',
      };

      const response = await axios.post('/api/admin/parents', payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.success) {
        setSuccessMsg(response.data.message || 'Parent account successfully registered!');
        onSuccess(response.data.parent);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        throw new Error(response.data.error || 'Failed to create parent account.');
      }
    } catch (err: any) {
      console.error('Registration dispatch error:', err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.details ||
        err.message ||
        'An unexpected error occurred while communicating with the server.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="parent-registration-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="parent-registration-modal-container"
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Deep Slate Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Register New Parent Account
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-400/30">
                  Day 5 MVP
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Create guardian credentials for fee statements, SMS notifications, and student linking.
              </p>
            </div>
          </div>
          <button
            id="close-parent-reg-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body & Inputs */}
        <div className="p-6 space-y-4">
          {/* Server Error Alert */}
          {serverError && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start gap-3 text-xs text-rose-200 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Registration Failed</p>
                <p className="text-[11px] mt-0.5">{serverError}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center gap-3 text-xs text-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-300">Parent Registered Successfully</p>
                <p className="text-[11px] mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input 1: Full Name */}
            <div>
              <label
                htmlFor="parent-reg-fullname"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Guardian Full Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="parent-reg-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                  }}
                  placeholder="e.g. Sarah Jenkins"
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-800/90 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 transition-all ${
                    errors.fullName
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.fullName && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.fullName}
                </p>
              )}
            </div>

            {/* Input 2: Email & Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Email */}
              <div>
                <label
                  htmlFor="parent-reg-email"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="parent-reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="s.jenkins@gmail.com"
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-800/90 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 transition-all ${
                      errors.email
                        ? 'border-rose-500 focus:ring-rose-500'
                        : 'border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.email}
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label
                  htmlFor="parent-reg-phone"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Mobile / M-Pesa Phone <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="parent-reg-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                    }}
                    placeholder="+254 712 345678"
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-800/90 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 transition-all ${
                      errors.phone
                        ? 'border-rose-500 focus:ring-rose-500'
                        : 'border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Input 3: Password */}
            <div>
              <label
                htmlFor="parent-reg-password"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Access Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="parent-reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  placeholder="At least 6 characters (e.g. Parent@2026!)"
                  className={`w-full pl-10 pr-10 py-2.5 bg-slate-800/90 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 transition-all ${
                    errors.password
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.password}
                </p>
              )}
            </div>

            {/* Optional Metadata Grid: National ID & Occupation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <label
                  htmlFor="parent-reg-national-id"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  National ID / Passport No.
                </label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="parent-reg-national-id"
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="e.g. ID-99887766"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="parent-reg-occupation"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Occupation / Relationship Role
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="parent-reg-occupation"
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Architect, Guardian"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit & Cancel Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                id="cancel-parent-reg-btn"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                id="submit-parent-reg-btn"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-900/40 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Create Parent Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
