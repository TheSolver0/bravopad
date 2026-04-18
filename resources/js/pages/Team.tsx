import { useState } from 'react';
import { Search, Award, Users2 } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { User } from './types';

interface TeamProps {
  users: User[];
}

export default function Team({ users }: TeamProps) {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('Tous');

  const departments = ['Tous', ...Array.from(new Set(users.map(u => u.department).filter(Boolean)))];

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase());
    const matchDept   = selectedDept === 'Tous' || u.department === selectedDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Équipe</h1>
          <p className="text-sm text-on-surface-variant font-medium">{users.length} membre{users.length !== 1 ? 's' : ''} dans l'organisation.</p>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-xl shadow-inner">
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                selectedDept === dept ? 'bg-white shadow-md text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {dept}
            </button>
          ))}
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
                    {user.department}
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
    </div>
  );
}
