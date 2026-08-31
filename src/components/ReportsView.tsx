import React from 'react';
import { Download, FileText, CheckCircle, BarChart2 } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const reports = [
    { title: 'Fall 2025 Midterm Academic Performance', date: 'Oct 14, 2025', size: '2.4 MB', type: 'PDF' },
    { title: 'Comprehensive Faculty Workload & Course Allocations', date: 'Aug 20, 2025', size: '1.1 MB', type: 'XLSX' },
    { title: 'School-Wide Attendance & Truancy Audit', date: 'Nov 01, 2025', size: '890 KB', type: 'PDF' },
    { title: 'Institutional Accreditation & Compliance Dossier', date: 'Jul 15, 2025', size: '4.8 MB', type: 'PDF' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-bold text-slate-800">
            Academic & Administrative Reports
          </h4>
          <p className="text-xs sm:text-sm text-slate-500">
            Generated institutional records, audit trails, and compliance exports.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {reports.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-slate-50/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-semibold text-slate-900 text-sm">{r.title}</h5>
                <p className="text-xs text-slate-500">Generated on {r.date} • {r.size} • {r.type}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const toast = document.createElement('div');
                toast.innerText = `Downloading "${r.title}" (${r.type})`;
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
