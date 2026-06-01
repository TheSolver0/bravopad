import { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Users, MapPin, Calendar, Clock } from 'lucide-react';

type Direction = { id: number; name: string; code: string | null };

interface Props {
    directions: Direction[];
}

export default function ClubPadInscription({ directions }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const flash = props.flash;

    const { data, setData, post, processing, errors, reset } = useForm({
        nom: '',
        matricule: '',
        sexe: '' as 'M' | 'F' | '',
        direction_id: '' as number | '',
        participera: '' as boolean | '',
    });

    const [submitted, setSubmitted] = useState(!!flash?.success);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/club-pad/inscription', {
            onSuccess: () => {
                setSubmitted(true);
                reset();
            },
        });
    }

    const programmes = [
        'Atelier de danse',
        'Atelier de yoga',
        'Démonstration culinaire & boisson détox',
        'Présentation des aliments bios',
        'Atelier de chiropractie',
        'Chaises de massage & stands de bien-être',
        'Quiz inter direction',
    ];

    if (submitted) {
        return (
            <>
                <Head title="Club PAD — Olympiades 2026" />
                <div className="min-h-screen bg-gradient-to-br from-[#003d82] via-[#0057b8] to-[#003d82] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-[#b5cc18] flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-white" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-[#003d82] mb-3">Inscription confirmée !</h2>
                        <p className="text-gray-600 mb-2">
                            Votre inscription aux <strong>Olympiades Club PAD 2026</strong> a bien été enregistrée.
                        </p>
                        <p className="text-gray-500 text-sm mb-6">
                            Rendez-vous le <strong>Samedi 20 Juin 2026</strong> de 07h30 à 15h00.
                        </p>
                        <button
                            onClick={() => setSubmitted(false)}
                            className="text-sm text-[#0057b8] underline hover:text-[#003d82]"
                        >
                            Inscrire un autre participant
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Club PAD — Inscription Olympiades 2026" />
            <div className="min-h-screen bg-gradient-to-br from-[#003d82] via-[#0057b8] to-[#003d82]">

                {/* Header */}
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="relative max-w-2xl mx-auto px-6 py-12 text-center text-white">
                        <div className="inline-block bg-[#b5cc18] text-[#003d82] font-extrabold text-xs uppercase tracking-widest px-4 py-1 rounded-full mb-4">
                            Rendez-vous au
                        </div>
                        <h1 className="text-5xl font-black tracking-tight mb-2">CLUB PAD</h1>
                        <div className="inline-block bg-[#b5cc18] text-[#003d82] font-bold text-sm px-4 py-1 rounded-md mb-6">
                            OLYMPIADES 2026
                        </div>

                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                                <Calendar className="w-4 h-4" />
                                <span>Samedi 20 Juin 2026</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                                <Clock className="w-4 h-4" />
                                <span>07h30 — 15h00</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                                <MapPin className="w-4 h-4" />
                                <span>Port Autonome de Douala</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Programme */}
                <div className="max-w-2xl mx-auto px-6 pb-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-white">
                        <h3 className="font-bold text-[#b5cc18] uppercase tracking-wider text-xs mb-3">Au programme</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {programmes.map((p) => (
                                <div key={p} className="flex items-center gap-2 text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#b5cc18] shrink-0" />
                                    {p}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Formulaire */}
                <div className="max-w-2xl mx-auto px-6 py-6">
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                        <div className="bg-[#003d82] px-8 py-5 flex items-center gap-3">
                            <Users className="w-5 h-5 text-[#b5cc18]" />
                            <h2 className="text-white font-bold text-lg">Formulaire d'inscription</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
                            {/* Nom */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Nom complet <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.nom}
                                    onChange={(e) => setData('nom', e.target.value)}
                                    placeholder="Ex: Jean-Paul MBARGA"
                                    className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003d82] transition ${errors.nom ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
                                />
                                {errors.nom && <p className="mt-1 text-xs text-red-500">{errors.nom}</p>}
                            </div>

                            {/* Matricule */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Matricule <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.matricule}
                                    onChange={(e) => setData('matricule', e.target.value)}
                                    placeholder="Ex: PAD-2024-001"
                                    className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003d82] transition ${errors.matricule ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
                                />
                                {errors.matricule && <p className="mt-1 text-xs text-red-500">{errors.matricule}</p>}
                            </div>

                            {/* Direction */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Direction <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.direction_id}
                                    onChange={(e) => setData('direction_id', Number(e.target.value) || '')}
                                    className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003d82] transition ${errors.direction_id ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
                                >
                                    <option value="">-- Sélectionner votre direction --</option>
                                    {directions.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.code ? `${d.code} — ${d.name}` : d.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.direction_id && <p className="mt-1 text-xs text-red-500">{errors.direction_id}</p>}
                            </div>

                            {/* Sexe */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Sexe <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-3">
                                    {(['M', 'F'] as const).map((val) => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setData('sexe', val)}
                                            className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition ${
                                                data.sexe === val
                                                    ? 'border-[#003d82] bg-[#003d82] text-white'
                                                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                                            }`}
                                        >
                                            {val === 'M' ? 'Masculin' : 'Féminin'}
                                        </button>
                                    ))}
                                </div>
                                {errors.sexe && <p className="mt-1 text-xs text-red-500">{errors.sexe}</p>}
                            </div>

                            {/* Participation */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Allez-vous participer à l'événement ? <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setData('participera', true)}
                                        className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition ${
                                            data.participera === true
                                                ? 'border-[#b5cc18] bg-[#b5cc18] text-[#003d82]'
                                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                                        }`}
                                    >
                                        Oui, je participe
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setData('participera', false)}
                                        className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition ${
                                            data.participera === false
                                                ? 'border-red-300 bg-red-50 text-red-600'
                                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                                        }`}
                                    >
                                        Non, absent(e)
                                    </button>
                                </div>
                                {errors.participera && <p className="mt-1 text-xs text-red-500">{errors.participera}</p>}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-4 rounded-xl bg-[#003d82] hover:bg-[#002d62] disabled:opacity-60 text-white font-bold text-sm transition active:scale-95"
                            >
                                {processing ? 'Enregistrement...' : "Valider mon inscription"}
                            </button>

                            <p className="text-center text-xs text-gray-400">
                                Chaque matricule ne peut s'inscrire qu'une seule fois.
                            </p>
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center pb-10 text-white/50 text-xs">
                    www.pad.cm — Port Autonome de Douala
                </div>
            </div>
        </>
    );
}
