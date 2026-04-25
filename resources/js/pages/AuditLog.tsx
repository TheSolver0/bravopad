import { Link } from '@inertiajs/react';
import {
  AlertTriangle,
  CheckCircle2,
  Heart,
  LogIn,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  UserCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

interface AuditActor {
  id: number;
  name: string;
  email: string;
}

interface AuditRow {
  id: number;
  action: string;
  severity: string;
  description: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
  actor: AuditActor | null;
}

interface PaginatedAudit {
  data: AuditRow[];
  current_page: number;
  last_page: number;
  total: number;
}

interface AuditLogProps {
  logs: PaginatedAudit;
  filters: { action: string; severity: string };
}

function prettyAction(action: string): string {
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function actionMeta(action: string) {
  if (action === 'auth_login') return { label: 'Connexion', icon: LogIn, className: 'bg-emerald-100 text-emerald-800' };
  if (action === 'auth_logout') return { label: 'Déconnexion', icon: LogOut, className: 'bg-slate-200 text-slate-800' };
  if (action === 'auth_login_failed') return { label: 'Échec connexion', icon: ShieldAlert, className: 'bg-red-100 text-red-800' };
  if (action.includes('bravo') && action.includes('comment')) return { label: prettyAction(action), icon: MessageSquare, className: 'bg-indigo-100 text-indigo-800' };
  if (action.includes('bravo') && (action.includes('liked') || action.includes('unliked'))) return { label: prettyAction(action), icon: Heart, className: 'bg-pink-100 text-pink-800' };
  if (action.includes('bravo')) return { label: prettyAction(action), icon: Sparkles, className: 'bg-blue-100 text-blue-800' };
  if (action.includes('challenge')) return { label: prettyAction(action), icon: Sparkles, className: 'bg-violet-100 text-violet-800' };
  if (action.includes('profile') || action.includes('password') || action.includes('auth')) return { label: prettyAction(action), icon: UserCircle2, className: 'bg-cyan-100 text-cyan-800' };
  if (action.includes('settings') || action.includes('admin') || action.includes('reward')) return { label: prettyAction(action), icon: Settings, className: 'bg-amber-100 text-amber-900' };
  return { label: prettyAction(action), icon: Shield, className: 'bg-slate-100 text-slate-700' };
}

function severityMeta(severity: string) {
  if (severity === 'critical') return { icon: ShieldAlert, className: 'bg-red-100 text-red-800' };
  if (severity === 'warning') return { icon: AlertTriangle, className: 'bg-amber-100 text-amber-900' };
  if (severity === 'info') return { icon: CheckCircle2, className: 'bg-sky-100 text-sky-800' };
  return { icon: Shield, className: 'bg-slate-100 text-slate-700' };
}

export default function AuditLog({ logs }: AuditLogProps) {
  const rows = logs.data ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-secondary/15 text-secondary">
          <Shield size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Journal d&apos;audit</h1>
          <p className="text-sm text-on-surface-variant font-medium">
            Traçabilité métier : Bravos, règles, échanges, configuration. {logs.total} entrée
            {logs.total !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>

      <Card className="overflow-x-auto border-none shadow-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-container-high text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              <th className="p-4">Date</th>
              <th className="p-4">Action</th>
              <th className="p-4">Gravité</th>
              <th className="p-4">Acteur</th>
              <th className="p-4">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-surface-container-low hover:bg-surface-container-low/40">
                <td className="p-4 whitespace-nowrap text-on-surface-variant">
                  {new Date(r.created_at).toLocaleString('fr-FR')}
                </td>
                <td className="p-4">
                  {(() => {
                    const meta = actionMeta(r.action);
                    const Icon = meta.icon;
                    return (
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-black px-2 py-1 rounded-full ${meta.className}`}>
                        <Icon size={13} />
                        {meta.label}
                      </span>
                    );
                  })()}
                </td>
                <td className="p-4">
                  {(() => {
                    const meta = severityMeta(r.severity);
                    const Icon = meta.icon;
                    return (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${meta.className}`}>
                        <Icon size={12} />
                        {r.severity}
                      </span>
                    );
                  })()}
                </td>
                <td className="p-4">{r.actor?.name ?? '—'}</td>
                <td className="p-4 max-w-md text-on-surface-variant">{r.description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {logs.last_page > 1 && (
        <div className="flex justify-center gap-3 text-xs font-bold">
          {logs.current_page > 1 ? (
            <Link href={`/audit?page=${logs.current_page - 1}`} preserveScroll className="text-primary">
              Précédent
            </Link>
          ) : (
            <span className="text-on-surface-variant/40">Précédent</span>
          )}
          <span className="text-on-surface-variant">
            {logs.current_page} / {logs.last_page}
          </span>
          {logs.current_page < logs.last_page ? (
            <Link href={`/audit?page=${logs.current_page + 1}`} preserveScroll className="text-primary">
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
