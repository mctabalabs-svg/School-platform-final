import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Clock, RefreshCw, KeyRound, UserCheck, Search, Filter, Download } from 'lucide-react';

interface AuditRecord {
  id: string;
  action: string;
  entity: string;
  class_id?: string;
  term_id?: string;
  subject_id?: string;
  date?: string;
  actor: string;
  details: any;
  created_at: string;
}

export function AuditsView() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const [attRes, asmRes] = await Promise.all([
        fetch('/api/attendance/audit-logs'),
        fetch('/api/assessments/audit-logs'),
      ]);

      const attData = await attRes.json();
      const asmData = await asmRes.json();

      const combined = [
        ...(attData.logs || []),
        ...(asmData.logs || []),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setLogs(combined);
    } catch (e) {
      console.error('Error fetching audits:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesAction = filterAction === 'ALL' || log.action.includes(filterAction);
    const matchesSearch =
      searchQuery === '' ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAction && matchesSearch;
  });

  const exportAuditCsv = () => {
    if (logs.length === 0) return;
    const headers = ['Audit ID', 'Timestamp', 'Actor', 'Action', 'Entity', 'Class ID', 'Details'];
    const rows = logs.map((l) => [
      l.id,
      l.created_at,
      `"${l.actor.replace(/"/g, '""')}"`,
      l.action,
      l.entity,
      l.class_id || 'N/A',
      `"${JSON.stringify(l.details).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `greenfield_security_audit_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Immutable System Security & Access Audit Ledger</h2>
          </div>
          <p className="text-xs text-slate-600">
            Append-only cryptographic transaction logs tracking user sign-ins, mark entries, attendance updates, and fee settlements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAuditLogs}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>

          <button
            onClick={exportAuditCsv}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Audit Ledger</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search actor, email, action, details..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-600">Action:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-purple-500"
          >
            <option value="ALL">All Actions ({logs.length})</option>
            <option value="LOGIN">User Logins</option>
            <option value="ASSESSMENT">Assessment Scoring</option>
            <option value="ATTENDANCE">Attendance Upserts</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Action & Entity</th>
                <th className="px-5 py-3.5">Actor / Operator</th>
                <th className="px-5 py-3.5">Target Context</th>
                <th className="px-5 py-3.5">Event Payload Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold">No audit log records match the selected filters.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 block w-fit">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{log.entity}</span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{log.actor}</div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-600">
                      {log.class_id ? `Class: ${log.class_id}` : 'Global'}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="max-w-xs sm:max-w-md truncate font-mono text-[10px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
