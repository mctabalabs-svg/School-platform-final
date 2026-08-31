import React, { useState } from 'react';
import { Teacher } from '../types';
import { Mail, BookOpen, GraduationCap, Search } from 'lucide-react';

interface TeachersViewProps {
  teachers: Teacher[];
}

export const TeachersView: React.FC<TeachersViewProps> = ({ teachers }) => {
  const [search, setSearch] = useState('');

  const filtered = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.department.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-bold text-slate-800">
            Faculty & Academic Instructors
          </h4>
          <p className="text-xs sm:text-sm text-slate-500">
            Greenfield Academy certified teaching staff, departmental assignments, and course loads.
          </p>
        </div>
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search faculty or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((teacher) => (
          <div
            key={teacher.id}
            className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {teacher.name.split(' ')[1]?.[0] || 'T'}
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-sm leading-snug">{teacher.name}</h5>
                  <span className="text-[11px] font-semibold text-indigo-600 block">
                    {teacher.department}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 my-2">
                <p className="font-medium text-slate-800">{teacher.subject}</p>
                <div className="flex items-center gap-1 text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{teacher.email}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">Course Load:</span>
              <span className="font-bold text-slate-800 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs">
                {teacher.classesCount} Classes
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
