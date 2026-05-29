import { FormEvent, useMemo, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { AlertTriangle, Download, Eye, Pencil, Plus, Search, SlidersHorizontal, Trash2, Users } from 'lucide-react';
import { EventContribution } from '@/pages/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type UserOption = { id: number; name: string; email: string };
type EventTypeStats = { event_type: string; total: number };
type ActiveContributionStats = { id: number; title: string; payments_count: number };

interface Props {
  contributions: EventContribution[];
  users: UserOption[];
  filters: {
    scope: '' | 'created' | 'invited';
    q: string;
    status: '' | 'open' | 'closing_soon' | 'closed';
  };
  can_view_global_stats: boolean;
  global_stats: {
    total_contributions: number;
    total_collected: number;
    total_participants: number;
    by_event_type: EventTypeStats[];
    active_contributions: ActiveContributionStats[];
  } | null;
}

const PAYMENT_LABELS: Record<'orange_money' | 'mtn_money' | 'cash', string> = {
  orange_money: 'Orange Money',
  mtn_money: 'MTN Mobile Money',
  cash: 'Cash / Especes',
};

export default function EventContributions({
  contributions,
  users,
  filters,
  can_view_global_stats,
  global_stats,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingContribution, setDeletingContribution] = useState<EventContribution | null>(null);
  const [editingContribution, setEditingContribution] = useState<EventContribution | null>(null);
  const [search, setSearch] = useState(filters.q ?? '');

  const { data, setData, reset, processing, errors } = useForm({
    title: '',
    description: '',
    event_type: 'anniversaire',
    goal_amount: '',
    deadline_at: '',
    visibility: 'public',
    amount_mode: 'global' as 'global' | 'per_participant',
    amount_per_participant: '',
    payment_methods: ['orange_money', 'mtn_money'] as ('orange_money' | 'mtn_money' | 'cash')[],
    allow_view_total: true,
    allow_view_participants: true,
    allow_view_individual_amounts: false,
    allow_view_participant_count: true,
    invite_user_ids: [] as number[],
    banner: null as File | null,
  });

  const eventTypeOptions = useMemo(
    () => ['mariage', 'anniversaire', 'deuil', 'soutien_familial', 'evenement_communautaire', 'autre'],
    [],
  );

  function fillEditForm(contribution: EventContribution) {
    setData({
      title: contribution.title,
      description: contribution.description ?? '',
      event_type: contribution.event_type,
      goal_amount: contribution.goal_amount ? formatGoalInput(String(contribution.goal_amount)) : '',
      deadline_at: contribution.deadline_at ?? '',
      visibility: contribution.visibility,
      amount_mode: contribution.amount_mode ?? 'global',
      amount_per_participant: contribution.amount_per_participant
        ? formatGoalInput(String(contribution.amount_per_participant))
        : '',
      payment_methods: contribution.payment_methods,
      allow_view_total: true,
      allow_view_participants: true,
      allow_view_individual_amounts: false,
      allow_view_participant_count: true,
      invite_user_ids: contribution.invitees.map((i) => i.user_id),
      banner: null,
    });
  }

  function togglePaymentMethod(method: 'orange_money' | 'mtn_money' | 'cash') {
    setData(
      'payment_methods',
      data.payment_methods.includes(method)
        ? data.payment_methods.filter((m) => m !== method)
        : [...data.payment_methods, method],
    );
  }

  function submitCreate(e: FormEvent) {
    e.preventDefault();
    router.post('/event-contributions', {
      ...data,
      goal_amount: normalizeGoalAmount(data.goal_amount),
      amount_per_participant: data.amount_mode === 'per_participant'
        ? normalizeGoalAmount(data.amount_per_participant)
        : null,
    }, {
      forceFormData: true,
      onSuccess: () => {
        reset();
        setCreateOpen(false);
      },
    });
  }

  function submitUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingContribution) return;
    router.post(`/event-contributions/${editingContribution.id}`, {
      ...data,
      goal_amount: normalizeGoalAmount(data.goal_amount),
      amount_per_participant: data.amount_mode === 'per_participant'
        ? normalizeGoalAmount(data.amount_per_participant)
        : null,
      _method: 'patch',
    }, {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        setEditOpen(false);
        setEditingContribution(null);
        reset();
      },
    });
  }

  function openEdit(contribution: EventContribution) {
    setEditingContribution(contribution);
    fillEditForm(contribution);
    setEditOpen(true);
  }

  function askDeleteContribution(contribution: EventContribution) {
    setDeletingContribution(contribution);
    setDeleteOpen(true);
  }

  function confirmDeleteContribution() {
    if (!deletingContribution) return;
    router.delete(`/event-contributions/${deletingContribution.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        setDeleteOpen(false);
        setDeletingContribution(null);
      },
    });
  }

  function roleLabel(role: EventContribution['viewer_role']) {
    if (role === 'creator') return 'Createur';
    if (role === 'invitee') return 'Invite';
    return 'Lecteur';
  }

  function applyFilters(next: Partial<Props['filters']>) {
    const merged = {
      scope: filters.scope ?? '',
      status: filters.status ?? '',
      q: search,
      ...next,
    };
    router.get('/event-contributions', {
      scope: merged.scope || undefined,
      status: merged.status || undefined,
      q: merged.q || undefined,
    }, { preserveState: true, preserveScroll: true });
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-surface-container-high/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">Cotisations Evenementielles</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Liste de vos cotisations creees et de celles ou vous etes invite.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href={`/event-contributions/export?${new URLSearchParams({
              ...(filters.scope ? { scope: filters.scope } : {}),
              ...(filters.status ? { status: filters.status } : {}),
              ...(search ? { q: search } : {}),
            }).toString()}`}>
              <Button type="button" variant="outline" className="gap-2 h-10 rounded-xl">
                <Download size={16} />
                Exporter
              </Button>
            </a>
            <Button type="button" className="gap-2 h-10 rounded-xl shadow-sm shadow-primary/25" onClick={() => {
              reset();
              setData('goal_amount', '');
              setCreateOpen(true);
            }}>
              <Plus size={16} />
              Creer contribution
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl p-4 md:p-5 border border-surface-container-high/80 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-on-surface-variant">
          <SlidersHorizontal size={14} />
          <p className="text-xs font-black uppercase tracking-wider">Filtres</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Vue</label>
            <select
              className="mt-1 h-10 w-full rounded-xl border border-surface-container-high bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
              value={filters.scope ?? ''}
              onChange={(e) => applyFilters({ scope: (e.target.value as Props['filters']['scope']) })}
            >
              <option value="">Toutes</option>
              <option value="created">Creees</option>
              <option value="invited">Invitees</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Statut</label>
            <select
              className="mt-1 h-10 w-full rounded-xl border border-surface-container-high bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
              value={filters.status ?? ''}
              onChange={(e) => applyFilters({ status: (e.target.value as Props['filters']['status']) })}
            >
              <option value="">Tous</option>
              <option value="open">Ouverte</option>
              <option value="closing_soon">Echeance proche (7j)</option>
              <option value="closed">Fermee</option>
            </select>
          </div>
          <div className="md:col-span-5">
            <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Recherche</label>
            <div className="relative mt-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
              <input
                className="h-10 w-full rounded-xl border border-surface-container-high bg-white pl-9 pr-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
                placeholder="Titre, type, createur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyFilters({ q: search });
                  }
                }}
              />
            </div>
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
            <Button type="button" variant="secondary" className="h-10 rounded-xl flex-1" onClick={() => applyFilters({ q: search })}>Filtrer</Button>
            <Button type="button" variant="ghost" className="h-10 rounded-xl px-3" onClick={() => {
              setSearch('');
              router.get('/event-contributions', {}, { preserveState: true, preserveScroll: true });
            }}>Reset</Button>
          </div>
        </div>
      </section>

      {can_view_global_stats && global_stats && (
        <section className="grid md:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-surface-container-high/80 shadow-sm">
            <p className="text-xs text-on-surface-variant font-semibold">Total cotisations</p>
            <p className="text-2xl font-black mt-1">{global_stats.total_contributions}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-surface-container-high/80 shadow-sm">
            <p className="text-xs text-on-surface-variant font-semibold">Total collecte</p>
            <p className="text-2xl font-black mt-1">{global_stats.total_collected.toLocaleString()} FCFA</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-surface-container-high/80 shadow-sm">
            <p className="text-xs text-on-surface-variant font-semibold">Participants uniques</p>
            <p className="text-2xl font-black mt-1">{global_stats.total_participants}</p>
          </div>
        </section>
      )}

      <section className="bg-white rounded-2xl p-4 border border-surface-container-high/80 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-[10px] font-black uppercase tracking-wider text-on-surface-variant border-b border-surface-container-high">
              <th className="p-3">Titre</th>
              <th className="p-3">Role</th>
              <th className="p-3">Type</th>
              <th className="p-3">Participants</th>
              <th className="p-3">Cagnotte</th>
              <th className="p-3">Collecte</th>
              <th className="p-3">Date limite</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contributions.map((contribution) => (
              <tr key={contribution.id} className="border-b border-surface-container-low hover:bg-surface-container-low/40">
                <td className="p-3">
                  <p className="font-bold">{contribution.title}</p>
                  <p className="text-xs text-on-surface-variant">{contribution.visibility}</p>
                </td>
                <td className="p-3">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${contribution.viewer_role === 'creator' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {roleLabel(contribution.viewer_role)}
                  </span>
                </td>
                <td className="p-3">{contribution.event_type}</td>
                <td className="p-3">{contribution.stats.participants_count ?? 'Masque'}</td>
                <td className="p-3">
                  {contribution.stats.pot_amount !== null
                    ? formatFcfa(contribution.stats.pot_amount)
                    : 'Masquee'}
                </td>
                <td className="p-3">
                  {contribution.stats.total_collected !== null
                    ? formatFcfa(contribution.stats.total_collected)
                    : 'Masquee'}
                </td>
                <td className="p-3">{contribution.deadline_at ?? '—'}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => router.visit(`/event-contributions/${contribution.id}`)} className="gap-1 rounded-lg">
                      <Eye size={13} />
                      Details
                    </Button>
                    {contribution.can_edit && (
                      <Button type="button" size="sm" variant="outline" onClick={() => openEdit(contribution)} className="gap-1 rounded-lg">
                        <Pencil size={13} />
                        Modifier
                      </Button>
                    )}
                    {contribution.can_delete && (
                      <Button type="button" size="sm" variant="outline" onClick={() => askDeleteContribution(contribution)} className="gap-1 rounded-lg text-red-600">
                        <Trash2 size={13} />
                        Supprimer
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 border border-surface-container-high shadow-2xl bg-white">
          <DialogHeader className="px-6 py-5 border-b border-surface-container-high bg-gradient-to-r from-primary/10 to-transparent">
            <DialogTitle className="text-xl font-black tracking-tight">Creer une contribution</DialogTitle>
          </DialogHeader>
          <ContributionForm
            data={data}
            setData={setData}
            users={users}
            errors={errors}
            eventTypeOptions={eventTypeOptions}
            processing={processing}
            togglePaymentMethod={togglePaymentMethod}
            onSubmit={submitCreate}
            submitLabel="Creer la contribution"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 border border-surface-container-high shadow-2xl bg-white">
          <DialogHeader className="px-6 py-5 border-b border-surface-container-high bg-gradient-to-r from-primary/10 to-transparent">
            <DialogTitle className="text-xl font-black tracking-tight">Modifier la contribution</DialogTitle>
          </DialogHeader>
          <ContributionForm
            data={data}
            setData={setData}
            users={users}
            errors={errors}
            eventTypeOptions={eventTypeOptions}
            processing={processing}
            togglePaymentMethod={togglePaymentMethod}
            onSubmit={submitUpdate}
            submitLabel="Enregistrer les modifications"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md p-0 border border-red-200 shadow-2xl bg-white overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-red-50 to-white border-b border-red-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="font-black text-red-700">Confirmer la suppression</h3>
              <p className="text-xs text-red-500">Cette action est irreversible.</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-700">
              Voulez-vous vraiment supprimer la cotisation
              <span className="font-bold"> {deletingContribution?.title ?? ''}</span> ?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Annuler</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDeleteContribution}>
                Supprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ContributionFormProps {
  data: {
    title: string;
    description: string;
    event_type: string;
    goal_amount: string;
    deadline_at: string;
    visibility: string;
    amount_mode: 'global' | 'per_participant';
    amount_per_participant: string;
    payment_methods: ('orange_money' | 'mtn_money' | 'cash')[];
    allow_view_total: boolean;
    allow_view_participants: boolean;
    allow_view_individual_amounts: boolean;
    allow_view_participant_count: boolean;
    invite_user_ids: number[];
    banner: File | null;
  };
  setData: (key: string | Record<string, unknown>, value?: unknown) => void;
  users: UserOption[];
  errors: Record<string, string>;
  eventTypeOptions: string[];
  processing: boolean;
  togglePaymentMethod: (method: 'orange_money' | 'mtn_money' | 'cash') => void;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
}

function ContributionForm({
  data,
  setData,
  users,
  errors,
  eventTypeOptions,
  processing,
  togglePaymentMethod,
  onSubmit,
  submitLabel,
}: ContributionFormProps) {
  const [inviteSearch, setInviteSearch] = useState('');
  const fieldClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-3 focus:ring-primary/15 focus:border-primary/40 transition';
  const inviteCandidates = users.filter((u) => {
    const q = inviteSearch.trim().toLowerCase();
    if (!q) return true;
    return `${u.name} ${u.email}`.toLowerCase().includes(q);
  });

  return (
    <form onSubmit={onSubmit} className="p-5 space-y-4 bg-white">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Titre</label>
          <input className={fieldClass} placeholder="Titre de la cotisation" value={data.title} onChange={(e) => setData('title', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Type d'evenement</label>
          <select className={fieldClass} value={data.event_type} onChange={(e) => setData('event_type', e.target.value)}>
            {eventTypeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Description</label>
          <textarea
            className={`${fieldClass} min-h-24 resize-none`}
            placeholder="Contexte, objectif, message pour les participants..."
            value={data.description}
            onChange={(e) => setData('description', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Mode de montant</label>
          <select
            className={fieldClass}
            value={data.amount_mode}
            onChange={(e) => setData('amount_mode', e.target.value as 'global' | 'per_participant')}
          >
            <option value="global">Objectif global (cagnotte unique)</option>
            <option value="per_participant">Montant fixe par personne</option>
          </select>
        </div>
        {data.amount_mode === 'global' ? (
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Objectif global (FCFA)</label>
            <input
              className={fieldClass}
              placeholder="Ex: 200 000"
              value={data.goal_amount}
              onChange={(e) => setData('goal_amount', formatGoalInput(e.target.value))}
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Montant par personne (FCFA)</label>
            <input
              className={fieldClass}
              placeholder="Ex: 5 000"
              value={data.amount_per_participant}
              onChange={(e) => setData('amount_per_participant', formatGoalInput(e.target.value))}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Date limite</label>
          <input className={fieldClass} type="date" value={data.deadline_at} onChange={(e) => setData('deadline_at', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Visibilite</label>
          <select className={fieldClass} value={data.visibility} onChange={(e) => setData('visibility', e.target.value as 'public' | 'private')}>
            <option value="public">Publique</option>
            <option value="private">Privee / sur invitation</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Banniere</label>
          <input className={`${fieldClass} file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-slate-700`} type="file" accept="image/*" onChange={(e) => setData('banner', e.target.files?.[0] ?? null)} />
        </div>
      </div>

      {data.visibility === 'private' && (
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Inviter des participants</label>
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full h-9 rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:ring-3 focus:ring-primary/15"
                  placeholder="Rechercher un participant..."
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto p-2 space-y-1">
              {inviteCandidates.map((user) => {
                const checked = data.invite_user_ids.includes(user.id);
                return (
                  <label key={user.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer ${checked ? 'bg-primary/10' : 'hover:bg-slate-50'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setData('invite_user_ids', [...data.invite_user_ids, user.id]);
                        } else {
                          setData('invite_user_ids', data.invite_user_ids.filter((id) => id !== user.id));
                        }
                      }}
                    />
                    <Users size={14} className="text-slate-400" />
                    <span className="text-sm">{user.name}</span>
                    <span className="text-xs text-slate-500 truncate">({user.email})</span>
                  </label>
                );
              })}
              {inviteCandidates.length === 0 && (
                <p className="text-xs text-slate-500 px-2 py-1">Aucun utilisateur trouve.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
        <p className="text-sm font-black text-slate-800">Modes de paiement actives</p>
        <div className="flex flex-wrap gap-2">
          {(['orange_money', 'mtn_money', 'cash'] as const).map((method) => (
            <button
              type="button"
              key={method}
              onClick={() => togglePaymentMethod(method)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition ${
                data.payment_methods.includes(method)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-primary/40'
              }`}
            >
              {PAYMENT_LABELS[method]}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-3.5">
        <p className="text-sm font-black mb-2.5 text-slate-800">Confidentialite</p>
        <div className="grid md:grid-cols-2 gap-2.5 text-sm">
          <label className="flex items-center gap-2 text-slate-700"><input type="checkbox" checked={data.allow_view_total} onChange={(e) => setData('allow_view_total', e.target.checked)} /> Voir le montant total</label>
          <label className="flex items-center gap-2 text-slate-700"><input type="checkbox" checked={data.allow_view_participant_count} onChange={(e) => setData('allow_view_participant_count', e.target.checked)} /> Voir le nombre de participants</label>
          <label className="flex items-center gap-2 text-slate-700"><input type="checkbox" checked={data.allow_view_participants} onChange={(e) => setData('allow_view_participants', e.target.checked)} /> Voir la liste des participants</label>
          <label className="flex items-center gap-2 text-slate-700"><input type="checkbox" checked={data.allow_view_individual_amounts} onChange={(e) => setData('allow_view_individual_amounts', e.target.checked)} /> Voir les montants individuels</label>
        </div>
      </div>

      {(errors.title || errors.payment_methods) && (
        <p className="text-sm text-red-600">{errors.title ?? errors.payment_methods}</p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition" disabled={processing}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function formatFcfa(value: number): string {
  return `${Number(value).toLocaleString('fr-FR')} FCFA`;
}

function formatGoalInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function normalizeGoalAmount(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}
