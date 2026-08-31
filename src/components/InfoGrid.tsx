import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { AdminProfile } from '../types';

interface InfoGridProps {
  profile: AdminProfile;
}

export const InfoGrid: React.FC<InfoGridProps> = ({ profile }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  return (
    <div id="admin-info-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 shrink-0">
      {/* 1. Role Card */}
      <div
        id="role-card"
        className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm relative group hover:border-indigo-200 transition-all flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">
              Role
            </p>
            <button
              type="button"
              onClick={() => handleCopy(profile.role, 'role')}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity p-1"
              title="Copy Role"
            >
              {copiedKey === 'role' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-800 truncate">
            {profile.role}
          </p>
        </div>
        <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full w-full bg-indigo-500"></div>
        </div>
      </div>

      {/* 2. Email Card */}
      <div
        id="email-card"
        className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm relative group hover:border-indigo-200 transition-all flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">
              Email Address
            </p>
            <button
              type="button"
              onClick={() => handleCopy(profile.email, 'email')}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity p-1"
              title="Copy Email"
            >
              {copiedKey === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-800 truncate" title={profile.email}>
            {profile.email}
          </p>
        </div>
        <p className="mt-4 text-xs text-indigo-500 font-medium">
          Primary Contact Verified
        </p>
      </div>

      {/* 3. School Name Card */}
      <div
        id="school-card"
        className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm relative group hover:border-indigo-200 transition-all flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">
              School Name
            </p>
            <button
              type="button"
              onClick={() => handleCopy(profile.school, 'school')}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity p-1"
              title="Copy School Name"
            >
              {copiedKey === 'school' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-800 truncate">
            {profile.school}
          </p>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          District 042-C • {profile.campus}
        </p>
      </div>

      {/* 4. School ID Card */}
      <div
        id="school-id-card"
        className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm relative group hover:border-indigo-200 transition-all flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">
              School ID
            </p>
            <button
              type="button"
              onClick={() => handleCopy(profile.schoolId, 'schoolId')}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity p-1"
              title="Copy School ID"
            >
              {copiedKey === 'schoolId' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-800">
            {profile.schoolId}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
            <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
