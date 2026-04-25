import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area,
} from 'recharts';
import { Download, Filter, Users, TrendingUp, Award, Activity } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

interface KPIs {
    total_bravos: number;
    total_points: number;
    active_givers: number;
    active_receivers: number;
    total_users: number;
}

interface UserStat {
    user: { id: number; name: string; avatar: string; department: string } | null;
    bravo_count: number;
    points_given?: number;
    points_received?: number;
}

interface DeptStat {
    department: string;
    bravo_count: number;
    total_points: number;
}

interface ValueStat {
    name: string;
    color: string;
    usage_count: number;
}

interface WeeklyPoint {
    label: string;
    bravos: number;
}

interface HrDashboardProps {
    from: string;
    to: string;
    kpis: KPIs;
    topGivers: UserStat[];
    topReceivers: UserStat[];
    byDepartment: DeptStat[];
    valueDistribution: ValueStat[];
    weeklyTrend: WeeklyPoint[];
}

function Avatar({ user }: { user: NonNullable<UserStat['user']> }) {
    const src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff&size=64`;
    return <img src={src} alt="" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />;
}

export default function HrDashboard({
    from, to, kpis, topGivers, topReceivers, byDepartment, valueDistribution, weeklyTrend,
}: HrDashboardProps) {
    const [fromDate, setFromDate] = useState(from);
    const [toDate, setToDate]     = useState(to);

    const applyFilter = () => {
        router.get('/hr/dashboard', { from: fromDate, to: toDate }, { preserveState: true });
    };

    const exportCsv = () => {
        window.location.href = `/hr/dashboard/export?from=${fromDate}&to=${toDate}`;
    };

    const adoptionRate = kpis.total_users > 0
        ? Math.round((kpis.active_givers / kpis.total_users) * 100)
        : 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">Dashboard RH</h1>
                    <p className="text-sm text-on-surface-variant font-medium">
                        Pilotez la reconnaissance de votre organisation.
                    </p>
                </div>
                <Button variant="primary" onClick={exportCsv} className="gap-2 shrink-0">
                    <Download size={16} />
                    Exporter CSV
                </Button>
            </div>

            {/* Filtres date */}
            <Card className="flex flex-col sm:flex-row items-end gap-4 border-none bg-white/80">
                <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Du</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                        className="w-full border border-surface-container-high rounded-lg px-3 py-2 text-sm font-medium"
                    />
                </div>
                <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Au</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                        className="w-full border border-surface-container-high rounded-lg px-3 py-2 text-sm font-medium"
                    />
                </div>
                <Button variant="outline" onClick={applyFilter} className="gap-2 shrink-0">
                    <Filter size={14} />
                    Filtrer
                </Button>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Bravos envoyés',    value: kpis.total_bravos,    icon: Award,      color: 'text-primary' },
                    { label: 'Points distribués',  value: kpis.total_points,    icon: TrendingUp, color: 'text-green-600' },
                    { label: 'Donneurs actifs',    value: kpis.active_givers,   icon: Users,      color: 'text-orange-500' },
                    { label: "Taux d'adoption",    value: `${adoptionRate}%`,   icon: Activity,   color: 'text-purple-600' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="border-none bg-white/80 space-y-2">
                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${color}`}>
                            <Icon size={14} />
                            {label}
                        </div>
                        <p className="text-3xl font-black tracking-tighter">{value.toLocaleString()}</p>
                    </Card>
                ))}
            </div>

            {/* Évolution hebdomadaire */}
            <Card className="border-none bg-white/80 space-y-6">
                <h3 className="text-lg font-black tracking-tight">Évolution hebdomadaire</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weeklyTrend}>
                            <defs>
                                <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800 }} />
                            <YAxis hide />
                            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px rgb(0 0 0 / 0.1)' }} />
                            <Area type="monotone" dataKey="bravos" stroke="#3b82f6" strokeWidth={3} fill="url(#hrGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* Top Givers + Top Receivers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none bg-white/80 space-y-4">
                    <h3 className="text-lg font-black tracking-tight">Top Donneurs</h3>
                    <div className="space-y-3">
                        {topGivers.slice(0, 5).map((g, i) => g.user && (
                            <div key={g.user.id} className="flex items-center gap-3">
                                <span className="text-xs font-black text-on-surface-variant w-5 text-center">{i + 1}</span>
                                <Avatar user={g.user} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{g.user.name}</p>
                                    <p className="text-xs text-on-surface-variant truncate">{g.user.department}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-black text-sm text-primary">{g.bravo_count} bravos</p>
                                    <p className="text-xs text-on-surface-variant">{(g.points_given ?? 0).toLocaleString()} pts</p>
                                </div>
                            </div>
                        ))}
                        {topGivers.length === 0 && <p className="text-sm text-on-surface-variant">Aucune donnée.</p>}
                    </div>
                </Card>

                <Card className="border-none bg-white/80 space-y-4">
                    <h3 className="text-lg font-black tracking-tight">Top Destinataires</h3>
                    <div className="space-y-3">
                        {topReceivers.slice(0, 5).map((r, i) => r.user && (
                            <div key={r.user.id} className="flex items-center gap-3">
                                <span className="text-xs font-black text-on-surface-variant w-5 text-center">{i + 1}</span>
                                <Avatar user={r.user} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{r.user.name}</p>
                                    <p className="text-xs text-on-surface-variant truncate">{r.user.department}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-black text-sm text-green-600">{(r.points_received ?? 0).toLocaleString()} pts</p>
                                    <p className="text-xs text-on-surface-variant">{r.bravo_count} bravos</p>
                                </div>
                            </div>
                        ))}
                        {topReceivers.length === 0 && <p className="text-sm text-on-surface-variant">Aucune donnée.</p>}
                    </div>
                </Card>
            </div>

            {/* Par département */}
            {byDepartment.length > 0 && (
                <Card className="border-none bg-white/80 space-y-6">
                    <h3 className="text-lg font-black tracking-tight">Activité par département</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={byDepartment} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="department" width={80} tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
                                <Bar dataKey="bravo_count" name="Bravos" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            )}

            {/* Distribution des valeurs */}
            {valueDistribution.length > 0 && (
                <Card className="border-none bg-white/80 space-y-6">
                    <h3 className="text-lg font-black tracking-tight">Distribution des valeurs</h3>
                    <div className="space-y-4">
                        {valueDistribution.map(v => {
                            const max = Math.max(...valueDistribution.map(x => x.usage_count), 1);
                            const pct = Math.round((v.usage_count / max) * 100);
                            return (
                                <div key={v.name} className="space-y-1.5">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold">{v.name}</span>
                                        <span className="font-black text-on-surface-variant">{v.usage_count}</span>
                                    </div>
                                    <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${pct}%`, backgroundColor: v.color }}
                                        />
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
