import { FormEvent, useMemo, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Search, Trash2, UserCog, Save, Plus, Pencil } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface UserRow {
  id: number;
  name: string;
  email: string;
  role_label: string | null;
  direction_id: number | null;
  direction: string | null;
  points_total: number;
  roles: string[];
}

interface DirectionOption {
  id: number;
  name: string;
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
  directions: DirectionOption[];
}

export default function AdminUsers({ users, filters, assignable_roles, directions }: AdminUsersProps) {
  const { auth } = usePage<{ auth: { is_super_admin?: boolean } }>().props;
  const [q, setQ] = useState(filters.q ?? '');
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    direction_id: '',
    role_label: 'Employe',
    role: assignable_roles[0] ?? 'employee',
    password: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    direction_id: '' as string | number,
    role_label: '',
    role: assignable_roles[0] ?? 'employee',
  });

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    router.get('/admin/users', { q: q.trim() || undefined }, { preserveState: true });
  };

  const beginEdit = (user: UserRow) => {
    setEditing(user);
    setEditForm({
      name: user.name,
      email: user.email,
      direction_id: user.direction_id ?? '',
      role_label: user.role_label ?? '',
      role: user.roles[0] ?? 'employee',
    });
    setOpenEdit(true);
  };

  const saveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    router.patch(
      `/admin/users/${editing.id}`,
      {
        name: editForm.name,
        email: editForm.email,
        direction_id: editForm.direction_id ? Number(editForm.direction_id) : null,
        role_label: editForm.role_label ?? '',
        role: editForm.role,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setOpenEdit(false);
          setEditing(null);
        },
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
      onSuccess: () => {
        setCreateForm({
          name: '',
          email: '',
          direction_id: '',
          role_label: 'Employe',
          role: assignable_roles[0] ?? 'employee',
          password: '',
        });
        setOpenCreate(false);
      },
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

      <div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button type="button" className="gap-2">
              <Plus size={14} />
              Créer un user
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un utilisateur</DialogTitle>
              <DialogDescription>Ajoutez un compte avec rôle et direction.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submitCreate} className="grid md:grid-cols-2 gap-3">
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nom"
                className="rounded-lg border border-surface-container-high px-3 py-2 text-sm"
                required
              />
              <input
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
                className="rounded-lg border border-surface-container-high px-3 py-2 text-sm"
                type="email"
                required
              />
              <select
                value={createForm.direction_id}
                onChange={(e) => setCreateForm((f) => ({ ...f, direction_id: e.target.value }))}
                className="rounded-lg border border-surface-container-high px-3 py-2 text-sm"
              >
                <option value="">Direction (optionnel)</option>
                {directions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
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
              <div className="md:col-span-2">
                <Button type="submit" className="gap-1">
                  <Plus size={14} />
                  Créer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={openEdit}
          onOpenChange={(v) => {
            setOpenEdit(v);
            if (!v) setEditing(null);
          }}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier un utilisateur</DialogTitle>
              <DialogDescription>Modifiez les informations et le rôle Spatie.</DialogDescription>
            </DialogHeader>

            <form onSubmit={saveEdit} className="grid md:grid-cols-2 gap-3">
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nom"
                className="rounded-lg border border-surface-container-high px-3 py-2 text-sm"
                required
              />
              <input
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
                className="rounded-lg border border-surface-container-high px-3 py-2 text-sm"
                type="email"
                required
              />

              <select
                value={editForm.direction_id}
                onChange={(e) => setEditForm((f) => ({ ...f, direction_id: e.target.value }))}
                className="rounded-lg border border-surface-container-high px-3 py-2 text-sm bg-white"
              >
                <option value="">Direction (optionnel)</option>
                {directions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <input
                value={editForm.role_label}
                onChange={(e) => setEditForm((f) => ({ ...f, role_label: e.target.value }))}
                placeholder="Libellé rôle"
                className="rounded-lg border border-surface-container-high px-3 py-2 text-sm"
              />

              <select
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                className="rounded-lg border border-surface-container-high px-3 py-2 text-sm bg-white"
              >
                {assignable_roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <Button type="submit" className="gap-1">
                  <Save size={14} />
                  Enregistrer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
              const directionLabel =
                u.direction ??
                (u.direction_id ? directions.find((d) => d.id === u.direction_id)?.name : null) ??
                '—';

              return (
                <tr key={u.id} className="border-b border-surface-container-low hover:bg-surface-container-low/30">
                  <td className="p-4">
                    <p className="font-bold text-on-surface">{u.name}</p>
                    <p className="text-xs text-on-surface-variant">{u.email}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-semibold text-on-surface">{directionLabel}</p>
                  </td>
                  <td className="p-4 font-mono">{u.points_total.toLocaleString()}</td>
                  <td className="p-4">
                    <p className="text-xs font-semibold text-on-surface-variant">{u.role_label ?? '—'}</p>
                    <p className="font-mono text-xs mt-1">{current}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => beginEdit(u)}
                      >
                        <Pencil size={14} />
                        Modifier
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
