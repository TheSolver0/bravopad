<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['name' => 'Sarah Kamau',    'email' => 'sarah@bravo.test',   'role' => 'Directrice Artistique', 'department' => 'Design',       'points_total' => 1250],
            ['name' => 'Marcus Diallo',  'email' => 'marcus@bravo.test',  'role' => 'Développeur Senior',    'department' => 'Ingénierie',   'points_total' => 840],
            ['name' => 'Léa Traoré',     'email' => 'lea@bravo.test',     'role' => 'Product Owner',         'department' => 'Produit',      'points_total' => 690],
            ['name' => 'David Okoro',    'email' => 'david@bravo.test',   'role' => 'Growth Manager',        'department' => 'Marketing',    'points_total' => 2100],
            ['name' => 'Jordan Mbeki',   'email' => 'jordan@bravo.test',  'role' => 'Fullstack Dev',         'department' => 'Ingénierie',   'points_total' => 540],
            ['name' => 'Amandine Diop',  'email' => 'amandine@bravo.test','role' => 'UX Designer',           'department' => 'Design',       'points_total' => 1100],
        ];

        foreach ($users as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                array_merge($data, ['password' => Hash::make('password')])
            );
            // Generate dicebear avatar URL based on name
            if (!$user->avatar) {
                $seed = urlencode($data['name']);
                $user->avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed={$seed}";
                $user->save();
            }
        }
    }
}
