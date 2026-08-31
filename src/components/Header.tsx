import React, { useState } from 'react';
import { School, LogOut, Bell, ShieldCheck, Check } from 'lucide-react';
import { AdminProfile } from '../types';

interface HeaderProps {
  profile: AdminProfile;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ profile, onLogout }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Format date like: "Monday, May 24, 2024"
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <nav
      id="main-header"
      className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-xs shrink-0 sticky top-0 z-30"
    >
      {/* Brand & School Icon */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-xs font-bold text-base">
          <span>G</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-lg sm:text-xl text-slate-800 tracking-tight">
            {profile.school}
          </span>
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
            District Portal
          </span>
        </div>
      </div>

      {/* Right side date, notifications & logout */}
      <div className="flex items-center gap-4 sm:gap-6">
        <span className="hidden md:inline text-sm text-slate-500 font-medium">
          {formattedDate}
        </span>

        {/* Notifications */}
        <div className="relative">
          <button
            id="header-notifications-btn"
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors relative"
            aria-label="Notifications"
            title="System Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white"></span>
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">System Alerts</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-medium px-1.5 py-0.5 rounded">All Operational</span>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="font-semibold text-slate-800">Fall Enrollment Active</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">1,420 student records synchronized across Central District.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="font-semibold text-slate-800">Security Audit Verified</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Administrator tier privileges granted.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admin Tag */}
        <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 pl-4">
          <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
            SA
          </div>
          <span className="text-xs font-semibold text-slate-700">{profile.name}</span>
        </div>

        {/* Logout Button */}
        <div className="relative">
          <button
            id="header-logout-button"
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-slate-200 transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Logout</span>
          </button>

          {/* Logout Confirmation Modal */}
          {showLogoutConfirm && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3 mx-auto">
                  <LogOut className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 text-center mb-1">
                  Confirm Logout
                </h3>
                <p className="text-xs text-slate-500 text-center mb-5">
                  Are you sure you want to end your administrative session for {profile.school}?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLogoutConfirm(false);
                      onLogout();
                    }}
                    className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
