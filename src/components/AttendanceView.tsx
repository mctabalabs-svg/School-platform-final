import React, { useState } from 'react';
import { BulkAttendance } from './BulkAttendance';
import { CheckCircle2, LayoutList, CheckSquare, Sparkles } from 'lucide-react';

export const AttendanceView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'marker' | 'overview'>('marker');

  const attendanceLogs = [
    { grade: 'Grade 12 (Seniors)', total: 340, present: 332, rate: '97.6%', status: 'Normal' },
    { grade: 'Grade 11 (Juniors)', total: 365, present: 348, rate: '95.3%', status: 'Normal' },
    { grade: 'Grade 10 (Sophomores)', total: 355, present: 342, rate: '96.3%', status: 'Normal' },
    { grade: 'Grade 9 (Freshmen)', total: 360, present: 347, rate: '96.4%', status: 'Normal' },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-Header Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="tab-teacher-marker-btn"
            onClick={() => setActiveSubTab('marker')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSubTab === 'marker'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Teacher Bulk Attendance Marking</span>
          </button>

          <button
            type="button"
            id="tab-campus-overview-btn"
            onClick={() => setActiveSubTab('overview')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>Campus Grade-Level Metrics</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Live SQLite Transaction Mode Active</span>
        </div>
      </div>

      {activeSubTab === 'marker' ? (
        /* Teacher Bulk Attendance Component */
        <BulkAttendance />
      ) : (
        /* Grade Overview */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-lg font-bold text-slate-800">
                Daily Institutional Attendance Tracking
              </h4>
              <p className="text-xs sm:text-sm text-slate-500">
                Real-time classroom attendance check-in statistics across school grade cohorts.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Campus Total: 96.4% Attendance Today</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {attendanceLogs.map((log) => (
              <div
                key={log.grade}
                className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-indigo-200 transition-all"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {log.grade}
                </span>
                <div className="text-2xl font-bold text-slate-900 font-mono mt-1">{log.rate}</div>
                <div className="text-xs text-slate-600 mt-2 flex justify-between">
                  <span>Present Today:</span>
                  <strong className="text-slate-800">
                    {log.present} / {log.total}
                  </strong>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: log.rate }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
