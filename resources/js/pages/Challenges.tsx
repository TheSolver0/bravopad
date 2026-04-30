import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { router, useForm } from '@inertiajs/react';
import {
  Trophy, Users, Clock, Award, Plus, X, Calendar, CheckCircle2,
  Flame, Globe, UserCheck, Loader2, Heart, SmilePlus, Palette, Star,
  Upload, Play, Trash2, Info, LayoutGrid, Zap, Camera, ImageIcon,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Challenge, ChallengeMedia, User } from './types';
import { usePermissions } from '@/hooks/usePermissions';

/* ─── Catégories PAD ─────────────────────────────────────────── */
const CATEGORIES: Record<string, {
  label: string;
  Icon: React.ElementType;
  gradient: string;
  badgeBg: string;
  badgeText: string;
}> = {
  sport:      { label: 'Sport',            Icon: Trophy,    gradient: 'from-orange-500 to-red-500',      badgeBg: 'bg-orange-500/20 backdrop-blur-sm', badgeText: 'text-orange-100' },
  accueil:    { label: 'Accueil & Service', Icon: SmilePlus, gradient: 'from-blue-500 to-cyan-400',       badgeBg: 'bg-blue-500/20 backdrop-blur-sm',   badgeText: 'text-blue-100'   },
  creativite: { label: 'Créativité',        Icon: Palette,   gradient: 'from-purple-500 to-pink-400',     badgeBg: 'bg-purple-500/20 backdrop-blur-sm', badgeText: 'text-purple-100' },
  bien_etre:  { label: 'Bien-être',         Icon: Heart,     gradient: 'from-green-500 to-emerald-400',   badgeBg: 'bg-green-500/20 backdrop-blur-sm',  badgeText: 'text-green-100'  },
  cohesion:   { label: 'Cohésion',          Icon: Users,     gradient: 'from-indigo-500 to-violet-500',   badgeBg: 'bg-indigo-500/20 backdrop-blur-sm', badgeText: 'text-indigo-100' },
  autre:      { label: 'Événement',         Icon: Star,      gradient: 'from-slate-600 to-gray-500',      badgeBg: 'bg-slate-500/20 backdrop-blur-sm',  badgeText: 'text-slate-100'  },
};

function getCat(category: string | null) {
  return CATEGORIES[category ?? 'autre'] ?? CATEGORIES.autre;
}

/* ─── Props ──────────────────────────────────────────────────── */
interface ChallengesProps {
  challenges: Challenge[];
  currentUser: User | null;
}

/* ═══════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════════════════════════════════ */
export default function Challenges({ challenges }: ChallengesProps) {
  const { canManageChallenges } = usePermissions();

  const activeChallenges   = challenges.filter(c => c.status === 'active');
  const finishedChallenges = challenges.filter(c => c.status === 'finished');

  /* ─── état participations ─── */
  const [participating, setParticipating] = useState<Record<number, boolean>>(
    Object.fromEntries(challenges.map(c => [c.id, c.is_participating]))
  );
  const [loadingParticipate, setLoadingParticipate] = useState<number | null>(null);

  /* ─── modal création ─── */
  const [showCreateModal, setShowCreateModal] = useState(false);

  /* ─── modal blog ─── */
  const [blogChallenge, setBlogChallenge] = useState<Challenge | null>(null);
  const [blogMedia, setBlogMedia]         = useState<ChallengeMedia[]>([]);
  const [loadingMedia, setLoadingMedia]   = useState(false);
  const [blogTab, setBlogTab]             = useState<'info' | 'media'>('info');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── formulaire création ─── */
  const { data, setData, post, processing, errors, reset } = useForm<{
    name: string;
    description: string;
    cover_image: File | null;
    category: string;
    start_date: string;
    end_date: string;
    points_bonus: number;
    for_all: boolean;
  }>({
    name: '',
    description: '',
    cover_image: null,
    category: 'autre',
    start_date: '',
    end_date: '',
    points_bonus: 100,
    for_all: true,
  });

  /* ─── actions ─── */
  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    post('/challenges', {
      forceFormData: true,
      onSuccess: () => { setShowCreateModal(false); reset(); },
    });
  };

  const handleParticipate = (challengeId: number) => {
    setLoadingParticipate(challengeId);
    router.post(`/challenges/${challengeId}/participate`, {}, {
      preserveScroll: true,
      onSuccess: () => setParticipating(prev => ({ ...prev, [challengeId]: !prev[challengeId] })),
      onFinish: () => setLoadingParticipate(null),
    });
  };

  const loadBlogMedia = async (challengeId: number) => {
    const res = await fetch(`/challenges/${challengeId}/media`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return;
    setBlogMedia(await res.json());
  };

  const openBlog = async (challenge: Challenge) => {
    setBlogChallenge(challenge);
    setBlogTab('info');
    setBlogMedia([]);
    setLoadingMedia(true);
    try {
      await loadBlogMedia(challenge.id);
    } catch {
      // server error — leave media list empty
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!blogChallenge || !e.target.files?.length) return;
    const fd = new FormData();
    Array.from(e.target.files).forEach(f => fd.append('files[]', f));
    setUploadingMedia(true);
    router.post(`/challenges/${blogChallenge.id}/media`, fd as never, {
      forceFormData: true,
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => loadBlogMedia(blogChallenge.id),
      onFinish: () => { setUploadingMedia(false); if (fileInputRef.current) fileInputRef.current.value = ''; },
    });
  };

  const handleDeleteMedia = (mediaId: number) => {
    if (!blogChallenge) return;
    router.delete(`/challenge-media/${mediaId}`, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => loadBlogMedia(blogChallenge.id),
    });
  };

  /* ─── aperçu cover_image ─── */
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setData('cover_image', file);
    if (file) setCoverPreview(URL.createObjectURL(file));
    else setCoverPreview(null);
  };

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── En-tête ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Flame size={16} className="text-primary" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              Challenges PAD
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight">Challenges & Événements</h1>
          <p className="text-on-surface-variant font-medium max-w-xl text-sm">
            Les défis lancés par la RH — sport, bien-être, cohésion. Participez et retrouvez les photos de chaque événement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-0 bg-white rounded-2xl shadow-sm border border-surface-container-high overflow-hidden">
            <div className="px-3 md:px-5 py-3 text-center border-r border-surface-container-high">
              <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">En cours</p>
              <p className="text-xl font-black text-primary">{activeChallenges.length}</p>
            </div>
            <div className="px-3 md:px-5 py-3 text-center border-r border-surface-container-high">
              <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">Terminés</p>
              <p className="text-xl font-black text-green-600">{finishedChallenges.length}</p>
            </div>
            <div className="px-3 md:px-5 py-3 text-center">
              <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest hidden sm:block">Mes inscriptions</p>
              <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest sm:hidden">Inscrits</p>
              <p className="text-xl font-black text-secondary">
                {Object.values(participating).filter(Boolean).length}
              </p>
            </div>
          </div>

          {canManageChallenges && (
            <Button
              variant="primary"
              className="gap-2 shadow-lg shadow-primary/25 px-5"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nouveau challenge</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Challenges en cours ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-xl text-orange-500">
            <Zap size={18} />
          </div>
          <h2 className="text-2xl font-black tracking-tight">En cours</h2>
          {activeChallenges.length > 0 && (
            <Badge className="bg-orange-100 text-orange-600 border-none text-[10px] font-black">
              {activeChallenges.length} actif{activeChallenges.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {activeChallenges.length === 0 ? (
          <Card className="p-14 text-center border-none bg-white/80 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center">
              <Trophy size={32} className="text-primary/30" />
            </div>
            <div>
              <p className="font-bold text-on-surface">Aucun challenge en cours.</p>
              <p className="text-sm text-on-surface-variant mt-1">La RH va bientôt lancer le prochain !</p>
            </div>
            {canManageChallenges && (
              <Button variant="primary" className="mt-2" onClick={() => setShowCreateModal(true)}>
                <Plus size={16} /> Créer un challenge
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeChallenges.map((challenge, i) => {
              const cat = getCat(challenge.category);
              const CatIcon = cat.Icon;
              const isJoined  = participating[challenge.id] ?? false;
              const isLoading = loadingParticipate === challenge.id;

              return (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="relative h-80 rounded-3xl overflow-hidden group cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-500">

                    {/* Background */}
                    {challenge.cover_image ? (
                      <img
                        src={challenge.cover_image}
                        alt={challenge.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient}`} />
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

                    {/* Top badges */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black ${cat.badgeBg} ${cat.badgeText} border border-white/10`}>
                        <CatIcon size={12} />
                        {cat.label}
                      </span>
                      <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black bg-black/30 backdrop-blur-sm text-white border border-white/10">
                        <Clock size={11} />
                        {challenge.days_left}j
                      </span>
                    </div>

                    {/* Bottom content */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <h3 className="text-xl font-black leading-tight drop-shadow-sm mb-1">
                        {challenge.name}
                      </h3>
                      {challenge.description && (
                        <p className="text-sm text-white/70 line-clamp-2 mb-4 leading-relaxed">
                          {challenge.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        {/* Stats */}
                        <div className="flex items-center gap-3 text-xs text-white/80">
                          <span className="flex items-center gap-1">
                            <Users size={13} />
                            {challenge.participants_count}
                          </span>
                          <span className="flex items-center gap-1 font-black text-yellow-300">
                            <Award size={13} />
                            +{challenge.points_bonus}pts
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openBlog(challenge)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-sm transition-all"
                          >
                            <Camera size={13} />
                            <span className="hidden sm:inline">Blog</span>
                            <ChevronRight size={12} />
                          </button>
                          <button
                            onClick={() => handleParticipate(challenge.id)}
                            disabled={isLoading}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              isJoined
                                ? 'bg-green-400/20 border border-green-300/30 text-green-200 hover:bg-red-500/20 hover:border-red-300/30 hover:text-red-200'
                                : 'bg-white text-gray-900 hover:bg-white/90 shadow-lg'
                            }`}
                          >
                            {isLoading ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : isJoined ? (
                              <CheckCircle2 size={13} />
                            ) : (
                              <Plus size={13} />
                            )}
                            {isJoined ? 'Inscrit' : 'Participer'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Carte "Ajouter" pour HR */}
            {canManageChallenges && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: activeChallenges.length * 0.08 }}
              >
                <div
                  onClick={() => setShowCreateModal(true)}
                  className="h-80 rounded-3xl border-2 border-dashed border-surface-container-high bg-transparent flex flex-col items-center justify-center gap-4 hover:border-primary/40 hover:bg-primary/3 transition-all group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <Plus size={28} />
                  </div>
                  <div className="text-center">
                    <h3 className="font-black text-base">Lancer un challenge</h3>
                    <p className="text-sm text-on-surface-variant font-medium mt-1">
                      Challenge Smile, Olympiades, Bien-être…
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </section>

      {/* ── Challenges terminés ── */}
      {finishedChallenges.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl text-green-600">
              <Award size={18} />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Challenges passés</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {finishedChallenges.map((challenge, i) => {
              const cat = getCat(challenge.category);
              const CatIcon = cat.Icon;

              return (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div
                    className="relative h-44 rounded-2xl overflow-hidden group cursor-pointer shadow-md hover:shadow-lg transition-all"
                    onClick={() => openBlog(challenge)}
                  >
                    {challenge.cover_image ? (
                      <img
                        src={challenge.cover_image}
                        alt={challenge.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 saturate-50 group-hover:saturate-100"
                      />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-60`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Terminé badge */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 rounded-full text-[10px] font-black bg-black/40 backdrop-blur-sm text-white/70 border border-white/10">
                        Terminé
                      </span>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CatIcon size={11} className="text-white/60" />
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-wider">{cat.label}</span>
                      </div>
                      <h3 className="text-sm font-black leading-tight line-clamp-2">{challenge.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/60">
                        <span className="flex items-center gap-1"><Camera size={10} /> Voir les photos</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL BLOG
      ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {blogChallenge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBlogChallenge(null)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Cover + header */}
              {(() => {
                const cat = getCat(blogChallenge.category);
                const CatIcon = cat.Icon;
                return (
                  <div className="relative h-52 shrink-0">
                    {blogChallenge.cover_image ? (
                      <img src={blogChallenge.cover_image} alt={blogChallenge.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient}`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

                    {/* Close */}
                    <button
                      onClick={() => setBlogChallenge(null)}
                      className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer backdrop-blur-sm"
                    >
                      <X size={18} />
                    </button>

                    {/* Title */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black ${cat.badgeBg} ${cat.badgeText} border border-white/10`}>
                          <CatIcon size={12} />
                          {cat.label}
                        </span>
                        {blogChallenge.status === 'active' ? (
                          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black bg-green-500/30 text-green-200 border border-green-400/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                            En cours
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-full text-[11px] font-black bg-white/10 text-white/60 border border-white/10">
                            Terminé
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-black">{blogChallenge.name}</h2>
                    </div>
                  </div>
                );
              })()}

              {/* Tabs */}
              <div className="flex gap-1 px-6 pt-4 border-b border-surface-container-low shrink-0">
                {(['info', 'media'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setBlogTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-lg transition-all cursor-pointer -mb-px ${
                      blogTab === tab
                        ? 'bg-white border border-b-white border-surface-container-low text-primary'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tab === 'info' ? <Info size={14} /> : <LayoutGrid size={14} />}
                    {tab === 'info' ? 'Présentation' : 'Photos & Vidéos'}
                    {tab === 'media' && blogMedia.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-primary/10 text-primary font-black">
                        {blogMedia.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="overflow-y-auto flex-1 p-6">
                {blogTab === 'info' && (
                  <div className="space-y-6">
                    {/* Description */}
                    {blogChallenge.description && (
                      <p className="text-on-surface-variant leading-relaxed">{blogChallenge.description}</p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Participants', value: blogChallenge.participants_count, Icon: Users, color: 'text-primary' },
                        { label: 'Bravos liés', value: blogChallenge.bravos_count, Icon: Award, color: 'text-orange-500' },
                        { label: 'Points bonus', value: `+${blogChallenge.points_bonus}`, Icon: Zap, color: 'text-secondary' },
                      ].map(({ label, value, Icon: I, color }) => (
                        <div key={label} className="bg-surface-container-low rounded-2xl p-4 text-center">
                          <I size={20} className={`mx-auto mb-2 ${color}`} />
                          <p className={`text-2xl font-black ${color}`}>{value}</p>
                          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mt-1">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Dates */}
                    <div className="flex gap-4">
                      {[
                        { label: 'Début', value: blogChallenge.start_date },
                        { label: 'Fin', value: blogChallenge.end_date },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex-1 flex items-center gap-3 px-4 py-3 bg-surface-container-low rounded-2xl">
                          <Calendar size={16} className="text-on-surface-variant shrink-0" />
                          <div>
                            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">{label}</p>
                            <p className="text-sm font-black">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {blogChallenge.status === 'active' && blogChallenge.days_left > 0 && (
                      <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 rounded-2xl text-orange-600">
                        <Clock size={16} className="shrink-0" />
                        <p className="text-sm font-black">{blogChallenge.days_left} jours restants</p>
                      </div>
                    )}
                  </div>
                )}

                {blogTab === 'media' && (
                  <div className="space-y-6">
                    {/* Upload zone — HR uniquement */}
                    {canManageChallenges && (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={handleMediaUpload}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingMedia}
                          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border-2 border-dashed border-surface-container-high hover:border-primary/40 hover:bg-primary/3 transition-all group cursor-pointer disabled:opacity-60"
                        >
                          {uploadingMedia ? (
                            <><Loader2 size={20} className="animate-spin text-primary" /><span className="text-sm font-black text-primary">Upload en cours…</span></>
                          ) : (
                            <><Upload size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" /><span className="text-sm font-black text-on-surface-variant group-hover:text-primary transition-colors">Ajouter des photos ou vidéos</span></>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Galerie */}
                    {loadingMedia ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-primary" />
                      </div>
                    ) : blogMedia.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center">
                          <ImageIcon size={24} className="text-on-surface-variant/30" />
                        </div>
                        <p className="text-sm font-bold text-on-surface-variant">Aucune photo pour l'instant.</p>
                        {canManageChallenges && (
                          <p className="text-xs text-on-surface-variant/60">Ajoutez les photos et vidéos prises pendant le challenge !</p>
                        )}
                      </div>
                    ) : (
                      <div className="columns-2 md:columns-3 gap-3 space-y-3">
                        {blogMedia.map(media => (
                          <div key={media.id} className="relative break-inside-avoid group rounded-2xl overflow-hidden shadow-sm">
                            {media.file_type === 'image' ? (
                              <img
                                src={media.url}
                                alt={media.caption ?? ''}
                                className="w-full object-cover"
                              />
                            ) : (
                              <div className="relative bg-black aspect-video">
                                <video src={media.url} className="w-full h-full object-contain" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                    <Play size={20} className="text-white ml-0.5" />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Overlay au hover */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end justify-between p-3 opacity-0 group-hover:opacity-100">
                              <div className="text-white text-xs">
                                {media.caption && <p className="font-bold line-clamp-2">{media.caption}</p>}
                                <p className="text-white/60 text-[10px]">{media.uploader_name} · {media.created_at}</p>
                              </div>
                              {canManageChallenges && (
                                <button
                                  onClick={() => handleDeleteMedia(media.id)}
                                  className="w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white transition-all cursor-pointer shrink-0 ml-2"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════
          MODAL CRÉATION
      ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-primary/80 px-8 py-6 flex items-center justify-between shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white/70 text-[10px] font-black uppercase tracking-widest">
                    <Flame size={11} /> Nouveau challenge
                  </div>
                  <h2 className="text-xl font-black text-white">Lancer un événement</h2>
                </div>
                <button
                  onClick={() => { setShowCreateModal(false); reset(); setCoverPreview(null); }}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1">

                {/* Cover image */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    Photo de couverture
                  </label>
                  {coverPreview ? (
                    <div className="relative h-36 rounded-2xl overflow-hidden">
                      <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setData('cover_image', null); setCoverPreview(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-3 h-24 rounded-2xl border-2 border-dashed border-surface-container-high hover:border-primary/40 hover:bg-primary/3 transition-all cursor-pointer">
                      <Camera size={20} className="text-on-surface-variant/50" />
                      <span className="text-sm text-on-surface-variant/60 font-medium">Ajouter une image</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                    </label>
                  )}
                </div>

                {/* Catégorie */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    Catégorie
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(CATEGORIES).map(([key, cfg]) => {
                      const I = cfg.Icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setData('category', key)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${
                            data.category === key
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-surface-container-high text-on-surface-variant hover:border-primary/30'
                          }`}
                        >
                          <I size={14} />
                          <span className="truncate">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nom */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    Nom du challenge <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Olympiades multisport du PAD, Challenge Smile…"
                    value={data.name}
                    onChange={e => setData('name', e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary/10 text-sm font-medium placeholder:text-on-surface-variant/50 outline-none"
                  />
                  {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    Description
                  </label>
                  <textarea
                    placeholder="Décrivez l'événement, les règles, l'objectif…"
                    rows={3}
                    value={data.description}
                    onChange={e => setData('description', e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary/10 text-sm font-medium placeholder:text-on-surface-variant/50 outline-none resize-none"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  {(['start_date', 'end_date'] as const).map(field => (
                    <div key={field} className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                        <Calendar size={11} /> {field === 'start_date' ? 'Début' : 'Fin'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={data[field]}
                        onChange={e => setData(field, e.target.value)}
                        className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary/10 text-sm font-medium outline-none"
                      />
                      {errors[field] && <p className="text-xs text-red-500 font-medium">{errors[field]}</p>}
                    </div>
                  ))}
                </div>

                {/* Points bonus */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                    <Award size={11} /> Points bonus
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 rounded-xl border border-primary/10">
                    <Zap size={18} className="text-secondary shrink-0" />
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={data.points_bonus}
                      onChange={e => setData('points_bonus', Number(e.target.value))}
                      className="flex-1 text-xl font-black text-primary bg-transparent border-none outline-none focus:ring-0"
                    />
                    <span className="text-[10px] font-black text-on-surface-variant uppercase">pts</span>
                  </div>
                </div>

                {/* Audience */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                    <Users size={11} /> Audience
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: true,  Icon: Globe,     title: 'Tous les employés', sub: 'Visible par tout le monde' },
                      { val: false, Icon: UserCheck, title: 'Équipe ciblée',     sub: 'Groupe sélectionné'       },
                    ].map(({ val, Icon: I, title, sub }) => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => setData('for_all', val)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                          data.for_all === val
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-surface-container-high text-on-surface-variant hover:border-primary/30'
                        }`}
                      >
                        <I size={22} />
                        <div className="text-center">
                          <p className="text-xs font-black">{title}</p>
                          <p className="text-[10px] font-medium opacity-70 mt-0.5">{sub}</p>
                        </div>
                        {data.for_all === val && <CheckCircle2 size={16} className="text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => { setShowCreateModal(false); reset(); setCoverPreview(null); }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 shadow-lg shadow-primary/25"
                    disabled={processing || !data.name || !data.start_date || !data.end_date}
                  >
                    {processing ? (
                      <><Loader2 size={16} className="animate-spin" /> Création…</>
                    ) : (
                      <><Flame size={16} /> Lancer le challenge</>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
