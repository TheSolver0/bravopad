import { FormEvent, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Search, Trash2, UserCog, Save, Plus } from 'lucide-react';
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
  const [pending, setPending] = useState<Record<number, UserRow & { role: string }>>({});
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    department: '',
    role_label: 'Employe',
    role: assignable_roles[0] ?? 'employee',
    password: '',
  });

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    router.get('/admin/users', { q: q.trim() || undefined }, { preserveState: true });
  };

  const setDraftField = (user: UserRow, field: 'name' | 'email' | 'department' | 'role_label' | 'role', value: string) => {
    setPending((p) => {
      const current = p[user.id] ?? { ...user, role: user.roles[0] ?? 'employee' };
      return { ...p, [user.id]: { ...current, [field]: value } };
    });
  };

  const saveUser = (user: UserRow) => {
    const data = pending[user.id];
    if (!data) return;
    router.patch(
      `/admin/users/${user.id}`,
      {
        name: data.name,
        email: data.email,
        department: data.department ?? '',
        role_label: data.role_label ?? '',
        role: data.role,
      },
      {
        preserveScroll: true,
        onSuccess: () =>
          setPending((p) => {
            const n = { ...p };
            delete n[user.id];
            return n;
          }),
      },
    );
  };

  const deleteUser = (user: UserRow) => {
    if (!confirm(`Supprimer ${user.name} ?`)) return;
    router.delete(`/admin/users/${user.id}`, { preserveScroll: true });
  };

  const submitCreate = (e: FormEvent) => {
    e.preventDefault();
    router.post('/admin/users', createForm, {
      preserveScroll: true,
      onSuccess: () =>
        setCreateForm({
          name: '',
          email: '',
          department: '',
          role_label: 'Employe',
          role: assignable_roles[0] ?? 'employee',
          password: '',
        }),
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto" >
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

      <Card className="border-none shadow-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant">Créer un utilisateur</h2>
        </div>
        <form onSubmit={submitCreate} className="grid md:grid-cols-6 gap-3">
          <input
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nom"
            className="md:col-span-2 rounded-lg border border-surface-container-high px-3 py-2 text-sm"
            required
          />
          <input
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Email"
            className="md:col-span-2 rounded-lg border border-surface-container-high px-3 py-2 text-sm"
            type="email"
            required
          />
          <input
            value={createForm.department}
            onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))}
            placeholder="Direction"
            className="rounded-lg border border-surface-container-high px-3 py-2 text-sm"
          />
          <input
            value={createForm.role_label}
            onChange={(e) => setCreateForm((f) => ({ ...f, role_label: e.target.value }))}
            placeholder="Libellé rôle"
            className="rounded-lg border border-surface-container-high px-3 py-2 text-sm"
          />
          <select
            value={createForm.role}
            onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
            className="rounded-lg border border-surface-container-high px-3 py-2 text-sm"
          >
            {assignable_roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            value={createForm.password}
            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Mot de passe"
            className="rounded-lg border border-surface-container-high px-3 py-2 text-sm"
            type="password"
            required
          />
          <div className="md:col-span-6">
            <Button type="submit" size="sm" className="gap-1">
              <Plus size={14} />
              Créer
            </Button>
          </div>
        </form>
      </Card>

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

      <Card className="overflow-x-auto border-none shadow-lg" style={{background: 'white'}}>
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
              const draft = pending[u.id] ?? { ...u, role: current };
              const dirty =
                draft.name !== u.name ||
                draft.email !== u.email ||
                (draft.department ?? '') !== (u.department ?? '') ||
                (draft.role_label ?? '') !== (u.role_label ?? '') ||
                draft.role !== current;

              return (
                <tr key={u.id} className="border-b border-surface-container-low hover:bg-surface-container-low/30">
                  <td className="p-4">
                    <input
                      value={draft.name}
                      onChange={(e) => setDraftField(u, 'name', e.target.value)}
                      className="w-full rounded-md border border-surface-container-high px-2 py-1 text-sm font-bold"
                    />
                    <input
                      value={draft.email}
                      onChange={(e) => setDraftField(u, 'email', e.target.value)}
                      className="w-full mt-1 rounded-md border border-surface-container-high px-2 py-1 text-xs text-on-surface-variant"
                    />
                  </td>
                  <td className="p-4">
                    <input
                      value={draft.department ?? ''}
                      onChange={(e) => setDraftField(u, 'department', e.target.value)}
                      className="w-full rounded-md border border-surface-container-high px-2 py-1 text-sm"
                      placeholder="Direction"
                    />
                  </td>
                  <td className="p-4 font-mono">{u.points_total.toLocaleString()}</td>
                  <td className="p-4">
                    <input
                      value={draft.role_label ?? ''}
                      onChange={(e) => setDraftField(u, 'role_label', e.target.value)}
                      className="w-full mb-1 rounded-md border border-surface-container-high px-2 py-1 text-xs"
                      placeholder="Libellé rôle"
                    />
                    <select
                      value={draft.role}
                      onChange={(e) => setDraftField(u, 'role', e.target.value)}
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
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        disabled={!dirty}
                        onClick={() => saveUser(u)}
                      >
                        <Save size={14} />
                        Enregistrer
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="gap-1 text-xs" onClick={() => deleteUser(u)}>
                        <Trash2 size={14} />
                        Suppr.
                      </Button>
                    </div>
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
