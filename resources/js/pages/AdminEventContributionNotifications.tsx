import { FormEvent, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { BellRing, Clock3, Download, Filter, Mail, Megaphone } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface NotificationRow {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string | null;
  contribution_id: number | null;
  contribution_title: string | null;
  days_left: number | null;
  created_at: string;
  read_at: string | null;
  notifiable_id: number;
  notifiable_type: string;
}

interface ReminderAudit {
  id: number;
  created_at: string;
  actor: { id: number; name: string } | null;
  description: string | null;
  context: Record<string, unknown> | null;
}

interface SendsPerDay {
  name: string;
  count: number;
}

interface NotificationsPage {
  data: NotificationRow[];
  current_page: number;
  last_page: number;
  total: number;
}

interface Props {
  stats: {
    total_notifications: number;
    invitations_sent: number;
    new_payments_sent: number;
    thank_you_sent: number;
    deadline_reminders_sent: number;
    contributions_total: number;
  };
  filters: {
    type: string;
    from: string;
    to: string;
  };
  types: string[];
  notifications: NotificationsPage;
  sends_per_day: SendsPerDay[];
  reminder_audits: ReminderAudit[];
  mail_enabled: boolean;
}

function typeLabel(type: string): string {
  if (type.includes('Invitation')) return 'Invitation';
  if (type.includes('NewPayment')) return 'Nouvelle contribution';
  if (type.includes('ThankYou')) return 'Remerciement';
  if (type.includes('DeadlineReminder')) return 'Rappel date limite';
  return type;
}

function buildQueryParams(filters: Props['filters'], page?: number): Record<string, string | undefined> {
  return {
    type: filters.type || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: page ? String(page) : undefined,
  };
}

export default function AdminEventContributionNotifications({
  stats,
  filters,
  types,
  notifications,
  sends_per_day,
  reminder_audits,
  mail_enabled,
}: Props) {
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);

  function applyFilters(e?: FormEvent) {
    e?.preventDefault();
    router.get('/admin/event-contributions/notifications', buildQueryParams({ ...filters, from, to }), {
      preserveState: true,
    });
  }

  function resetFilters() {
    setFrom('');
    setTo('');
    router.get('/admin/event-contributions/notifications', { type: filters.type || undefined }, { preserveState: true });
  }

  const exportUrl = `/admin/event-contributions/notifications/export?${new URLSearchParams(
    Object.entries(buildQueryParams(filters)).filter(([, v]) => v) as [string, string][],
  ).toString()}`;

  const querySuffix = (page?: number) => {
    const params = new URLSearchParams();
    const q = buildQueryParams(filters, page);
    Object.entries(q).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const s = params.toString();
    return s ? `?${s}` : '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <BellRing size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Notifications cotisations</h1>
            <p className="text-sm text-on-surface-variant">
              Suivi des invitations, contributions, remerciements et rappels. Email {mail_enabled ? 'active' : 'desactive'}.
            </p>
          </div>
        </div>
        <a href={exportUrl}>
          <Button type="button" variant="outline" className="gap-2">
            <Download size={16} />
            Export CSV
          </Button>
        </a>
      </div>

      <section className="grid md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total notif.', value: stats.total_notifications, Icon: BellRing },
          { label: 'Invitations', value: stats.invitations_sent, Icon: Megaphone },
          { label: 'Nouv. contributions', value: stats.new_payments_sent, Icon: BellRing },
          { label: 'Remerciements', value: stats.thank_you_sent, Icon: Mail },
          { label: 'Rappels', value: stats.deadline_reminders_sent, Icon: Clock3 },
          { label: 'Cotisations', value: stats.contributions_total, Icon: Filter },
        ].map(({ label, value, Icon }) => (
          <Card key={label} className="p-4 border-none bg-white/90">
            <div className="flex items-center gap-1 text-on-surface-variant text-[11px] font-bold uppercase">
              <Icon size={13} />
              {label}
            </div>
            <p className="text-2xl font-black mt-1">{value.toLocaleString()}</p>
          </Card>
        ))}
      </section>

      <Card className="p-4 border-none bg-white/90 space-y-4">
        <h2 className="font-bold">Envois par jour</h2>
        <p className="text-xs text-on-surface-variant">
          {filters.from || filters.to
            ? 'Periode filtree'
            : '30 derniers jours (graphique par defaut)'}
        </p>
        <div className="h-56 w-full">
          {sends_per_day.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-8 text-center">Aucune donnee sur cette periode.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sends_per_day} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`${value} envoi(s)`, 'Total']}
                  labelFormatter={(label) => `Date : ${label}`}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-4 border-none bg-white/90 space-y-4">
        <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Du</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="block mt-1 px-3 py-2 text-sm rounded-lg border border-surface-container-high"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Au</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="block mt-1 px-3 py-2 text-sm rounded-lg border border-surface-container-high"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Type</label>
            <select
              value={filters.type}
              onChange={(e) =>
                router.get(
                  '/admin/event-contributions/notifications',
                  buildQueryParams({ ...filters, from, to, type: e.target.value }),
                  { preserveState: true },
                )
              }
              className="block mt-1 px-3 py-2 text-sm rounded-lg border border-surface-container-high"
            >
              <option value="">Tous les types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {typeLabel(type)}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary">
            Appliquer
          </Button>
          <Button type="button" variant="ghost" onClick={resetFilters}>
            Reinitialiser
          </Button>
        </form>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-bold">
            Historique des envois
            <span className="text-sm font-normal text-on-surface-variant ml-2">({notifications.total})</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-wider text-on-surface-variant border-b border-surface-container-high">
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Canal</th>
                <th className="p-3">Cotisation</th>
                <th className="p-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {notifications.data.map((row) => (
                <tr key={row.id} className="border-b border-surface-container-low">
                  <td className="p-3 text-on-surface-variant">{new Date(row.created_at).toLocaleString('fr-FR')}</td>
                  <td className="p-3 font-semibold">{typeLabel(row.type)}</td>
                  <td className="p-3">{row.channel}</td>
                  <td className="p-3">
                    <p className="font-semibold">{row.contribution_title ?? '—'}</p>
                    <p className="text-xs text-on-surface-variant">#{row.contribution_id ?? '—'}</p>
                  </td>
                  <td className="p-3 text-on-surface-variant">
                    <p>{row.body ?? row.title}</p>
                    {row.days_left !== null && <p className="text-xs mt-0.5">Rappel J-{row.days_left}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {notifications.last_page > 1 && (
          <div className="flex justify-center gap-3 text-xs font-bold">
            {notifications.current_page > 1 ? (
              <Link
                href={`/admin/event-contributions/notifications${querySuffix(notifications.current_page - 1)}`}
                preserveScroll
                className="text-primary"
              >
                Precedent
              </Link>
            ) : (
              <span className="text-on-surface-variant/40">Precedent</span>
            )}
            <span className="text-on-surface-variant">
              {notifications.current_page} / {notifications.last_page}
            </span>
            {notifications.current_page < notifications.last_page ? (
              <Link
                href={`/admin/event-contributions/notifications${querySuffix(notifications.current_page + 1)}`}
                preserveScroll
                className="text-primary"
              >
                Suivant
              </Link>
            ) : (
              <span className="text-on-surface-variant/40">Suivant</span>
            )}
          </div>
        )}
      </Card>

      <Card className="p-4 border-none bg-white/90">
        <h2 className="font-bold mb-3">Historique des rappels planifies (audit)</h2>
        <div className="space-y-2">
          {reminder_audits.length === 0 && (
            <p className="text-sm text-on-surface-variant">Aucun rappel envoye pour le moment.</p>
          )}
          {reminder_audits.map((audit) => (
            <div key={audit.id} className="rounded-xl border border-surface-container-high px-3 py-2">
              <p className="text-sm font-semibold">{audit.description ?? 'Rappel envoye'}</p>
              <p className="text-xs text-on-surface-variant">
                {new Date(audit.created_at).toLocaleString('fr-FR')} {audit.actor ? `· ${audit.actor.name}` : ''}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
