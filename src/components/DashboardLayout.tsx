import React, { useState } from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  ShieldAlert,
  ClipboardList,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  Calendar,
  BookOpen,
  LogOut,
  Menu,
  X,
  School,
  Bell,
  ArrowRightLeft,
  Clock,
  Link2,
  UploadCloud,
  ChevronDown,
  Home,
  ShieldCheck,
} from 'lucide-react';
import { UserSession } from './LoginModal';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  category?: string;
}

interface DashboardLayoutProps {
  session: UserSession;
  activeNavId: string;
  onSelectNav: (navId: string) => void;
  onLogout: () => void;
  onOpenLoginModal: () => void;
  children: React.ReactNode;
}

export function DashboardLayout({
  session,
  activeNavId,
  onSelectNav,
  onLogout,
  onOpenLoginModal,
  children,
}: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);

  // 1. Programmatically define navigation links based on user role
  const getNavLinks = (): NavItem[] => {
    switch (session.role) {
      case 'teacher':
        return [
          { id: 'classes', label: 'My classes', icon: School },
          { id: 'attendance', label: 'Attendance', icon: ClipboardList },
          { id: 'grading', label: 'Assessments', icon: CheckCircle2 },
          { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
        ];

      case 'parent':
        return [
          { id: 'parent_dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'students', label: 'My children', icon: GraduationCap },
          { id: 'finance', label: 'Fees & finance', icon: CreditCard },
          { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
          { id: 'attendance', label: 'Attendance', icon: Calendar },
        ];

      case 'student':
        return [
          { id: 'assignments', label: 'Assignments', icon: UploadCloud },
          { id: 'classes', label: 'My classes', icon: Calendar },
          { id: 'grading', label: 'Academic scores', icon: BookOpen },
          { id: 'reports', label: 'My reports', icon: FileSpreadsheet },
          { id: 'attendance', label: 'Attendance', icon: Clock },
        ];

      case 'admin':
      case 'super_admin':
      case 'principal':
      default:
        return [
          { id: 'overview', label: 'Dashboard', icon: Home },
          { id: 'students', label: 'Students', icon: GraduationCap },
          { id: 'teachers', label: 'Teachers', icon: Users },
          { id: 'parents', label: 'Parents', icon: Link2 },
          { id: 'attendance', label: 'Attendance', icon: ClipboardList },
          { id: 'classes', label: 'Academics', icon: School },
          { id: 'grading', label: 'Assessments', icon: CheckCircle2 },
          { id: 'finance', label: 'Fees & finance', icon: CreditCard },
          { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
          { id: 'audits', label: 'Settings', icon: ShieldAlert },
        ];
    }
  };

  const navLinks = getNavLinks();

  const getRoleLabel = () => {
    switch (session.role) {
      case 'admin':
      case 'super_admin':
      case 'principal':
        return 'District Admin';
      case 'teacher':
        return 'Senior Faculty';
      case 'parent':
        return 'Parent Guardian';
      case 'student':
        return 'Enrolled Scholar';
      default:
        return session.role;
    }
  };

  const roleLabel = getRoleLabel();

  return (
    <div className="min-h-screen bg-[#f3f6ff] text-slate-900 flex flex-col lg:flex-row font-sans antialiased">
      <aside
        id="app-sidebar-navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-[#07182f] text-white transition-all duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } ${isSidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-[208px]'}`}
      >
        <div className="relative flex flex-col items-center border-b border-white/10 px-4 py-5 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 text-emerald-300 ring-1 ring-emerald-300/40">
            <ShieldCheck className="h-11 w-11 stroke-[1.3]" />
            <School className="absolute h-5 w-5 text-white" />
          </div>
          <div className={isSidebarCollapsed ? 'lg:hidden' : ''}>
            <div className="mt-2 text-base font-bold leading-tight tracking-tight text-white">
              {session.school_name || 'Greenfield Academy'}
            </div>
            <div className="mt-1 text-[10px] font-medium tracking-wide text-emerald-300">Learn · Excel · Grow</div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
          <div className={`px-2.5 pb-2 pt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>
            {session.role === 'admin' ? 'School workspace' : `${session.role} portal`}
          </div>
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = activeNavId === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-btn-${item.id}`}
                type="button"
                onClick={() => {
                  onSelectNav(item.id);
                  setIsMobileMenuOpen(false);
                }}
                title={isSidebarCollapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-700 text-white shadow-md shadow-blue-950/25'
                    : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className={`truncate ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                {item.badge && !isSidebarCollapsed && (
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-slate-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {import.meta.env.DEV && (
          <div className="mx-2.5 mb-2 rounded-lg border border-white/10 bg-white/[0.04] p-2">
            <button
              type="button"
              onClick={() => setShowDevTools((open) => !open)}
              className="flex w-full items-center gap-2 text-[10px] font-semibold text-slate-300"
              aria-expanded={showDevTools}
              title={isSidebarCollapsed ? 'Development tools' : undefined}
            >
              <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>Dev tools</span>
              <ChevronDown className={`ml-auto h-3 w-3 transition-transform ${showDevTools ? 'rotate-180' : ''} ${isSidebarCollapsed ? 'lg:hidden' : ''}`} />
            </button>
            {showDevTools && !isSidebarCollapsed && (
              <div className="mt-2 grid grid-cols-2 gap-1">
                {['admin', 'teacher', 'parent', 'student'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/auth/demo-token', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ role }),
                        });
                        const data = await response.json();
                        if (!response.ok || !data.success) {
                          throw new Error(data.error || `Unable to switch to ${role}.`);
                        }
                        localStorage.setItem('ga_auth_token', data.token);
                        localStorage.setItem('ga_user_session', JSON.stringify(data.user));
                        window.location.reload();
                      } catch (error) {
                        console.error('Unable to switch demo role:', error);
                      }
                    }}
                    className={`rounded px-2 py-1 text-[9px] font-medium capitalize ${session.role === role ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/15'}`}
                  >
                  {role}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-white/10 bg-black/10 p-3">
          <div className={`mb-3 flex items-center gap-2.5 ${isSidebarCollapsed ? 'lg:justify-center' : ''}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 text-[10px] font-bold text-white ring-2 ring-white/10">
              {session.name
                ? session.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
                : 'GA'}
            </div>
            <div className={`min-w-0 ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-[11px] font-semibold text-white">{session.name}</p>
              <p className="truncate text-[9px] capitalize text-slate-400">{roleLabel}</p>
            </div>
          </div>
          <button
            id="sidebar-signout-button"
            type="button"
            onClick={onLogout}
            title={isSidebarCollapsed ? 'Sign out' : undefined}
            className={`flex w-full items-center gap-2 rounded-lg border border-white/10 px-2.5 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200 ${isSidebarCollapsed ? 'lg:justify-center' : ''}`}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>Sign out</span>
          </button>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setIsSidebarCollapsed((collapsed) => !collapsed);
                } else {
                  setIsMobileMenuOpen(true);
                }
              }}
              className="rounded-lg p-2 text-slate-700 transition hover:bg-slate-100"
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-base">
                {session.school_name || 'Greenfield Academy'}
              </p>
              <p className="hidden text-[10px] text-slate-500 sm:block">School management platform</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <button type="button" aria-label="Notifications" className="relative rounded-lg p-2 text-slate-700 transition hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="flex items-center gap-2 rounded-lg p-1.5 text-left transition hover:bg-slate-100"
              aria-label={`Switch user, signed in as ${session.name}`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                {session.name
                  ? session.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
                  : 'GA'}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block max-w-36 truncate text-[11px] font-semibold text-slate-900">{session.name}</span>
                <span className="block text-[10px] text-slate-500">{roleLabel}</span>
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-slate-500 sm:block" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f3f6ff] p-3 sm:p-4 lg:p-5">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
