<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class, // doit être en premier
            AppSettingsSeeder::class,
            BravoValueSeeder::class,
            DirectionSeeder::class,
            UserSeeder::class,
            ChallengeSeeder::class,
            ChallengeMediaSeeder::class,
            RewardSeeder::class,
            BadgeSeeder::class,
            HrSurveySeeder::class,
            BravoSeeder::class,
        ]);

        $superAdmin = User::firstOrNew(['email' => 'superadmin@bravo.test']);
        $superAdmin->fill([
            'name'         => 'Super Admin',
            'role'         => 'Super Administrateur',
            'points_total' => 0,
            'password'     => Hash::make('password'),
        ]);
        $superAdmin->save();
        $superAdmin->syncRoles(['super_admin']);

        // Comptes de démo pour la barre latérale « Administration » (RH / rôles / audit)
        $adminDemo = User::firstOrNew(['email' => 'admin@bravo.test']);
        $adminDemo->fill([
            'name'         => 'Admin PAD',
            'role'         => 'Administrateur',
            'points_total' => 0,
            'password'     => Hash::make('password'),
        ]);
        $adminDemo->save();
        $adminDemo->syncRoles(['admin']);

        $rhDemo = User::firstOrNew(['email' => 'rh@bravo.test']);
        $rhDemo->fill([
            'name'         => 'RH PAD',
            'role'         => 'Responsable RH',
            'points_total' => 0,
            'password'     => Hash::make('password'),
        ]);
        $rhDemo->save();
        $rhDemo->syncRoles(['hr']);

        $automation = User::firstOrNew(['email' => 'automations@bravo.internal']);
        $automation->fill([
            'name'          => 'Automatisations PAD',
            'role'          => 'Compte système',
            'points_total'  => 0,
            'is_automation' => true,
            'password'      => Hash::make(Str::random(48)),
        ]);
        $automation->save();
        $automation->syncRoles(['employee']);

        User::query()
            ->where('is_automation', false)
            ->whereNotIn('email', [
                'superadmin@bravo.test',
                'admin@bravo.test',
                'rh@bravo.test',
                'automations@bravo.internal',
            ])
            ->inRandomOrder()
            ->limit(50)
            ->each(function (User $u): void {
                $u->forceFill([
                    'birth_date' => now()->subYears(random_int(24, 55))->subDays(random_int(0, 320))->toDateString(),
                    'hired_at'   => now()->subYears(random_int(1, 14))->subDays(random_int(0, 200))->toDateString(),
                ])->saveQuietly();
            });
    }
}
