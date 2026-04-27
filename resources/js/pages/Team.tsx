import { useMemo, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Search, Award, Users, ChevronDown, Check, Building2, X } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { User } from './types';

interface TeamProps {
  users: User[];
  departments: string[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export default function Team({ users, departments: deptList, pagination }: TeamProps) {
  const [search, setSearch]           = useState('');
  const [selectedDept, setSelectedDept] = useState('Tous');
  const [deptSearch, setDeptSearch]   = useState('');
  const deptInputRef = useRef<HTMLInputElement>(null);

  const allDepts = ['Tous', ...deptList];
  const filteredDepts = allDepts.filter(d =>
    d.toLowerCase().includes(deptSearch.toLowerCase())
  );

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase());
    const matchDept = selectedDept === 'Tous' || u.department === selectedDept;
    return matchSearch && matchDept;
  });

  const startAt = useMemo(() => ((pagination.current_page - 1) * pagination.per_page) + 1, [pagination]);
  const endAt   = useMemo(() => Math.min(pagination.current_page * pagination.per_page, pagination.total), [pagination]);
  const pages   = useMemo(() => {
    const from = Math.max(1, pagination.current_page - 2);
    const to   = Math.min(pagination.last_page, pagination.current_page + 2);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [pagination.current_page, pagination.last_page]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">Personnel</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {pagination.total.toLocaleString()} membres · {deptList.length} directions
          </p>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 pointer-events-none" size={16} />
          <input
            type="text"
            placeholder="Rechercher par nom ou rôle…"
            className="w-full h-10 pl-10 pr-9 bg-white rounded-xl border border-surface-container-high text-sm shadow-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/25 transition"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant"
              onClick={() => setSearch('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtre direction */}
        <DropdownMenu onOpenChange={open => { if (open) setTimeout(() => deptInputRef.current?.focus(), 50); else setDeptSearch(''); }}>
          <DropdownMenuTrigger asChild>
            <button className="h-10 flex items-center gap-2 px-4 bg-white rounded-xl border border-surface-container-high text-sm font-semibold shadow-sm hover:bg-surface-container-low transition focus:outline-none focus:ring-2 focus:ring-primary/25 min-w-[180px] sm:min-w-[200px]">
              <Building2 size={15} className="text-primary shrink-0" />
              <span className="truncate flex-1 text-left text-on-surface">
                {selectedDept === 'Tous' ? 'Toutes les directions' : selectedDept}
              </span>
              <ChevronDown size={14} className="text-on-surface-variant shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-0" sideOffset={6}>
            {/* Search inside dropdown */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  ref={deptInputRef}
                  type="text"
                  placeholder="Rechercher une direction…"
                  className="w-full h-8 pl-8 pr-3 text-xs bg-muted rounded-md focus:outline-none focus:ring-1 focus:ring-primary/30"
                  value={deptSearch}
                  onChange={e => setDeptSearch(e.target.value)}
                  onKeyDown={e => e.stopPropagation()}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto py-1">
              {filteredDepts.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">Aucun résultat</p>
              ) : filteredDepts.map(dept => (
                <DropdownMenuItem
                  key={dept}
                  onSelect={() => setSelectedDept(dept)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className={`size-4 flex items-center justify-center shrink-0 ${selectedDept === dept ? 'text-primary' : 'text-transparent'}`}>
                    <Check size={13} />
                  </span>
                  <span className={dept === 'Tous' ? 'italic text-muted-foreground' : ''}>
                    {dept === 'Tous' ? 'Toutes les directions' : dept}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>

            {selectedDept !== 'Tous' && (
              <>
                <DropdownMenuSeparator />
                <div className="p-1">
                  <DropdownMenuItem
                    onSelect={() => setSelectedDept('Tous')}
                    className="text-xs text-muted-foreground justify-center cursor-pointer"
                  >
                    Réinitialiser le filtre
                  </DropdownMenuItem>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Résumé actif */}
      {(search || selectedDept !== 'Tous') && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-on-surface-variant">
          <span>{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          {selectedDept !== 'Tous' && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition"
              onClick={() => setSelectedDept('Tous')}
            >
              {selectedDept} <X size={10} />
            </Badge>
          )}
          {search && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition"
              onClick={() => setSearch('')}
            >
              "{search}" <X size={10} />
            </Badge>
          )}
        </div>
      )}

      {/* Grille */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant">
          <Users className="mx-auto mb-4 opacity-20" size={48} />
          <p className="font-bold text-base">Aucun membre trouvé</p>
          <p className="text-sm mt-1 opacity-70">Essayez de modifier vos filtres</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((user, index) => (
            <Card
              key={user.id}
              className="group relative overflow-hidden border border-surface-container-high/60 hover:border-primary/20 hover:shadow-lg transition-all duration-300 bg-white flex flex-col items-center text-center p-5 gap-3"
            >
              {/* Médaille top 3 */}
              {index < 3 && (
                <div className={`absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300'
                  : index === 1 ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-300'
                  : 'bg-orange-100 text-orange-600 ring-1 ring-orange-300'
                }`}>
                  {index + 1}
                </div>
              )}

              {/* Avatar */}
              <div className="relative mt-1">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white ring-1 ring-surface-container-high group-hover:ring-primary/30 transition-all duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
              </div>

              {/* Infos */}
              <div className="w-full space-y-0.5">
                <p className="font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">{user.name}</p>
                <p className="text-xs text-on-surface-variant truncate">{user.role}</p>
                {user.department && (
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant/70 bg-surface-container-low rounded-full px-2 py-0.5">
                      <Building2 size={9} />
                      {user.department}
                    </span>
                  </div>
                )}
              </div>

              {/* Score */}
              <div className="w-full border-t border-surface-container-low pt-3 flex items-center justify-center gap-1.5">
                <Award size={14} className="text-primary/60" />
                <span className="font-extrabold text-primary text-sm">{user.points_total.toLocaleString()}</span>
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">pts</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <p className="text-xs text-on-surface-variant">
          {startAt}–{endAt} sur {pagination.total.toLocaleString()} membres
        </p>
        <div className="flex items-center gap-1.5">
          {pagination.current_page <= 1 ? (
            <span className="px-3 py-1.5 text-xs rounded-lg border border-border text-on-surface-variant/40 cursor-not-allowed select-none">
              ← Précédent
            </span>
          ) : (
            <Link
              href={`/team?page=${pagination.current_page - 1}`}
              preserveScroll
              className="px-3 py-1.5 text-xs rounded-lg border border-border text-on-surface hover:bg-surface-container-low font-medium transition"
            >
              ← Précédent
            </Link>
          )}

          {pages.map(page => (
            <Link
              key={page}
              href={`/team?page=${page}`}
              preserveScroll
              className={`min-w-8 px-2.5 py-1.5 text-xs rounded-lg font-semibold text-center transition ${
                page === pagination.current_page
                  ? 'bg-primary text-white shadow-sm'
                  : 'border border-border text-on-surface hover:bg-surface-container-low'
              }`}
            >
              {page}
            </Link>
          ))}

          {pagination.current_page >= pagination.last_page ? (
            <span className="px-3 py-1.5 text-xs rounded-lg border border-border text-on-surface-variant/40 cursor-not-allowed select-none">
              Suivant →
            </span>
          ) : (
            <Link
              href={`/team?page=${pagination.current_page + 1}`}
              preserveScroll
              className="px-3 py-1.5 text-xs rounded-lg border border-border text-on-surface hover:bg-surface-container-low font-medium transition"
            >
              Suivant →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
