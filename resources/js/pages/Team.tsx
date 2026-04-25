import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Search, Award, Users2 } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { User } from './types';

interface TeamProps {
  users: User[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export default function Team({ users, pagination }: TeamProps) {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('Tous');

  const departments = ['Tous', ...Array.from(new Set(users.map(u => u.department).filter(Boolean)))];
  const deptClasses: Record<string, string> = {
    Tous: 'bg-slate-100 text-slate-700',
    DSI: 'bg-blue-100 text-blue-800',
    DRH: 'bg-pink-100 text-pink-800',
    DCRP: 'bg-purple-100 text-purple-800',
    DEX: 'bg-amber-100 text-amber-800',
    DCG: 'bg-emerald-100 text-emerald-800',
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase());
    const matchDept   = selectedDept === 'Tous' || u.department === selectedDept;
    return matchSearch && matchDept;
  });
  const startAt = useMemo(() => ((pagination.current_page - 1) * pagination.per_page) + 1, [pagination.current_page, pagination.per_page]);
  const endAt = useMemo(() => Math.min(pagination.current_page * pagination.per_page, pagination.total), [pagination.current_page, pagination.per_page, pagination.total]);
  const pages = useMemo(() => {
    const from = Math.max(1, pagination.current_page - 2);
    const to = Math.min(pagination.last_page, pagination.current_page + 2);
    return Array.from({ length: to - from + 1 }, (_, idx) => from + idx);
  }, [pagination.current_page, pagination.last_page]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Équipe</h1>
          <p className="text-sm text-on-surface-variant font-medium">
            {pagination.total.toLocaleString()} membres dans l'organisation.
          </p>
        </div>
        <div className="w-full md:w-auto max-w-full overflow-x-auto bg-surface-container-low p-1 rounded-xl shadow-inner">
          <div className="flex items-center gap-2 min-w-max">
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border ${
                selectedDept === dept
                  ? 'shadow-md scale-[1.02] border-white text-white bg-gradient-to-r from-primary to-secondary'
                  : `${deptClasses[dept] ?? 'bg-slate-100 text-slate-700'} border-transparent hover:brightness-95`
              }`}
            >
              {dept}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
        <input
          type="text"
          placeholder="Rechercher par nom ou rôle..."
          className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border-none shadow-sm focus:ring-2 focus:ring-primary/20 text-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Grille des membres */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <Users2 className="mx-auto mb-3 opacity-30" size={40} />
          <p className="font-bold">Aucun membre trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((user, index) => (
            <Card
              key={user.id}
              className="group relative overflow-hidden border-none hover:shadow-2xl transition-all duration-500 flex flex-col items-center text-center p-6 space-y-4 bg-white/80 backdrop-blur-md cursor-pointer"
            >
              {/* Rang dans le classement */}
              {index < 3 && (
                <div className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shadow ${
                  index === 0 ? 'bg-yellow-400 text-yellow-900' : index === 1 ? 'bg-gray-300 text-gray-700' : 'bg-orange-300 text-orange-900'
                }`}>
                  {index + 1}
                </div>
              )}

              {/* Avatar */}
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-20 h-20 rounded-2xl shadow-lg border-4 border-white group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow" />
              </div>

              {/* Infos */}
              <div className="space-y-1 w-full">
                <p className="font-extrabold text-on-surface group-hover:text-primary transition-colors truncate">{user.name}</p>
                <p className="text-xs font-semibold text-on-surface-variant truncate">{user.role}</p>
                {user.department && (
                  <Badge variant="secondary" className="bg-surface-container-high/50 text-on-surface-variant border-none text-[10px] mt-1">
                    DIR: {user.department}
                  </Badge>
                )}
              </div>

              {/* Score */}
              <div className="w-full pt-3 border-t border-surface-container-low flex items-center justify-center gap-1.5">
                <Award size={16} className="text-secondary" />
                <span className="font-black text-primary text-sm">{user.points_total.toLocaleString()}</span>
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">pts</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2">
        <p className="text-xs text-on-surface-variant">
          Affichage {startAt}-{endAt} sur {pagination.total.toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          {pagination.current_page <= 1 ? (
            <span className="px-3 py-1.5 text-xs rounded-full border-2 border-primary/20 text-primary/40 cursor-not-allowed">
              Précédent
            </span>
          ) : (
            <Link
              href={`/team?page=${pagination.current_page - 1}`}
              preserveScroll
              className="px-3 py-1.5 text-xs rounded-full border-2 border-primary/20 text-primary hover:bg-primary/5 font-semibold"
            >
              Précédent
            </Link>
          )}

          {pages.map((page) => (
            <Link
              key={page}
              href={`/team?page=${page}`}
              preserveScroll
              className={`min-w-9 px-3 py-1.5 text-xs rounded-full font-semibold text-center ${
                page === pagination.current_page
                  ? 'bg-primary text-white'
                  : 'border-2 border-primary/20 text-primary hover:bg-primary/5'
              }`}
            >
              {page}
            </Link>
          ))}

          {pagination.current_page >= pagination.last_page ? (
            <span className="px-3 py-1.5 text-xs rounded-full border-2 border-primary/20 text-primary/40 cursor-not-allowed">
              Suivant
            </span>
          ) : (
            <Link
              href={`/team?page=${pagination.current_page + 1}`}
              preserveScroll
              className="px-3 py-1.5 text-xs rounded-full border-2 border-primary/20 text-primary hover:bg-primary/5 font-semibold"
            >
              Suivant
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
