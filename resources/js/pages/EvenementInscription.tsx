import { useState, useRef, useEffect } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Calendar, Clock, MapPin, Users, ListChecks, Info, ChevronDown, X, PlayCircle } from 'lucide-react';

type Direction = { id: number; name: string; code: string | null };

type EvenementInfo = {
    id: number;
    slug: string;
    nom: string;
    description: string | null;
    date: string | null;
    heure_debut: string | null;
    heure_fin: string | null;
    lieu: string | null;
    cover_image: string | null;
    programme: string[];
    activites_options: string[];
    video_url: string | null;
};

interface Props {
    evenement: EvenementInfo;
    directions: Direction[];
}

const PAD_BLUE  = '#003d82';
const PAD_GREEN = '#b5cc18';

export default function EvenementInscription({ evenement, directions }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const [submitted, setSubmitted] = useState(!!props.flash?.success);
    const [selectedActivites, setSelectedActivites] = useState<string[]>([]);

    const { data, setData, post, processing, errors, reset } = useForm({
        nom: '',
        matricule: '',
        sexe: '' as 'M' | 'F' | '',
        direction_id: '' as number | '',
        participera: null as boolean | null,
        activites: [] as string[],
    });

    function toggleActivite(option: string) {
        const next = selectedActivites.includes(option)
            ? selectedActivites.filter(a => a !== option)
            : [...selectedActivites, option];
        setSelectedActivites(next);
        setData('activites', next);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(`/inscrire/${evenement.slug}`, {
            onSuccess: () => { setSubmitted(true); reset(); setSelectedActivites([]); },
        });
    }

    function handleReSubmit() { setSubmitted(false); }

    /* ── Confirmation screen ── */
    if (submitted) {
        return (
            <>
                <Head title={`${evenement.nom} — Inscription confirmée`} />
                <div className="min-h-screen flex items-center justify-center p-4"
                    style={{ background: `linear-gradient(135deg, ${PAD_BLUE} 0%, #0057b8 60%, ${PAD_BLUE} 100%)` }}>
                    <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                            style={{ background: PAD_GREEN }}>
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-3" style={{ color: PAD_BLUE }}>Inscription confirmée !</h2>
                        <p className="text-gray-600 mb-2">
                            Votre participation à <strong>{evenement.nom}</strong> a bien été enregistrée.
                        </p>
                        {evenement.date && (
                            <p className="text-gray-500 text-sm mb-6">
                                Rendez-vous le <strong>{evenement.date}</strong>
                                {evenement.heure_debut && <> à {evenement.heure_debut}</>}
                                {evenement.lieu && <> — {evenement.lieu}</>}.
                            </p>
                        )}
                        <button onClick={handleReSubmit} className="text-sm underline" style={{ color: '#0057b8' }}>
                            Inscrire un autre participant
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title={`${evenement.nom} — Inscription`} />
            <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${PAD_BLUE} 0%, #0057b8 60%, ${PAD_BLUE} 100%)` }}>

                {/* ── Hero ── */}
                <div className="relative overflow-hidden">
                    {evenement.cover_image && (
                        <div className="absolute inset-0 opacity-20 bg-cover bg-center"
                            style={{ backgroundImage: `url(${evenement.cover_image})` }} />
                    )}
                    <div className="relative max-w-2xl mx-auto px-6 py-10 text-center text-white">
                        {/* Entête festival */}
                        <div className="inline-block font-extrabold text-xs uppercase tracking-widest px-4 py-1 rounded-full mb-3"
                            style={{ background: PAD_GREEN, color: PAD_BLUE }}>
                            Inscription ouverte
                        </div>
                        <h1 className="text-3xl font-black tracking-tight mb-1 leading-tight uppercase">
                            {evenement.nom}
                        </h1>
                        <p className="text-white/70 text-sm mb-5 font-medium tracking-wide">
                            Appel à participation — Inscription digitale du personnel
                        </p>

                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            {evenement.date && <Chip icon={<Calendar className="w-3.5 h-3.5" />} label={evenement.date} />}
                            {(evenement.heure_debut || evenement.heure_fin) && (
                                <Chip
                                    icon={<Clock className="w-3.5 h-3.5" />}
                                    label={[evenement.heure_debut, evenement.heure_fin].filter(Boolean).join(' — ')}
                                />
                            )}
                            {evenement.lieu && <Chip icon={<MapPin className="w-3.5 h-3.5" />} label={evenement.lieu} />}
                        </div>
                    </div>
                </div>

                {/* ── Section 1 : Texte d'annonce ── */}
                {evenement.description && (
                    <div className="max-w-2xl mx-auto px-6 pb-4">
                        <div className="rounded-2xl p-5 text-white" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <Info className="w-4 h-4 shrink-0" style={{ color: PAD_GREEN }} />
                                <h3 className="font-bold uppercase tracking-wider text-xs" style={{ color: PAD_GREEN }}>
                                    1 — Texte de l'annonce
                                </h3>
                            </div>
                            <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line">{evenement.description}</p>
                        </div>
                    </div>
                )}

                {/* ── Programme ── */}
                {evenement.programme.length > 0 && (
                    <div className="max-w-2xl mx-auto px-6 pb-4">
                        <div className="rounded-2xl p-5 text-white" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <ListChecks className="w-4 h-4" style={{ color: PAD_GREEN }} />
                                <h3 className="font-bold uppercase tracking-wider text-xs" style={{ color: PAD_GREEN }}>
                                    Au programme
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {evenement.programme.map(item => (
                                    <div key={item} className="flex items-center gap-2 text-sm">
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PAD_GREEN }} />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Vidéo de présentation ── */}
                {evenement.video_url && (
                    <div className="max-w-2xl mx-auto px-6 pb-4">
                        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                            <div className="flex items-center gap-2 px-5 pt-4 pb-3">
                                <PlayCircle className="w-4 h-4 shrink-0" style={{ color: PAD_GREEN }} />
                                <h3 className="font-bold uppercase tracking-wider text-xs text-white" style={{ color: PAD_GREEN }}>
                                    Vidéo de présentation
                                </h3>
                            </div>
                            <video
                                src={evenement.video_url}
                                controls
                                preload="metadata"
                                className="w-full"
                                style={{ display: 'block', maxHeight: '360px' }}
                            />
                        </div>
                    </div>
                )}

                {/* ── Formulaire ── */}
                <div className="max-w-2xl mx-auto px-6 py-6">
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                        <div className="px-8 py-5 flex items-center gap-3" style={{ background: PAD_BLUE }}>
                            <Users className="w-5 h-5" style={{ color: PAD_GREEN }} />
                            <h2 className="text-white font-bold text-lg">Formulaire d'inscription</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">

                            {/* Nom */}
                            <Field label="Nom complet" error={errors.nom}>
                                <input type="text" value={data.nom}
                                    onChange={e => setData('nom', e.target.value)}
                                    placeholder="Ex : Jean-Paul MBARGA" className={inputCls(!!errors.nom)} />
                            </Field>

                            {/* Matricule */}
                            <Field label="Matricule" error={errors.matricule}>
                                <input type="text" value={data.matricule}
                                    onChange={e => setData('matricule', e.target.value)}
                                    placeholder="Ex : PAD-2024-001" className={inputCls(!!errors.matricule)} />
                            </Field>

                            {/* Direction */}
                            <Field label="Direction / Entité" error={errors.direction_id}>
                                <DirectionCombobox
                                    directions={directions}
                                    value={data.direction_id}
                                    onChange={id => setData('direction_id', id)}
                                    hasError={!!errors.direction_id}
                                />
                            </Field>

                            {/* Sexe */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Sexe <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-3">
                                    {(['M', 'F'] as const).map(v => (
                                        <ToggleBtn key={v} active={data.sexe === v}
                                            onClick={() => setData('sexe', v)}
                                            label={v === 'M' ? 'Masculin' : 'Féminin'}
                                            color={PAD_BLUE} />
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
                                    <ToggleBtn active={data.participera === true}
                                        onClick={() => setData('participera', true)}
                                        label="Oui, je participe" color={PAD_GREEN} textColor={PAD_BLUE} />
                                    <ToggleBtn active={data.participera === false}
                                        onClick={() => setData('participera', false)}
                                        label="Non, absent(e)" color="#ef4444" />
                                </div>
                                {errors.participera && <p className="mt-1 text-xs text-red-500">{errors.participera}</p>}
                            </div>

                            {/* C — Activités */}
                            {evenement.activites_options.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-gray-800 uppercase tracking-wide"
                                            style={{ color: PAD_BLUE }}>
                                            C — Activités qui vous intéressent
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-3">(Plusieurs choix possibles)</p>
                                    <div className="space-y-2.5">
                                        {evenement.activites_options.map(option => {
                                            const checked = selectedActivites.includes(option);
                                            return (
                                                <label key={option}
                                                    className="flex items-center gap-3 cursor-pointer group">
                                                    <span
                                                        className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-all ${
                                                            checked
                                                                ? 'border-transparent'
                                                                : 'border-gray-300 group-hover:border-gray-400'
                                                        }`}
                                                        style={checked ? { background: PAD_BLUE, borderColor: PAD_BLUE } : {}}
                                                        onClick={() => toggleActivite(option)}
                                                    >
                                                        {checked && (
                                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </span>
                                                    <span
                                                        className={`text-sm font-medium transition-colors ${checked ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-800'}`}
                                                        onClick={() => toggleActivite(option)}
                                                    >
                                                        {option}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <button type="submit" disabled={processing}
                                className="w-full py-4 rounded-xl text-white font-bold text-sm transition active:scale-95 disabled:opacity-60"
                                style={{ background: PAD_BLUE }}>
                                {processing ? 'Enregistrement…' : 'Valider mon inscription'}
                            </button>

                            <p className="text-center text-xs text-gray-400">
                                Un seul enregistrement par matricule et par événement.
                            </p>
                        </form>
                    </div>
                </div>

                <div className="text-center pb-10 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                   <a href="https://onepad.orbitclan.cloud" className="href" target="_blank" rel="noopener noreferrer">
                        onepad.orbitclan.cloud
                    </a> — Reseau social du PAD <br /> powered by LOMIE KENNY.
                </div>
            </div>
        </>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function DirectionCombobox({
    directions,
    value,
    onChange,
    hasError,
}: {
    directions: Direction[];
    value: number | '';
    onChange: (id: number | '') => void;
    hasError: boolean;
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = directions.find(d => d.id === value) ?? null;

    const filtered = query.trim() === ''
        ? directions
        : directions.filter(d => {
            const q = query.toLowerCase();
            return (
                d.name.toLowerCase().includes(q) ||
                (d.code ?? '').toLowerCase().includes(q)
            );
        });

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    function select(d: Direction) {
        onChange(d.id);
        setQuery('');
        setOpen(false);
    }

    function clear(e: React.MouseEvent) {
        e.stopPropagation();
        onChange('');
        setQuery('');
    }

    const baseCls = `w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${
        hasError
            ? 'border-red-400 bg-red-50 focus:ring-red-300'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300 focus:ring-blue-200'
    }`;

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger / input */}
            <div className={`${baseCls} flex items-center gap-2 cursor-pointer`}
                onClick={() => { setOpen(o => !o); }}>
                {open ? (
                    <input
                        autoFocus
                        className="flex-1 bg-transparent outline-none text-sm placeholder-gray-400"
                        placeholder="Rechercher par code ou nom…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onClick={e => e.stopPropagation()}
                    />
                ) : (
                    <span className={`flex-1 truncate ${selected ? 'text-gray-800' : 'text-gray-400'}`}>
                        {selected
                            ? (selected.code ? `${selected.code} — ${selected.name}` : selected.name)
                            : '— Sélectionner votre direction —'}
                    </span>
                )}
                {selected && !open
                    ? <X className="w-4 h-4 text-gray-400 shrink-0 hover:text-gray-600" onClick={clear} />
                    : <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                }
            </div>

            {/* Dropdown */}
            {open && (
                <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-gray-400 text-center">Aucun résultat</li>
                    ) : (
                        filtered.map(d => (
                            <li key={d.id}
                                className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition-colors ${
                                    d.id === value ? 'bg-blue-50 font-semibold text-blue-800' : 'text-gray-700'
                                }`}
                                onMouseDown={e => { e.preventDefault(); select(d); }}>
                                {d.code
                                    ? <><span className="font-mono font-bold text-xs text-blue-700 mr-2">{d.code}</span>{d.name}</>
                                    : d.name}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ background: 'rgba(255,255,255,0.2)' }}>
            {icon}<span>{label}</span>
        </div>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {label} <span className="text-red-500">*</span>
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function ToggleBtn({ active, onClick, label, color, textColor = '#fff' }: {
    active: boolean; onClick: () => void; label: string; color: string; textColor?: string;
}) {
    return (
        <button type="button" onClick={onClick}
            className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition"
            style={active
                ? { borderColor: color, background: color, color: textColor }
                : { borderColor: '#e5e7eb', background: '#f9fafb', color: '#6b7280' }}>
            {label}
        </button>
    );
}

function inputCls(hasError: boolean) {
    return `w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${
        hasError
            ? 'border-red-400 bg-red-50 focus:ring-red-300'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300 focus:ring-blue-200'
    }`;
}
