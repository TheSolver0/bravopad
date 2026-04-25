import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Shield, Users, Award, TrendingUp, Building2, ChevronDown } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import type { Permission } from './types';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  permission: Permission;
  department: string | null;
  avatar: string;
  points_total: number;
}

interface Department {
  id: number;
  name: string;
  employees_count: number;
}

interface Stats {
  total_users: number;
  total_bravos: number;
  total_points: number;
  admins: number;
  managers: number;
  employees: number;
}

interface AdminProps {
  users: AdminUser[];
  departments: Department[];
  stats: Stats;
}

const PERM_LABELS: Record<Permission, { label: string; color: string; bg: string }> = {
  admin:    { label: 'Admin',    color: '#dc2626', bg: '#fef2f2' },
  manager:  { label: 'Manager',  color: '#d97706', bg: '#fffbeb' },
  employee: { label: 'Employé',  color: '#6b7280', bg: '#f9fafb' },
};

export default function Admin({ users, departments, stats }: AdminProps) {
  const [updating, setUpdating] = useState<number | null>(null);

  const handlePermissionChange = (user: AdminUser, permission: Permission) => {
    if (permission === user.permission) return;
    setUpdating(user.id);
    router.patch(
      `/admin/users/${user.id}/permission`,
      { permission },
      {
        preserveScroll: true,
        onFinish: () => setUpdating(null),
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-red-50 text-red-600">
          <Shield size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Administration</h1>
          <p className="text-sm text-on-surface-variant">Gestion des utilisateurs et des permissions</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Utilisateurs', value: stats.total_users,  icon: Users,      color: '#6366f1' },
          { label: 'Bravos',       value: stats.total_bravos, icon: Award,      color: '#10b981' },
          { label: 'Points total', value: stats.total_points, icon: TrendingUp, color: '#f59e0b' },
          { label: 'Admins',       value: stats.admins,       icon: Shield,     color: '#dc2626' },
          { label: 'Managers',     value: stats.managers,     icon: Users,      color: '#d97706' },
          { label: 'Employés',     value: stats.employees,    icon: Users,      color: '#6b7280' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-none bg-white/90 p-4 space-y-1">
            <div className="flex items-center gap-1.5" style={{ color }}>
              <Icon size={13} />
              <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-extrabold" style={{ color }}>{value.toLocaleString()}</p>
          </Card>
        ))}
      </div>

      {/* Departments */}
      <Card className="border-none bg-white/90 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-on-surface-variant" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Départements</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {departments.map(dept => (
            <div key={dept.id} className="flex items-center gap-2 px-3 py-2 bg-surface-container-low rounded-xl">
              <span className="font-bold text-sm">{dept.name}</span>
              <Badge className="bg-primary/10 text-primary border-none text-[10px]">
                {dept.employees_count} membre{dept.employees_count !== 1 ? 's' : ''}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* User table */}
      <Card className="border-none bg-white/90 space-y-4">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-on-surface-variant" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Utilisateurs</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-container-high text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                <th className="text-left pb-3 pr-4">Utilisateur</th>
                <th className="text-left pb-3 pr-4">Département</th>
                <th className="text-left pb-3 pr-4">Poste</th>
                <th className="text-right pb-3 pr-4">Points</th>
                <th className="text-left pb-3">Permission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {users.map(user => {
                const meta = PERM_LABELS[user.permission];
                return (
                  <tr key={user.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                          alt=""
                          className="w-9 h-9 rounded-xl object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-bold leading-tight">{user.name}</p>
                          <p className="text-[10px] text-on-surface-variant">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-on-surface-variant">{user.department ?? '—'}</td>
                    <td className="py-3 pr-4 text-on-surface-variant">{user.role ?? '—'}</td>
                    <td className="py-3 pr-4 text-right font-bold text-secondary">{user.points_total.toLocaleString()}</td>
                    <td className="py-3">
                      <div className="relative inline-block">
                        <select
                          value={user.permission}
                          disabled={updating === user.id}
                          onChange={e => handlePermissionChange(user, e.target.value as Permission)}
                          className="appearance-none pl-2 pr-7 py-1 rounded-lg text-[11px] font-bold border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-wait"
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                          <option value="employee">Employé</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                        <ChevronDown
                          size={11}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: meta.color }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
