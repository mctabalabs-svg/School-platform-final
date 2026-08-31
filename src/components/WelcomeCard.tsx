import React from 'react';
import { Plus, Download, Shield, Sparkles } from 'lucide-react';
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
      className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden shrink-0"
    >
      {/* Decorative skewed accent */}
      <div className="absolute right-0 top-0 h-full w-32 bg-indigo-600 opacity-5 -skew-x-12 translate-x-16 pointer-events-none" />

      <div className="relative z-10 space-y-1 max-w-2xl">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
          Welcome back, {profile.name}
        </h2>
        <p className="text-slate-500 text-base sm:text-lg">
          Managing {profile.school} Central District ({profile.campus})
        </p>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3">
          <button
            id="quick-add-student-btn"
            type="button"
            onClick={onAddStudentClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll Student</span>
          </button>

          <button
            id="quick-export-report-btn"
            type="button"
            onClick={onExportReportClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export Reports</span>
          </button>
        </div>
      </div>

      {/* System Status Block from Design */}
      <div className="relative z-10 hidden lg:block bg-indigo-50 px-6 py-3.5 rounded-2xl border border-indigo-100 shrink-0">
        <div className="text-indigo-600 text-xs font-bold uppercase tracking-widest">
          System Status
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-slate-700 font-semibold text-sm">All modules operational</span>
        </div>
      </div>
    </div>
  );
};
