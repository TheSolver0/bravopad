<?php

namespace Database\Seeders;

use App\Models\Direction;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    // Photos professionnelles — hommes et femmes noirs (Pexels, licence gratuite)
private static array $avatarsMen = [
    // Hommes noirs / africains — Pexels licence gratuite
    'https://i.pinimg.com/1200x/ff/d5/1c/ffd51c259d9fd07370309cd93f031adb.jpg',
    'https://i.pinimg.com/1200x/52/99/d3/5299d3a179231855a17467619e18ae02.jpg',
    'https://i.pinimg.com/1200x/74/61/3b/74613b9a25935ee4d89d5ba08505c8ed.jpg',
    'https://i.pinimg.com/1200x/8f/23/44/8f23447418ff5e3e048ad43742eaf93a.jpg',
    'https://i.pinimg.com/1200x/69/05/23/690523b4ed80d7aebd12e3e28ac23584.jpg',
    'https://i.pinimg.com/736x/7a/84/8d/7a848db3674de69117563846fda36aac.jpg',
    'https://i.pinimg.com/1200x/a9/02/9d/a9029dabf25a6a9550f6769f7ee5ec2b.jpg',
    'https://i.pinimg.com/1200x/ab/bf/04/abbf04a5b410c459598771d60a35fca2.jpg',
    'https://i.pinimg.com/1200x/bd/2e/6b/bd2e6bc7c308f0bd5deb37b4e0a12788.jpg',
    'https://i.pinimg.com/1200x/c7/53/2d/c7532d0465b39b5a551a55ce4f1bbfdf.jpg',
    // Nouveaux — profils africains vérifiés Pexels
    'https://i.pinimg.com/1200x/55/1e/fd/551efdcabb77e0ce4cf9f48f4d02e395.jpg',
    'https://i.pinimg.com/1200x/d9/84/3e/d9843eaf254d89de95cb845ba69d0fcb.jpg',
    'https://i.pinimg.com/736x/b0/56/f0/b056f0bc37003a15eb1339688df7eab6.jpg',
    'https://i.pinimg.com/1200x/54/d4/43/54d4430cf9216e3a7bce6778edf2b2c3.jpg',
    'https://i.pinimg.com/1200x/a5/19/5d/a5195d1b521156d368d5f9f2d5e0909f.jpg',
];
 
private static array $avatarsWomen = [
    // Femmes noires / africaines — Pexels licence gratuite
    'https://i.pinimg.com/1200x/0a/de/79/0ade7978a78e1880decc809bdd382f60.jpg',
    'https://i.pinimg.com/1200x/a3/8b/76/a38b76a2832e89a3e132d2058a387385.jpg',
    'https://i.pinimg.com/1200x/b5/92/07/b5920724ed2120a34e511b75a06bdde2.jpg',
    'https://i.pinimg.com/1200x/70/60/d8/7060d80bb20205640417494f8d641462.jpg',
    'https://i.pinimg.com/1200x/f7/18/a7/f718a7c6290bcacf48f118915e6b9c5b.jpg',
    'https://i.pinimg.com/1200x/ad/c7/93/adc7937efda6bb2e90ca0c995bc94f42.jpg',
    'https://i.pinimg.com/1200x/6f/c5/6e/6fc56ebd86ff309f5cfd3cb43783f94e.jpg',
    'https://i.pinimg.com/736x/7d/e4/c4/7de4c4c91b6a68c6f4f59065e3efc700.jpg',
    'https://i.pinimg.com/1200x/97/04/30/970430b085bef5b5b8747cfa9cecb88d.jpg',
    'https://i.pinimg.com/1200x/19/68/2b/19682bc650738e1db84fbfdae44dbb28.jpg',
    // Nouveaux — profils africaines vérifiés Pexels
    'https://i.pinimg.com/1200x/af/c7/7b/afc77b328645f19aed2d831e79692361.jpg',
    'https://i.pinimg.com/1200x/ba/4b/0b/ba4b0bba850037b23cbfc860c6df99bb.jpg',
    'https://i.pinimg.com/1200x/6e/1c/c4/6e1cc4cc72a5cef35be0eda605c8e46b.jpg',
    'https://i.pinimg.com/1200x/6d/6b/be/6d6bbe24d5c0da4bef8ae86a3dfc6ca3.jpg',
    'https://i.pinimg.com/1200x/55/d4/13/55d413685fea09315b57b03b4bb6722a.jpg',
];
    // Prénom féminin → déterminer si on tire dans la liste femmes
    private static array $feminineFirstNames = [
        'Clarisse', 'Claudine', 'Diane', 'Doris', 'Estelle', 'Evelyne', 'Gaelle', 'Ghislaine', 'Grace',
        'Ines', 'Irene', 'Laure', 'Linda', 'Lydie', 'Mireille', 'Murielle', 'Nadine', 'Nathalie', 'Prisca',
        'Rachel', 'Ruth', 'Sonia', 'Sylvie', 'Valerie', 'Vanessa', 'Yvette', 'Blandine', 'Noella', 'Flore',
        'Carine', 'Fanny', 'Joelle', 'Melanie', 'Raissa', 'Jessica',
    ];

    private static function pickAvatar(string $firstName, int $index): string
    {
        $isFeminine = in_array($firstName, self::$feminineFirstNames, true);
        $pool       = $isFeminine ? self::$avatarsWomen : self::$avatarsMen;

        return $pool[$index % count($pool)];
    }

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
            ->get(['id', 'code', 'name']);

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
                ], $spatieRole, $firstName, $globalIndex];

                $globalIndex++;
            }
        }

        $directionIdByCode = $directions->pluck('id', 'code')->all();

        foreach ($users as [$data, $spatieRole, $firstName, $idx]) {
            $directionCode = $data['direction_code'] ?? null;
            unset($data['direction_code']);

            $attributes = array_merge(
                $data,
                [
                    'direction_id' => $directionIdByCode[$directionCode] ?? null,
                    'password' => Hash::make('password'),
                ]
            );

            $user = User::firstOrNew(['email' => $data['email']]);
            $user->fill($attributes);
            $user->save();

            if (! $user->avatar) {
                $user->avatar = self::pickAvatar($firstName, $idx);
                $user->save();
            }

            if (! $user->hasRole($spatieRole)) {
                $user->syncRoles([$spatieRole]);
            }
        }
    }
}
