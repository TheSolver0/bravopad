import { FormEvent, useMemo, useState, type ReactNode } from 'react';
import { useForm, router } from '@inertiajs/react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  FileSpreadsheet,
  FileText,
  HandCoins,
  Plus,
  Search,
  Target,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { EventContribution, EventContributionStatus } from '@/pages/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useInitials } from '@/hooks/use-initials';

type UserOption = { id: number; name: string; email: string };

interface Props {
  contribution: EventContribution;
  users: UserOption[];
}

const PAYMENT_LABELS: Record<'orange_money' | 'mtn_money' | 'cash', string> = {
  orange_money: 'Orange Money',
  mtn_money: 'MTN Mobile Money',
  cash: 'Cash / Especes',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  mariage: 'Mariage',
  anniversaire: 'Anniversaire',
  deuil: 'Deuil',
  soutien_familial: 'Soutien familial',
  evenement_communautaire: 'Evenement communautaire',
  autre: 'Autre',
};

export default function EventContributionDetail({ contribution, users }: Props) {
  const [recordOpen, setRecordOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');

  const recordForm = useForm({
    contributor_user_ids: [] as number[],
    amount: '',
    payment_method: (contribution.payment_methods[0] ?? 'cash') as 'orange_money' | 'mtn_money' | 'cash',
    note: '',
  });

  const eligibleUsers = useMemo(() => {
    const participantIds = new Set(contribution.participants.map((p) => p.user_id));
    const inviteeIds = new Set(contribution.invitees.map((i) => i.user_id));
    const allowedIds = participantIds.size > 0 ? participantIds : inviteeIds;

    return users
      .filter((u) => allowedIds.has(u.id))
      .filter((u) => !u.email.includes('automations@') && !u.email.endsWith('.internal'))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [contribution, users]);

  const selectedUsers = useMemo(
    () => eligibleUsers.filter((u) => recordForm.data.contributor_user_ids.includes(u.id)),
    [eligibleUsers, recordForm.data.contributor_user_ids],
  );

  const filteredEligible = useMemo(() => {
    const q = participantSearch.trim().toLowerCase();
    if (!q) return eligibleUsers;
    return eligibleUsers.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q));
  }, [eligibleUsers, participantSearch]);

  const perParticipant = contribution.amount_mode === 'per_participant';
  const totalCollected = contribution.stats.total_collected ?? 0;
  const goalProgress = contribution.stats.goal_progress_percent;
  const paidParticipants = contribution.participants.filter((p) => p.is_fully_paid).length;
  const potAmount = contribution.stats.pot_amount;

  function formatFcfa(value: number | null | undefined) {
    if (value === null || value === undefined) return '—';
    return `${Number(value).toLocaleString('fr-FR')} FCFA`;
  }

  function submitRecord(e: FormEvent) {
    e.preventDefault();
    router.post(
      `/event-contributions/${contribution.id}/manual`,
      {
        contributor_user_ids: recordForm.data.contributor_user_ids,
        amount: recordForm.data.amount.replace(/[^\d]/g, ''),
        payment_method: recordForm.data.payment_method,
        note: recordForm.data.note || null,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          recordForm.reset('contributor_user_ids', 'amount', 'note');
          setRecordOpen(false);
          setParticipantSearch('');
        },
      },
    );
  }

  function toggleUser(userId: number) {
    const ids = recordForm.data.contributor_user_ids;
    if (ids.includes(userId)) {
      recordForm.setData('contributor_user_ids', ids.filter((id) => id !== userId));
    } else {
      recordForm.setData('contributor_user_ids', [...ids, userId]);
    }
  }

  function selectAllVisible() {
    const visibleIds = filteredEligible.map((u) => u.id);
    const merged = new Set([...recordForm.data.contributor_user_ids, ...visibleIds]);
    recordForm.setData('contributor_user_ids', [...merged]);
  }

  function clearSelection() {
    recordForm.setData('contributor_user_ids', []);
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => router.visit('/event-contributions')}
          className="gap-2 rounded-xl border-surface-container-high"
        >
          <ArrowLeft size={14} />
          Retour a la liste
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/event-contributions/${contribution.id}/export/excel`}>
            <Button type="button" variant="outline" className="gap-2 rounded-xl">
              <FileSpreadsheet size={15} />
              Excel
            </Button>
          </a>
          <a href={`/event-contributions/${contribution.id}/export/pdf`}>
            <Button type="button" variant="outline" className="gap-2 rounded-xl">
              <FileText size={15} />
              PDF
            </Button>
          </a>
          {contribution.can_record_manual && (
            <Button
              className="gap-2 rounded-xl shadow-lg shadow-primary/20"
              onClick={() => {
                recordForm.setData('amount', contribution.amount_per_participant
                  ? formatGoalInput(String(contribution.amount_per_participant))
                  : '');
                setRecordOpen(true);
              }}
            >
              <Plus size={16} />
              Enregistrer une contribution
            </Button>
          )}
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-surface-container-high bg-gradient-to-br from-slate-900 via-slate-800 to-primary/80 text-white shadow-xl">
        {contribution.banner_url && (
          <img
            src={contribution.banner_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="relative p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
                  {EVENT_TYPE_LABELS[contribution.event_type] ?? contribution.event_type}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
                  {contribution.visibility === 'public' ? 'Publique' : 'Privee'}
                </span>
                {perParticipant && (
                  <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                    Montant fixe / personne
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">{contribution.title}</h1>
              {contribution.description && (
                <p className="text-sm text-white/80 leading-relaxed">{contribution.description}</p>
              )}
              <p className="text-xs text-white/60">
                Organise par <span className="font-semibold text-white">{contribution.creator.name}</span>
              </p>
            </div>
            {!perParticipant && goalProgress !== null && (
              <div className="flex flex-col items-center">
                <div
                  className="relative flex h-24 w-24 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#34d399 ${goalProgress}%, rgba(255,255,255,0.15) 0)`,
                  }}
                >
                  <div className="flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-full bg-slate-900/90 text-center">
                    <span className="text-lg font-black">{goalProgress}%</span>
                    <span className="text-[9px] uppercase tracking-wide text-white/60">Objectif</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <HeroStat
              icon={<Wallet size={16} />}
              label="Collecte"
              value={contribution.stats.total_collected !== null ? formatFcfa(totalCollected) : 'Masquee'}
            />
            <HeroStat
              icon={<Target size={16} />}
              label={perParticipant ? 'Cagnotte' : 'Objectif'}
              value={potAmount !== null
                ? formatFcfa(potAmount)
                : perParticipant
                  ? formatFcfa(contribution.amount_per_participant)
                  : formatFcfa(contribution.goal_amount)}
            />
            <HeroStat
              icon={<Users size={16} />}
              label="Participants"
              value={contribution.stats.participants_count ?? '—'}
            />
            <HeroStat
              icon={<Calendar size={16} />}
              label="Echeance"
              value={contribution.deadline_at
                ? new Date(contribution.deadline_at).toLocaleDateString('fr-FR')
                : 'Sans limite'}
            />
          </div>
        </div>
      </section>

      {contribution.participants.length > 0 && (
        <section className="rounded-2xl border border-surface-container-high bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-container-high px-5 py-4 bg-gradient-to-r from-slate-50 to-white">
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <Users size={18} className="text-primary" />
                Suivi des participants
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {perParticipant
                  ? `${paidParticipants} / ${contribution.participants.length} ont atteint leur cotisation`
                  : 'Montants deja verses par participant'}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase tracking-wider text-on-surface-variant border-b border-surface-container-high bg-slate-50/80">
                  <th className="p-3 w-10" />
                  <th className="p-3">Participant</th>
                  {perParticipant && <th className="p-3">Cotisation</th>}
                  <th className="p-3">Verse</th>
                  {perParticipant && <th className="p-3">Reste</th>}
                  <th className="p-3">Etat</th>
                  {perParticipant && <th className="p-3 min-w-[120px]">Progression</th>}
                </tr>
              </thead>
              <tbody>
                {contribution.participants.map((participant) => (
                  <tr
                    key={participant.user_id}
                    className="border-b border-surface-container-low hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="p-3">
                      {participant.is_fully_paid ? (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      ) : (
                        <span className="inline-block h-[18px] w-[18px] rounded-full border-2 border-slate-200" />
                      )}
                    </td>
                    <td className="p-3 font-semibold">{participant.name}</td>
                    {perParticipant && (
                      <td className="p-3 text-on-surface-variant">
                        {formatFcfa(participant.target_amount)}
                      </td>
                    )}
                    <td className="p-3 font-bold text-emerald-700">
                      {formatFcfa(participant.paid_amount)}
                    </td>
                    {perParticipant && (
                      <td className="p-3 text-amber-700 font-medium">
                        {formatFcfa(participant.remaining_amount)}
                      </td>
                    )}
                    <td className="p-3">
                      <ParticipantStatusBadge status={participant.contribution_status} />
                    </td>
                    {perParticipant && (
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                participant.is_fully_paid ? 'bg-emerald-500' : 'bg-primary'
                              }`}
                              style={{ width: `${participant.progress_percent ?? 0}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold w-9 text-right">
                            {participant.progress_percent ?? 0}%
                          </span>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-surface-container-high bg-white shadow-sm overflow-hidden">
        <div className="border-b border-surface-container-high px-5 py-4 bg-gradient-to-r from-primary/5 to-transparent">
          <h2 className="text-lg font-black flex items-center gap-2">
            <CircleDollarSign size={18} className="text-primary" />
            Historique des contributions
          </h2>
        </div>
        <div className="p-4 space-y-2">
          {contribution.payments.length === 0 && (
            <div className="rounded-xl border border-dashed border-surface-container-high p-8 text-center">
              <HandCoins size={28} className="mx-auto text-on-surface-variant/40 mb-2" />
              <p className="text-sm text-on-surface-variant">Aucune contribution enregistree pour le moment.</p>
            </div>
          )}
          {contribution.payments.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-container-high px-4 py-3 hover:border-primary/20 transition-colors"
            >
              <div>
                <p className="font-bold text-sm">{payment.contributor_name}</p>
                <p className="text-xs text-on-surface-variant">
                  {PAYMENT_LABELS[payment.payment_method]}
                  {payment.is_manual && ' · Enregistrement manuel'}
                  {payment.paid_at && ` · ${new Date(payment.paid_at).toLocaleString('fr-FR')}`}
                </p>
              </div>
              <p className="text-sm font-black text-emerald-700">
                {payment.amount !== null ? formatFcfa(payment.amount) : 'Masque'}
              </p>
            </div>
          ))}
        </div>
      </section>

      <RecordContributionDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        contribution={contribution}
        perParticipant={perParticipant}
        eligibleUsers={eligibleUsers}
        filteredEligible={filteredEligible}
        selectedUsers={selectedUsers}
        participantSearch={participantSearch}
        onParticipantSearchChange={setParticipantSearch}
        recordForm={recordForm}
        onSubmit={submitRecord}
        onToggleUser={toggleUser}
        onSelectAllVisible={selectAllVisible}
        onClearSelection={clearSelection}
      />
    </div>
  );
}

type RecordForm = ReturnType<typeof useForm<{
  contributor_user_ids: number[];
  amount: string;
  payment_method: 'orange_money' | 'mtn_money' | 'cash';
  note: string;
}>>;

function RecordContributionDialog({
  open,
  onOpenChange,
  contribution,
  perParticipant,
  eligibleUsers,
  filteredEligible,
  selectedUsers,
  participantSearch,
  onParticipantSearchChange,
  recordForm,
  onSubmit,
  onToggleUser,
  onSelectAllVisible,
  onClearSelection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribution: EventContribution;
  perParticipant: boolean;
  eligibleUsers: UserOption[];
  filteredEligible: UserOption[];
  selectedUsers: UserOption[];
  participantSearch: string;
  onParticipantSearchChange: (value: string) => void;
  recordForm: RecordForm;
  onSubmit: (e: FormEvent) => void;
  onToggleUser: (userId: number) => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
}) {
  const getInitials = useInitials();
  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 transition';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden p-0 gap-0 border border-surface-container-high shadow-2xl bg-white text-slate-900">
        <DialogHeader className="px-6 py-5 border-b border-surface-container-high bg-gradient-to-r from-primary/10 via-white to-white">
          <DialogTitle className="text-xl font-black tracking-tight text-slate-900">
            Enregistrer une contribution
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Selectionnez un ou plusieurs participants, puis indiquez le montant et le mode de paiement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col max-h-[calc(90vh-7rem)]">
          <div className="overflow-y-auto px-6 py-5 space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  Participants
                </label>
                <span className="text-xs font-semibold text-slate-500">
                  {selectedUsers.length} selectionne{selectedUsers.length > 1 ? 's' : ''}
                </span>
              </div>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => onToggleUser(user.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 pl-1.5 pr-2 py-1 text-xs font-semibold text-primary hover:bg-primary/15 transition"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white">
                        {getInitials(user.name)}
                      </span>
                      {user.name}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 p-2 border-b border-slate-100 bg-slate-50/80">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-primary/10"
                      placeholder="Rechercher..."
                      value={participantSearch}
                      onChange={(e) => onParticipantSearchChange(e.target.value)}
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl text-xs shrink-0" onClick={onSelectAllVisible}>
                    Tout
                  </Button>
                </div>

                <div className="max-h-52 overflow-y-auto p-2 space-y-1">
                  {filteredEligible.map((user) => {
                    const checked = recordForm.data.contributor_user_ids.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => onToggleUser(user.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                          checked
                            ? 'bg-primary/10 border border-primary/25 shadow-sm'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                          checked ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                        >
                          {getInitials(user.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-900 truncate">{user.name}</span>
                          <span className="block text-xs text-slate-500 truncate">{user.email}</span>
                        </span>
                        <span className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                          checked ? 'border-primary bg-primary' : 'border-slate-300'
                        }`}
                        >
                          {checked && <CheckCircle2 size={14} className="text-white" />}
                        </span>
                      </button>
                    );
                  })}
                  {filteredEligible.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-6">Aucun participant trouve.</p>
                  )}
                </div>

                {eligibleUsers.length > 0 && (
                  <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50 flex justify-between">
                    <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={onSelectAllVisible}>
                      Selectionner tout ({eligibleUsers.length})
                    </button>
                    <button type="button" className="text-xs font-semibold text-slate-500 hover:underline" onClick={onClearSelection}>
                      Effacer
                    </button>
                  </div>
                )}
              </div>
              {recordForm.errors.contributor_user_ids && (
                <p className="text-xs text-red-600">{recordForm.errors.contributor_user_ids}</p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Montant (FCFA)</label>
                <input
                  className={fieldClass}
                  placeholder="Ex: 5 000"
                  value={recordForm.data.amount}
                  onChange={(e) => recordForm.setData('amount', formatGoalInput(e.target.value))}
                />
                {perParticipant && contribution.amount_per_participant && (
                  <p className="text-[11px] text-slate-500">
                    Cotisation attendue : {Number(contribution.amount_per_participant).toLocaleString('fr-FR')} FCFA / personne
                  </p>
                )}
                {recordForm.errors.amount && (
                  <p className="text-xs text-red-600">{recordForm.errors.amount}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Mode de paiement</label>
                <div className="flex flex-wrap gap-2">
                  {contribution.payment_methods.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => recordForm.setData('payment_method', method)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition ${
                        recordForm.data.payment_method === method
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-primary/40'
                      }`}
                    >
                      {PAYMENT_LABELS[method]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Note (optionnel)</label>
              <textarea
                className={`${fieldClass} min-h-[80px] resize-none`}
                placeholder="Reference de paiement, commentaire..."
                value={recordForm.data.note}
                onChange={(e) => recordForm.setData('note', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-container-high bg-slate-50/80">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="rounded-xl shadow-sm shadow-primary/20 min-w-[120px]"
              disabled={recordForm.processing || recordForm.data.contributor_user_ids.length === 0}
            >
              {recordForm.processing ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ParticipantStatusBadge({ status }: { status: EventContributionStatus | null }) {
  if (!status) return <span className="text-on-surface-variant text-xs">—</span>;

  const config: Record<EventContributionStatus, { label: string; className: string }> = {
    pending: { label: 'En attente', className: 'bg-slate-100 text-slate-700' },
    partial: { label: 'Partiel', className: 'bg-amber-100 text-amber-800' },
    complete: { label: 'A jour', className: 'bg-emerald-100 text-emerald-800' },
  };

  const { label, className } = config[status];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${className}`}>
      {label}
    </span>
  );
}

function HeroStat({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-3">
      <div className="flex items-center gap-1.5 text-white/70 text-[10px] font-bold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p className="text-sm md:text-base font-black mt-1.5 truncate">{value}</p>
    </div>
  );
}

function formatGoalInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
