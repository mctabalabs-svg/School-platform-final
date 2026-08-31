import React from 'react';
import { Users, GraduationCap, BookOpen, CalendarCheck, BarChart3, LayoutDashboard, CreditCard } from 'lucide-react';
import { TabType } from '../types';

interface NavigationTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  studentsCount: number;
  teachersCount: number;
  classesCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  studentsCount,
  teachersCount,
  classesCount,
}) => {
  const tabs = [
    {
      id: 'students' as TabType,
      label: 'Students',
      icon: Users,
      badge: `${studentsCount}`,
    },
    {
      id: 'teachers' as TabType,
      label: 'Staff Registry',
      icon: GraduationCap,
      badge: `${teachersCount}`,
    },
    {
      id: 'classes' as TabType,
      label: 'Classes & Courses',
      icon: BookOpen,
      badge: `${classesCount}`,
    },
    {
      id: 'attendance' as TabType,
      label: 'Attendance & Logs',
      icon: CalendarCheck,
      badge: '96.4%',
    },
    {
      id: 'grading' as TabType,
      label: 'Assessment & CBC Grid',
      icon: LayoutDashboard,
      badge: 'CBC / Marks',
    },
    {
      id: 'finance' as TabType,
      label: 'Finance & M-Pesa',
      icon: CreditCard,
      badge: 'Daraja STK',
    },
    {
      id: 'reports' as TabType,
      label: 'Reports',
      icon: BarChart3,
      badge: 'Dossier',
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-8 shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar">
        <div className="flex gap-6 sm:gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`py-3.5 sm:py-4 font-medium text-xs sm:text-sm cursor-pointer whitespace-nowrap transition-colors flex items-center gap-2 relative ${
                  isActive
                    ? 'text-indigo-600 font-bold border-b-2 border-indigo-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
