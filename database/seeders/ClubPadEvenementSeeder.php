<?php

namespace Database\Seeders;

use App\Models\Evenement;
use Illuminate\Database\Seeder;

class ClubPadEvenementSeeder extends Seeder
{
    public function run(): void
    {
        // Trouver l'ancien slug ou le nouveau pour éviter le doublon
        $evenement = Evenement::where('slug', 'club-pad-olympiades-2026')
            ->orWhere('slug', 'festival-nutrisante-bien-etre-2026')
            ->first();

        $data = [
            'slug'        => 'festival-nutrisante-bien-etre-2026',
            'nom'         => "1er Festival Nutri'Santé & Bien-être",
            'description' => "La Direction des Ressources Humaines a le plaisir de vous annoncer la tenue de la première édition du Festival Nutri-Santé & Bien-être du PAD, un moment de partage, de santé et de cohésion réunissant l'ensemble du personnel.\n\nAfin de bien organiser cet évènement et de l'adapter à vos attentes, nous vous invitons à répondre à ce court sondage (moins de 2 minutes). Votre réponse nous aide à tout prévoir : espaces, restauration, activités et animations.\n\nMerci de votre participation !",
            'date'        => '2026-06-20',
            'heure_debut' => '07:30',
            'heure_fin'   => '15:00',
            'lieu'        => 'Port Autonome de Douala',
            'cover_image' => '/assets/images/events/festival_nutrition.jpeg',
            'statut'      => 'ouvert',
            'programme'   => [
                'Atelier de danse Zumba',
                'Atelier de yoga',
                'Démonstration culinaire & boisson détox',
                'Présentation des aliments bios',
                'Dépistages & consultations santé',
                'Chiropractie & séances de massages',
                'Stands de bien-être',
                'Quiz inter-direction',
            ],
            'activites_options' => [
                'Quiz Inter-Directions',
                'Activités sportives (Yoga, Danse zumba)',
                'Ateliers / sensibilisation à la santé',
                'Dépistages / consultations santé',
                'Animations & moments conviviaux',
                'Séance de massages',
            ],
        ];

        if ($evenement) {
            $evenement->update($data);
        } else {
            Evenement::create($data);
        }
    }
}
