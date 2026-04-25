import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { KeyRound, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface RoleRow {
  id: number;
  name: string;
  users_count: number;
  permission_names: string[];
}

interface AdminRolesProps {
  roles: RoleRow[];
  permissions: string[];
}

export default function AdminRoles({ roles, permissions }: AdminRolesProps) {
  const [selectedId, setSelectedId] = useState<number>(roles[0]?.id ?? 0);
  const selected = roles.find((r) => r.id === selectedId) ?? roles[0];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selected) return;
    const next: Record<string, boolean> = {};
    permissions.forEach((p) => {
      next[p] = selected.permission_names.includes(p);
    });
    setChecked(next);
  }, [selected, permissions]);

  const toggle = (name: string) => {
    setChecked((c) => ({ ...c, [name]: !c[name] }));
  };

  const handleSave = () => {
    if (!selected) return;
    const names = permissions.filter((p) => checked[p]);
    router.patch(`/admin/roles/${selected.id}`, { permission_names: names }, { preserveScroll: true });
  };

  const grouped = useMemo(() => {
    const g: Record<string, string[]> = {};
    permissions.forEach((p) => {
      const prefix = p.split('-')[0] ?? 'autre';
      if (!g[prefix]) g[prefix] = [];
      g[prefix].push(p);
    });
    return g;
  }, [permissions]);

  if (!selected) {
    return <p className="p-8 text-center text-on-surface-variant">Aucun rôle défini.</p>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-secondary/15 text-secondary">
          <KeyRound size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Rôles & permissions</h1>
          <p className="text-sm text-on-surface-variant font-medium">
            Ajustez les permissions Spatie par rôle. Les comptes super_admin contournent les policies via Gate.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedId(r.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              r.id === selectedId ? 'bg-primary text-white shadow-md' : 'bg-white border border-surface-container-high text-on-surface-variant'
            }`}
          >
            {r.name}
            <span className="ml-1 opacity-70">({r.users_count})</span>
          </button>
        ))}
      </div>

      <Card className="p-6 space-y-6 border-none shadow-lg">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-extrabold capitalize">{selected.name}</h2>
            <p className="text-xs text-on-surface-variant">{selected.users_count} utilisateur(s) avec ce rôle</p>
          </div>
          <Button type="button" variant="primary" className="gap-2" onClick={handleSave}>
            <Save size={16} />
            Enregistrer les permissions
          </Button>
        </div>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
          {Object.entries(grouped).map(([prefix, perms]) => (
            <div key={prefix}>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">{prefix}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {perms.map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 rounded-lg border border-surface-container-high px-3 py-2 bg-surface-container-low/40 cursor-pointer hover:border-primary/30"
                  >
                    <input type="checkbox" checked={!!checked[p]} onChange={() => toggle(p)} className="rounded border-surface-container-high" />
                    <span className="text-xs font-mono text-on-surface">{p}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
