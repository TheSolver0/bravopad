import { FormEvent, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Search, UserCog, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UserRow {
  id: number;
  name: string;
  email: string;
  role_label: string | null;
  department: string | null;
  points_total: number;
  roles: string[];
}

interface PaginatedUsers {
  data: UserRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface AdminUsersProps {
  users: PaginatedUsers;
  filters: { q: string };
  assignable_roles: string[];
}

export default function AdminUsers({ users, filters, assignable_roles }: AdminUsersProps) {
  const { auth } = usePage<{ auth: { is_super_admin?: boolean } }>().props;
  const [q, setQ] = useState(filters.q ?? '');
  const [pending, setPending] = useState<Record<number, string>>({});

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    router.get('/admin/users', { q: q.trim() || undefined }, { preserveState: true });
  };

  const setRoleDraft = (userId: number, role: string) => {
    setPending((p) => ({ ...p, [userId]: role }));
  };

  const saveRole = (userId: number) => {
    const role = pending[userId];
    if (!role) return;
    router.patch(
      `/admin/users/${userId}`,
      { role },
      { preserveScroll: true, onSuccess: () => setPending((p) => { const n = { ...p }; delete n[userId]; return n; }) },
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <UserCog size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Utilisateurs</h1>
            <p className="text-sm text-on-surface-variant font-medium">
              Attribuez les rôles Spatie (employé, manager, RH, admin).{' '}
              {auth?.is_super_admin ? 'Super admin : tous les rôles.' : ''}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-container-high bg-white text-sm"
          />
        </div>
        <Button type="submit" variant="secondary" className="shrink-0">
          Filtrer
        </Button>
      </form>

      <Card className="overflow-x-auto border-none shadow-lg">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant border-b border-surface-container-high">
              <th className="p-4">Utilisateur</th>
              <th className="p-4">Direction</th>
              <th className="p-4">Points</th>
              <th className="p-4">Rôle Spatie</th>
              <th className="p-4 w-40" />
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((u) => {
              const current = u.roles[0] ?? 'employee';
              const draft = pending[u.id] ?? current;

              return (
                <tr key={u.id} className="border-b border-surface-container-low hover:bg-surface-container-low/30">
                  <td className="p-4">
                    <p className="font-bold text-on-surface">{u.name}</p>
                    <p className="text-xs text-on-surface-variant">{u.email}</p>
                  </td>
                  <td className="p-4 text-on-surface-variant">{u.department ?? '—'}</td>
                  <td className="p-4 font-mono">{u.points_total.toLocaleString()}</td>
                  <td className="p-4">
                    <select
                      value={draft}
                      onChange={(e) => setRoleDraft(u.id, e.target.value)}
                      className="w-full max-w-[200px] rounded-lg border border-surface-container-high px-2 py-1.5 text-xs font-semibold bg-white"
                    >
                      {assignable_roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      disabled={draft === current}
                      onClick={() => saveRole(u.id)}
                    >
                      <Save size={14} />
                      Enregistrer
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {users.last_page > 1 && (
        <div className="flex justify-center gap-3 text-xs font-bold">
          {users.current_page > 1 ? (
            <Link href={`/admin/users?page=${users.current_page - 1}${filters.q ? `&q=${encodeURIComponent(filters.q)}` : ''}`} preserveScroll className="text-primary">
              Précédent
            </Link>
          ) : (
            <span className="text-on-surface-variant/40">Précédent</span>
          )}
          <span className="text-on-surface-variant">
            {users.current_page} / {users.last_page}
          </span>
          {users.current_page < users.last_page ? (
            <Link href={`/admin/users?page=${users.current_page + 1}${filters.q ? `&q=${encodeURIComponent(filters.q)}` : ''}`} preserveScroll className="text-primary">
              Suivant
            </Link>
          ) : (
            <span className="text-on-surface-variant/40">Suivant</span>
          )}
        </div>
      )}
    </div>
  );
}
