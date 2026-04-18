import React from 'react';
import { motion } from 'motion/react';
import {
  Lightbulb,
  Users2,
  Clock,
  Eye,
  Trophy,
  Target,
  Zap,
  Award
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Challenge } from './types';

interface ChallengesProps {
  challenges: Challenge[];
}

export default function Challenges({ challenges }: ChallengesProps) {
  const activeChallenges  = challenges.filter(c => c.status === 'active');
  const finishedChallenges = challenges.filter(c => c.status === 'finished');

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="primary" className="bg-primary/10 text-primary border-none">Centre de Défis</Badge>
          <h1 className="text-4xl font-black tracking-tight">Défis & Missions</h1>
          <p className="text-on-surface-variant font-medium max-w-2xl">
            Relevez des défis collectifs ou individuels pour gagner des points, débloquer des badges exclusifs et renforcer l'esprit d'équipe.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-surface-container-high">
          <div className="px-4 py-2 text-center border-r border-surface-container-high">
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Actifs</p>
            <p className="text-xl font-black text-primary">{activeChallenges.length}</p>
          </div>
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Terminés</p>
            <p className="text-xl font-black text-green-600">{finishedChallenges.length}</p>
          </div>
        </div>
      </div>

      {/* Missions en cours */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary/20 rounded-lg text-secondary">
            <Zap size={20} />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Missions en cours</h2>
        </div>

        {activeChallenges.length === 0 ? (
          <Card className="p-10 text-center border-none bg-white/80">
            <Target className="mx-auto mb-3 text-primary/30" size={40} />
            <p className="font-bold text-on-surface-variant">Aucun défi actif pour le moment.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeChallenges.map((challenge) => (
              <Card key={challenge.id} className="group relative overflow-hidden border-none hover:shadow-2xl transition-all duration-500 flex flex-col h-full">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Lightbulb size={120} />
                </div>

                <div className="flex items-start justify-between mb-6">
                  <div className="p-4 rounded-2xl shadow-inner bg-orange-50 text-orange-600">
                    <Lightbulb size={28} />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Récompense</span>
                    <div className="text-2xl font-black text-secondary">+{challenge.points_bonus} pts</div>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <h3 className="text-xl font-black group-hover:text-primary transition-colors">{challenge.name}</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{challenge.description}</p>
                </div>

                <div className="mt-8 space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-on-surface-variant">Bravos liés</span>
                      <span className="text-primary">{challenge.bravos_count}</span>
                    </div>
                    <div className="h-3 bg-surface-container-low rounded-full overflow-hidden shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (challenge.bravos_count / 10) * 100)}%` }}
                        transition={{ duration: 1.5, ease: 'circOut' }}
                        className="h-full rounded-full shadow-lg bg-gradient-to-r from-orange-400 to-secondary"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 text-xs text-red-500 font-black uppercase tracking-wider">
                      <Clock size={16} />
                      <span>{challenge.days_left} jours restants</span>
                    </div>
                    <Button variant="primary" className="px-6 py-2 shadow-lg shadow-primary/20">Participer</Button>
                  </div>
                </div>
              </Card>
            ))}

            {/* Carte suggestion */}
            <Card className="border-2 border-dashed border-surface-container-high bg-transparent flex flex-col items-center justify-center p-10 text-center space-y-4 hover:border-primary/30 transition-colors group cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-all">
                <Target size={32} />
              </div>
              <div>
                <h3 className="font-black text-lg">Suggérer un défi</h3>
                <p className="text-sm text-on-surface-variant font-medium mt-1">Vous avez une idée de mission pour l'équipe ?</p>
              </div>
              <Button variant="ghost" className="text-xs font-black uppercase tracking-widest">Proposer</Button>
            </Card>
          </div>
        )}
      </section>

      {/* Défis terminés */}
      {finishedChallenges.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <Award size={20} />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Défis terminés</h2>
          </div>

          <Card className="p-0 overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low/50 text-on-surface-variant text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-6">Nom du Défi</th>
                    <th className="px-8 py-6">Bravos</th>
                    <th className="px-8 py-6">Points distribués</th>
                    <th className="px-8 py-6">Date de fin</th>
                    <th className="px-8 py-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {finishedChallenges.map(challenge => (
                    <tr key={challenge.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-green-50 text-green-600 rounded-xl shadow-sm">
                            <Trophy size={18} />
                          </div>
                          <span className="font-black text-on-surface group-hover:text-primary transition-colors">{challenge.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-1.5">
                          <Users2 size={14} className="text-on-surface-variant" />
                          <span className="font-bold text-on-surface-variant">{challenge.bravos_count}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-black text-primary">
                        <div className="flex items-center gap-1.5">
                          <Zap size={14} className="text-secondary" />
                          {challenge.points_bonus} pts bonus
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm font-medium text-on-surface-variant">{challenge.end_date}</td>
                      <td className="px-8 py-6 text-right">
                        <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                          <Eye size={20} />
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
    </div>
  );
}
