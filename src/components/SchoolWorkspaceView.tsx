import { Building2, ClipboardList, CreditCard, GraduationCap, LogOut, School, ShieldCheck } from 'lucide-react';
import { UserSession } from './LoginModal';

interface SchoolWorkspaceViewProps {
  session: UserSession;
  onLogout: () => void;
}

const upcomingModules = [
  { label: 'Students & enrollment', icon: GraduationCap },
  { label: 'Classes & faculty', icon: School },
  { label: 'Attendance & reports', icon: ClipboardList },
  { label: 'Fees & payments', icon: CreditCard },
];

export function SchoolWorkspaceView({ session, onLogout }: SchoolWorkspaceViewProps) {
  const schoolName = session.school_name || 'Your school';
  const initials = session.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-slate-900">
      <header className="border-b border-[#e4e9e1] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#204c3a] text-[#f3d28e]">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#20372b]">{schoolName}</p>
              <p className="text-[11px] text-slate-500">School administrator workspace</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <section className="overflow-hidden rounded-3xl bg-[#204c3a] p-6 text-white shadow-sm sm:p-10">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[11px] font-medium text-emerald-50/85">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a7d8a1]" />
                Secure school workspace
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome, {session.name.split(' ')[0]}.
              </h1>
              <p className="mt-3 text-sm leading-6 text-emerald-50/75">
                Your administrator account is connected to {schoolName}. Your school has a separate workspace.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 pr-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e6b86a] text-xs font-bold text-[#173c32]">
                {initials}
              </span>
              <span>
                <span className="block text-xs font-semibold">{session.name}</span>
                <span className="mt-0.5 block max-w-52 truncate text-[11px] text-emerald-50/65">{session.email}</span>
              </span>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-[#e1e7de] bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <ShieldCheck className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-[#25382c]">Your account is ready</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  You can sign in securely, and your school has its own isolated database. The student, class,
                  attendance, finance and reporting screens are not enabled for this workspace yet. They are being
                  adapted to use each school’s data before access is opened.
                </p>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  This keeps Greenfield’s demonstration records from appearing in your school’s workspace.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e1e7de] bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-sm font-semibold text-[#25382c]">School modules</h2>
            <ul className="mt-4 space-y-3">
              {upcomingModules.map(({ label, icon: Icon }) => (
                <li key={label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2.5 text-slate-600">
                    <Icon className="h-4 w-4 text-[#52775d]" />
                    {label}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500">
                    In progress
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
