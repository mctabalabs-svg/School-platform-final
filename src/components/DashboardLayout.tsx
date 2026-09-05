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
  ChevronRight,
  Menu,
  X,
  School,
  Sparkles,
  Search,
  Bell,
  User,
  Layers,
  ArrowRightLeft,
  Briefcase,
  Clock,
  Link2,
  UploadCloud,
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
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Programmatically define navigation links based on user role
  const getNavLinks = (): NavItem[] => {
    switch (session.role) {
      case 'teacher':
        return [
          { id: 'classes', label: 'My Classes', icon: School, badge: 'Active' },
          { id: 'attendance', label: 'Mark Attendance', icon: ClipboardList },
          { id: 'grading', label: 'Enter Marks / CBC', icon: CheckCircle2, badge: 'Rubric' },
          { id: 'reports', label: 'Academic Reports', icon: FileSpreadsheet },
        ];

      case 'parent':
        return [
          { id: 'parent_dashboard', label: 'Parent Dashboard', icon: LayoutDashboard, badge: 'Overview' },
          { id: 'students', label: 'Linked Children', icon: GraduationCap },
          { id: 'finance', label: 'Fee Statements & M-Pesa', icon: CreditCard, badge: 'Real-Time' },
          { id: 'reports', label: 'Official Report Cards', icon: FileSpreadsheet },
          { id: 'attendance', label: 'Attendance Records', icon: Calendar },
        ];

      case 'student':
        return [
          { id: 'assignments', label: 'Submit Assignments', icon: UploadCloud, badge: 'Tasks' },
          { id: 'classes', label: 'My Timetable & Courses', icon: Calendar },
          { id: 'grading', label: 'Academic Scores & CBC', icon: BookOpen, badge: 'CBC' },
          { id: 'reports', label: 'My Report Card', icon: FileSpreadsheet },
          { id: 'attendance', label: 'Attendance Record', icon: Clock },
        ];

      case 'admin':
      case 'super_admin':
      case 'principal':
      default:
        return [
          { id: 'overview', label: 'District Overview', icon: LayoutDashboard },
          { id: 'parents', label: 'Parent-Student Linking', icon: Link2, badge: 'Day 5' },
          { id: 'classes', label: 'Manage Classes', icon: School, badge: '4 Active' },
          { id: 'students', label: 'Manage Students', icon: GraduationCap, badge: '10 Enrolled' },
          { id: 'teachers', label: 'Faculty Directory', icon: Users },
          { id: 'attendance', label: 'Attendance & Truancy', icon: ClipboardList },
          { id: 'grading', label: 'Assessments & Strands', icon: CheckCircle2 },
          { id: 'finance', label: 'Fee Clearance & M-Pesa', icon: CreditCard, badge: 'Audit' },
          { id: 'reports', label: 'Summative & CBC Dossier', icon: FileSpreadsheet },
          { id: 'audits', label: 'System Audits & Security', icon: ShieldAlert, badge: 'Immutable' },
        ];
    }
  };

  const navLinks = getNavLinks();

  // Role Badge Styling
  const getRoleBadge = () => {
    switch (session.role) {
      case 'admin':
      case 'super_admin':
      case 'principal':
        return {
          label: 'District Admin',
          bg: 'bg-purple-100 text-purple-800 border-purple-200',
          dot: 'bg-purple-500',
        };
      case 'teacher':
        return {
          label: 'Senior Faculty',
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
        };
      case 'parent':
        return {
          label: 'Parent Guardian',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'student':
        return {
          label: 'Enrolled Scholar',
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
        };
      default:
        return {
          label: session.role,
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
          dot: 'bg-slate-500',
        };
    }
  };

  const roleInfo = getRoleBadge();

  // Current Breadcrumb Title
  const currentNav = navLinks.find((n) => n.id === activeNavId) || navLinks[0];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans antialiased">
      {/* ========================================================================= */}
      {/* 1. DYNAMIC APP SIDEBAR (Desktop Fixed & Mobile Drawer)                     */}
      {/* ========================================================================= */}
      <aside
        id="app-sidebar-navigation"
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:static lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-900/50">
              G
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-tight">Greenfield Academy</div>
              <div className="text-[11px] text-slate-400 font-mono">SCH-KEN-2026-001</div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Academic Session Notice */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-300">2025-2026 Academic Year</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold text-[10px]">
            Term 1 (Fall)
          </span>
        </div>

        {/* Role-Specific Navigation Links */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {session.role === 'admin' ? 'Administrative Workspace' : `${session.role} Portal`}
          </div>

          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = activeNavId === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-btn-${item.id}`}
                onClick={() => {
                  onSelectNav(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Role Switcher Trigger (For Instant Day 2 Testing) */}
        <div className="p-3 mx-4 mb-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
              Role Simulator
            </span>
            <button
              onClick={onOpenLoginModal}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Sign In
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">
            Switch authorized roles to test role-filtered links and ownership guards.
          </p>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            {['admin', 'teacher', 'parent', 'student'].map((r) => (
              <button
                key={r}
                onClick={async () => {
                  try {
                    const res = await fetch('/api/auth/demo-token', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ role: r }),
                    });
                    const d = await res.json();
                    if (d.success) {
                      localStorage.setItem('ga_auth_token', d.token);
                      localStorage.setItem('ga_user_session', JSON.stringify(d.user));
                      window.location.reload();
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className={`py-1 px-2 rounded-md font-medium text-center transition-colors capitalize ${
                  session.role === r
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Base User Profile Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs border border-white/20">
                {session.name
                  ? session.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                  : 'GA'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-white truncate max-w-[120px]">{session.name}</div>
                <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{session.email}</div>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 shrink-0 ${roleInfo.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.dot}`} />
              {roleInfo.label}
            </span>
          </div>

          <button
            id="sidebar-signout-button"
            onClick={onLogout}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 text-slate-300 border border-slate-700 hover:border-rose-800/60 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* ========================================================================= */}
      {/* 2. CONTENT SHELL OVERVIEW & HEADER                                        */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar with Breadcrumb Navigation */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 shadow-xs">
          {/* Breadcrumb Path & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500 hidden sm:inline">Greenfield Academy</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
              <span className="font-medium text-slate-600 capitalize">{session.role} Portal</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                {currentNav.label}
              </span>
            </nav>
          </div>

          {/* Quick Actions & Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students, classes, records..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-56 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenLoginModal}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Switch User</span>
              </button>

              <div className="relative">
                <button className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 relative">
                  <Bell className="w-4 h-4" />
                  <span className="w-2 h-2 bg-emerald-500 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Main Content Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
