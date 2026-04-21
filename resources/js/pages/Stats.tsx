import { motion } from 'motion/react';
import { router } from '@inertiajs/react';
import {
  TrendingUp,
  Activity,
  Award,
  Zap,
  Users2,
  Clock,
  Trophy
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Card } from '../components/ui/card';
import { Button } from '@/components/ui/button';
import { User, WeeklyData, ValueStat, BadgeStat } from './types';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  Zap, Users2, Clock, Award, Trophy, TrendingUp, Activity,
};

interface StatsProps {
  users: User[];
  sentCount: number;
  receivedCount: number;
  totalPoints: number;
  weeklyData: WeeklyData[];
  valueStats: ValueStat[];
  badgeStats: BadgeStat[];
}

export default function Stats({ users, sentCount, receivedCount, totalPoints, weeklyData, valueStats, badgeStats }: StatsProps) {
  const topUsers = [...users].sort((a, b) => b.points_total - a.points_total).slice(0, 3);
  const maxFlow  = Math.max(sentCount, receivedCount, 1);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Statistiques</h1>
          <p className="text-sm text-on-surface-variant font-medium">Visualisez l'impact de l'équipe.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="space-y-4 border-none bg-white/80 backdrop-blur-md relative overflow-hidden group">
          <div className="relative z-10 space-y-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Total points distribués</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tighter">{totalPoints.toLocaleString()}</span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed">Cumulé par tous les membres de l'équipe.</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <TrendingUp size={120} />
          </div>
        </Card>

        <Card className="space-y-4 border-none bg-white/80 backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Bravos envoyés</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tighter">{sentCount}</span>
          </div>
          <div className="space-y-3">
            <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">Par vous</p>
            <div className="h-2.5 bg-surface-container-low rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full shadow-lg" style={{ width: `${Math.min(100, (sentCount / maxFlow) * 100)}%` }} />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 border-none bg-white/80 backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Taux d'engagement</span>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-black tracking-tighter">{users.length > 0 ? Math.round(((sentCount + receivedCount) / Math.max(users.length, 1)) * 10) : 0}x</span>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl shadow-sm">
              <Activity size={24} />
            </div>
          </div>
          <div className="h-2.5 bg-surface-container-low rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 w-[75%] rounded-full shadow-lg" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Évolution hebdomadaire */}
        <Card className="lg:col-span-2 space-y-8 border-none bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black tracking-tight">Évolution de l'engagement</h3>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              <div className="w-3 h-3 rounded-full bg-primary shadow-sm" />
              Bravos / semaine
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorBravos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 800, fill: '#64748b' }} dy={10} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                  itemStyle={{ fontWeight: 800, color: '#3b82f6' }}
                />
                <Area type="monotone" dataKey="bravos" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorBravos)" animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Flux Bravos */}
        <Card className="bg-primary/5 border-none flex flex-col justify-between p-10 relative overflow-hidden group">
          <div className="space-y-10 relative z-10">
            <h3 className="text-2xl font-black tracking-tight">Bravos : Flux</h3>
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                  <span className="text-primary">Envoyés</span>
                  <span className="text-on-surface text-lg">{sentCount}</span>
                </div>
                <div className="h-4 bg-white rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (sentCount / maxFlow) * 100)}%` }}
                    transition={{ duration: 2, ease: 'circOut' }}
                    className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full shadow-lg"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                  <span className="text-orange-600">Reçus</span>
                  <span className="text-on-surface text-lg">{receivedCount}</span>
                </div>
                <div className="h-4 bg-white rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (receivedCount / maxFlow) * 100)}%` }}
                    transition={{ duration: 2, ease: 'circOut', delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full shadow-lg"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -top-10 opacity-5 group-hover:rotate-12 transition-transform duration-700">
            <Award size={240} />
          </div>
        </Card>
      </div>

      {/* Répartition par badges */}
      {badgeStats.length > 0 && (
        <Card className="space-y-6 border-none bg-white/80 backdrop-blur-md">
          <h3 className="text-xl font-black tracking-tight">Répartition par Badge</h3>
          <div className="grid grid-cols-3 gap-4">
            {badgeStats.map(badge => {
              const total = badgeStats.reduce((s, b) => s + b.count, 0);
              const pct   = total > 0 ? Math.round((badge.count / total) * 100) : 0;
              return (
                <div key={badge.key} className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-surface-container-low">
                  <span className="text-3xl">{badge.emoji}</span>
                  <div className="text-center">
                    <p className="font-black text-sm">{badge.label}</p>
                    <p className="text-2xl font-black" style={{ color: badge.color }}>{badge.count}</p>
                    <p className="text-[10px] text-on-surface-variant font-medium">{pct}% des bravos</p>
                  </div>
                  <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.2, ease: 'circOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: badge.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Répartition par valeurs */}
        <Card className="space-y-8 border-none bg-white/80 backdrop-blur-md">
          <h3 className="text-xl font-black tracking-tight">Répartition par Valeurs</h3>
          {valueStats.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Aucune donnée disponible.</p>
          ) : (
            <div className="space-y-8">
              {valueStats.map((item) => {
                const IconComp = ICON_MAP[item.icon] ?? Award;
                const total   = valueStats.reduce((s, v) => s + v.value, 0);
                const pct     = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={item.name} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-surface-container-low">
                          <IconComp size={18} style={{ color: item.color }} />
                        </div>
                        <span className="text-sm font-black">{item.name}</span>
                      </div>
                      <span className="text-sm font-black text-on-surface-variant">{pct}%</span>
                    </div>
                    <div className="h-2.5 bg-surface-container-low rounded-full overflow-hidden shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.5, ease: 'circOut' }}
                        className="h-full rounded-full shadow-lg"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Champions */}
        <Card className="lg:col-span-2 bg-primary text-white p-0 overflow-hidden relative border-none shadow-2xl shadow-primary/30 group">
          <div className="p-10 space-y-8 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-black tracking-tight">Champions de la semaine</h3>
                <p className="text-white/70 text-sm font-medium mt-1">Les contributeurs les plus actifs.</p>
              </div>
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                <Trophy size={32} className="text-secondary" />
              </div>
            </div>

            {topUsers.length === 0 ? (
              <p className="text-white/60 text-sm">Aucun utilisateur enregistré.</p>
            ) : (
              <div className="space-y-4">
                {topUsers.map((user, i) => (
                  <div key={user.id} className="flex items-center justify-between p-5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/5 hover:bg-white/20 transition-all cursor-pointer group/item">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={user.avatar} alt="" className="w-14 h-14 rounded-full border-2 border-white/20 shadow-lg" referrerPolicy="no-referrer" />
                        <div className={`absolute -right-1 -bottom-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-700' : 'bg-orange-300 text-orange-900'}`}>
                          {i + 1}
                        </div>
                      </div>
                      <div>
                        <p className="text-lg font-black">{user.name}</p>
                        <p className="text-xs font-bold text-white/60 uppercase tracking-widest">{user.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-secondary tracking-tighter">{user.points_total.toLocaleString()}</span>
                      <span className="text-[10px] font-black opacity-60 uppercase tracking-widest ml-1">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button variant="ghost" className="w-full text-white hover:bg-white/10 border-white/10 border py-2.5 text-xs font-bold tracking-wide" onClick={() => router.visit('/team')}>
              VOIR TOUTE L'ÉQUIPE
            </Button>
          </div>
          <div className="absolute right-[-40px] top-[-40px] opacity-10 group-hover:scale-110 transition-transform duration-1000">
            <Trophy size={300} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-container pointer-events-none" />
        </Card>
      </div>
    </div>
  );
}
