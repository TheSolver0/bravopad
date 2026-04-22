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
            ['name' => 'TAPTUE Dilane',    'email' => 'dilane@bravo.test',   'role' => 'Développeur',  'permission' => 'manager',  'department_id' => 1, 'points_total' => 0],
            ['name' => 'FOTSO Luc',        'email' => 'luc@bravo.test',      'role' => 'Développeur',  'permission' => 'admin',     'department_id' => 1, 'points_total' => 0],
            ['name' => 'SIBAFO Salomon',   'email' => 'salomon@bravo.test',  'role' => 'Développeur',  'permission' => 'employee',  'department_id' => 1, 'points_total' => 0],
            ['name' => 'NGO TONYE Marie',  'email' => 'marie@bravo.test',    'role' => 'Designer',     'permission' => 'employee',  'department_id' => 2, 'points_total' => 0],
            ['name' => 'DISSACKE Allegra', 'email' => 'allegra@bravo.test',  'role' => 'Data Analyst', 'permission' => 'employee',  'department_id' => 3, 'points_total' => 0],
            ['name' => 'YOUBOU Anderson',  'email' => 'anderson@bravo.test', 'role' => 'Data Analyst', 'permission' => 'employee',  'department_id' => 3, 'points_total' => 0],
            ['name' => 'NGONDA Evodie',    'email' => 'evodie@bravo.test',   'role' => 'Assistante',   'permission' => 'employee',  'department_id' => 4, 'points_total' => 0],
            ['name' => 'Hermann TCHAMBIA',    'email' => 'hermann@bravo.test',   'role' => 'Reseau',   'permission' => 'employee',  'department_id' => 4, 'points_total' => 0],
        ];

        foreach ($users as $data) {
            $spatieRole = $data['permission'];
            unset($data['permission']);

            $user = User::firstOrCreate(
                ['email' => $data['email']],
                array_merge($data, ['password' => Hash::make('password')])
            );

            if (!$user->avatar) {
                $user->avatar = "https://i.pinimg.com/1200x/f7/39/c1/f739c1b1812d3d13aad9236b9cb8109b.jpg";
                $user->save();
            }

            $user->syncRoles([$spatieRole]);
        }
    }
}
