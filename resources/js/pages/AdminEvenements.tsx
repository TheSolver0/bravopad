import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
  CalendarDays, MapPin, Users, X, Plus, PartyPopper,
  Check, Loader2, Link as LinkIcon, LayoutDashboard,
  Trash2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Types ─────────────────────────────────────────────────────────────────────

type Evenement = {
  id: number;
  nom: string;
  slug: string;
  date: string | null;
  lieu: string | null;
  statut: 'brouillon' | 'ouvert' | 'ferme' | 'termine';
  inscriptions_count: number;
  cover_image?: string | null;
};

interface Props {
  evenements: Evenement[];
}

type FormData = {
  nom: string;
  description: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  lieu: string;
  cover_image: string;
  statut: string;
  programme: string[];
  activites_options: string[];
};

const emptyForm: FormData = {
  nom: '', description: '', date: '', heure_debut: '', heure_fin: '',
  lieu: '', cover_image: '', statut: 'brouillon', programme: [''], activites_options: [''],
};

const STATUT_DOT: Record<string, string> = {
  ouvert:   'bg-emerald-400',
  brouillon:'bg-yellow-400',
  ferme:    'bg-orange-400',
  termine:  'bg-slate-300',
};

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon',
  ouvert:    'Inscriptions ouvertes',
  ferme:     'Inscriptions fermées',
  termine:   'Terminé',
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminEvenements({ evenements }: Props) {
  const [showForm, setShowForm]           = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [form, setForm]                   = useState<FormData>(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const ouverts    = evenements.filter(e => e.statut === 'ouvert');
  const brouillons = evenements.filter(e => e.statut === 'brouillon');
  const fermes     = evenements.filter(e => e.statut === 'ferme');
  const termines   = evenements.filter(e => e.statut === 'termine');

  const openCreate = () => { setForm(emptyForm); setShowForm(true); };
  const closeForm  = () => { setShowForm(false); setForm(emptyForm); };

  /* ── programme helpers ── */
  const addProg    = () => setForm(f => ({ ...f, programme: [...f.programme, ''] }));
  const updProg    = (i: number, v: string) => {
    const a = [...form.programme]; a[i] = v; setForm(f => ({ ...f, programme: a }));
  };
  const delProg    = (i: number) =>
    setForm(f => ({ ...f, programme: f.programme.filter((_, idx) => idx !== i) }));

  /* ── activites_options helpers ── */
  const addAct     = () => setForm(f => ({ ...f, activites_options: [...f.activites_options, ''] }));
  const updAct     = (i: number, v: string) => {
    const a = [...form.activites_options]; a[i] = v; setForm(f => ({ ...f, activites_options: a }));
  };
  const delAct     = (i: number) =>
    setForm(f => ({ ...f, activites_options: f.activites_options.filter((_, idx) => idx !== i) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...form,
      programme:         form.programme.filter(Boolean),
      activites_options: form.activites_options.filter(Boolean),
    };
    router.post('/admin/evenements', payload, {
      preserveScroll: true,
      onFinish: () => { setSubmitting(false); closeForm(); },
    });
  };

  const handleDelete = (id: number) => {
    router.delete(`/admin/evenements/${id}`, {
      preserveScroll: true,
      onFinish: () => setConfirmDeleteId(null),
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Head title="Événements — Administration" />

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <PartyPopper size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Gestion des événements</h1>
            <p className="text-sm text-on-surface-variant font-medium">
              Créez et gérez les événements ouverts à l'inscription.
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} /> Nouvel événement
        </Button>
      </div>

      {/* ── Modal création ── */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="absolute inset-0 bg-black/50" onClick={closeForm} />
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl bg-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nouvel événement</p>
                <h2 className="text-xl font-black mt-0.5">Créer un événement</h2>
              </div>
              <button type="button" onClick={closeForm} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <form className="space-y-4 px-6 pb-6 pt-4" onSubmit={handleSubmit}>
              <FLabel label="Nom" required>
                <input required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Ex : Festival Nutri'Santé 2026" className={inp} />
              </FLabel>

              <FLabel label="Description">
                <textarea rows={3} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Texte d'annonce de l'événement…" className={inp + ' resize-none'} />
              </FLabel>

              <FLabel label="Image de couverture (URL ou chemin)">
                <input value={form.cover_image}
                  onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))}
                  placeholder="https://… ou /assets/images/events/…" className={inp} />
                {form.cover_image && (
                  <img src={form.cover_image} alt="aperçu"
                    className="mt-2 w-full h-28 object-cover rounded-xl border border-gray-100"
                    onError={e => (e.currentTarget.style.display = 'none')} />
                )}
              </FLabel>

              <div className="grid grid-cols-3 gap-4">
                <FLabel label="Date" required>
                  <input required type="date" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inp} />
                </FLabel>
                <FLabel label="Heure début">
                  <input type="time" value={form.heure_debut}
                    onChange={e => setForm(f => ({ ...f, heure_debut: e.target.value }))} className={inp} />
                </FLabel>
                <FLabel label="Heure fin">
                  <input type="time" value={form.heure_fin}
                    onChange={e => setForm(f => ({ ...f, heure_fin: e.target.value }))} className={inp} />
                </FLabel>
              </div>

              <FLabel label="Lieu">
                <input value={form.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))}
                  placeholder="Ex : Port Autonome de Douala" className={inp} />
              </FLabel>

              {/* Programme */}
              <div>
                <span className={labelCls}>Programme</span>
                <div className="space-y-2">
                  {form.programme.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={item} onChange={e => updProg(i, e.target.value)}
                        placeholder={`Activité ${i + 1}…`} className={inp + ' flex-1'} />
                      {form.programme.length > 1 && (
                        <button type="button" onClick={() => delProg(i)}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addProg}
                  className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
                  <Plus size={12} /> Ajouter une activité
                </button>
              </div>

              {/* Activités inscription */}
              <div>
                <span className={labelCls}>Activités proposées à l'inscription</span>
                <p className="text-[11px] text-gray-400 mb-2">Les participants pourront cocher leurs préférences lors de l'inscription.</p>
                <div className="space-y-2">
                  {form.activites_options.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={item} onChange={e => updAct(i, e.target.value)}
                        placeholder={`Option ${i + 1}…`} className={inp + ' flex-1'} />
                      {form.activites_options.length > 1 && (
                        <button type="button" onClick={() => delAct(i)}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addAct}
                  className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
                  <Plus size={12} /> Ajouter une option
                </button>
              </div>

              <FLabel label="Statut" required>
                <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} className={inp}>
                  <option value="brouillon">Brouillon</option>
                  <option value="ouvert">Inscriptions ouvertes</option>
                  <option value="ferme">Inscriptions fermées</option>
                  <option value="termine">Terminé</option>
                </select>
              </FLabel>

              <div className="flex gap-3 pt-1">
                <Button type="submit" variant="primary" disabled={submitting || !form.nom || !form.date}>
                  {submitting ? <><Loader2 size={15} className="animate-spin" /> Création…</> : <><PartyPopper size={15} /> Créer</>}
                </Button>
                <Button type="button" variant="ghost" onClick={closeForm}>Annuler</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Sections ── */}
      <EvenementSection title="Ouverts" dot="bg-emerald-400"
        items={ouverts} confirmDeleteId={confirmDeleteId}
        onDelete={id => setConfirmDeleteId(id)}
        onConfirmDelete={handleDelete}
        onCancelDelete={() => setConfirmDeleteId(null)} />

      <EvenementSection title="Brouillons" dot="bg-yellow-400"
        items={brouillons} confirmDeleteId={confirmDeleteId}
        onDelete={id => setConfirmDeleteId(id)}
        onConfirmDelete={handleDelete}
        onCancelDelete={() => setConfirmDeleteId(null)} />

      <EvenementSection title="Inscriptions fermées" dot="bg-orange-400"
        items={fermes} confirmDeleteId={confirmDeleteId}
        onDelete={id => setConfirmDeleteId(id)}
        onConfirmDelete={handleDelete}
        onCancelDelete={() => setConfirmDeleteId(null)} />

      <EvenementSection title="Terminés" dot="bg-slate-300"
        items={termines} confirmDeleteId={confirmDeleteId}
        onDelete={id => setConfirmDeleteId(id)}
        onConfirmDelete={handleDelete}
        onCancelDelete={() => setConfirmDeleteId(null)} />

      {evenements.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <PartyPopper size={36} className="text-on-surface-variant/25" />
          <p className="font-semibold text-on-surface-variant">Aucun événement créé pour le moment.</p>
          <Button variant="primary" onClick={openCreate}><Plus size={16} /> Créer le premier événement</Button>
        </div>
      )}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function EvenementSection({ title, dot, items, confirmDeleteId, onDelete, onConfirmDelete, onCancelDelete }: {
  title: string; dot: string; items: Evenement[];
  confirmDeleteId: number | null;
  onDelete: (id: number) => void;
  onConfirmDelete: (id: number) => void;
  onCancelDelete: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dot} inline-block`} />
        {title} ({items.length})
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(ev => (
          <EvenementCard key={ev.id} evenement={ev}
            confirmDeleteId={confirmDeleteId}
            onDelete={() => onDelete(ev.id)}
            onConfirmDelete={() => onConfirmDelete(ev.id)}
            onCancelDelete={onCancelDelete} />
        ))}
      </div>
    </section>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function EvenementCard({ evenement: ev, confirmDeleteId, onDelete, onConfirmDelete, onCancelDelete }: {
  evenement: Evenement;
  confirmDeleteId: number | null;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const isDeleting = confirmDeleteId === ev.id;

  return (
    <div
      className="group relative block rounded-2xl overflow-hidden bg-surface-container border border-surface-container-high transition-all duration-200 hover:shadow-md cursor-pointer"
      onClick={() => router.visit(`/admin/evenements/${ev.id}`)}
    >
      {/* Cover */}
      <div className="relative w-full aspect-video bg-surface-container-high overflow-hidden">
        {ev.cover_image ? (
          <img src={ev.cover_image} alt={ev.nom}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PartyPopper size={28} className="text-on-surface-variant/20" />
          </div>
        )}

        {/* Status dot */}
        <span className={`absolute top-2.5 left-2.5 w-2 h-2 rounded-full ring-2 ring-white ${STATUT_DOT[ev.statut] ?? 'bg-slate-300'}`} />

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex flex-col justify-between p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'rgba(0,0,0,0.52)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Top: statut + delete */}
          <div className="flex items-center justify-between gap-1">
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-white bg-white/15">
              {ev.statut === 'ouvert'
                ? <><ToggleRight size={13} /> Ouvert</>
                : <><ToggleLeft size={13} /> {STATUT_LABEL[ev.statut]}</>}
            </span>

            {isDeleting ? (
              <div className="flex items-center gap-1">
                <button type="button" onClick={e => { e.stopPropagation(); onConfirmDelete(); }}
                  className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                  <Check size={11} />
                </button>
                <button type="button" onClick={e => { e.stopPropagation(); onCancelDelete(); }}
                  className="p-1.5 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors">
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={e => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-red-500/60 transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {/* Bottom: actions */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); router.visit(`/admin/evenements/${ev.id}`); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-white bg-white/15 hover:bg-white/25 transition-colors"
            >
              <LayoutDashboard size={11} /> Dashboard
            </button>
            <a
              href={`/inscrire/${ev.slug}`}
              target="_blank"
              rel="noopener"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-white bg-white/15 hover:bg-white/25 transition-colors"
            >
              <LinkIcon size={11} /> Lien public
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5">
        <p className="text-sm font-bold text-on-surface leading-snug line-clamp-2">{ev.nom}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant font-medium flex-wrap">
          {ev.date && (
            <span className="flex items-center gap-1">
              <CalendarDays size={10} /> {ev.date}
            </span>
          )}
          {ev.lieu && (
            <span className="flex items-center gap-1 opacity-60">
              <MapPin size={10} /> {ev.lieu}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users size={10} /> {ev.inscriptions_count} inscrit{ev.inscriptions_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FLabel({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="space-y-1 block">
      <span className={labelCls}>{label} {required && <span className="text-red-500">*</span>}</span>
      {children}
    </label>
  );
}

const labelCls = 'text-[11px] font-black uppercase tracking-widest text-gray-400 block';
const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition';
