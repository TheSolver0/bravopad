<?php

namespace Database\Seeders;

use App\Models\Evenement;
use Illuminate\Database\Seeder;

class PortVolleyballEvenementSeeder extends Seeder
{
    public function run(): void
    {
        $evenement = Evenement::where('slug', 'port-volleyball-finale-coupe-cameroun-2026')->first();

        $data = [
            'slug'        => 'port-volleyball-finale-coupe-cameroun-2026',
            'nom'         => 'Port Volley-ball — Finale de la Coupe du Cameroun 2026',
            'description' => "Champion du Cameroun 2026, Port Volley-ball vise un doublé historique lors de la Finale de la Coupe du Cameroun 2026.\n\nTout le personnel du Groupe PAD est invité à se mobiliser massivement pour soutenir nos champions au Palais Polyvalent des Sports de Yaoundé. Votre présence et vos encouragements seront des atouts précieux dans la conquête de ce nouveau trophée.\n\nEnsemble, faisons résonner les couleurs du PAD dans les tribunes !\n\n🚌 Départ de l'Immeuble Siège : 06h00 précises\n📌 Infos & inscription : Bureau Sport — 698 23 50 76",
            'date'        => '2026-06-14',
            'heure_debut' => '06:00',
            'heure_fin'   => null,
            'lieu'        => 'Palais Polyvalent des Sports de Yaoundé',
            'cover_image' => '/assets/images/events/eventsport_volleyball.png',
            'statut'      => 'ouvert',
            'programme'   => [
                'Départ de l\'Immeuble Siège à 06h00 précises',
                'Déplacement collectif vers Yaoundé',
                'Finale de la Coupe du Cameroun 2026',
                'Soutien à Port Volley-ball dans les tribunes',
            ],
            'activites_options' => [],
        ];

        if ($evenement) {
            $evenement->update($data);
        } else {
            Evenement::create($data);
        }
    }
}
