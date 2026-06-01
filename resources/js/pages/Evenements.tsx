import { Head } from '@inertiajs/react';
import { CalendarDays, MapPin, Users, PartyPopper, ExternalLink } from 'lucide-react';

type Evenement = {
  id: number;
  slug: string;
  nom: string;
  description: string | null;
  date: string | null;
  heure_debut: string | null;
  lieu: string | null;
  statut: 'ouvert' | 'ferme' | 'termine';
  cover_image: string | null;
  inscriptions_count: number;
};

interface Props {
  evenements: Evenement[];
}

const STATUT_LABEL: Record<string, string> = {
  ouvert:  'Inscriptions ouvertes',
  ferme:   'Inscriptions fermées',
  termine: 'Terminé',
};

const STATUT_STYLE: Record<string, string> = {
  ouvert:  'bg-green-100 text-green-700',
  ferme:   'bg-orange-100 text-orange-700',
  termine: 'bg-slate-100 text-slate-500',
};

export default function Evenements({ evenements }: Props) {
  const ouverts = evenements.filter(e => e.statut === 'ouvert');
  const autres  = evenements.filter(e => e.statut !== 'ouvert');

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Head title="Événements" />

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <PartyPopper size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Événements</h1>
          <p className="text-sm text-on-surface-variant font-medium">
            Découvrez et inscrivez-vous aux événements du Port Autonome de Douala.
          </p>
        </div>
      </div>

      {/* ── Événements ouverts ── */}
      {ouverts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Inscriptions ouvertes ({ouverts.length})
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {ouverts.map(ev => (
              <EvenementCard key={ev.id} evenement={ev} featured />
            ))}
          </div>
        </section>
      )}

      {/* ── Autres événements ── */}
      {autres.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
            Passés & fermés ({autres.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {autres.map(ev => (
              <EvenementCard key={ev.id} evenement={ev} />
            ))}
          </div>
        </section>
      )}

      {/* ── État vide ── */}
      {evenements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <CalendarDays size={40} className="text-on-surface-variant/25" />
          <p className="font-semibold text-on-surface-variant">Aucun événement disponible pour le moment.</p>
          <p className="text-sm text-on-surface-variant/60">Revenez bientôt pour découvrir les prochains événements.</p>
        </div>
      )}
    </div>
  );
}

// ── EvenementCard ─────────────────────────────────────────────────────────────

function EvenementCard({ evenement: ev, featured }: { evenement: Evenement; featured?: boolean }) {
  const canRegister = ev.statut === 'ouvert';

  return (
    <div className={`bg-white rounded-2xl overflow-hidden border border-surface-container-high transition-shadow ${featured ? 'shadow-md hover:shadow-lg' : 'shadow-sm opacity-80'}`}>

      {/* Cover image */}
      <div className="relative h-36 bg-gradient-to-br from-primary/20 to-primary/5">
        {ev.cover_image ? (
          <img
            src={ev.cover_image}
            alt={ev.nom}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PartyPopper size={32} className="text-primary/30" />
          </div>
        )}
        {/* Statut badge */}
        <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUT_STYLE[ev.statut]}`}>
          {STATUT_LABEL[ev.statut]}
        </span>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <h3 className="font-extrabold text-base leading-tight">{ev.nom}</h3>

        {ev.description && (
          <p className="text-xs text-on-surface-variant line-clamp-2">{ev.description}</p>
        )}

        <div className="flex flex-wrap gap-2 text-[11px] text-on-surface-variant font-medium">
          {ev.date && (
            <span className="flex items-center gap-1">
              <CalendarDays size={11} className="text-primary/70" /> {ev.date}
              {ev.heure_debut && <> à {ev.heure_debut}</>}
            </span>
          )}
          {ev.lieu && (
            <span className="flex items-center gap-1">
              <MapPin size={11} className="text-primary/70" /> {ev.lieu}
            </span>
          )}
          {ev.inscriptions_count > 0 && (
            <span className="flex items-center gap-1">
              <Users size={11} className="text-primary/70" /> {ev.inscriptions_count} inscrit{ev.inscriptions_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {canRegister ? (
          <a
            href={`/inscrire/${ev.slug}`}
            target="_blank"
            rel="noopener"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            <ExternalLink size={14} /> S'inscrire
          </a>
        ) : (
          <div className="w-full py-2.5 rounded-xl bg-surface-container-low text-on-surface-variant text-sm font-semibold text-center">
            {ev.statut === 'termine' ? 'Événement terminé' : 'Inscriptions fermées'}
          </div>
        )}
      </div>
    </div>
  );
}
