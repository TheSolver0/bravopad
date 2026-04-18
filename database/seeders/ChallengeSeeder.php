<?php

namespace Database\Seeders;

use App\Models\Challenge;
use App\Models\User;
use Illuminate\Database\Seeder;

class ChallengeSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::first();

        Challenge::insert([
            [
                'name'        => 'Esprit d\'équipe du mois',
                'description' => 'Envoyez au moins 3 Bravos à des collègues d\'un autre département pour renforcer la collaboration inter-équipes.',
                'start_date'  => now()->subDays(5)->toDateString(),
                'end_date'    => now()->addDays(20)->toDateString(),
                'points_bonus' => 150,
                'status'      => 'active',
                'created_by'  => $admin?->id,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'name'        => 'Innovation Sprint',
                'description' => 'Partagez une idée innovante via un Bravo "Innovation" et encouragez vos pairs à faire de même.',
                'start_date'  => now()->subDays(2)->toDateString(),
                'end_date'    => now()->addDays(12)->toDateString(),
                'points_bonus' => 200,
                'status'      => 'active',
                'created_by'  => $admin?->id,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'name'        => 'Onboarding Champions',
                'description' => 'Accueillez les nouveaux arrivants avec un Bravo "Proactivité" pour les mettre à l\'aise dans l\'équipe.',
                'start_date'  => now()->subDays(45)->toDateString(),
                'end_date'    => now()->subDays(5)->toDateString(),
                'points_bonus' => 100,
                'status'      => 'finished',
                'created_by'  => $admin?->id,
                'created_at'  => now()->subDays(45),
                'updated_at'  => now()->subDays(5),
            ],
            [
                'name'        => 'Qualité d\'abord',
                'description' => 'Mettez en avant les bonnes pratiques en envoyant des Bravos "Qualité" à vos collègues rigoureux.',
                'start_date'  => now()->subDays(60)->toDateString(),
                'end_date'    => now()->subDays(15)->toDateString(),
                'points_bonus' => 120,
                'status'      => 'finished',
                'created_by'  => $admin?->id,
                'created_at'  => now()->subDays(60),
                'updated_at'  => now()->subDays(15),
            ],
        ]);
    }
}
