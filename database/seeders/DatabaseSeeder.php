<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

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
            RewardSeeder::class,
        ]);

        $superAdmin = User::firstOrNew(['email' => 'superadmin@bravo.test']);
        $superAdmin->fill([
            'name' => 'Super Admin',
            'role' => 'Super Administrateur',
            'department' => 'DSI',
            'points_total' => 0,
            'password' => Hash::make('password'),
        ]);
        $superAdmin->save();
        $superAdmin->syncRoles(['super_admin']);
    }
}
