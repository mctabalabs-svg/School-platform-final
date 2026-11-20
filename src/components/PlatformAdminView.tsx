import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Building2, CircleAlert, LoaderCircle, LogOut, Plus, ShieldCheck } from 'lucide-react';
import { UserSession } from './LoginModal';

type SchoolItem = {
  id: string;
  name: string;
  admin_email: string;
  status: string;
  created_at: string;
};

interface PlatformAdminViewProps {
  session: UserSession;
  onLogout: () => void;
}

export function PlatformAdminView({ session, onLogout }: PlatformAdminViewProps) {
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const loadSchools = useCallback(async () => {
    try {
      const response = await fetch('/api/platform/schools', {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load schools.');
      setSchools(data.schools || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load schools.');
    } finally {
      setIsLoading(false);
    }
  }, [session.token]);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  const handleCreateSchool = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const response = await fetch('/api/platform/schools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ name, adminFirstName, adminLastName, adminEmail, adminPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'School creation failed.');
      setSuccess(data.message);
      setName('');
      setAdminFirstName('');
      setAdminLastName('');
      setAdminEmail('');
      setAdminPassword('');
      await loadSchools();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'School creation failed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold">Platform administration</h1>
              <p className="text-sm text-slate-500">{session.email}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold">Create a school</h2>
          </div>
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex gap-2 font-semibold">
              <CircleAlert className="h-5 w-5 shrink-0" />
              School accounts use isolated workspaces
            </div>
            <p className="mt-2">
              The first school administrator can sign in after provisioning. Their landing page is
              isolated; student, attendance, finance and reporting modules remain unavailable until
              those screens are migrated to school-specific data.
            </p>
          </div>

          {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {success && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}

          <form onSubmit={handleCreateSchool} className="space-y-4">
            <label className="block text-sm font-medium">
              School name
              <input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Admin first name
                <input required value={adminFirstName} onChange={(event) => setAdminFirstName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                Admin last name
                <input required value={adminLastName} onChange={(event) => setAdminLastName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Admin email
              <input required type="email" autoComplete="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">
              Initial password (at least 16 characters)
              <input required minLength={16} maxLength={72} type="password" autoComplete="new-password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <button disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Provision school and first admin
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold">Provisioned schools</h2>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading schools…</p>
          ) : schools.length === 0 ? (
            <p className="text-sm text-slate-500">No schools have been provisioned.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {schools.map((school) => (
                <li key={school.id} className="flex items-start justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold">{school.name}</p>
                    <p className="text-sm text-slate-500">{school.admin_email}</p>
                    <p className="mt-1 font-mono text-xs text-slate-400">{school.id}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    school.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {school.status.replace('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
