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
            'description' => "Sous le parrainage du Directeur Général, la Direction des Ressources Humaines vous invite à la première édition du Festival Nutri-Santé & Bien-être du PAD. 
                            Accordez-vous une journée dédiée à votre santé, votre énergie et votre équilibre à travers des ateliers de danse, yoga, nutrition, bien-être, massages et de nombreuses autres activités conviviales. 
                            Les places étant limitées, inscrivez-vous dès maintenant pour réserver votre participation et vivre une expérience enrichissante placée sous le signe du bien-être et de la cohésion. Nous vous attendons nombreux le samedi 20 juin 2026 au Club PAD !",
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
                'Ateliers à la santé',
                'Sensibilisation à la santé (Trouble du sommeil, stress, alimentation, sexologie)',
                'Dépistages / consultations santé',
                'Atelier diététique et Spa',
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
