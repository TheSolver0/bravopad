<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChallengeSeeder extends Seeder
{
    public function run(): void
    {
        $superAdminId = User::query()->where('email', 'superadmin@bravo.test')->value('id');
        $adminId = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'admin'))
            ->value('id');
        $hrId = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'hr'))
            ->value('id');
        $managerId = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'manager'))
            ->value('id');

        $defaultCreatorId = $superAdminId
            ?? $adminId
            ?? $hrId
            ?? $managerId
            ?? User::query()->value('id');

        if (! $defaultCreatorId) {
            return;
        }

        $existingDepartmentIds = array_flip(DB::table('departments')->pluck('id')->all());
        $resolveDivisionId = static fn (?int $id): ?int => ($id && isset($existingDepartmentIds[$id])) ? $id : null;

        DB::table('challenges')->insert([
            [
                'id'          => 1,
                'name'        => 'Zéro Incident Mai 2026',
                'description' => 'Toute l\'équipe Exploitation s\'engage à signaler chaque situation à risque avant qu\'elle ne devienne un accident. Envoyez un Bravo "Rigueur" à tout collègue qui identifie et remonte un danger sur le quai ou à bord. Objectif : 30 signalements en un mois.',
                'cover_image' => 'https://i.pinimg.com/1200x/4d/2d/64/4d2d64342060ec5de9aa64c4b0eaa9c5.jpg',
                'category'    => 'securite',
                'start_date'  => '2026-04-01',
                'end_date'    => '2026-04-30',
                'points_bonus'=> 250,
                'status'      => 'active',
                'for_all'     => 0,
                'created_by'  => $adminId ?? $defaultCreatorId,
                'division_id' => $resolveDivisionId(14),
                'created_at'  => '2026-04-24 13:48:01',
                'updated_at'  => '2026-04-24 13:48:01',
            ],
            [
                'id'          => 3,
                'name'        => 'Accueil Armateurs — Excellence Client',
                'description' => 'Le Service Accueil & Protocole lance un défi : obtenez un Bravo "Service" d\'un armateur ou d\'un transitaire suite à une prise en charge exemplaire. Chaque témoignage positif relayé en interne rapporte 250 pts de bonus à votre équipe.',
                'cover_image' => 'https://i.pinimg.com/1200x/b1/fe/98/b1fe98a714bbe508cbcaa344804022b1.jpg',
                'category'    => 'service',
                'start_date'  => '2026-04-25',
                'end_date'    => '2026-05-25',
                'points_bonus'=> 250,
                'status'      => 'active',
                'for_all'     => 0,
                'created_by'  => $hrId ?? $defaultCreatorId,
                'division_id' => $resolveDivisionId(5),
                'created_at'  => '2026-04-25 13:48:01',
                'updated_at'  => '2026-04-25 13:48:01',
            ],
            [
                'id'          => 4,
                'name'        => 'Capitainerie — Escales Sans Délai',
                'description' => 'Chaque officier de quart qui coordonne une escale sans retard et le documente dans le système reçoit un Bravo "Rigueur". L\'équipe ayant le plus grand ratio escales-à-l\'heure / escales-totales remporte 300 pts bonus collectifs.',
                'cover_image' => 'https://i.pinimg.com/webp85/1200x/6d/6c/dc/6d6cdc2660f4d265cbc5714f8899a89f.webp',
                'category'    => 'performance',
                'start_date'  => '2026-04-17',
                'end_date'    => '2026-05-17',
                'points_bonus'=> 300,
                'status'      => 'active',
                'for_all'     => 0,
                'created_by'  => $adminId ?? $defaultCreatorId,
                'division_id' => $resolveDivisionId(10),
                'created_at'  => '2026-04-17 13:48:01',
                'updated_at'  => '2026-04-17 13:48:01',
            ],
            [
                'id'          => 5,
                'name'        => 'Semaine Verte du Port',
                'description' => 'Dans le cadre de la politique RSE du PAD, valorisez les gestes éco-responsables : tri des déchets huileux, économie d\'énergie en salle des machines, covoiturage. Envoyez un Bravo "Esprit d\'équipe" à chaque initiative verte observée. Les 10 meilleurs éco-champions seront célébrés lors du bilan mensuel.',
                'cover_image' => 'https://i.pinimg.com/1200x/db/23/16/db2316dee599c549f41bbc6042e38717.jpg',
                'category'    => 'rse',
                'start_date'  => '2026-04-26',
                'end_date'    => '2026-05-03',
                'points_bonus'=> 180,
                'status'      => 'active',
                'for_all'     => 1,
                'created_by'  => $hrId ?? $defaultCreatorId,
                'division_id' => null,
                'created_at'  => '2026-04-26 13:48:01',
                'updated_at'  => '2026-04-26 13:48:01',
            ],
            [
                'id'          => 6,
                'name'        => 'Mentorat Nouveaux Agents',
                'description' => 'La DRH invite les seniors (+ 5 ans d\'ancienneté) à parrainer un nouvel agent pendant 4 semaines. Chaque parrain/marraine reçoit un Bravo "Proactivité" de son filleul et un de la DRH. Objectif : 100 % des recrues 2026 accompagnées.',
                'cover_image' => 'https://i.pinimg.com/1200x/4d/2d/64/4d2d64342060ec5de9aa64c4b0eaa9c5.jpg',
                'category'    => 'collaboration',
                'start_date'  => '2026-04-22',
                'end_date'    => '2026-05-20',
                'points_bonus'=> 220,
                'status'      => 'active',
                'for_all'     => 1,
                'created_by'  => $hrId ?? $defaultCreatorId,
                'division_id' => null,
                'created_at'  => '2026-04-22 13:48:01',
                'updated_at'  => '2026-04-22 13:48:01',
            ],
            [
                'id'          => 7,
                'name'        => 'Budget Q2 — Maîtrise des Coûts',
                'description' => 'La Direction Financière challenge toutes les directions : signalez et documentez toute économie réalisée (renégociation contrat, optimisation stock, réduction consommable). Chaque économie validée ≥ 500 000 XAF donne lieu à un Bravo "Rigueur" et 150 pts bonus.',
                'cover_image' => 'https://i.pinimg.com/1200x/4d/2d/64/4d2d64342060ec5de9aa64c4b0eaa9c5.jpg',
                'category'    => 'performance',
                'start_date'  => '2026-04-23',
                'end_date'    => '2026-06-24',
                'points_bonus'=> 150,
                'status'      => 'active',
                'for_all'     => 1,
                'created_by'  => $adminId ?? $defaultCreatorId,
                'division_id' => $resolveDivisionId(15),
                'created_at'  => '2026-04-23 13:48:01',
                'updated_at'  => '2026-04-23 13:48:01',
            ],
            [
                'id'          => 8,
                'name'        => 'Plan SYNERGIE — Collaboration Inter-Directions',
                'description' => 'Dans le cadre du plan stratégique SYNERGIE 2024-2028, chaque agent ayant facilité un projet transversal entre deux directions différentes a été invité à envoyer un Bravo "Esprit d\'équipe". 47 bravos inter-directions ont été enregistrés.',
                'cover_image' => 'https://i.pinimg.com/1200x/4d/2d/64/4d2d64342060ec5de9aa64c4b0eaa9c5.jpg',
                'category'    => 'collaboration',
                'start_date'  => '2026-02-11',
                'end_date'    => '2026-04-12',
                'points_bonus'=> 200,
                'status'      => 'finished',
                'for_all'     => 1,
                'created_by'  => $adminId ?? $defaultCreatorId,
                'division_id' => null,
                'created_at'  => '2026-02-11 13:48:01',
                'updated_at'  => '2026-04-12 13:48:01',
            ],
            [
                'id'          => 9,
                'name'        => 'Certification ISO 9001 — Mobilisation Qualité',
                'description' => 'En préparation de l\'audit de renouvellement ISO 9001, la CQN a demandé à chaque direction de désigner un référent qualité et de documenter au moins 3 non-conformités corrigées. Chaque référent ayant atteint son objectif a reçu un Bravo "Rigueur".',
                'cover_image' => 'https://i.pinimg.com/1200x/4d/2d/64/4d2d64342060ec5de9aa64c4b0eaa9c5.jpg',
                'category'    => 'qualite',
                'start_date'  => '2026-01-27',
                'end_date'    => '2026-04-07',
                'points_bonus'=> 300,
                'status'      => 'finished',
                'for_all'     => 1,
                'created_by'  => $hrId ?? $defaultCreatorId,
                'division_id' => null,
                'created_at'  => '2026-01-27 13:48:01',
                'updated_at'  => '2026-04-07 13:48:01',
            ],
            [
                'id'          => 10,
                'name'        => 'Dragage du Chenal — Équipe de Choc',
                'description' => 'L\'opération de dragage du chenal d\'accès a mobilisé 120 agents pendant 8 semaines. Chaque chef d\'équipe ayant tenu ses jalons sans dépassement de délai a reçu un Bravo "Performance" et 120 pts bonus.',
                'cover_image' => 'https://i.pinimg.com/1200x/4d/2d/64/4d2d64342060ec5de9aa64c4b0eaa9c5.jpg',
                'category'    => 'performance',
                'start_date'  => '2025-12-28',
                'end_date'    => '2026-02-22',  
                'points_bonus'=> 120,
                'status'      => 'finished',
                'for_all'     => 0,
                'created_by'  => $adminId ?? $defaultCreatorId,
                'division_id' => $resolveDivisionId(14),
                'created_at'  => '2025-12-28 13:48:01',
                'updated_at'  => '2026-02-22 13:48:01',
            ],
            [
                'id'          => 11,
                'name'        => 'Hackathon DSI — Solutions Internes',
                'description' => 'La DSI a organisé un hackathon de 48 h pour développer des outils internes (tableau de bord escales, portail congés). Les 3 équipes gagnantes ont reçu chacune un Bravo "Innovation" et 500 pts. Bilan : 4 prototypes livrés, dont 2 en production.',
                'cover_image' => 'https://i.pinimg.com/1200x/4d/2d/64/4d2d64342060ec5de9aa64c4b0eaa9c5.jpg',
                'category'    => 'innovation',
                'start_date'  => '2026-02-26',
                'end_date'    => '2026-03-30',
                'points_bonus'=> 500,
                'status'      => 'finished',
                'for_all'     => 0,
                'created_by'  => $adminId ?? $defaultCreatorId,
                'division_id' => $resolveDivisionId(19),
                'created_at'  => '2026-02-26 13:48:01',
                'updated_at'  => '2026-03-30 13:48:01',
            ],
            [
                'id'          => 12,
                'name'        => 'Journée Portes Ouvertes 2025',
                'description' => 'La DCRP a coordonné la Journée Portes Ouvertes du PAD : accueil de 2 000 visiteurs, ateliers métiers, démonstrations portuaires. Tous les agents-animateurs ayant reçu au moins un retour positif d\'un visiteur ont été honorés d\'un Bravo "Service".',
                'cover_image' => 'https://i.pinimg.com/1200x/4d/2d/64/4d2d64342060ec5de9aa64c4b0eaa9c5.jpg',
                'category'    => 'service',
                'start_date'  => '2026-03-08',
                'end_date'    => '2026-03-09',
                'points_bonus'=> 180,
                'status'      => 'finished',
                'for_all'     => 1,
                'created_by'  => $hrId ?? $defaultCreatorId,
                'division_id' => null,
                'created_at'  => '2026-03-03 13:48:01',
                'updated_at'  => '2026-03-10 13:48:01',
            ],
            [
                'id'          => 13,
                'name'        => 'Olympiade MultiSport du PAD',
                'description' => '1ère édition des Olympiades MultiSports du PAD : rendez-vous le samedi 25 avril 2026 au Stade de Japoma. Venez mouiller le maillot, représenter votre direction et tenter de remporter les lots et trophées !',
                'cover_image' => '/assets/images/challenges/olympiade.jpg',
                'category'    => 'autre',
                'start_date'  => '2026-04-25',
                'end_date'    => '2026-04-25',
                'points_bonus'=> 100,
                'status'      => 'active',
                'for_all'     => 1,
                'created_by'  => $superAdminId ?? $adminId ?? $defaultCreatorId,
                'division_id' => null,
                'created_at'  => '2026-04-27 14:16:20',
                'updated_at'  => '2026-04-27 14:16:20',
            ],

        ]);
    DB::statement('SET FOREIGN_KEY_CHECKS=1;');
    }
}