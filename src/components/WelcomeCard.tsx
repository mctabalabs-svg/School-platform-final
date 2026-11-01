import React from 'react';
import { ArrowUpRight, CalendarDays, Download, Plus } from 'lucide-react';
import { AdminProfile } from '../types';

interface WelcomeCardProps {
  profile: AdminProfile;
  onAddStudentClick?: () => void;
  onExportReportClick?: () => void;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({
  profile,
  onAddStudentClick,
  onExportReportClick,
}) => {
  return (
    <div
      id="welcome-card-container"
      className="welcome-panel rounded-lg p-6 sm:p-8 border border-emerald-900/10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden shrink-0"
    >
      <div className="welcome-mark pointer-events-none absolute right-8 top-1/2 hidden h-48 w-48 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 lg:flex">
        <div className="h-32 w-32 rounded-full border border-white/10" />
      </div>

      <div className="relative z-10 space-y-1 max-w-2xl">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase text-emerald-100/75">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{profile.academicYear} <span className="mx-1 text-emerald-100/40">/</span> {profile.term}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white">
          Good morning, {profile.name.split(' ')[0]}
        </h2>
        <p className="text-emerald-50/75 text-sm sm:text-base">
          {profile.school} <span className="mx-1 text-emerald-100/40">/</span> {profile.campus}
        </p>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3">
          <button
            id="quick-add-student-btn"
            type="button"
            onClick={onAddStudentClick}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#e7a66c] px-3.5 py-2 text-xs font-semibold text-[#203b32] shadow-sm transition-colors hover:bg-[#f0b984] active:bg-[#d99558] sm:text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll Student</span>
          </button>

          <button
            id="quick-export-report-btn"
            type="button"
            onClick={onExportReportClick}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15 sm:text-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-100/70" />
            <span>Export Reports</span>
          </button>
        </div>
      </div>

      {/* System Status Block from Design */}
      <div className="relative z-10 hidden min-w-52 rounded-md border border-white/15 bg-white/10 px-4 py-3 lg:block">
        <div className="text-emerald-100/60 text-[10px] font-semibold uppercase">
          Signed in as
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#e7a66c]"></div>
          <span className="text-sm font-medium text-white">{profile.role}</span>
          <ArrowUpRight className="ml-auto h-4 w-4 text-emerald-100/60" />
        </div>
      </div>
    </div>
  );
};
