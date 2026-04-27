import { FormEvent, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import {
  Award,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Flame,
  Globe,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ── Types ────────────────────────────────────────────────────────────────────

type Department = { id: number; name: string };

type AdminChallenge = {
  id: number;
  name: string;
  description: string;
  cover_image: string | null;
  start_date: string;
  end_date: string;
  points_bonus: number;
  status: 'active' | 'finished';
  for_all: boolean;
  division_id: number | null;
  division_name: string | null;
  bravos_count: number;
  participants_count: number;
  created_by_name: string | null;
  days_left: number;
  created_at: string;
};

interface AdminChallengesProps {
  challenges: AdminChallenge[];
  departments: Department[];
}

type FormData = {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  points_bonus: number;
  for_all: boolean;
  division_id: number | null;
};

const emptyForm: FormData = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  points_bonus: 100,
  for_all: true,
  division_id: null,
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminChallenges({ challenges, departments }: AdminChallengesProps) {
  const [showForm, setShowForm] = useState(false);
  const [editChallenge, setEditChallenge] = useState<AdminChallenge | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmFinishId, setConfirmFinishId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [divisionSearch, setDivisionSearch] = useState('');
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
  const divisionSearchRef = useRef<HTMLInputElement>(null);

  const activeChallenges = challenges.filter((c) => c.status === 'active');
  const finishedChallenges = challenges.filter((c) => c.status === 'finished');

  const openCreate = () => {
    setEditChallenge(null);
    setForm(emptyForm);
    setCoverFile(null);
    setCoverUrl('');
    setCoverPreview(null);
    setDivisionSearch('');
    setShowDivisionDropdown(false);
    setShowForm(true);
  };

  const openEdit = (c: AdminChallenge) => {
    setShowForm(true); // Ensure modal opens when editing

    setEditChallenge(c);
    setForm({
      name: c.name,
      description: c.description ?? '',
      start_date: c.start_date,
      end_date: c.end_date,
      points_bonus: c.points_bonus,
      for_all: c.for_all,
      division_id: c.division_id,
    });
    setCoverFile(null);
    setCoverUrl('');
    setCoverPreview(c.cover_image ?? null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditChallenge(null);
    setForm(emptyForm);
    setCoverFile(null);
    setCoverUrl('');
    setCoverPreview(null);
    setDivisionSearch('');
    setShowDivisionDropdown(false);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
    setCoverUrl('');
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(editChallenge?.cover_image ?? null);
    }
    // Ensure the image change applies correctly
  };

  const removeCover = () => {
    setCoverFile(null);
    setCoverUrl('');
    setCoverPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    type Payload = Record<string, string | number | boolean | File | null | undefined>;
    const payload: Payload = {
      name: form.name,
      description: form.description,
      start_date: form.start_date,
      end_date: form.end_date,
      points_bonus: form.points_bonus,
      for_all: form.for_all,
      division_id: form.for_all ? null : form.division_id,
    };

    if (coverFile) {
      payload.cover_image = coverFile;
    } else if (coverUrl) {
      payload.cover_image = coverUrl;
    }

    const opts = {
      forceFormData: true,
      preserveScroll: true,
      onFinish: () => { setSubmitting(false); closeForm(); },
    };

    if (editChallenge) {
      router.patch(`/admin/challenges/${editChallenge.id}`, payload, opts);
    } else {
      router.post('/admin/challenges', payload, opts);
    }
  };

  const handleDelete = (id: number) => {
    router.delete(`/admin/challenges/${id}`, {
      preserveScroll: true,
      onFinish: () => setConfirmDeleteId(null),
    });
  };

  const handleActivate = (id: number) => {
    router.post(`/admin/challenges/${id}/activate`, {}, { preserveScroll: true });
  };

  const handleFinish = (id: number) => {
    router.post(`/admin/challenges/${id}/finish`, {}, {
      preserveScroll: true,
      onFinish: () => setConfirmFinishId(null),
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Trophy size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Gestion des défis</h1>
            <p className="text-sm text-on-surface-variant font-medium">
              Créez, modifiez et clôturez les défis collectifs de l'équipe.
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} /> Nouveau défi
        </Button>
      </div>

      {/* ── Stats pills ── */}
      <div className="flex flex-wrap gap-3">
        <StatPill label="Total" value={challenges.length} color="text-on-surface" />
        <StatPill label="Actifs" value={activeChallenges.length} color="text-primary" />
        <StatPill label="Terminés" value={finishedChallenges.length} color="text-green-600" />
      </div>

      {/* ── Formulaire création / édition ── */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeForm} />
          <Card className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 bg-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container-high">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {editChallenge ? 'Modifier le défi' : 'Nouveau défi'}
                </p>
                <h2 className="text-2xl font-black mt-1">{editChallenge ? 'Modifier le défi' : 'Créer un défi'}</h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form className="space-y-4 px-6 pb-6 pt-2" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom */}
                <label className="space-y-1 block md:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                    Nom du défi <span className="text-red-500">*</span>
                  </span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex : 10 bravos en une semaine"
                    className="w-full border border-surface-container-high rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                {/* Description */}
                <label className="space-y-1 block md:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                    Description
                  </span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Décrivez l'objectif et les règles du défi…"
                    className="w-full border border-surface-container-high rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </label>

                {/* Image de couverture */}
                <div className="space-y-1 md:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                    <ImageIcon size={11} /> Image de couverture
                  </span>
                  <p className="text-[10px] text-on-surface-variant/80">Ajoutez une URL directe ou téléchargez un fichier pour la couverture.</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverChange}
                  />
                  {coverPreview ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-surface-container-high group">
                      <img src={coverPreview} alt="Aperçu" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white text-xs font-black rounded-lg hover:bg-white/90 transition-colors"
                        >
                          Changer
                        </button>
                        <button
                          type="button"
                          onClick={removeCover}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-surface-container-high rounded-xl flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      <ImageIcon size={24} className="opacity-40" />
                      <span className="text-xs font-medium">Cliquez pour ajouter une image</span>
                      <span className="text-[10px] opacity-60">JPG, PNG, WebP — max 5 Mo</span>
                    </button>
                  )}
                </div>

                {/* URL de l'image de couverture */}
                <label className="space-y-1 block md:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                    Ou URL de l'image
                  </span>
                  <input
                    type="url"
                    value={coverUrl}
                    onChange={(e) => {
                      setCoverUrl(e.target.value);
                      if (e.target.value) {
                        setCoverPreview(e.target.value);
                        setCoverFile(null);
                      } else {
                        setCoverPreview(editChallenge?.cover_image ?? null);
                      }
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="w-full border border-surface-container-high rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                {/* Dates */}
                <label className="space-y-1 block">
                  <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                    <Calendar size={11} /> Début <span className="text-red-500">*</span>
                  </span>
                  <input
                    required
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="w-full border border-surface-container-high rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                    <Calendar size={11} /> Fin <span className="text-red-500">*</span>
                  </span>
                  <input
                    required
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="w-full border border-surface-container-high rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                {/* Points bonus */}
                <label className="space-y-1 block">
                  <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                    <Award size={11} /> Points bonus
                  </span>
                  <div className="flex items-center gap-2 border border-surface-container-high rounded-xl px-3 py-2">
                    <Zap size={16} className="text-secondary shrink-0" />
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={form.points_bonus}
                      onChange={(e) => setForm((f) => ({ ...f, points_bonus: Number(e.target.value) }))}
                      className="flex-1 text-sm font-bold bg-transparent border-none outline-none focus:ring-0"
                    />
                    <span className="text-[10px] font-black text-on-surface-variant uppercase">pts</span>
                  </div>
                </label>

                {/* Audience */}
                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                    <Users size={11} /> Audience
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, for_all: true, division_id: null }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${
                        form.for_all
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-surface-container-high text-on-surface-variant hover:border-primary/30'
                      }`}
                    >
                      <Globe size={14} />
                      Tous les employés
                      {form.for_all && <CheckCircle2 size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, for_all: false }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${
                        !form.for_all
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-surface-container-high text-on-surface-variant hover:border-primary/30'
                      }`}
                    >
                      <Building2 size={14} />
                      Division ciblée
                      {!form.for_all && <CheckCircle2 size={13} />}
                    </button>
                  </div>
                </div>

                {/* Sélecteur de division avec recherche */}
                {!form.for_all && (
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                      <Building2 size={11} /> Division <span className="text-red-500">*</span>
                    </span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDivisionDropdown((v) => !v);
                          setTimeout(() => divisionSearchRef.current?.focus(), 50);
                        }}
                        className={`w-full flex items-center justify-between border rounded-xl px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                          showDivisionDropdown ? 'border-primary/50 ring-2 ring-primary/20' : 'border-surface-container-high'
                        }`}
                      >
                        <span className={form.division_id ? 'text-on-surface' : 'text-on-surface-variant/50'}>
                          {form.division_id
                            ? departments.find((d) => d.id === form.division_id)?.name
                            : '— Choisir une division —'}
                        </span>
                        <ChevronDown size={15} className={`text-on-surface-variant transition-transform ${showDivisionDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showDivisionDropdown && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-surface-container-high rounded-xl shadow-lg overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-container-low">
                            <Search size={14} className="text-on-surface-variant shrink-0" />
                            <input
                              ref={divisionSearchRef}
                              type="text"
                              value={divisionSearch}
                              onChange={(e) => setDivisionSearch(e.target.value)}
                              placeholder="Rechercher une division…"
                              className="flex-1 text-sm font-medium bg-transparent border-none outline-none placeholder:text-on-surface-variant/50"
                            />
                            {divisionSearch && (
                              <button type="button" onClick={() => setDivisionSearch('')} className="text-on-surface-variant hover:text-on-surface">
                                <X size={13} />
                              </button>
                            )}
                          </div>

                          <ul className="max-h-48 overflow-y-auto">
                            {departments
                              .filter((d) => d.name.toLowerCase().includes(divisionSearch.toLowerCase()))
                              .map((d) => (
                                <li key={d.id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setForm((f) => ({ ...f, division_id: d.id }));
                                      setShowDivisionDropdown(false);
                                      setDivisionSearch('');
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-primary/5 transition-colors flex items-center justify-between ${
                                      form.division_id === d.id ? 'text-primary bg-primary/5' : 'text-on-surface'
                                    }`}
                                  >
                                    {d.name}
                                    {form.division_id === d.id && <Check size={14} className="text-primary" />}
                                  </button>
                                </li>
                              ))}
                            {departments.filter((d) => d.name.toLowerCase().includes(divisionSearch.toLowerCase())).length === 0 && (
                              <li className="px-4 py-3 text-sm text-on-surface-variant/60 text-center">Aucun résultat</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    submitting ||
                    !form.name ||
                    !form.start_date ||
                    !form.end_date ||
                    (!form.for_all && !form.division_id)
                  }
                >
                  {submitting ? (
                    <><Loader2 size={15} className="animate-spin" /> {editChallenge ? 'Enregistrement…' : 'Création…'}</>
                  ) : editChallenge ? (
                    <><Check size={15} /> Enregistrer</>
                  ) : (
                    <><Flame size={15} /> Lancer le défi</>
                  )}
                </Button>
                <Button type="button" variant="ghost" onClick={closeForm}>
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── Défis actifs ── */}
      {activeChallenges.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            Actifs ({activeChallenges.length})
          </h2>
          <div className="space-y-3">
            {activeChallenges.map((c) => (
              <ChallengeRow
                key={c.id}
                challenge={c}
                onEdit={() => openEdit(c)}
                onFinish={() => setConfirmFinishId(c.id)}
                confirmFinishId={confirmFinishId}
                onConfirmFinish={() => handleFinish(c.id)}
                onCancelFinish={() => setConfirmFinishId(null)}
                confirmDeleteId={confirmDeleteId}
                onDelete={() => setConfirmDeleteId(c.id)}
                onConfirmDelete={() => handleDelete(c.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Défis terminés ── */}
      {finishedChallenges.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
            Terminés ({finishedChallenges.length})
          </h2>
          <div className="space-y-3">
            {finishedChallenges.map((c) => (
              <ChallengeRow
                key={c.id}
                challenge={c}
                onEdit={() => openEdit(c)}
                onActivate={() => handleActivate(c.id)}
                confirmDeleteId={confirmDeleteId}
                onDelete={() => setConfirmDeleteId(c.id)}
                onConfirmDelete={() => handleDelete(c.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── État vide ── */}
      {challenges.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Target size={36} className="text-on-surface-variant/25" />
          <p className="font-semibold text-on-surface-variant">Aucun défi créé pour le moment.</p>
          <Button variant="primary" onClick={openCreate}>
            <Plus size={16} /> Créer le premier défi
          </Button>
        </div>
      )}
    </div>
  );
}

// ── StatPill ─────────────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="px-4 py-2 bg-white rounded-2xl shadow-sm border border-surface-container-high text-center min-w-[80px]">
      <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}

// ── ChallengeRow ─────────────────────────────────────────────────────────────

function ChallengeRow({
  challenge,
  onEdit,
  onFinish,
  onActivate,
  confirmFinishId,
  onConfirmFinish,
  onCancelFinish,
  confirmDeleteId,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  challenge: AdminChallenge;
  onEdit: () => void;
  onFinish?: () => void;
  onActivate?: () => void;
  confirmFinishId?: number | null;
  onConfirmFinish?: () => void;
  onCancelFinish?: () => void;
  confirmDeleteId: number | null;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const isActive = challenge.status === 'active';

  return (
    <Card className={`bg-white border-none p-0 overflow-hidden transition-shadow ${isActive ? 'shadow-md' : 'shadow-sm opacity-80'}`}>
      <div className="flex items-center gap-3 px-5 py-4">
        {/* Cover thumbnail */}
        {challenge.cover_image ? (
          <img
            src={challenge.cover_image}
            alt=""
            className="shrink-0 w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${isActive ? 'bg-primary' : 'bg-slate-300'}`} />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-sm truncate">{challenge.name}</p>
            <Badge className={`text-[10px] border-none ${isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
              {isActive ? 'Actif' : 'Terminé'}
            </Badge>
          </div>
          {challenge.description && (
            <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{challenge.description}</p>
          )}
        </div>

        {/* Meta */}
        <div className="hidden md:flex items-center gap-4 text-[11px] text-on-surface-variant font-medium shrink-0">
          <span className="flex items-center gap-1">
            <Zap size={11} className="text-secondary" />
            {challenge.points_bonus} pts
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} />
            {challenge.participants_count} part.
          </span>
          <span className="flex items-center gap-1">
            {challenge.for_all ? (
              <><Globe size={11} className="text-primary" /><span className="text-primary">Tous</span></>
            ) : (
              <><Building2 size={11} />{challenge.division_name ?? 'Division'}</>
            )}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {challenge.end_date}
          </span>
          {isActive && (
            <span className={`font-bold ${challenge.days_left <= 3 ? 'text-red-500' : 'text-on-surface-variant'}`}>
              {challenge.days_left}j restants
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            type="button"
            onClick={onEdit}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
            title="Modifier"
          >
            <Pencil size={15} />
          </button>

          {/* Clôturer / Réactiver */}
          {isActive && onFinish && (
            confirmFinishId === challenge.id ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onConfirmFinish}
                  className="p-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors text-[11px] font-black px-2"
                  title="Confirmer la clôture"
                >
                  Clôturer
                </button>
                <button
                  type="button"
                  onClick={onCancelFinish}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onFinish}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-orange-50 hover:text-orange-500 transition-colors"
                title="Clôturer le défi"
              >
                <Trophy size={15} />
              </button>
            )
          )}

          {!isActive && onActivate && (
            <button
              type="button"
              onClick={onActivate}
              className="p-2 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors"
              title="Réactiver le défi"
            >
              <Flame size={15} />
            </button>
          )}

          {/* Supprimer */}
          {confirmDeleteId === challenge.id ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onConfirmDelete}
                className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                title="Confirmer la suppression"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onDelete}
              className="p-2 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
