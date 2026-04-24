import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { router, useForm } from '@inertiajs/react';
import {
  Lightbulb,
  Users2,
  Clock,
  Eye,
  Trophy,
  Target,
  Zap,
  Award,
  Plus,
  X,
  Calendar,
  CheckCircle2,
  Users,
  Flame,
  Globe,
  UserCheck,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Challenge, User } from './types';
import { usePermissions } from '@/hooks/usePermissions';

interface ChallengesProps {
  challenges: Challenge[];
  currentUser: User | null;
}

export default function Challenges({ challenges }: ChallengesProps) {
  const { canManageChallenges } = usePermissions();
  const activeChallenges  = challenges.filter(c => c.status === 'active');
  const finishedChallenges = challenges.filter(c => c.status === 'finished');
  const [showModal, setShowModal] = useState(false);
  const [participating, setParticipating] = useState<Record<number, boolean>>(
    Object.fromEntries(challenges.map(c => [c.id, c.is_participating]))
  );
  const [loadingParticipate, setLoadingParticipate] = useState<number | null>(null);

  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    points_bonus: 100,
    for_all: true,
  });

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    post('/challenges', {
      onSuccess: () => {
        setShowModal(false);
        reset();
      },
    });
  };

  const handleParticipate = (challengeId: number) => {
    setLoadingParticipate(challengeId);
    router.post(
      `/challenges/${challengeId}/participate`,
      {},
      {
        preserveScroll: true,
        onSuccess: () => {
          setParticipating(prev => ({ ...prev, [challengeId]: !prev[challengeId] }));
        },
        onFinish: () => setLoadingParticipate(null),
      }
    );
  };

  const progressPercent = (count: number, goal = 10) =>
    Math.min(100, Math.round((count / goal) * 100));

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── En-tête ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Flame size={16} className="text-primary" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Centre de Défis</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight">Défis & Missions</h1>
          <p className="text-on-surface-variant font-medium max-w-xl text-sm">
            Relevez des défis collectifs, gagnez des points et débloquez des badges exclusifs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Stats pill */}
          <div className="flex items-center gap-0 bg-white rounded-2xl shadow-sm border border-surface-container-high overflow-hidden min-w-0">
            <div className="px-3 md:px-5 py-3 text-center border-r border-surface-container-high">
              <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">Actifs</p>
              <p className="text-xl font-black text-primary">{activeChallenges.length}</p>
            </div>
            <div className="px-3 md:px-5 py-3 text-center border-r border-surface-container-high">
              <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">Terminés</p>
              <p className="text-xl font-black text-green-600">{finishedChallenges.length}</p>
            </div>
            <div className="px-3 md:px-5 py-3 text-center">
              <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest hidden sm:block">Participations</p>
              <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest sm:hidden">Part.</p>
              <p className="text-xl font-black text-secondary">
                {Object.values(participating).filter(Boolean).length}
              </p>
            </div>
          </div>

          {/* New challenge button */}
          {canManageChallenges && (
            <Button
              variant="primary"
              className="gap-2 shadow-lg shadow-primary/25 px-5"
              onClick={() => setShowModal(true)}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nouveau défi</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Missions en cours ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-xl text-orange-500">
            <Zap size={18} />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Missions en cours</h2>
          {activeChallenges.length > 0 && (
            <Badge className="bg-orange-100 text-orange-600 border-none text-[10px] font-black">
              {activeChallenges.length} actif{activeChallenges.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {activeChallenges.length === 0 ? (
          <Card className="p-14 text-center border-none bg-white/80 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center">
              <Target size={32} className="text-primary/30" />
            </div>
            <div>
              <p className="font-bold text-on-surface">Aucun défi actif pour le moment.</p>
              <p className="text-sm text-on-surface-variant mt-1">Lancez le premier défi de l'équipe !</p>
            </div>
            {canManageChallenges && (
              <Button variant="primary" className="mt-2" onClick={() => setShowModal(true)}>
                <Plus size={16} /> Créer un défi
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeChallenges.map((challenge, i) => {
              const isJoined = participating[challenge.id] ?? false;
              const isLoading = loadingParticipate === challenge.id;
              const pct = progressPercent(challenge.bravos_count);

              return (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className="group relative overflow-hidden border-none hover:shadow-2xl transition-all duration-500 flex flex-col h-full bg-white p-0">
                    {/* Top accent bar */}
                    <div className="h-1.5 w-full bg-primary rounded-t-full" />

                    {/* Watermark icon */}
                    <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                      <Lightbulb size={110} />
                    </div>

                    <div className="p-4 md:p-6 flex flex-col flex-1 gap-4 md:gap-5">
                      {/* Header row */}
                      <div className="flex items-start justify-between">
                        <div className="p-3 rounded-2xl bg-orange-50 text-orange-500 shadow-sm">
                          <Lightbulb size={26} />
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-1.5 text-2xl font-black text-secondary">
                            <Award size={18} />
                            +{challenge.points_bonus}
                            <span className="text-sm font-black text-on-surface-variant">pts</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                            {challenge.for_all ? (
                              <>
                                <Globe size={11} className="text-primary" />
                                <span className="text-primary">Tous les employés</span>
                              </>
                            ) : (
                              <>
                                <UserCheck size={11} />
                                Ciblé
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-2">
                        <h3 className="text-lg font-black group-hover:text-primary transition-colors leading-tight">
                          {challenge.name}
                        </h3>
                        <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-3">
                          {challenge.description}
                        </p>
                      </div>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                          <span className="text-on-surface-variant flex items-center gap-1">
                            <TrendingUp size={11} /> Bravos liés
                          </span>
                          <span className="text-primary">{challenge.bravos_count} / 10</span>
                        </div>
                        <div className="h-2.5 bg-surface-container-low rounded-full overflow-hidden shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1.2, ease: 'circOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-secondary"
                          />
                        </div>
                      </div>

                      {/* Footer row */}
                      <div className="flex items-center justify-between pt-1 border-t border-surface-container-low">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-black text-red-500">
                            <Clock size={13} />
                            {challenge.days_left} jours restants
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-black text-on-surface-variant">
                            <Users size={13} />
                            {challenge.participants_count} participant{challenge.participants_count !== 1 ? 's' : ''}
                          </div>
                        </div>

                        <button
                          onClick={() => handleParticipate(challenge.id)}
                          disabled={isLoading}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer ${
                            isJoined
                              ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                              : 'bg-primary text-white hover:bg-primary/90 shadow-primary/25 shadow-md'
                          }`}
                        >
                          {isLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : isJoined ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <Plus size={14} />
                          )}
                          {isJoined ? 'Inscrit' : 'Participer'}
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}

            {/* Suggestion card — managers/admins only */}
            {canManageChallenges && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: activeChallenges.length * 0.08 }}
              >
                <Card
                  className="border-2 border-dashed border-surface-container-high bg-transparent flex flex-col items-center justify-center p-6 md:p-10 text-center space-y-4 hover:border-primary/40 hover:bg-primary/2 transition-all group cursor-pointer min-h-[220px] md:min-h-[280px]"
                  onClick={() => setShowModal(true)}
                >
                  <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <Plus size={28} />
                  </div>
                  <div>
                    <h3 className="font-black text-base">Lancer un défi</h3>
                    <p className="text-sm text-on-surface-variant font-medium mt-1">
                      Créez une nouvelle mission pour motiver l'équipe.
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Cliquer pour créer →
                  </span>
                </Card>
              </motion.div>
            )}
          </div>
        )}
      </section>

      {/* ── Défis terminés ── */}
      {finishedChallenges.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl text-green-600">
              <Award size={18} />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Défis terminés</h2>
          </div>

          <Card className="p-0 overflow-hidden border-none shadow-xl bg-white/90 backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low/60 text-on-surface-variant text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-5">Nom du Défi</th>
                    <th className="px-8 py-5">Audience</th>
                    <th className="px-8 py-5">Bravos</th>
                    <th className="px-8 py-5">Points bonus</th>
                    <th className="px-8 py-5">Date de fin</th>
                    <th className="px-8 py-5 text-right">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {finishedChallenges.map(challenge => (
                    <tr key={challenge.id} className="hover:bg-primary/4 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-50 text-green-600 rounded-xl shadow-sm shrink-0">
                            <Trophy size={16} />
                          </div>
                          <span className="font-black text-on-surface group-hover:text-primary transition-colors">
                            {challenge.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant">
                          {challenge.for_all ? (
                            <>
                              <Globe size={13} className="text-primary" />
                              <span className="text-primary">Tous</span>
                            </>
                          ) : (
                            <>
                              <UserCheck size={13} />
                              Ciblé
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-on-surface-variant">
                          <Users2 size={14} />
                          {challenge.bravos_count}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-1.5 font-black text-secondary">
                          <Zap size={14} />
                          {challenge.points_bonus} pts
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-medium text-on-surface-variant">
                        {challenge.end_date}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {/* ── Modal : Créer un défi ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="bg-gradient-to-r from-primary to-primary/80 px-8 py-6 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white/70 text-[10px] font-black uppercase tracking-widest">
                    <Flame size={11} /> Nouveau défi
                  </div>
                  <h2 className="text-xl font-black text-white">Lancer une mission</h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">

                {/* Nom */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    Nom du défi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 10 bravos en une semaine"
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
                    placeholder="Décrivez l'objectif et les règles du défi..."
                    rows={3}
                    value={data.description}
                    onChange={e => setData('description', e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary/10 text-sm font-medium placeholder:text-on-surface-variant/50 outline-none resize-none"
                  />
                  {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description}</p>}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                      <Calendar size={11} /> Début <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={data.start_date}
                      onChange={e => setData('start_date', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary/10 text-sm font-medium outline-none"
                    />
                    {errors.start_date && <p className="text-xs text-red-500 font-medium">{errors.start_date}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                      <Calendar size={11} /> Fin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={data.end_date}
                      onChange={e => setData('end_date', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary/10 text-sm font-medium outline-none"
                    />
                    {errors.end_date && <p className="text-xs text-red-500 font-medium">{errors.end_date}</p>}
                  </div>
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
                  {errors.points_bonus && <p className="text-xs text-red-500 font-medium">{errors.points_bonus}</p>}
                </div>

                {/* Audience */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                    <Users size={11} /> Audience du défi
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setData('for_all', true)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        data.for_all
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-surface-container-high text-on-surface-variant hover:border-primary/30'
                      }`}
                    >
                      <Globe size={22} />
                      <div className="text-center">
                        <p className="text-xs font-black">Tous les employés</p>
                        <p className="text-[10px] font-medium opacity-70 mt-0.5">Visible par tout le monde</p>
                      </div>
                      {data.for_all && (
                        <CheckCircle2 size={16} className="text-primary" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setData('for_all', false)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        !data.for_all
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-surface-container-high text-on-surface-variant hover:border-primary/30'
                      }`}
                    >
                      <UserCheck size={22} />
                      <div className="text-center">
                        <p className="text-xs font-black">Équipe ciblée</p>
                        <p className="text-[10px] font-medium opacity-70 mt-0.5">Groupe sélectionné</p>
                      </div>
                      {!data.for_all && (
                        <CheckCircle2 size={16} className="text-primary" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => { setShowModal(false); reset(); }}
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
                      <><Flame size={16} /> Lancer le défi</>
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
