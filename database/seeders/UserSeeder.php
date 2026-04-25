<?php

namespace Database\Seeders;

use App\Models\Direction;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $firstNames = [
            'Armand', 'Boris', 'Brice', 'Cedric', 'Christian', 'Clarisse', 'Claudine', 'Cyprien', 'Diane',
            'Doris', 'Emile', 'Estelle', 'Evelyne', 'Fabrice', 'Fabrice', 'Gaelle', 'Ghislaine', 'Grace',
            'Herve', 'Ines', 'Irene', 'Jean', 'Junior', 'Kevin', 'Landry', 'Laure', 'Linda', 'Lydie',
            'Mireille', 'Murielle', 'Nadine', 'Nathalie', 'Patrick', 'Prisca', 'Rachel', 'Richard', 'Ruth',
            'Serge', 'Sonia', 'Stephane', 'Sylvie', 'Thierry', 'Ulrich', 'Valerie', 'Vanessa', 'Wilfried',
            'Yannick', 'Yvette', 'Blandine', 'Noella', 'Flore', 'Carine', 'Marius', 'Fanny', 'Joelle',
            'Romuald', 'Borisland', 'Ghislain', 'Dylan', 'Melanie', 'Raissa', 'Jessica', 'Ernest', 'Freddy',
        ];
        $lastNames = [
            'Abanda', 'Abega', 'Atangana', 'Awono', 'Balla', 'Banen', 'Biloa', 'Biyogo', 'Dipanda', 'Douala',
            'Ebongue', 'Ekoue', 'Essomba', 'Etoundi', 'Ewane', 'Fokou', 'Fouda', 'Kamga', 'Kemayou', 'Kenfack',
            'Kouam', 'Kouamo', 'Kounga', 'Mbarga', 'Mbe', 'Mbia', 'Mbianda', 'Mbida', 'Mebenga', 'Mekongo',
            'Minkoue', 'Moukoko', 'Mounchili', 'Mvondo', 'Nana', 'Nde', 'Ndzi', 'Ngalla', 'Ngando', 'Ngassa',
            'Ngoh', 'Nguessan', 'Nguimfack', 'Nji', 'Njikam', 'Njoya', 'Nono', 'Ntone', 'Obam', 'Onana',
            'Owona', 'Simo', 'Tchameni', 'Tchinda', 'Tchoua', 'Wamba', 'Yene', 'Yomba', 'Zambo', 'Ze',
        ];
        $managerRoles = [
            'Chef de Service', 'Chef de Division', 'Manager Opérations', 'Coordinateur Direction',
        ];
        $employeeRoles = [
            'Chargé de Mission', 'Assistant Administratif', 'Analyste', 'Contrôleur',
            'Agent de Suivi', 'Chargé de Projet', 'Technicien', 'Agent Logistique',
        ];

        $directions = Direction::query()
            ->orderBy('code')
            ->get(['code', 'name']);

        if ($directions->isEmpty()) {
            return;
        }

        $users = [];
        $globalIndex = 1;

        foreach ($directions as $direction) {
            for ($i = 0; $i < 10; $i++) {
                $firstName = $firstNames[($globalIndex + $i) % count($firstNames)];
                $lastName = $lastNames[($globalIndex * 3 + $i) % count($lastNames)];
                $fullName = "{$firstName} {$lastName}";

                $spatieRole = 'employee';
                $jobRole = $employeeRoles[$i % count($employeeRoles)];

                if ($direction->code === 'DSI' && $i === 0) {
                    $spatieRole = 'admin';
                    $jobRole = 'Administrateur Système';
                } elseif ($direction->code === 'DRH' && $i === 0) {
                    $spatieRole = 'hr';
                    $jobRole = 'Responsable RH';
                } elseif ($i === 0) {
                    $spatieRole = 'manager';
                    $jobRole = $managerRoles[$globalIndex % count($managerRoles)];
                }

                $emailLocal = Str::of($firstName . '.' . $lastName . '.' . strtolower($direction->code) . '.' . $i)
                    ->lower()
                    ->ascii()
                    ->replaceMatches('/[^a-z0-9\.]/', '')
                    ->trim('.')
                    ->value();

                $users[] = [[
                    'name' => $fullName,
                    'email' => "{$emailLocal}@bravo.test",
                    'role' => $jobRole,
                    'direction_code' => $direction->code,
                    'points_total' => random_int(100, 2500),
                ], $spatieRole];

                $globalIndex++;
            }
        }

        foreach ($users as [$data, $spatieRole]) {
            $directionCode = $data['direction_code'] ?? null;
            // On stocke le code direction dans "department" pour l'affichage Team.
            $department = $directionCode ?? 'N/A';
            unset($data['direction_code']);

            $attributes = array_merge(
                $data,
                [
                    'department' => $department,
                    'password' => Hash::make('password'),
                ]
            );

            $user = User::firstOrNew(['email' => $data['email']]);
            $user->fill($attributes);
            $user->save();

            if (! $user->avatar) {
                $seed = urlencode($data['name']);
                $user->avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed={$seed}";
                $user->save();
            }

            if (! $user->hasRole($spatieRole)) {
                $user->syncRoles([$spatieRole]);
            }
        }
    }
}
