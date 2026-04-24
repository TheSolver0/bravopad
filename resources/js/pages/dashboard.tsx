import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { router } from '@inertiajs/react';
import {
  Clock,
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
  MoreHorizontal,
  Smile,
  ChevronUp,
  ChevronDown,
  Heart,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { User, Bravo, Challenge, BravoValue } from './types';
import { BADGES } from './constants';
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

  // Recognition counts for current user
  const myReceivedBravos = bravos.filter(b => b.receiver_id === currentUser.id);
  const recognitionCounts = {
    good_job: myReceivedBravos.filter(b => b.badge === 'good_job').length,
    excellent: myReceivedBravos.filter(b => b.badge === 'excellent').length,
    impressive: myReceivedBravos.filter(b => b.badge === 'impressive').length,
  };

  // Comment states per bravo
  const [comments, setComments] = useState<Record<number, string>>({});

  // ── Slides du carrousel ────────────────────────────────────────────────────
  interface Slide {
    id: string;
    bg: string;
    tag?: React.ReactNode;
    title: string;
    subtitle: string;
    cta?: { label: string; action: () => void };
    badge?: React.ReactNode;
    visual: React.ReactNode;
  }

  const slides: Slide[] = [
    {
      id: 'pad',
      bg: 'from-[#003d7a] via-[#00529e] to-[#0066c2]',
      tag: (
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
          <Anchor size={11} /> Orbit Sarl
        </span>
      ),
      title: 'Bienvenue sur Bravo ',
      subtitle: 'Reconnaissez l\'excellence de vos collègues et valorisez les talents qui font la force de Orbit Sarl.',
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
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#003d7a]" />
            <div className="absolute bottom-6 right-8 w-32 h-32 border-2 border-white/10 rounded-full" />
            <div className="absolute bottom-16 right-20 w-16 h-16 border border-white/10 rounded-full" />
            <Anchor size={64} className="absolute right-12 top-1/2 -translate-y-1/2 text-white/8" strokeWidth={1} />
          </div>
        </div>
      ),
    },
    ...(sortedUsers.length > 0 ? [{
      id: 'spotlight',
      bg: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
      tag: (
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-secondary/90">
          <Star size={11} className="fill-current" /> Employé du moment
        </span>
      ),
      title: sortedUsers[0].name,
      subtitle: `${sortedUsers[0].role} · ${sortedUsers[0].department} — ${sortedUsers[0].points_total.toLocaleString()} pts accumulés.`,
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
              <img src={getAvatar(sortedUsers[0])} alt="" className="w-28 h-28 rounded-3xl border-4 border-secondary/40 shadow-2xl opacity-80" referrerPolicy="no-referrer" />
              <div className="absolute -top-3 -right-3 w-10 h-10 bg-secondary rounded-full flex items-center justify-center shadow-lg">
                <Trophy size={18} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      ),
    } as Slide] : []),
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
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-primary" />
        </div>
      ),
    } as Slide] : []),
  ];

  const [current, setCurrent] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prev = () => setCurrent(c => (c - 1 + slides.length) % slides.length);
  const next = () => setCurrent(c => (c + 1) % slides.length);
  const slide = slides[current];
  

  return (
    <div className="animate-in fade-in duration-500">

      {/* ── Carrousel ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden shadow-xl h-[100px]">
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
            <div className="relative z-10 flex-1 min-w-0 space-y-0.5">
              {slide.tag}
              <h1 className="text-sm md:text-base font-extrabold tracking-tight leading-tight truncate">{slide.title}</h1>
              <p className="text-white/70 text-[11px] font-medium leading-snug hidden md:block line-clamp-1">{slide.subtitle}</p>
            </div>
            {slide.badge && <div className="relative z-10 shrink-0 hidden sm:block">{slide.badge}</div>}
            {slide.cta && (
              <Button variant="secondary" className="relative z-10 px-3 py-1.5 text-xs shadow-md shadow-secondary/40 shrink-0 hidden lg:flex" onClick={slide.cta.action}>
                {slide.cta.label}
              </Button>
            )}
            <div className="relative z-20 flex items-center gap-2 shrink-0">
              <button onClick={prev} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all cursor-pointer">
                <ChevronLeft size={12} className="text-white" />
              </button>
              <div className="flex items-center gap-1">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)}
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

          {/* ── Flux des Bravos ────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-4">
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
                <Button variant="primary" className="shadow-md shadow-primary/20 px-4 py-2 text-xs" style={{ cursor: 'pointer' }} onClick={() => setShowCreateModal(true)}>
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
              <div className="space-y-4">
                {bravos.map((bravo, index) => {
                  const badgeInfo = BADGES.find(x => x.key === bravo.badge);
                  const badgeColor = badgeInfo?.color ?? '#6366f1';
                  return (
                    <motion.div
                      key={bravo.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                    >
                      {/* Carte bravo — style épuré avec avatars superposés */}
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                        {/* Header discret : badge pill + points */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
                          {badgeInfo ? (
                            <span
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={{ backgroundColor: `${badgeColor}18`, color: badgeColor }}
                            >
                              <Star size={11} style={{ fill: badgeColor, color: badgeColor }} />
                              {badgeInfo.label}
                            </span>
                          ) : (
                            <span />
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-400">+{bravo.points} pts</span>
                            <button className="text-gray-300 hover:text-gray-500 transition-colors cursor-pointer">
                              <MoreHorizontal size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Corps */}
                        <div className="px-4 pt-4 pb-3 space-y-3">
                          <div className="flex items-start gap-4">
                            {/* Avatars superposés */}
                            <div className="flex items-center shrink-0">
                              <div className="relative">
                                <img
                                  src={bravo.sender ? getAvatar(bravo.sender) : `https://ui-avatars.com/api/?name=?&background=e5e7eb&color=6b7280&size=64`}
                                  alt=""
                                  className="w-10 h-10 rounded-xl ring-2 ring-white shadow-sm z-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute -right-1 -bottom-1 bg-primary/80 text-white p-0.5 rounded-md shadow z-10">
                                  <ArrowRight size={9} />
                                </div>
                              </div>
                              <img
                                src={bravo.receiver ? getAvatar(bravo.receiver) : `https://ui-avatars.com/api/?name=?&background=e5e7eb&color=6b7280&size=64`}
                                alt=""
                                className="w-14 h-14 rounded-2xl ring-4 ring-white shadow-md -ml-2 z-10 relative"
                                referrerPolicy="no-referrer"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-500">
                                To <span className="font-bold text-gray-800">{bravo.receiver?.name ?? '—'}</span>
                              </p>
                              {bravo.message && (
                                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{bravo.message}</p>
                              )}
                              {bravo.values && bravo.values.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {bravo.values.map(v => (
                                    <span
                                      key={v.id}
                                      className="px-2.5 py-0.5 rounded-full border text-[11px] font-medium bg-white"
                                      style={v.color ? { borderColor: `${v.color}80`, color: v.color } : { borderColor: '#e5e7eb', color: '#6b7280' }}
                                    >
                                      {v.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Footer: date + sender */}
                          
                          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                            <span className="text-xs text-gray-400"> {new Date(bravo.created_at).toLocaleDateString('fr-FR')}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                From <span className="font-medium text-gray-700">{bravo.sender?.name ?? '—'}</span>
                              </span>
                              <img
                                src={bravo.sender ? getAvatar(bravo.sender) : `https://ui-avatars.com/api/?name=?&background=e5e7eb&color=6b7280&size=64`}
                                alt=""
                                className="w-7 h-7 rounded-full border-2 border-gray-100 shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Zone commentaire */}
                        <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-gray-50/40">
                          <div className="flex items-center justify-between">
                            <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                              <Heart size={14} />
                              <span>{bravo.likes_count}</span>
                            </button>
                            <button className="text-gray-300 hover:text-gray-500 transition-colors cursor-pointer">
                              <Smile size={16} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <img
                              src={getAvatar(currentUser)}
                              alt=""
                              className="w-7 h-7 rounded-full shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 flex items-center bg-white rounded-full px-3 py-1.5 border border-gray-200 gap-2 focus-within:border-gray-300 transition-colors">
                              <input
                                placeholder="Écrire un commentaire..."
                                value={comments[bravo.id] ?? ''}
                                onChange={e => setComments(prev => ({ ...prev, [bravo.id]: e.target.value }))}
                                className="flex-1 bg-transparent text-xs outline-none text-gray-600 placeholder-gray-400"
                              />
                              <button className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 cursor-pointer">
                                <Smile size={13} />
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* <div className="flex justify-center pt-4">
              <button
                onClick={() => router.visit('/history')}
                className="p-3 rounded-full border border-primary/10 text-primary hover:bg-primary/5 transition-all shadow-sm flex items-center justify-center group cursor-pointer"
                title="Voir tout l'historique"
              >
                <PlusCircle size={24} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div> */}
          </div>

          {/* ── Sidebar droite ─────────────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-5">

            {/* My Recognition */}
            <RecognitionCard counts={recognitionCounts} />

            {/* My Points */}
            <Card className="p-5 flex flex-col justify-between border-none bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3B82F6' }}>
                    <Star size={12} className="text-white fill-white" />
                  </span>
                  Mes Points
                </h3>
                <ChevronUp size={16} className="text-gray-400" />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className={`text-xl font-black ${(currentUser.monthly_points_remaining ?? 0) === 0 ? 'text-red-400' : 'text-primary'}`}>
                    {(currentUser.monthly_points_remaining ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">À donner</p>
                </div>
                <div>
                  <p className="text-xl font-black text-primary">{currentUser.points_total.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Redeemable</p>
                </div>
                <div>
                  <p className="text-xl font-black text-primary">{(currentUser.monthly_points_allowance ?? 100).toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Quota/mois</p>
                </div>
              </div>

              {/* Barre quota mensuel */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">Quota mensuel utilisé</span>
                  <span className="text-[10px] font-black text-primary">
                    {((currentUser.monthly_points_allowance ?? 100) - (currentUser.monthly_points_remaining ?? 0)).toLocaleString()} / {(currentUser.monthly_points_allowance ?? 100).toLocaleString()} pts
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(((currentUser.monthly_points_allowance ?? 100) - (currentUser.monthly_points_remaining ?? 0)) / (currentUser.monthly_points_allowance ?? 100) * 100)}%` }}
                    className={`h-full rounded-full ${(currentUser.monthly_points_remaining ?? 0) === 0 ? 'bg-red-400' : 'bg-orange-400'}`}
                  />
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">Prochain palier</span>
                  <span className="text-[10px] font-black text-primary">{nextMilestone.toLocaleString()} pts</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            </Card>

            {/* Classement */}
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                <Trophy className="text-secondary" size={20} />
                Classement
              </h2>
              <button onClick={() => router.visit('/stats')} className="text-primary text-xs font-black hover:underline uppercase tracking-widest cursor-pointer">Voir tout</button>
            </div>

            {topUsers.length >= 3 && (
              <Card className="p-0 overflow-hidden border-none shadow-md bg-white">
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
                <div className="divide-y divide-gray-50">
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
                <div className="p-4 bg-gray-50/50">
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
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setShowCreateModal(false)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-gray-50 rounded-2xl shadow-2xl modal-scroll"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-400 hover:text-gray-700 shadow-sm border border-gray-100 transition-all cursor-pointer z-10"
              >
                <X size={16} />
              </button>
              <div className="px-4 py-6">
                <CreateBravo
                  users={users}
                  bravoValues={bravoValues}
                  isModal
                  onSuccess={() => { setShowCreateModal(false); router.reload(); }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Composant My Recognition ──────────────────────────────────────────────────
interface RecognitionCardProps {
  counts: { good_job: number; excellent: number; impressive: number };
}

function RecognitionCard({ counts }: RecognitionCardProps) {
  const [open, setOpen] = useState(true);

  const items = [
    { key: 'good_job',   label: 'Good job',    color: '#F97316', count: counts.good_job },
    { key: 'excellent',  label: 'Impressive',  color: '#3B82F6', count: counts.excellent },
    { key: 'impressive', label: 'Exceptional', color: '#9333EA', count: counts.impressive },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Star size={14} className="text-white fill-white" />
          </div>
          <span className="font-bold text-sm text-gray-700">Mes Reconnaissances</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 grid grid-cols-3 gap-4">
              {items.map(item => (
                <div key={item.key} className="flex flex-col items-center gap-1.5">
                  <div className="relative">
                    {/* Cercle coloré */}
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center shadow-md"
                      style={{ backgroundColor: item.color }}
                    >
                      <Star size={22} className="text-white fill-white" />
                    </div>
                    {/* Badge count */}
                    <div
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 min-w-[22px] h-[18px] px-1 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow border-2 border-white"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.count}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium text-center mt-1">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
