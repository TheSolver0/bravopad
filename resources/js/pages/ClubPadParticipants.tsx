import { Head } from '@inertiajs/react';
import { Users, CheckCircle, XCircle, BarChart3, Download } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

type Registration = {
    id: number;
    nom: string;
    matricule: string;
    sexe: 'M' | 'F';
    direction: string;
    participera: boolean;
    created_at: string;
};

type Stats = {
    total: number;
    participants: number;
    absents: number;
    hommes: number;
    femmes: number;
    par_direction: Record<string, number>;
};

interface Props {
    registrations: Registration[];
    stats: Stats;
}

export default function ClubPadParticipants({ registrations, stats }: Props) {
    function exportCsv() {
        const header = ['Nom', 'Matricule', 'Sexe', 'Direction', 'Participe', 'Inscrit le'];
        const rows = registrations.map((r) => [
            r.nom,
            r.matricule,
            r.sexe === 'M' ? 'Masculin' : 'Féminin',
            r.direction,
            r.participera ? 'Oui' : 'Non',
            r.created_at,
        ]);
        const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'club-pad-inscriptions.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <AppLayout>
            <Head title="Club PAD — Participants" />

            <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-6 h-6 text-[#003d82]" />
                            Club PAD — Olympiades 2026
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Liste des inscriptions — Samedi 20 Juin 2026</p>
                    </div>
                    <button
                        onClick={exportCsv}
                        className="flex items-center gap-2 bg-[#003d82] hover:bg-[#002d62] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
                    >
                        <Download className="w-4 h-4" />
                        Exporter CSV
                    </button>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="Inscrits total" value={stats.total} color="blue" icon={<Users className="w-5 h-5" />} />
                    <StatCard label="Participants" value={stats.participants} color="green" icon={<CheckCircle className="w-5 h-5" />} />
                    <StatCard label="Absents" value={stats.absents} color="red" icon={<XCircle className="w-5 h-5" />} />
                    <StatCard label="Directions" value={Object.keys(stats.par_direction).length} color="yellow" icon={<BarChart3 className="w-5 h-5" />} />
                </div>

                {/* Sexe + direction repartition */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Répartition par sexe</h3>
                        <div className="flex gap-4">
                            <div className="flex-1 bg-blue-50 rounded-xl p-4 text-center">
                                <div className="text-3xl font-bold text-blue-700">{stats.hommes}</div>
                                <div className="text-xs text-blue-500 mt-1">Hommes</div>
                            </div>
                            <div className="flex-1 bg-pink-50 rounded-xl p-4 text-center">
                                <div className="text-3xl font-bold text-pink-600">{stats.femmes}</div>
                                <div className="text-xs text-pink-400 mt-1">Femmes</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Inscrits par direction</h3>
                        <div className="space-y-2 max-h-36 overflow-y-auto">
                            {Object.entries(stats.par_direction).map(([dir, count]) => (
                                <div key={dir} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700 font-medium truncate max-w-[70%]">{dir || '—'}</span>
                                    <span className="bg-[#003d82] text-white text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
                                </div>
                            ))}
                            {Object.keys(stats.par_direction).length === 0 && (
                                <p className="text-gray-400 text-xs">Aucune inscription</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-800">Toutes les inscriptions ({registrations.length})</h3>
                    </div>
                    {registrations.length === 0 ? (
                        <div className="px-6 py-12 text-center text-gray-400 text-sm">Aucune inscription pour l'instant.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                                        <th className="px-6 py-3 text-left font-semibold">Nom</th>
                                        <th className="px-6 py-3 text-left font-semibold">Matricule</th>
                                        <th className="px-6 py-3 text-left font-semibold">Sexe</th>
                                        <th className="px-6 py-3 text-left font-semibold">Direction</th>
                                        <th className="px-6 py-3 text-center font-semibold">Participe</th>
                                        <th className="px-6 py-3 text-left font-semibold">Inscrit le</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {registrations.map((r) => (
                                        <tr key={r.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-3 font-medium text-gray-900">{r.nom}</td>
                                            <td className="px-6 py-3 text-gray-500 font-mono text-xs">{r.matricule}</td>
                                            <td className="px-6 py-3">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${r.sexe === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-600'}`}>
                                                    {r.sexe === 'M' ? 'M' : 'F'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-gray-600">{r.direction || '—'}</td>
                                            <td className="px-6 py-3 text-center">
                                                {r.participera ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-gray-400 text-xs">{r.created_at}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        green: 'bg-green-50 text-green-700 border-green-100',
        red: 'bg-red-50 text-red-600 border-red-100',
        yellow: 'bg-[#f5f8e8] text-[#6b7a0a] border-[#dce89a]',
    };
    return (
        <div className={`rounded-2xl border p-5 ${colors[color]}`}>
            <div className="flex items-center gap-2 mb-2 opacity-70">{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div>
            <div className="text-3xl font-black">{value}</div>
        </div>
    );
}
