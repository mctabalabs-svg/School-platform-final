import {
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  GraduationCap,
  HeartPulse,
  Home,
  Plus,
  UserRoundCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { CourseClass, Student, Teacher } from '../types';

interface DashboardOverviewProps {
  name: string;
  school: string;
  students: Student[];
  teachers: Teacher[];
  classes: CourseClass[];
  onAddStudent: () => void;
  onNavigate: (tab: string) => void;
}

const cardStyles = [
  { icon: Users, color: 'bg-blue-600', valueColor: 'text-blue-700', wave: 'bg-blue-100/80' },
  { icon: GraduationCap, color: 'bg-emerald-500', valueColor: 'text-emerald-700', wave: 'bg-emerald-100/80' },
  { icon: HeartPulse, color: 'bg-violet-600', valueColor: 'text-violet-700', wave: 'bg-violet-100/80' },
  { icon: BookOpen, color: 'bg-orange-500', valueColor: 'text-orange-700', wave: 'bg-orange-100/80' },
  { icon: UserRoundCheck, color: 'bg-teal-500', valueColor: 'text-teal-700', wave: 'bg-teal-100/80' },
];

const quickActions = [
  { label: 'Record attendance', tab: 'attendance', icon: UserRoundCheck, color: 'bg-emerald-600 hover:bg-emerald-700' },
  { label: 'Post fee payment', tab: 'finance', icon: Wallet, color: 'bg-violet-600 hover:bg-violet-700' },
  { label: 'Create report', tab: 'reports', icon: FileText, color: 'bg-orange-500 hover:bg-orange-600' },
];

function CampusIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 760 220"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="campus-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8d7ff" />
          <stop offset="1" stopColor="#f4f8ff" />
        </linearGradient>
        <linearGradient id="campus-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9cc98f" />
          <stop offset="1" stopColor="#5a9b69" />
        </linearGradient>
      </defs>
      <rect width="760" height="220" fill="url(#campus-sky)" />
      <circle cx="650" cy="39" r="20" fill="#fff3c4" opacity=".8" />
      <path d="M0 151 Q150 112 310 150 T760 135 V220 H0Z" fill="#c6dfbd" />
      <path d="M0 176 Q180 143 390 176 T760 158 V220 H0Z" fill="url(#campus-ground)" />
      <path d="M252 95 410 42 580 92Z" fill="#365d87" />
      <path d="M282 91 410 51 550 91Z" fill="#d8785e" />
      <rect x="275" y="91" width="285" height="84" rx="3" fill="#f3eadb" />
      <rect x="295" y="103" width="245" height="13" fill="#d7e4f0" />
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <g key={index}>
          <rect x={301 + index * 39} y="124" width="22" height="20" rx="2" fill="#8bb4d3" />
          <rect x={301 + index * 39} y="151" width="22" height="18" rx="2" fill="#8bb4d3" />
        </g>
      ))}
      <rect x="389" y="143" width="42" height="32" fill="#b87953" />
      <path d="M383 143 410 126 437 143Z" fill="#3c6589" />
      <rect x="402" y="153" width="15" height="22" fill="#d9e7f1" />
      <g fill="#4a8051">
        <circle cx="215" cy="128" r="28" />
        <circle cx="236" cy="137" r="23" />
        <circle cx="604" cy="129" r="31" />
        <circle cx="628" cy="141" r="25" />
        <circle cx="688" cy="144" r="22" />
      </g>
      <g fill="#6b4d37">
        <rect x="211" y="145" width="7" height="29" />
        <rect x="603" y="148" width="8" height="31" />
        <rect x="686" y="157" width="6" height="22" />
      </g>
    </svg>
  );
}

export function DashboardOverview({
  name,
  school,
  students,
  teachers,
  classes,
  onAddStudent,
  onNavigate,
}: DashboardOverviewProps) {
  const averageAttendance = students.length
    ? students.reduce((total, student) => total + student.attendanceRate, 0) / students.length
    : 0;
  const guardianCount = new Set(students.map((student) => student.guardianName.trim()).filter(Boolean)).size;
  const metrics = [
    { label: 'Total students', value: students.length.toLocaleString(), detail: 'Student records', icon: cardStyles[0] },
    { label: 'Teachers', value: teachers.length.toLocaleString(), detail: 'Teaching staff', icon: cardStyles[1] },
    { label: 'Guardian contacts', value: guardianCount.toLocaleString(), detail: 'Linked student records', icon: cardStyles[2] },
    { label: 'Active classes', value: classes.length.toLocaleString(), detail: 'Across this school', icon: cardStyles[3] },
    { label: 'Attendance rate', value: `${averageAttendance.toFixed(0)}%`, detail: 'Average across students', icon: cardStyles[4] },
  ];

  const performanceByGrade = Object.values(
    students.reduce<Record<string, { grade: string; gpaTotal: number; passCount: number; count: number }>>(
      (groups, student) => {
        const group = groups[student.grade] ?? {
          grade: student.grade,
          gpaTotal: 0,
          passCount: 0,
          count: 0,
        };
        group.gpaTotal += student.gpa;
        group.passCount += student.gpa >= 2 ? 1 : 0;
        group.count += 1;
        groups[student.grade] = group;
        return groups;
      },
      {},
    ),
  ).sort((a, b) => a.grade.localeCompare(b.grade, undefined, { numeric: true }));

  const recentStudents = [...students]
    .sort((a, b) => new Date(b.enrolledDate).getTime() - new Date(a.enrolledDate).getTime())
    .slice(0, 4);
  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
  const currentTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date());
  const recentStudentColors = ['bg-emerald-500', 'bg-blue-500', 'bg-rose-400', 'bg-orange-400'];
  const attendanceStyle = {
    background: `conic-gradient(#0bb978 0 ${averageAttendance}%, #e5eaf2 ${averageAttendance}% 100%)`,
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="relative isolate min-h-[108px] overflow-hidden rounded-xl border border-blue-100 bg-[#dceaff] shadow-sm sm:min-h-[116px]">
        <div className="absolute inset-y-0 right-0 w-[76%] sm:w-[65%]">
          <CampusIllustration />
          <div className="absolute inset-0 bg-gradient-to-r from-[#dceaff] via-[#dceaff]/90 to-transparent" />
        </div>
        <div className="relative z-10 flex min-h-[108px] flex-col justify-center px-5 py-3 sm:min-h-[116px] sm:px-7">
          <p className="text-xs font-medium text-slate-600">Welcome back,</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            <span className="text-blue-700">{name.split(' ')[0]}</span>!
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Here&apos;s what&apos;s happening at {school} today.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-blue-700" />
              {currentDate}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 text-blue-700" />
              {currentTime}
            </span>
          </div>
        </div>
      </section>

      <section aria-label="School statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map(({ label, value, detail, icon: style }) => {
          const Icon = style.icon;
          return (
            <article
              key={label}
              className="relative min-h-[94px] overflow-hidden rounded-xl border border-[#e3e9f4] bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-3.5"
            >
              <div className={`absolute -bottom-5 -left-2 h-10 w-[115%] -rotate-2 rounded-[50%] ${style.wave}`} />
              <div className="relative flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${style.color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className={`text-xl font-bold leading-tight tabular-nums ${style.valueColor}`}>{value}</p>
                  <p className="mt-0.5 text-[10px] font-medium leading-tight text-slate-700">{label}</p>
                </div>
              </div>
              <p className="relative mt-2 text-[9px] leading-tight text-slate-500">{detail}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.35fr_0.95fr_0.78fr]">
        <article className="min-w-0 rounded-xl border border-[#e1e7f2] bg-white p-3 shadow-sm sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <div>
                <h2 className="text-[13px] font-bold text-slate-900">Academic performance</h2>
                <p className="mt-0.5 text-[10px] text-slate-500">GPA and pass rate by grade</p>
              </div>
            </div>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600">
              Current roster
            </span>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 text-[10px] text-slate-600">
            <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-blue-600" />Average GPA</span>
            <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-emerald-500" />Pass rate</span>
          </div>

          {performanceByGrade.length ? (
            <div className="mt-2 grid grid-cols-[23px_minmax(0,1fr)] gap-2">
              <div className="flex h-28 flex-col justify-between pb-5 text-right text-[9px] text-slate-500">
                <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
              </div>
              <div
                role="img"
                aria-label="Bar chart comparing average GPA and pass rate for each grade"
                className="grid h-28 items-end gap-2 border-b border-slate-200 bg-[linear-gradient(to_top,#e9edf5_1px,transparent_1px)] bg-[length:100%_25%] px-1 sm:gap-3"
                style={{ gridTemplateColumns: `repeat(${performanceByGrade.length}, minmax(0, 1fr))` }}
              >
                {performanceByGrade.map((group) => {
                  const averageGpa = group.gpaTotal / group.count;
                  const averageGpaPercent = Math.min((averageGpa / 4) * 100, 100);
                  const passRate = (group.passCount / group.count) * 100;
                  return (
                    <div key={group.grade} className="flex h-full min-w-0 items-end justify-center gap-1">
                      <div className="flex h-full w-1/3 max-w-7 items-end">
                        <div
                          className="w-full rounded-t-sm bg-blue-600 transition-[height] duration-300"
                          style={{ height: `${averageGpaPercent}%` }}
                          title={`Average GPA: ${averageGpa.toFixed(2)} / 4`}
                        />
                      </div>
                      <div className="flex h-full w-1/3 max-w-7 items-end">
                        <div
                          className="w-full rounded-t-sm bg-emerald-500 transition-[height] duration-300"
                          style={{ height: `${passRate}%` }}
                          title={`Pass rate: ${passRate.toFixed(0)}%`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <span aria-hidden="true" />
              <div
                className="grid gap-2 px-1 pt-1 text-center text-[9px] font-medium text-slate-600 sm:gap-3"
                style={{ gridTemplateColumns: `repeat(${performanceByGrade.length}, minmax(0, 1fr))` }}
              >
                {performanceByGrade.map((group) => <span key={group.grade} className="truncate">{group.grade}</span>)}
              </div>
            </div>
          ) : (
            <div className="flex h-28 items-center justify-center text-xs text-slate-500">
              Add student records to see academic performance.
            </div>
          )}
        </article>

        <article className="rounded-xl border border-[#e1e7f2] bg-white p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <h2 className="text-[13px] font-bold text-slate-900">Attendance overview</h2>
            </div>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600">Roster</span>
          </div>
          <div className="mt-3 flex items-center justify-center gap-3">
            <div
              role="img"
              aria-label={`Average student attendance is ${averageAttendance.toFixed(1)} percent`}
              className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
              style={attendanceStyle}
            >
              <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-white">
                <span className="text-2xl font-bold tracking-tight text-slate-900">{averageAttendance.toFixed(0)}%</span>
                <span className="text-[10px] text-slate-500">Average</span>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <p className="flex items-start gap-2">
                <i className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                <span><span className="block font-semibold text-slate-800">Attendance</span><span className="text-slate-500">{averageAttendance.toFixed(1)}% average</span></span>
              </p>
              <p className="flex items-start gap-2">
                <i className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300" />
                <span><span className="block font-semibold text-slate-800">Not in attendance</span><span className="text-slate-500">{(100 - averageAttendance).toFixed(1)}% average</span></span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-blue-100 bg-blue-50 py-1.5 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            View attendance <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>

        <article className="rounded-xl border border-[#e1e7f2] bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-2 flex items-center gap-2">
            <BellRing className="h-4 w-4 text-blue-600" />
            <h2 className="text-[13px] font-bold text-slate-900">Quick actions</h2>
          </div>
          <button
            type="button"
            onClick={onAddStudent}
            className="flex w-full items-center gap-2 rounded-lg bg-blue-700 px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            <Plus className="h-4 w-4" /> Add student
          </button>
          <div className="mt-1.5 space-y-1.5">
            {quickActions.map(({ label, tab, icon: Icon, color }) => (
              <button
                key={tab}
                type="button"
                onClick={() => onNavigate(tab)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[10px] font-semibold text-white shadow-sm transition ${color}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
        <article className="rounded-xl border border-[#e1e7f2] bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent enrollments</h2>
            </div>
            <button type="button" onClick={() => onNavigate('students')} className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-900">
              View students <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {recentStudents.length ? (
            <ul className="divide-y divide-slate-100">
              {recentStudents.map((student, index) => (
                <li key={student.id} className="flex items-center gap-3 py-2 first:pt-1">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${recentStudentColors[index % recentStudentColors.length]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{student.firstName} {student.lastName}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{student.grade} · Enrolled {student.enrolledDate}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${student.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {student.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-xs text-slate-500">No student records yet.</p>
          )}
        </article>

        <article className="rounded-xl border border-[#e1e7f2] bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Class overview</h2>
            </div>
            <button type="button" onClick={() => onNavigate('classes')} className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-900">
              View classes <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {classes.length ? (
            <ul className="divide-y divide-slate-100">
              {classes.slice(0, 4).map((course) => {
                const capacity = course.capacity ? Math.min((course.enrolledStudents / course.capacity) * 100, 100) : 0;
                return (
                  <li key={course.id} className="py-2 first:pt-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">{course.title}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{course.code} · {course.grade}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-medium tabular-nums text-slate-600">
                        {course.enrolledStudents}/{course.capacity}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${capacity}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-xs text-slate-500">No classes have been added yet.</p>
          )}
        </article>
      </section>

      <div className="flex items-center justify-between gap-3 px-1 pb-1 text-[10px] text-slate-500">
        <span className="truncate">{school} · School management platform</span>
        <button type="button" onClick={() => onNavigate('finance')} className="inline-flex shrink-0 items-center gap-1 font-medium text-slate-600 hover:text-blue-700">
          <CreditCard className="h-3 w-3" /> Fees & finance
        </button>
      </div>
    </div>
  );
}
