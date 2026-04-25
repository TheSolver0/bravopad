import { motion } from 'motion/react';
import { router } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import {
  TrendingUp,
  Activity,
  Award,
  Zap,
  Users,
  Clock,
  Trophy,
  ThumbsUp,
  Star,
  Send,
  Inbox,
  UserCheck,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart3,
  Target,
  Building2,
  ChevronDown,
  Search,
  X,
  Check,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '../components/ui/card';
import { User, WeeklyData, ValueStat, BadgeStat, TopUser, Department } from './types';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>> = {
  Zap, Users, Clock, Award, Trophy, TrendingUp, Activity, Star, Target,
};

const BADGE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; color?: string }>> = {
  good_job: ThumbsUp,
  excellent: Star,
  impressive: Zap,
};

interface StatsProps {
  users: User[];
  sentCount: number;
  receivedCount: number;
  totalPoints: number;
  weeklyData: WeeklyData[];
  valueStats: ValueStat[];
  badgeStats: BadgeStat[];
  topGivers: TopUser[];
  topReceivers: TopUser[];
  departments: Department[];
  filters: { department_id: number | null };
}

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
  delta?: number;
  sub?: string;
}

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, delta, sub }: KpiCardProps) {
  const DeltaIcon = delta == null ? null : delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const deltaColor = delta == null ? '' : delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-gray-400';
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 min-w-0">
      <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">{label}</p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-xl font-black text-gray-800 leading-none">{value}</span>
          {DeltaIcon && delta != null && (
            <span className={`flex items-center gap-0.5 text-[10px] font-bold ${deltaColor}`}>
              <DeltaIcon size={10} />
              {Math.abs(delta)}%
            </span>
          )}
        </div>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

export default function Stats({ users, sentCount, receivedCount, totalPoints, weeklyData, valueStats, badgeStats, topGivers, topReceivers, departments, filters }: StatsProps) {
  const maxFlow          = Math.max(sentCount, receivedCount, 1);
  const engagementRate   = users.length > 0 ? Math.round(((sentCount + receivedCount) / Math.max(users.length, 1)) * 10) : 0;
  const avgPointsPerUser = users.length > 0 ? Math.round(totalPoints / users.length) : 0;
  const totalBadges      = badgeStats.reduce((s, b) => s + b.count, 0);

  function setDepartment(id: number | null) {
    router.get('/stats', id ? { department_id: id } : {}, { preserveScroll: true, replace: true });
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Tableau de bord RH</h1>
          <p className="text-xs text-gray-500 mt-0.5">Vue consolidée · aide à la décision</p>
        </div>

        <div className="flex items-center gap-3">
          <DepartmentFilter
            departments={departments}
            value={filters.department_id}
            onChange={setDepartment}
          />
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            En temps réel
          </div>
        </div>
      </div>

      {/* KPI Strip — 5 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Points distribués"
          value={totalPoints.toLocaleString()}
          icon={TrendingUp}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          sub="Cumulé équipe"
        />
        <KpiCard
          label="Bravos envoyés"
          value={sentCount}
          icon={Send}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          sub="Par vous ce mois"
        />
        <KpiCard
          label="Bravos reçus"
          value={receivedCount}
          icon={Inbox}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          sub="Sur vous ce mois"
        />
        <KpiCard
          label="Taux d'engagement"
          value={`${engagementRate}×`}
          icon={Activity}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          sub="Interactions / membre"
        />
        <KpiCard
          label="Moy. pts / personne"
          value={avgPointsPerUser.toLocaleString()}
          icon={UserCheck}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          sub={`${users.length} membres`}
        />
      </div>

      {/* Row 2 — Chart + Flux */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Engagement chart */}
        <Card className="lg:col-span-2 border border-gray-100 shadow-sm bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-gray-800">Évolution de l'engagement</h3>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Bravos / semaine
            </div>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="colorBravos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,.08)', padding: '8px 12px', fontSize: 12 }}
                  itemStyle={{ fontWeight: 700, color: '#3b82f6' }}
                />
                <Area type="monotone" dataKey="bravos" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBravos)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Flux Bravos */}
        <Card className="border border-gray-100 shadow-sm bg-white p-4 space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-orange-500" />
            <h3 className="text-sm font-bold text-gray-800">Flux de reconnaissance</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Envoyés', count: sentCount,    color: '#3b82f6', bg: 'bg-blue-50',   pct: Math.min(100, (sentCount / maxFlow) * 100) },
              { label: 'Reçus',   count: receivedCount, color: '#f97316', bg: 'bg-orange-50', pct: Math.min(100, (receivedCount / maxFlow) * 100) },
            ].map(item => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-600">{item.label}</span>
                  <span className="text-sm font-black text-gray-800">{item.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 1.5, ease: 'circOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Ratio indicator */}
          <div className="pt-2 border-t border-gray-50">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Ratio envoi / réception</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-gray-800">
                {receivedCount > 0 ? (sentCount / receivedCount).toFixed(1) : '—'}
              </span>
              <span className="text-xs text-gray-400">bravo envoyé par bravo reçu</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 3 — Values + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Répartition par valeurs */}
        <Card className="border border-gray-100 shadow-sm bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-800">Valeurs — Répartition</h3>
          </div>
          {valueStats.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Aucune donnée disponible.</p>
          ) : (
            <div className="space-y-3">
              {valueStats.map((item) => {
                const IconComp = ICON_MAP[item.icon] ?? Award;
                const total   = valueStats.reduce((s, v) => s + v.value, 0);
                const pct     = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${item.color}18` }}>
                          <IconComp size={13} style={{ color: item.color }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">{item.value}</span>
                        <span className="text-[10px] font-semibold text-gray-400 w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.2, ease: 'circOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <TopUserList
          title="Top Givers"
          subtitle="Bravos envoyés"
          icon={Send}
          iconColor="text-blue-500"
          barColor="from-blue-400 to-blue-600"
          users={topGivers}
        />

        <TopUserList
          title="Top Receivers"
          subtitle="Bravos reçus"
          icon={Inbox}
          iconColor="text-orange-500"
          barColor="from-orange-400 to-orange-500"
          users={topReceivers}
        />
      </div>

      {/* Row 4 — Badge distribution (icons, compact) */}
      {badgeStats.length > 0 && (
        <Card className="border border-gray-100 shadow-sm bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-violet-500" />
              <h3 className="text-sm font-bold text-gray-800">Répartition par Badge</h3>
            </div>
            <span className="text-[10px] text-gray-400 font-semibold">{totalBadges} bravos au total</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {badgeStats.map(badge => {
              const pct      = totalBadges > 0 ? Math.round((badge.count / totalBadges) * 100) : 0;
              const BadgeIcon = BADGE_ICONS[badge.key] ?? Award;
              return (
                <div key={badge.key} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${badge.color}18` }}>
                    <BadgeIcon size={20} color={badge.color} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">{badge.label}</span>
                      <span className="text-sm font-black" style={{ color: badge.color }}>{badge.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.2, ease: 'circOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: badge.color }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">{pct}% des bravos</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

    </div>
  );
}

// ── DepartmentFilter ─────────────────────────────────────────────────────────

interface DepartmentFilterProps {
  departments: Department[];
  value: number | null;
  onChange: (id: number | null) => void;
}

function DepartmentFilter({ departments, value, onChange }: DepartmentFilterProps) {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState('');
  const containerRef          = useRef<HTMLDivElement>(null);

  const selected = departments.find(d => d.id === value) ?? null;
  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function select(id: number | null) {
    onChange(id);
    setOpen(false);
    setSearch('');
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
          selected
            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800'
        }`}
      >
        <Building2 size={13} />
        <span className="max-w-[140px] truncate">
          {selected ? selected.name : 'Tous les départements'}
        </span>
        {selected ? (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); select(null); }}
            className="ml-0.5 opacity-80 hover:opacity-100 cursor-pointer"
          >
            <X size={12} />
          </span>
        ) : (
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un département…"
              className="flex-1 text-xs outline-none text-gray-700 placeholder-gray-400 bg-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={11} />
              </button>
            )}
          </div>

          {/* Option "Tous" */}
          <button
            onClick={() => select(null)}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer ${!value ? 'text-blue-600' : 'text-gray-600'}`}
          >
            Tous les départements
            {!value && <Check size={13} className="text-blue-600" />}
          </button>

          {/* Liste filtrée */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">Aucun résultat</p>
            ) : (
              filtered.map(dept => (
                <button
                  key={dept.id}
                  onClick={() => select(dept.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 transition-colors cursor-pointer ${value === dept.id ? 'font-bold text-blue-600' : 'font-medium text-gray-700'}`}
                >
                  <span className="truncate">{dept.name}</span>
                  {value === dept.id && <Check size={13} className="text-blue-600 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TopUserList ───────────────────────────────────────────────────────────────

interface TopUserListProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  barColor: string;
  users: TopUser[];
}

function TopUserList({ title, subtitle, icon: Icon, iconColor, barColor, users }: TopUserListProps) {
  const maxCount = users[0]?.count ?? 1;
  const medalColors = ['text-amber-500', 'text-gray-400', 'text-orange-400'];

  return (
    <Card className="border border-gray-100 shadow-sm bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={16} className={iconColor} />
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        <span className="ml-auto text-[10px] text-gray-400 font-semibold">{subtitle}</span>
      </div>

      {users.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Aucune donnée.</p>
      ) : (
        <div className="space-y-1">
          {users.map((user, i) => {
            const barPct = maxCount > 0 ? (user.count / maxCount) * 100 : 0;
            return (
              <div key={user.id} className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group">
                <span className={`text-[10px] font-black w-4 text-center shrink-0 ${medalColors[i] ?? 'text-gray-300'}`}>
                  {i + 1}
                </span>
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e5e7eb&color=6b7280&size=64`}
                  alt=""
                  className="w-7 h-7 rounded-lg object-cover border border-gray-100 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-gray-800 truncate">{user.name}</span>
                    <span className={`text-xs font-black shrink-0 ${iconColor}`}>{user.count}</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ duration: 1, ease: 'circOut', delay: i * 0.08 }}
                      className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
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
