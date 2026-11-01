import React, { useState } from 'react';
import { BookOpen, Check, Copy, GraduationCap, Users, UserRoundCheck } from 'lucide-react';

interface InfoGridProps {
  metrics: {
    students: number;
    classes: number;
    teachers: number;
    attendance: number;
  };
}

export const InfoGrid: React.FC<InfoGridProps> = ({ metrics }) => {
  const items = [
    { label: 'Students on roster', value: metrics.students.toLocaleString(), detail: 'Enrolled records', icon: GraduationCap, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Active classes', value: metrics.classes.toLocaleString(), detail: 'Across this school', icon: BookOpen, tone: 'text-blue-700 bg-blue-50' },
    { label: 'Teaching staff', value: metrics.teachers.toLocaleString(), detail: 'Faculty directory', icon: Users, tone: 'text-orange-700 bg-orange-50' },
    { label: 'Average attendance', value: `${metrics.attendance.toFixed(1)}%`, detail: 'Across the roster', icon: UserRoundCheck, tone: 'text-teal-700 bg-teal-50' },
  ];

  return (
    <div id="admin-info-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      {items.map(({ label, value, detail, icon: Icon, tone }) => (
        <section key={label} className="metric-tile flex items-center justify-between gap-4 rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{detail}</p>
          </div>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        </section>
      ))}
    </div>
  );
};
