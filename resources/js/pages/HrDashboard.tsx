import { router } from '@inertiajs/react';
import { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp, Users, Send, Inbox, UserCheck,
  Download, Target, Building2, Lightbulb, Award, Activity, UserPlus, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { Card } from '../components/ui/card';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Kpis {
  total_bravos: number;
  total_points: number;
  active_givers: number;
  active_receivers: number;
  total_users: number;
  active_users: number;
}

interface PersonEntry {
  user: { id: number; name: string; avatar: string; department: string | null } | null;
  bravo_count: number;
  points_given?: number;
  points_received?: number;
}

interface DeptEntry {
  department: string;
  bravo_count: number;
  total_points: number;
}

interface ValueEntry {
  name: string;
  color: string;
  usage_count: number;
}

interface WeekEntry {
  label: string;
  bravos: number;
}

interface HrDashboardProps {
  from: string;
  to: string;
  kpis: Kpis;
  topGivers: PersonEntry[];
  topReceivers: PersonEntry[];
  byDepartment: DeptEntry[];
  valueDistribution: ValueEntry[];
  weeklyTrend: WeekEntry[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PALETTE = ['#3b82f6','#f97316','#8b5cf6','#10b981','#f43f5e','#eab308','#06b6d4','#ec4899'];

const DATE_PRESETS = [
  { label: '7 j',  days: 7  },
  { label: '30 j', days: 30 },
  { label: '90 j', days: 90 },
];

function dateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

// ── Main component ────────────────────────────────────────────────────────────

export default function HrDashboard({
  from, to, kpis, topGivers, topReceivers, byDepartment, valueDistribution, weeklyTrend,
}: HrDashboardProps) {
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo,   setCustomTo]   = useState(to);

  const participationRate = kpis.total_users > 0
    ? Math.round((kpis.active_givers / kpis.total_users) * 100) : 0;
  const coverageRate = kpis.total_users > 0
    ? Math.round((kpis.active_receivers / kpis.total_users) * 100) : 0;
  const avgPoints = kpis.active_receivers > 0
    ? Math.round(kpis.total_points / kpis.active_receivers) : 0;

  const topDept  = byDepartment[0];
  const topValue = valueDistribution[0];
  const insights: string[] = [
    `${participationRate}% des collaborateurs ont donné au moins un Bravo sur la période.`,
    topDept  ? `"${topDept.department}" est le département le plus actif avec ${topDept.bravo_count} bravos reçus.` : '',
    topValue ? `"${topValue.name}" est la valeur la plus célébrée (${topValue.usage_count} fois).` : '',
  ].filter(Boolean);

  function applyRange(f: string, t: string) {
    router.get('/hr/dashboard', { from: f, to: t }, { preserveScroll: true, replace: true });
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Tableau de bord RH</h1>
          <p className="text-xs text-gray-500 mt-0.5">Analyse de la reconnaissance · aide à la décision</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {DATE_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyRange(dateOffset(p.days), todayStr())}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer bg-white"
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg">
            <input
              type="date" value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="text-xs text-gray-700 outline-none bg-transparent cursor-pointer"
            />
            <span className="text-gray-300 text-xs">→</span>
            <input
              type="date" value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="text-xs text-gray-700 outline-none bg-transparent cursor-pointer"
            />
            <button
              onClick={() => applyRange(customFrom, customTo)}
              className="ml-1 px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 transition-colors cursor-pointer"
            >
              OK
            </button>
          </div>
          <a
            href={`/hr/dashboard/export?from=${from}&to=${to}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
          >
            <Download size={13} /> Export CSV
          </a>
        </div>
      </div>

      {/* Insight banner */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl px-4 py-3">
          <div className="flex items-start gap-2">
            <Lightbulb size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Insights clés</p>
              {insights.map((ins, i) => <p key={i} className="text-xs text-gray-700">{ins}</p>)}
            </div>
          </div>
        </div>
      )}

      {/* KPI strip — row 1: activité */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Bravos envoyés"
          value={kpis.total_bravos}
          icon={Send}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          sub="sur la période"
        />
        <KpiCard
          label="Points distribués"
          value={kpis.total_points.toLocaleString()}
          icon={TrendingUp}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          sub="cumulé équipe"
        />
        <KpiCard
          label="Givers actifs"
          value={`${kpis.active_givers} / ${kpis.total_users}`}
          icon={Users}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          sub={`${participationRate}% participation`}
        />
        <KpiCard
          label="Personnes honorées"
          value={`${kpis.active_receivers} / ${kpis.total_users}`}
          icon={Inbox}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          sub={`${coverageRate}% couverture`}
        />
        <KpiCard
          label="Moy. pts reçus"
          value={avgPoints.toLocaleString()}
          icon={UserCheck}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          sub="par personne honorée"
        />
      </div>

      {/* KPI strip — row 2: snapshot structure */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Personnes inscrites"
          value={kpis.total_users}
          icon={UserPlus}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          sub="collaborateurs enregistrés"
        />
        <KpiCard
          label="Personnes actives"
          value={kpis.active_users}
          icon={Zap}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          sub={`${kpis.total_users > 0 ? Math.round((kpis.active_users / kpis.total_users) * 100) : 0}% ont interagi`}
        />
        <KpiCard
          label="Département le plus actif"
          value={topDept ? topDept.department : '—'}
          icon={Building2}
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
          sub={topDept ? `${topDept.bravo_count} bravos reçus` : 'aucune donnée'}
        />
      </div>

      {/* Row 1 — Weekly trend + Participation dials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <Card className="lg:col-span-2 border border-gray-100 shadow-sm bg-white p-4">
          <ChartHeader
            icon={Activity}
            color="text-blue-600"
            title="Dynamique hebdomadaire"
            sub="La reconnaissance est-elle en hausse ?"
          />
          <div className="h-[190px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label" axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} dy={8}
                />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: 12 }}
                />
                <Area
                  type="monotone" dataKey="bravos" stroke="#3b82f6" strokeWidth={2.5}
                  fill="url(#hrGrad)"
                  dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border border-gray-100 shadow-sm bg-white p-4">
          <ChartHeader
            icon={Users}
            color="text-violet-600"
            title="Participation"
            sub="Qui est dans la boucle ?"
          />
          <div className="space-y-5 mt-4">
            <DialStat
              label="Donneurs actifs"
              rate={participationRate}
              color="#8b5cf6"
              count={kpis.active_givers}
              total={kpis.total_users}
            />
            <DialStat
              label="Personnes honorées"
              rate={coverageRate}
              color="#f97316"
              count={kpis.active_receivers}
              total={kpis.total_users}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-4">Un taux ≥ 70% indique une culture de reconnaissance saine.</p>
        </Card>
      </div>

      {/* Row 2 — Departments + Values */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Card className="border border-gray-100 shadow-sm bg-white p-4">
          <ChartHeader
            icon={Building2}
            color="text-indigo-600"
            title="Par département"
            sub="Où la culture est-elle la plus vivante ?"
          />
          {byDepartment.length === 0 ? <Empty /> : (
            <div className="h-[200px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDepartment} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                  <YAxis
                    type="category" dataKey="department" axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} width={88}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: 12 }}
                  />
                  <Bar dataKey="bravo_count" name="Bravos" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="border border-gray-100 shadow-sm bg-white p-4">
          <ChartHeader
            icon={Target}
            color="text-violet-600"
            title="Valeurs célébrées"
            sub="Ce que l'équipe honore le plus"
          />
          {valueDistribution.length === 0 ? <Empty /> : (
            <div className="flex items-center gap-4 mt-2">
              <div className="h-[160px] w-[160px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={valueDistribution}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={70}
                      dataKey="usage_count"
                      paddingAngle={3}
                      animationDuration={1500}
                    >
                      {valueDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color || PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', padding: '8px 12px', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                {valueDistribution.map((v, i) => {
                  const total = valueDistribution.reduce((s, x) => s + x.usage_count, 0);
                  const pct   = total > 0 ? Math.round((v.usage_count / total) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: v.color || PALETTE[i % PALETTE.length] }} />
                      <span className="text-xs text-gray-700 truncate flex-1">{v.name}</span>
                      <span className="text-xs font-bold text-gray-500 shrink-0">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Row 3 — Top Givers + Top Receivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PersonList
          title="Ambassadeurs de la reconnaissance"
          sub="Bravos envoyés · classement"
          icon={Send}
          iconColor="text-blue-500"
          barColor="#3b82f6"
          entries={topGivers}
          getValue={e => e.bravo_count}
          getLabel={() => 'bravos'}
        />
        <PersonList
          title="Talents les plus reconnus"
          sub="Points reçus · classement"
          icon={Award}
          iconColor="text-orange-500"
          barColor="#f97316"
          entries={topReceivers}
          getValue={e => e.points_received ?? e.bravo_count}
          getLabel={e => e.points_received !== undefined ? 'pts' : 'bravos'}
        />
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
  sub?: string;
}

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, sub }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 min-w-0">
      <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">{label}</p>
        <span className="text-xl font-black text-gray-800 leading-tight truncate block">{value}</span>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

interface ChartHeaderProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  title: string;
  sub: string;
}

function ChartHeader({ icon: Icon, color, title, sub }: ChartHeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon size={15} className={color} />
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <p className="text-[10px] text-gray-400 mt-0.5 ml-5">{sub}</p>
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-gray-400 py-8 text-center">Aucune donnée disponible.</p>;
}

interface DialStatProps {
  label: string;
  rate: number;
  color: string;
  count: number;
  total: number;
}

function DialStat({ label, rate, color, count, total }: DialStatProps) {
  const r    = 28;
  const circ = 2 * Math.PI * r;
  const dash = (rate / 100) * circ;

  return (
    <div className="flex items-center gap-3">
      <svg width="68" height="68" viewBox="0 0 68 68" className="shrink-0">
        <circle cx="34" cy="34" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <motion.circle
          cx="34" cy="34" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${circ}`}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.4, ease: 'circOut' }}
          strokeLinecap="round"
          transform="rotate(-90 34 34)"
        />
        <text x="34" y="38" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1e293b">
          {rate}%
        </text>
      </svg>
      <div>
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        <p className="text-[10px] text-gray-400">{count} sur {total} collaborateurs</p>
      </div>
    </div>
  );
}

interface PersonListProps {
  title: string;
  sub: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  barColor: string;
  entries: PersonEntry[];
  getValue: (e: PersonEntry) => number;
  getLabel: (e: PersonEntry) => string;
}

function PersonList({ title, sub, icon: Icon, iconColor, barColor, entries, getValue, getLabel }: PersonListProps) {
  const valid  = entries.filter(e => e.user !== null);
  const maxVal = valid.length > 0 ? Math.max(...valid.map(getValue)) : 1;
  const medals = ['text-amber-500', 'text-gray-400', 'text-orange-400'];

  return (
    <Card className="border border-gray-100 shadow-sm bg-white p-4">
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Icon size={15} className={iconColor} />
          <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5 ml-5">{sub}</p>
      </div>
      {valid.length === 0 ? <Empty /> : (
        <div className="space-y-1">
          {valid.slice(0, 7).map((entry, i) => {
            const val = getValue(entry);
            const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
            const u   = entry.user!;
            return (
              <div key={u.id} className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                <span className={`text-[10px] font-black w-4 text-center shrink-0 ${medals[i] ?? 'text-gray-300'}`}>
                  {i + 1}
                </span>
                <img
                  src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=e5e7eb&color=6b7280&size=64`}
                  alt=""
                  className="w-7 h-7 rounded-lg object-cover border border-gray-100 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-gray-800 truncate block">{u.name}</span>
                      {u.department && (
                        <span className="text-[9px] text-gray-400">{u.department}</span>
                      )}
                    </div>
                    <span className="text-xs font-black shrink-0" style={{ color: barColor }}>
                      {val} <span className="text-[9px] font-medium text-gray-400">{getLabel(entry)}</span>
                    </span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: 'circOut', delay: i * 0.08 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: barColor }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
