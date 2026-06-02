import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Users, CheckCircle, XCircle, BarChart3, TrendingUp,
    Download, ChevronLeft, Calendar, MapPin, Clock,
    BookOpen, Plus, Trash2, Globe, X,
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
// ── Types ────────────────────────────────────────────────────────────────────

type Statut = 'brouillon' | 'ouvert' | 'ferme' | 'termine';

type EvenementInfo = {
    id: number; slug: string; nom: string; description: string | null;
    date: string | null; heure_debut: string | null; heure_fin: string | null;
    lieu: string | null; statut: Statut; programme: string[];
    cover_image: string | null;
};

type Stats = {
    total: number; participants: number; absents: number;
    hommes: number; femmes: number;
    par_direction: { direction: string; total: number; participants: number; absents: number }[];
};

type Tendance = {
    date: string; total: number; participants: number; absents: number; cumul: number;
};

type Inscription = {
    id: number; nom: string; matricule: string; sexe: 'M' | 'F';
    direction: string; participera: boolean; created_at: string;
};

type Post = {
    id: number; titre: string; contenu: string;
    image_url: string | null; auteur: string | null; published_at: string | null;
};

interface Props {
    evenement: EvenementInfo;
    stats: Stats;
    tendances: Tendance[];
    inscriptions: Inscription[];
    posts: Post[];
}

// ── Statut config ─────────────────────────────────────────────────────────────

const STATUT_LABELS: Record<Statut, string> = {
    brouillon: 'Brouillon', ouvert: 'Inscriptions ouvertes',
    ferme: 'Inscriptions fermées', termine: 'Terminé',
};
const STATUT_COLORS: Record<Statut, string> = {
    brouillon: 'bg-gray-100 text-gray-600',
    ouvert:    'bg-green-100 text-green-700',
    ferme:     'bg-yellow-100 text-yellow-700',
    termine:   'bg-blue-100 text-blue-700',
};
const STATUTS: Statut[] = ['brouillon', 'ouvert', 'ferme', 'termine'];

// ── Component ─────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'participants' | 'tendances' | 'blog';

export default function AdminEvenementDashboard({ evenement, stats, tendances, inscriptions, posts }: Props) {
    const [tab, setTab] = useState<Tab>('overview');
    const [search, setSearch] = useState('');

    function exportCsv() {
        const header = ['Nom', 'Matricule', 'Sexe', 'Direction', 'Participe', 'Inscrit le'];
        const rows = inscriptions.map(r => [r.nom, r.matricule, r.sexe === 'M' ? 'Masculin' : 'Féminin', r.direction, r.participera ? 'Oui' : 'Non', r.created_at]);
        const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${evenement.slug}-inscriptions.csv`; a.click();
        URL.revokeObjectURL(url);
    }

    const filtered = inscriptions.filter(i =>
        search === '' ||
        i.nom.toLowerCase().includes(search.toLowerCase()) ||
        i.matricule.toLowerCase().includes(search.toLowerCase()) ||
        i.direction.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
            <Head title={`${evenement.nom} — Dashboard`} />

                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <button
                            onClick={() => router.visit('/admin/evenements')}
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2 transition"
                        >
                            <ChevronLeft className="w-4 h-4" /> Tous les événements
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">{evenement.nom}</h1>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-gray-500">
                            {evenement.date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{evenement.date}</span>}
                            {(evenement.heure_debut || evenement.heure_fin) && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {[evenement.heure_debut, evenement.heure_fin].filter(Boolean).join(' — ')}
                                </span>
                            )}
                            {evenement.lieu && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{evenement.lieu}</span>}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <StatutSelector evenement={evenement} />
                        <a
                            href={`/inscrire/${evenement.slug}`} target="_blank" rel="noopener"
                            className="flex items-center gap-2 text-sm font-semibold text-blue-700 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-50 transition"
                        >
                            <Globe className="w-4 h-4" /> Lien public
                        </a>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                    {([
                        ['overview',     'Vue d\'ensemble', BarChart3],
                        ['participants', 'Participants',    Users],
                        ['tendances',    'Tendances',       TrendingUp],
                        ['blog',         'Blog',            BookOpen],
                    ] as [Tab, string, React.ElementType][]).map(([key, label, Icon]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Icon className="w-4 h-4" />{label}
                        </button>
                    ))}
                </div>

                {/* ── Vue d'ensemble ── */}
                {tab === 'overview' && (
                    <div className="space-y-6">
                        {/* KPIs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <KpiCard label="Inscrits" value={stats.total} color="blue" icon={<Users className="w-5 h-5" />} />
                            <KpiCard label="Participants" value={stats.participants} color="green" icon={<CheckCircle className="w-5 h-5" />} />
                            <KpiCard label="Absents" value={stats.absents} color="red" icon={<XCircle className="w-5 h-5" />} />
                            <KpiCard
                                label="Taux participation"
                                value={stats.total > 0 ? Math.round(stats.participants / stats.total * 100) + ' %' : '—'}
                                color="yellow"
                                icon={<TrendingUp className="w-5 h-5" />}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Sexe */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Répartition par sexe</h3>
                                <div className="flex gap-4">
                                    <div className="flex-1 bg-blue-50 rounded-xl p-4 text-center">
                                        <div className="text-3xl font-black text-blue-700">{stats.hommes}</div>
                                        <div className="text-xs text-blue-400 mt-1">Hommes</div>
                                    </div>
                                    <div className="flex-1 bg-pink-50 rounded-xl p-4 text-center">
                                        <div className="text-3xl font-black text-pink-600">{stats.femmes}</div>
                                        <div className="text-xs text-pink-400 mt-1">Femmes</div>
                                    </div>
                                </div>
                            </div>

                            {/* Directions top */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Par direction (top 5)</h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {stats.par_direction.slice(0, 5).map((d) => (
                                        <div key={d.direction} className="flex items-center justify-between text-sm">
                                            <span className="text-gray-700 font-medium truncate max-w-[55%]">{d.direction}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-green-600 font-semibold">{d.participants}✓</span>
                                                <span className="bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded-full">{d.total}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {stats.par_direction.length === 0 && <p className="text-xs text-gray-400">Aucune inscription.</p>}
                                </div>
                            </div>
                        </div>

                        {/* Bar chart directions */}
                        {stats.par_direction.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Inscriptions par direction</h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={stats.par_direction} margin={{ top: 0, right: 10, left: -20, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="direction" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="participants" name="Participants" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="absents" name="Absents" fill="#f87171" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Participants ── */}
                {tab === 'participants' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <input
                                value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Rechercher par nom, matricule, direction…"
                                className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                            <button
                                onClick={exportCsv}
                                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
                            >
                                <Download className="w-4 h-4" /> Exporter CSV
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-3 border-b border-gray-100 text-sm font-semibold text-gray-600">
                                {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
                            </div>
                            {filtered.length === 0 ? (
                                <div className="px-6 py-12 text-center text-gray-400 text-sm">Aucune inscription.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide">
                                                <th className="px-5 py-3 text-left font-semibold">Nom</th>
                                                <th className="px-5 py-3 text-left font-semibold">Matricule</th>
                                                <th className="px-5 py-3 text-left font-semibold">Sexe</th>
                                                <th className="px-5 py-3 text-left font-semibold">Direction</th>
                                                <th className="px-5 py-3 text-center font-semibold">Participe</th>
                                                <th className="px-5 py-3 text-left font-semibold">Inscrit le</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filtered.map(r => (
                                                <tr key={r.id} className="hover:bg-gray-50 transition">
                                                    <td className="px-5 py-3 font-medium text-gray-900">{r.nom}</td>
                                                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{r.matricule}</td>
                                                    <td className="px-5 py-3">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${r.sexe === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-600'}`}>
                                                            {r.sexe}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-gray-600">{r.direction}</td>
                                                    <td className="px-5 py-3 text-center">
                                                        {r.participera
                                                            ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                                            : <XCircle className="w-4 h-4 text-red-400 mx-auto" />}
                                                    </td>
                                                    <td className="px-5 py-3 text-gray-400 text-xs">{r.created_at}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Tendances ── */}
                {tab === 'tendances' && (
                    <div className="space-y-6">
                        {tendances.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-16 text-center text-gray-400 text-sm">
                                Aucune donnée de tendance pour le moment.
                            </div>
                        ) : (
                            <>
                                {/* Inscriptions cumulées */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="font-semibold text-gray-800 mb-1">Inscriptions cumulées dans le temps</h3>
                                    <p className="text-xs text-gray-400 mb-4">Progression totale des inscriptions par jour.</p>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <LineChart data={tendances} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                            <Tooltip />
                                            <Line
                                                type="monotone" dataKey="cumul" name="Total cumulé"
                                                stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Inscriptions par jour */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="font-semibold text-gray-800 mb-1">Inscriptions par jour</h3>
                                    <p className="text-xs text-gray-400 mb-4">Nombre d'inscriptions enregistrées chaque jour.</p>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <BarChart data={tendances} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                            <Tooltip />
                                            <Bar dataKey="total" name="Inscriptions" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Participants vs Absents */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="font-semibold text-gray-800 mb-1">Tendance participation vs absence</h3>
                                    <p className="text-xs text-gray-400 mb-4">Comparaison quotidienne entre ceux qui viennent et ceux qui ne viennent pas.</p>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <LineChart data={tendances} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="participants" name="Participants" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                                            <Line type="monotone" dataKey="absents" name="Absents" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Blog ── */}
                {tab === 'blog' && (
                    <BlogTab evenement={evenement} posts={posts} />
                )}
        </div>
    );
}

// ── Blog Tab ──────────────────────────────────────────────────────────────────

function BlogTab({ evenement, posts }: { evenement: EvenementInfo; posts: Post[] }) {
    const [showForm, setShowForm] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        titre: '', contenu: '', image_url: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(`/admin/evenements/${evenement.id}/posts`, {
            onSuccess: () => { reset(); setShowForm(false); },
        });
    }

    function handleDelete(postId: number) {
        if (!confirm('Supprimer cet article ?')) return;
        router.delete(`/admin/evenements/${evenement.id}/posts/${postId}`);
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Articles de l'événement</h3>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                >
                    <Plus className="w-4 h-4" /> Nouvel article
                </button>
            </div>

            {/* Form modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900">Publier un article</h3>
                            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titre</label>
                                <input value={data.titre} onChange={e => setData('titre', e.target.value)} className={inp2(!!errors.titre)} placeholder="Titre de l'article…" />
                                {errors.titre && <p className="mt-1 text-xs text-red-500">{errors.titre}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contenu</label>
                                <textarea value={data.contenu} onChange={e => setData('contenu', e.target.value)} rows={5} className={inp2(!!errors.contenu)} placeholder="Corps de l'article…" />
                                {errors.contenu && <p className="mt-1 text-xs text-red-500">{errors.contenu}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Image (URL, optionnel)</label>
                                <input value={data.image_url} onChange={e => setData('image_url', e.target.value)} className={inp2(false)} placeholder="https://…" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">Annuler</button>
                                <button type="submit" disabled={processing} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition disabled:opacity-60">
                                    {processing ? 'Publication…' : 'Publier'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Liste posts */}
            {posts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-16 text-center text-gray-400 text-sm">
                    Aucun article pour cet événement.
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.map(p => (
                        <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            {p.image_url && (
                                <img src={p.image_url} alt={p.titre} className="w-full h-40 object-cover" />
                            )}
                            <div className="px-6 py-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-base">{p.titre}</h4>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {p.auteur && <>{p.auteur} · </>}{p.published_at}
                                        </p>
                                    </div>
                                    <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="mt-3 text-sm text-gray-600 whitespace-pre-line leading-relaxed">{p.contenu}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Statut Selector ───────────────────────────────────────────────────────────

function StatutSelector({ evenement }: { evenement: EvenementInfo }) {
    function change(statut: Statut) {
        router.patch(`/admin/evenements/${evenement.id}/statut`, { statut });
    }
    return (
        <select
            value={evenement.statut}
            onChange={e => change(e.target.value as Statut)}
            className={`text-sm font-semibold px-3 py-2 rounded-xl border-2 focus:outline-none transition ${STATUT_COLORS[evenement.statut]} border-transparent`}
        >
            {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
        </select>
    );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: React.ReactNode }) {
    const palettes: Record<string, string> = {
        blue:   'bg-blue-50 text-blue-700 border-blue-100',
        green:  'bg-green-50 text-green-700 border-green-100',
        red:    'bg-red-50 text-red-600 border-red-100',
        yellow: 'bg-amber-50 text-amber-700 border-amber-100',
    };
    return (
        <div className={`rounded-2xl border p-5 ${palettes[color]}`}>
            <div className="flex items-center gap-2 mb-2 opacity-60">{icon}<span className="text-xs font-bold uppercase tracking-wide">{label}</span></div>
            <div className="text-3xl font-black">{value}</div>
        </div>
    );
}

// ── Input helper ──────────────────────────────────────────────────────────────

function inp2(hasError: boolean) {
    return `w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${hasError ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-gray-200 bg-gray-50 focus:ring-blue-200'}`;
}
