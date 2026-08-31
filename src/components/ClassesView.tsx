import React from 'react';
import { CourseClass } from '../types';
import { Clock, MapPin, User, Users } from 'lucide-react';

interface ClassesViewProps {
  classes: CourseClass[];
}

export const ClassesView: React.FC<ClassesViewProps> = ({ classes }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-bold text-slate-800">
            Active Classes & Course Schedules
          </h4>
          <p className="text-xs sm:text-sm text-slate-500">
            Current semester courses, assigned lecture halls, and room capacities.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classes.map((c) => {
          const occupancyRate = Math.round((c.enrolledStudents / c.capacity) * 100);
          return (
            <div
              key={c.id}
              className="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    {c.code}
                  </span>
                  <h5 className="font-bold text-slate-900 text-base mt-1.5">{c.title}</h5>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                  {c.grade}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 my-3">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-800">Instructor: {c.instructor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Location: {c.room}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Schedule: {c.schedule}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    <strong>{c.enrolledStudents}</strong> / {c.capacity} Enrolled
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${
                        occupancyRate >= 95 ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${occupancyRate}%` }}
                    />
                  </div>
                  <span className="font-bold text-slate-800">{occupancyRate}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
