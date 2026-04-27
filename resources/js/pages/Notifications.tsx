import { Link } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
interface NotificationRow {
  id: string;
  type: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  links: { url: string | null; label: string; active: boolean }[];
}

interface NotificationsProps {
  notifications: Paginated<NotificationRow>;
}

function labelFromData(data: Record<string, unknown>): string {
  if (typeof data.title === 'string') return data.title;
  if (data.type === 'bravo_received') return 'Nouveau Bravo reçu';
  if (data.type === 'bravo_anomaly_spike') return 'Alerte activité Bravo';
  if (data.type === 'reward_redemption_submitted') return 'Échange de points';
  if (data.type === 'reward_redemption_outcome') return 'Mise à jour échange';
  return 'Notification';
}

function bodyFromData(data: Record<string, unknown>): string {
  if (typeof data.body === 'string') return data.body;
  if (data.type === 'bravo_received' && typeof data.sender_name === 'string') {
    const pts = typeof data.points === 'number' ? data.points : '';
    return `${data.sender_name} vous a envoyé un Bravo${pts !== '' ? ` (+${pts} pts)` : ''}.`;
  }
  return '';
}

export default function Notifications({ notifications }: NotificationsProps) {
  const rows = notifications.data ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Bell size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
            <p className="text-sm text-on-surface-variant font-medium">
              {notifications.total} notification{notifications.total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Link
          href="/notifications/read-all"
          method="post"
          preserveScroll
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-primary/20 text-primary text-xs font-bold hover:bg-primary/5"
        >
          <CheckCheck size={16} />
          Tout marquer lu
        </Link>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <Card className="p-10 text-center text-on-surface-variant border-none shadow-sm" style={{background:'white',}}>
            Aucune notification pour le moment.
          </Card>
        ) : (
          rows.map((n) => (
            <Card
              key={n.id}
              className={`p-4 border-none shadow-sm flex flex-col gap-2 ${n.read_at ? 'opacity-70' : 'ring-2 ring-primary/15'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-on-surface">{labelFromData(n.data)}</p>
                  <p className="text-sm text-on-surface-variant mt-1">{bodyFromData(n.data)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 mt-2">
                    {new Date(n.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                {!n.read_at && (
                  <Link
                    href={`/notifications/${n.id}/read`}
                    method="post"
                    preserveScroll
                    className="shrink-0 text-xs font-bold text-primary hover:underline"
                  >
                    Marquer lu
                  </Link>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {notifications.last_page > 1 && (
        <div className="flex justify-center items-center gap-3 pt-4 flex-wrap">
          {notifications.current_page > 1 ? (
            <Link
              href={`/notifications?page=${notifications.current_page - 1}`}
              preserveScroll
              className="text-xs font-bold text-primary"
            >
              Précédent
            </Link>
          ) : (
            <span className="text-xs text-on-surface-variant/40">Précédent</span>
          )}
          <span className="text-xs font-black text-on-surface-variant">
            Page {notifications.current_page} / {notifications.last_page}
          </span>
          {notifications.current_page < notifications.last_page ? (
            <Link
              href={`/notifications?page=${notifications.current_page + 1}`}
              preserveScroll
              className="text-xs font-bold text-primary"
            >
              Suivant
            </Link>
          ) : (
            <span className="text-xs text-on-surface-variant/40">Suivant</span>
          )}
        </div>
      )}
    </div>
  );
}
