import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { router } from '@inertiajs/react';
import {
  Clock,
  Heart,
  ArrowRight,
  MessageSquare,
  Award,
  PlusCircle,
  Trophy,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Anchor,
  Ship,
  Star,
  X,
  Send,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { User, Bravo, BravoComment, Challenge, BravoValue } from './types';
import CreateBravo from './CreateBravo';

interface DashboardProps {
  bravos: Bravo[];
  users: User[];
  activeChallenge: Challenge | null;
  currentUser: User;
  bravoValues: BravoValue[];
}


function getAvatar(user: { name: string; avatar?: string | null }): string {
  if (user.avatar && user.avatar.trim() !== '') return user.avatar;
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=6366f1&color=ffffff&size=128&bold=true&format=svg`;
}

export default function Dashboard({ bravos, users, activeChallenge, currentUser, bravoValues }: DashboardProps) {
  const safeUsers = Array.isArray(users) ? users : [];
  const sortedUsers = [...safeUsers].sort((a, b) => b.points_total - a.points_total);
  const topUsers = [...safeUsers].sort((a, b) => b.points_total - a.points_total);

  const nextMilestone = Math.ceil((currentUser.points_total + 1) / 500) * 500;
  const progress = nextMilestone > 0 ? Math.min(100, (currentUser.points_total / nextMilestone) * 100) : 0;

  // ── Likes & commentaires ──────────────────────────────────────────────────
  type LikeState = { liked: boolean; count: number };
  const [likeStates, setLikeStates] = useState<Record<number, LikeState>>(() =>
    Object.fromEntries(bravos.map(b => [b.id, { liked: b.user_has_liked ?? false, count: b.likes_count }]))
  );
  const [likingId, setLikingId] = useState<number | null>(null);

  const [openComments, setOpenComments] = useState<number | null>(null);
  const [commentsByBravo, setCommentsByBravo] = useState<Record<number, BravoComment[]>>({});
  const [commentInput, setCommentInput] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const csrfToken = (): string =>
    document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), 'Accept': 'application/json', ...((options.headers ?? {}) as Record<string, string>) },
      ...options,
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }, []);

  const handleLike = useCallback(async (bravoId: number) => {
    if (likingId !== null) return;
    setLikingId(bravoId);
    try {
      const data = await apiFetch(`/api/bravos/${bravoId}/like`, { method: 'POST' });
      setLikeStates(prev => ({ ...prev, [bravoId]: { liked: data.liked, count: data.likes_count } }));
    } finally {
      setLikingId(null);
    }
  }, [likingId, apiFetch]);

  const loadComments = useCallback(async (bravoId: number) => {
    if (commentsByBravo[bravoId]) return;
    setLoadingComments(true);
    try {
      const data = await apiFetch(`/api/bravos/${bravoId}/comments`);
      setCommentsByBravo(prev => ({ ...prev, [bravoId]: data }));
    } finally {
      setLoadingComments(false);
    }
  }, [commentsByBravo, apiFetch]);

  const toggleComments = useCallback((bravoId: number) => {
    if (openComments === bravoId) {
      setOpenComments(null);
    } else {
      setOpenComments(bravoId);
      loadComments(bravoId);
    }
    setCommentInput('');
  }, [openComments, loadComments]);

  const handleAddComment = useCallback(async (bravoId: number) => {
    if (!commentInput.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      const data = await apiFetch(`/api/bravos/${bravoId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentInput.trim() }),
      });
      setCommentsByBravo(prev => ({
        ...prev,
        [bravoId]: [data, ...(prev[bravoId] ?? [])],
      }));
      setCommentInput('');
    } finally {
      setSendingComment(false);
    }
  }, [commentInput, sendingComment, apiFetch]);

  // ── Slides du carrousel ────────────────────────────────────────────────────
  interface Slide {
    id: string;
    bg: string;          // gradient tailwind ou couleur inline
    tag?: React.ReactNode;
    title: string;
    subtitle: string;
    cta?: { label: string; action: () => void };
    badge?: React.ReactNode;
    visual: React.ReactNode;
  }

  const slides: Slide[] = [
    // Slide 1 — Identité PAD
    {
      id: 'pad',
      bg: 'from-[#003d7a] via-[#00529e] to-[#0066c2]',
      tag: (
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
          <Anchor size={11} /> Port Autonome de Douala
        </span>
      ),
      title: 'Bienvenue sur Bravo PAD',
      subtitle: 'Reconnaissez l\'excellence de vos collègues et valorisez les talents qui font la force du premier port d\'Afrique centrale.',
      cta: { label: 'Envoyer un Bravo', action: () => setShowCreateModal(true) },
      badge: (
        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
          <Ship size={18} className="text-white/80" />
          <span className="font-bold text-sm text-white">{bravos.length} Bravos partagés</span>
        </div>
      ),
      visual: (
        <div className="absolute right-0 inset-y-0 w-1/2 hidden lg:flex items-center justify-center pointer-events-none">
          <div className="relative w-full h-full overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.pad.cm/wp-content/uploads/2022/12/Portiques.jpg')] bg-cover bg-center opacity-15" />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#003d7a]" />
            {/* Déco géométrique marine */}
            <div className="absolute bottom-6 right-8 w-32 h-32 border-2 border-white/10 rounded-full" />
            <div className="absolute bottom-16 right-20 w-16 h-16 border border-white/10 rounded-full" />
            <Anchor size={64} className="absolute right-12 top-1/2 -translate-y-1/2 text-white/8" strokeWidth={1} />
          </div>
        </div>
      ),
    },
    // Slide 2 — Spotlight employé du moment
    ...(sortedUsers.length > 0 ? [{
      id: 'spotlight',
      bg: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
      tag: (
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-secondary/90">
          <Star size={11} className="fill-current" /> Employé du moment
        </span>
      ),
      title: sortedUsers[0].name,
      subtitle: `${sortedUsers[0].role} · ${sortedUsers[0].department} — ${sortedUsers[0].points_total.toLocaleString()} pts accumulés. Félicitez-le pour son engagement exceptionnel !`,
      cta: { label: 'Voir le classement', action: () => router.visit('/stats') },
      badge: (
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary/20 backdrop-blur-md rounded-xl border border-secondary/30">
          <Trophy size={18} className="text-secondary" />
          <span className="font-bold text-sm text-white">#1 du classement</span>
        </div>
      ),
      visual: (
        <div className="absolute right-0 inset-y-0 w-1/2 hidden lg:flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#1a1a2e]" />
          <div className="relative z-10 flex flex-col items-center gap-3 mr-12">
            <div className="relative">
              <img
                src={getAvatar(sortedUsers[0])}
                alt=""
                className="w-28 h-28 rounded-3xl border-4 border-secondary/40 shadow-2xl opacity-80"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -top-3 -right-3 w-10 h-10 bg-secondary rounded-full flex items-center justify-center shadow-lg">
                <Trophy size={18} className="text-white" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white/60 font-bold text-sm">{sortedUsers[0].points_total.toLocaleString()} pts</p>
            </div>
          </div>
        </div>
      ),
    } as Slide] : []),
    // Slide 3 — Défi actif (si présent)
    ...(activeChallenge ? [{
      id: 'challenge',
      bg: 'from-primary via-primary/90 to-primary/70',
      tag: (
        <div className="flex items-center gap-3">
          <Badge variant="warning" className="bg-secondary text-white border-none px-3 py-1 text-[10px]">NOUVEAU DÉFI</Badge>
          <span className="flex items-center gap-1.5 text-white/70 text-xs font-bold">
            <Clock size={12} /> Plus que {activeChallenge.days_left} jours
          </span>
        </div>
      ),
      title: activeChallenge.name,
      subtitle: activeChallenge.description,
      cta: { label: 'Participer maintenant', action: () => router.visit('/challenges') },
      badge: (
        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
          <Award size={18} className="text-secondary" />
          <span className="font-extrabold text-base text-white">+{activeChallenge.points_bonus} pts</span>
        </div>
      ),
      visual: (
        <div className="absolute right-0 inset-y-0 w-1/2 hidden lg:block pointer-events-none">
          <img src="https://picsum.photos/seed/challenge/1000/800" alt="" className="object-cover h-full w-full opacity-10" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-primary" />
        </div>
      ),
    } as Slide] : []),
  ];

  const [current, setCurrent] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Auto-avance toutes les 5 secondes
  useEffect(() => {
    const timer = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prev = () => setCurrent(c => (c - 1 + slides.length) % slides.length);
  const next = () => setCurrent(c => (c + 1) % slides.length);

  const slide = slides[current];

  return (
    <div className="animate-in fade-in duration-500">

      {/* ── Carrousel d'annonces ── flush top, no rounding at top ───────── */}
      <div className="relative overflow-hidden  shadow-xl h-[100px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className={`bg-gradient-to-r ${slide.bg} px-5 text-white flex items-center gap-4 relative h-full`}
          >
            {slide.visual}

            {/* Contenu principal */}
            <div className="relative z-10 flex-1 min-w-0 space-y-0.5">
              {slide.tag}
              <h1 className="text-sm md:text-base font-extrabold tracking-tight leading-tight truncate">{slide.title}</h1>
              <p className="text-white/70 text-[11px] font-medium leading-snug hidden md:block line-clamp-1">{slide.subtitle}</p>
            </div>

            {/* Badge */}
            {slide.badge && (
              <div className="relative z-10 shrink-0 hidden sm:block">{slide.badge}</div>
            )}

            {/* CTA */}
            {slide.cta && (
              <Button variant="secondary" className="relative z-10 px-3 py-1.5 text-xs shadow-md shadow-secondary/40 shrink-0 hidden lg:flex" onClick={slide.cta.action}>
                {slide.cta.label}
              </Button>
            )}

            {/* Contrôles nav */}
            <div className="relative z-20 flex items-center gap-2 shrink-0">
              <button onClick={prev} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all cursor-pointer">
                <ChevronLeft size={12} className="text-white" />
              </button>
              <div className="flex items-center gap-1">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`rounded-full transition-all cursor-pointer ${i === current ? 'w-4 h-1 bg-white' : 'w-1 h-1 bg-white/40 hover:bg-white/60'}`}
                  />
                ))}
              </div>
              <button onClick={next} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all cursor-pointer">
                <ChevronRight size={12} className="text-white" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-6 md:p-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Flux des Bravos */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
              <MessageSquare className="text-primary" size={20} />
              Les Bravos
            </h2>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-surface-container-high">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">{bravos.length} récents</span>
              </div>
              <Button variant="primary" className="shadow-md shadow-primary/20 px-4 py-2 text-xs" style={{cursor: 'pointer'}} onClick={() => setShowCreateModal(true)}>
                <PlusCircle size={20} /> <span className="hidden sm:inline">Envoyer un Bravo</span>
              </Button>
            </div>
          </div>

          {bravos.length === 0 ? (
            <Card className="p-10 text-center border-none bg-white/80">
              <MessageSquare className="mx-auto mb-3 text-primary/30" size={40} />
              <p className="font-bold text-on-surface-variant">Aucun bravo pour l'instant.</p>
              <p className="text-sm text-on-surface-variant mt-1">Soyez le premier à féliciter un collègue !</p>
              <Button variant="primary" className="mt-4" onClick={() => setShowCreateModal(true)}>Envoyer le premier Bravo</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {bravos.map((bravo, index) => (
                <motion.div
                  key={bravo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 space-y-5 hover:shadow-xl transition-all duration-500 cursor-pointer border-none bg-white/80 backdrop-blur-md group relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center -space-x-3">
                          <div className="relative group/avatar shrink-0">
                            <img
                              src={bravo.sender ? getAvatar(bravo.sender) : `https://i.pinimg.com/1200x/87/22/ec/8722ec261ddc86a44e7feb3b46836c10.jpg`}
                              alt=""
                              className="w-12 h-12 rounded-xl bg-surface-container-low ring-4 ring-white shadow-lg transition-transform group-hover/avatar:scale-110"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute -right-1 -bottom-1 bg-primary text-white p-1 rounded-lg shadow-lg">
                              <ArrowRight size={12} />
                            </div>
                          </div>
                          <img
                            src={bravo.receiver ? getAvatar(bravo.receiver) : `https://i.pinimg.com/1200x/87/22/ec/8722ec261ddc86a44e7feb3b46836c10.jpg`}
                            alt=""
                            className="w-16 h-16 rounded-2xl bg-surface-container-low ring-4 ring-white shadow-xl transition-transform group-hover/avatar:scale-110"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-base text-on-surface">Félicitations !</span>
                            
                          </div>
                          <p className="text-sm text-on-surface-variant font-medium mt-1">
                            <span className="font-black text-primary">@{bravo.sender?.name?.split(' ')[0] ?? '?'}</span>
                            {' '}a envoyé un bravo à{' '}
                            <span className="font-black text-primary">@{bravo.receiver?.name?.split(' ')[0] ?? '?'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 text-secondary font-black text-2xl tracking-tighter">
                            <Award size={20} />
                            <span className="font-extrabold text-xl">+{bravo.points}</span>
                          </div>
                          <span className="text-[9px] font-semibold text-on-surface-variant uppercase tracking-wide">{bravo.created_at}</span>
                        </div>
                      </div>
                    </div>

                    {bravo.message && (
                      <div className="bg-surface-container-low/50 p-4 rounded-xl relative group-hover:bg-primary/5 transition-colors">
                        <MessageSquare size={20} className="absolute -left-2 -top-2 text-primary/10" />
                        <p className="text-base text-on-surface-variant leading-relaxed font-medium italic">"{bravo.message}"</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex flex-wrap gap-2">
                        {bravo.values && bravo.values.map(v => (
                          <Badge key={v.id} className="border-1 bg-white text-[10px]" style={v.color ? { borderColor: v.color } : undefined}>{v.name}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLike(bravo.id)}
                          disabled={likingId === bravo.id}
                          className={`flex items-center gap-1.5 transition-colors text-xs font-bold uppercase tracking-wide ${
                            likeStates[bravo.id]?.liked ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                          }`}
                        >
                          <Heart size={16} className={likeStates[bravo.id]?.liked ? 'fill-primary' : ''} />
                          {likeStates[bravo.id]?.count ?? 0}
                        </button>
                        <button
                          onClick={() => toggleComments(bravo.id)}
                          className={`flex items-center gap-1.5 transition-colors text-xs font-bold uppercase tracking-wide ${
                            openComments === bravo.id ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                          }`}
                        >
                          <MessageSquare size={16} />
                          {(commentsByBravo[bravo.id]?.length ?? bravo.comments_count ?? 0) || ''}
                        </button>
                      </div>
                    </div>

                    {/* Section commentaires */}
                    <AnimatePresence>
                      {openComments === bravo.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 space-y-3 border-t border-surface-container-high mt-2">
                            {loadingComments && <p className="text-xs text-on-surface-variant">Chargement...</p>}
                            {(commentsByBravo[bravo.id] ?? []).map(c => (
                              <div key={c.id} className="flex items-start gap-2">
                                <img
                                  src={c.user ? getAvatar(c.user) : ''}
                                  alt=""
                                  className="w-7 h-7 rounded-full shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-bold">{c.user?.name}</span>
                                    <span className="text-[10px] text-on-surface-variant">{c.created_at}</span>
                                  </div>
                                  <p className="text-sm text-on-surface leading-snug">{c.content}</p>
                                </div>
                              </div>
                            ))}
                            <div className="flex items-center gap-2">
                              <img
                                src={getAvatar(currentUser)}
                                alt=""
                                className="w-7 h-7 rounded-full shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <input
                                type="text"
                                value={commentInput}
                                onChange={e => setCommentInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddComment(bravo.id)}
                                placeholder="Ajouter un commentaire..."
                                className="flex-1 text-sm border border-surface-container-high rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-primary/20 transition-all"
                              />
                              <button
                                onClick={() => handleAddComment(bravo.id)}
                                disabled={sendingComment || !commentInput.trim()}
                                className="p-1.5 rounded-xl bg-primary text-white disabled:opacity-40 transition-opacity"
                              >
                                <Send size={14} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <div className="flex justify-center pt-6">
            <button
              onClick={() => router.visit('/history')}
              className="p-3 rounded-full border border-primary/10 text-primary hover:bg-primary/5 transition-all shadow-sm flex items-center justify-center group cursor-pointer"
              title="Voir tout l'historique"
            >
              <PlusCircle size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Classement */}
        <div className="lg:col-span-4 space-y-6">

          {/* Score de l'utilisateur connecté */}
          <Card className="flex flex-col justify-between border-none bg-primary/5 border-primary/10">
            <div className="space-y-2">
              <h3 className="text-primary font-black uppercase tracking-widest text-[10px]">Tes points actuels</h3>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-primary tracking-tighter">{currentUser.points_total.toLocaleString()}</span>
                <span className="text-primary/60 font-black text-xs uppercase">pts</span>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-primary/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase">Prochain palier</span>
                <span className="text-[10px] font-black text-primary">{nextMilestone.toLocaleString()} pts</span>
              </div>
              <div className="h-2 bg-white rounded-full overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
            </div>
          </Card>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
              <Trophy className="text-secondary" size={20} />
              Classement
            </h2>
            <button onClick={() => router.visit('/stats')} className="text-primary text-xs font-black hover:underline uppercase tracking-widest cursor-pointer">Voir tout</button>
          </div>

          {topUsers.length >= 3 && (
            <Card className="p-0 overflow-hidden border-none shadow-lg bg-white/80 backdrop-blur-md">
              <div className="p-5 bg-gradient-to-br from-primary to-primary-container text-white">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wide opacity-70">Top Performeurs</span>
                  <TrendingUp size={16} className="text-secondary" />
                </div>
                <div className="flex items-end justify-around pb-2">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <img src={getAvatar(topUsers[1])} alt="" className="w-12 h-12 rounded-full border-2 border-white/30" referrerPolicy="no-referrer" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-surface-container-high rounded-full flex items-center justify-center text-[10px] font-bold text-on-surface border-2 border-white">2</div>
                    </div>
                    <span className="text-[10px] font-bold opacity-80 truncate w-16 text-center">{topUsers[1].name.split(' ')[0]}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 scale-110">
                    <div className="relative">
                      <img src={getAvatar(topUsers[0])} alt="" className="w-16 h-16 rounded-full border-4 border-secondary shadow-lg" referrerPolicy="no-referrer" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-secondary rounded-full flex items-center justify-center text-[10px] font-extrabold text-white border-2 border-white">1</div>
                    </div>
                    <span className="text-[10px] font-bold truncate w-16 text-center">{topUsers[0].name.split(' ')[0]}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <img src={getAvatar(topUsers[2])} alt="" className="w-12 h-12 rounded-full border-2 border-white/30" referrerPolicy="no-referrer" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-secondary/50 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">3</div>
                    </div>
                    <span className="text-[10px] font-bold opacity-80 truncate w-16 text-center">{topUsers[2].name.split(' ')[0]}</span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-surface-container-low">
                {topUsers.map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <span className={`text-[10px] font-black w-3 ${index < 3 ? 'text-primary' : 'text-on-surface-variant'}`}>{index + 1}</span>
                      <img src={getAvatar(user)} alt="" className="w-10 h-10 rounded-xl bg-surface-container-low" referrerPolicy="no-referrer" />
                      <div>
                        <p className="text-sm font-bold group-hover:text-primary transition-colors">{user.name}</p>
                        <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide">{user.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-on-surface">{user.points_total.toLocaleString()}</p>
                      <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">pts</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-surface-container-low/30">
                <Button variant="ghost" className="w-full text-xs font-extrabold tracking-wide py-3" onClick={() => router.visit('/stats')}>
                  VOIR TOUT LE CLASSEMENT
                </Button>
              </div>
            </Card>
          )}


        </div>
      </div>
      </div>

      {/* ── Modal Créer un Bravo ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col"
          >
            {/* Slide compact en header */}
            <div className={`relative bg-gradient-to-r ${slide.bg} px-5 py-4 flex items-center justify-between shrink-0`}>
              <div className="space-y-0.5">
                {slide.tag}
                <h2 className="text-xl font-extrabold text-white leading-tight tracking-tight">Envoyer un Bravo</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="flex-1 overflow-y-auto bg-surface-container-low/95 backdrop-blur-md">
              <div className="max-w-2xl mx-auto px-4 py-6">
                <CreateBravo
                  users={users}
                  bravoValues={bravoValues}
                  isModal
                  onSuccess={() => { setShowCreateModal(false); router.reload(); }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
