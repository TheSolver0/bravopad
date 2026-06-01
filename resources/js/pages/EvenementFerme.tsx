import { Head } from '@inertiajs/react';
import { CalendarDays, Lock } from 'lucide-react';

interface Props {
  evenement: {
    nom: string;
    statut: string;
    date: string | null;
  };
}

const STATUT_MSG: Record<string, string> = {
  ferme:   "Les inscriptions pour cet événement sont fermées.",
  termine: "Cet événement est terminé.",
  brouillon: "Cet événement n'est pas encore disponible.",
};

export default function EvenementFerme({ evenement }: Props) {
  return (
    <>
      <Head title={`${evenement.nom} — Inscriptions fermées`} />
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #003d82 0%, #0057b8 60%, #003d82 100%)' }}
      >
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: '#e5e7eb' }}
          >
            <Lock className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#003d82' }}>
            {evenement.nom}
          </h2>
          <p className="text-gray-600 mb-4">
            {STATUT_MSG[evenement.statut] ?? 'Cet événement n\'est plus disponible.'}
          </p>
          {evenement.date && (
            <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
              <CalendarDays className="w-4 h-4" />
              {evenement.date}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
