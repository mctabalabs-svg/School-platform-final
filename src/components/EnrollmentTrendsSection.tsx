import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

export const EnrollmentTrendsSection: React.FC = () => {
  const [timeRange, setTimeRange] = useState('Last 30 Days');
  const [showAllLogs, setShowAllLogs] = useState(false);

  const bars = [
    { day: 'Mon', height: 'h-[40%]', val: '18 students' },
    { day: 'Tue', height: 'h-[65%]', val: '28 students' },
    { day: 'Wed', height: 'h-[50%]', val: '22 students' },
    { day: 'Thu', height: 'h-[85%]', val: '38 students' },
    { day: 'Fri', height: 'h-[70%]', val: '31 students' },
    { day: 'Sat', height: 'h-[95%]', val: '42 students' },
    { day: 'Sun', height: 'h-[30%]', val: '14 students' },
  ];

  const requests = [
    {
      id: '#44012',
      title: 'Transfer Request',
      time: '2m ago',
      color: 'bg-orange-400',
      desc: 'Grade 11 STEM transfer approval requested',
    },
    {
      id: '#44015',
      title: 'New Teacher Signup',
      time: '14m ago',
      color: 'bg-indigo-500',
      desc: 'Social Studies faculty credential verification',
    },
    {
      id: '#43998',
      title: 'Grade Report Filed',
      time: '1h ago',
      color: 'bg-emerald-400',
      desc: 'Fall term midterm scores uploaded',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Student Enrollment Trends Chart */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-semibold text-slate-800 text-base">Student Enrollment Trends</h3>
            <p className="text-xs text-slate-400 mt-0.5">Weekly registration & transfer volume</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#5d8a6e]"
          >
            <option>Last 30 Days</option>
            <option>This Quarter</option>
            <option>Academic Year</option>
          </select>
        </div>

        {/* Bar Chart Visualization */}
        <div className="h-44 flex items-end gap-3 pt-6 px-2 border-b border-slate-100">
          {bars.map((bar, i) => (
            <div key={bar.day} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
              <div
                className={`w-full ${bar.height} rounded-t-lg transition-all duration-300 group-hover:opacity-90 ${
                  i === 5
                    ? 'bg-[#245441]'
                    : i === 3
                    ? 'bg-[#5d8a6e]'
                    : i === 4
                    ? 'bg-[#79a387]'
                    : i === 1
                    ? 'bg-[#d5e5d8]'
                    : i === 2
                    ? 'bg-[#b8d2bd]'
                    : 'bg-[#e6efe7]'
                }`}
              />
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">
                {bar.day}
              </span>
              {/* Tooltip on hover */}
              <div className="absolute -top-8 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {bar.val}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-between items-center gap-2 mt-4 pt-3 text-xs text-slate-500">
          <span>Average daily registrations: <strong>27 students</strong></span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +14.2% vs last term
          </span>
        </div>
      </div>

      {/* 2. Recent Requests & Activity Panel */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-base">Recent Requests</h3>
          <span className="text-[11px] font-semibold text-[#245441] bg-[#edf5ef] px-2.5 py-1 rounded-full">
            3 Pending
          </span>
        </div>

        <div className="flex flex-col gap-3 my-auto">
          {requests.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3.5 p-3 bg-slate-50/80 hover:bg-slate-100/80 rounded-lg border border-slate-100 transition-colors"
            >
              <div className={`w-1.5 h-9 ${item.color} rounded-full shrink-0`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
                <p className="text-xs text-slate-500">
                  ID: {item.id} • <span className="text-slate-400">{item.time}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAllLogs(!showAllLogs)}
          className="mt-4 w-full py-2.5 text-xs font-semibold text-[#245441] hover:text-[#173d35] bg-[#edf5ef] hover:bg-[#e2eee5] rounded-lg border border-[#dce9df] transition-colors cursor-pointer"
        >
          {showAllLogs ? 'Hide Notifications' : 'View All Notifications'}
        </button>

        {showAllLogs && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1.5 border border-slate-200 animate-in fade-in duration-150">
            <p className="font-semibold text-slate-800">Additional Log Items (4)</p>
            <p>• GA-902 Curriculum update synced</p>
            <p>• Room B-204 capacity adjusted to 30</p>
            <p>• Attendance export downloaded</p>
          </div>
        )}
      </div>
    </div>
  );
};
