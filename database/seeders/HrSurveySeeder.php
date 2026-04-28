<?php

namespace Database\Seeders;

use App\Models\HrSurvey;
use App\Models\User;
use Illuminate\Database\Seeder;

class HrSurveySeeder extends Seeder
{
    public function run(): void
    {
        $hr = User::whereHas('roles', fn ($q) => $q->where('name', 'hr'))->first()
            ?? User::first();

        $surveys = [
            [
                'title'    => "Journée de l'Excellence PAD 2026 — Activité team building",
                'question' => "Quelle activité souhaitez-vous pour la prochaine journée de team building du Port Autonome de Douala ?",
                'options'  => [
                    ['key' => 'kribi',     'label' => 'Excursion touristique à Kribi (plage + cascades de la Lobé)'],
                    ['key' => 'tournoi',   'label' => 'Tournoi sportif inter-directions (football, volley-ball, jeux de société)'],
                    ['key' => 'gastro',    'label' => 'Soirée gastronomique au restaurant panoramique face au port de Douala'],
                    ['key' => 'limbe',     'label' => 'Sortie détente à Limbe (plage volcanique + visite du zoo)'],
                    ['key' => 'culture',   'label' => 'Journée culturelle à Douala (musée national, patrimoine colonial, marché artisanal)'],
                ],
                'is_active' => true,
                'ends_at'   => now()->addDays(28),
            ],
            [
                'title'    => "Dîner de fin d'année 2026 — Choix du lieu",
                'question' => "Quel cadre préférez-vous pour le dîner officiel de fin d'année du personnel PAD ?",
                'options'  => [
                    ['key' => 'akwa',      'label' => "Salle de réception de l'hôtel Akwa Palace — Douala Centre"],
                    ['key' => 'bord_mer',  'label' => 'Restaurant bord de mer Bonanjo avec vue sur le fleuve Wouri'],
                    ['key' => 'siege',     'label' => 'Barbecue & buffet convivial au siège du PAD (terrasse extérieure)'],
                    ['key' => 'sawa',      'label' => 'Espace Sawa Douala — grande salle panoramique événementiel'],
                    ['key' => 'mont_cam',  'label' => 'Réception à Buea avec vue sur le Mont Cameroun (déplacement inclus)'],
                ],
                'is_active' => true,
                'ends_at'   => now()->addDays(18),
            ],
            [
                'title'    => "Bien-être au travail — Priorités du personnel 2026",
                'question' => "Quelle amélioration de vos conditions de travail vous semble la plus urgente à mettre en place au PAD ?",
                'options'  => [
                    ['key' => 'sport',    'label' => 'Salle de sport et de remise en forme au sein du PAD'],
                    ['key' => 'medical',  'label' => 'Consultations médicales périodiques et permanence infirmière on-site'],
                    ['key' => 'creche',   'label' => 'Crèche et garderie pour les enfants du personnel'],
                    ['key' => 'formation','label' => 'Programme de formation continue et développement de carrière accéléré'],
                    ['key' => 'restau',   'label' => 'Amélioration de la cafétéria (menus équilibrés, tarifs préférentiels pour le personnel)'],
                ],
                'is_active' => true,
                'ends_at'   => now()->addDays(21),
            ],
            [
                'title'    => "Aménagement des horaires de travail — Votre préférence",
                'question' => "Quel mode d'organisation du temps de travail correspondrait le mieux à votre situation personnelle et professionnelle ?",
                'options'  => [
                    ['key' => 'teletravail', 'label' => 'Télétravail 2 jours par semaine (postes administratifs éligibles)'],
                    ['key' => 'flex',        'label' => 'Horaires flexibles — plage fixe 9h–15h avec souplesse sur les marges'],
                    ['key' => 'actuel',      'label' => 'Maintien du planning actuel (7h30–15h30 du lundi au vendredi)'],
                    ['key' => 'compresse',   'label' => 'Semaine compressée — 4 jours à 9h/jour avec repos le vendredi'],
                ],
                'is_active' => false,
                'ends_at'   => now()->subDays(5),
            ],
        ];

        foreach ($surveys as $data) {
            HrSurvey::firstOrCreate(
                ['title' => $data['title']],
                [
                    'question'   => $data['question'],
                    'options'    => $data['options'],
                    'is_active'  => $data['is_active'],
                    'created_by' => $hr?->id,
                    'starts_at'  => now()->subDays(3),
                    'ends_at'    => $data['ends_at'],
                ]
            );
        }
    }
}
