<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class BravoSetupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\User::factory()->create([
            'name' => 'Alice',
            'email' => 'alice@test.com'
        ]);

        \App\Models\User::factory()->create([
            'name' => 'Bob',
            'email' => 'bob@test.com'
        ]);

        \App\Models\BravoValue::insert([
            ['name' => 'Autonomie', 'multiplier' => 1],
            ['name' => 'Travail d\'équipe', 'multiplier' => 1.2],
            ['name' => 'Efficacité', 'multiplier' => 1.5],
        ]);
    }
}
