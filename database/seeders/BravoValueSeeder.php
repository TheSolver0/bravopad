<?php

namespace Database\Seeders;

use App\Models\BravoValue;
use Illuminate\Database\Seeder;

class BravoValueSeeder extends Seeder
{
    public function run(): void
    {
        $values = [
            ['name' => 'Autonomie',        'description' => 'Capacité à travailler de manière indépendante.', 'multiplier' => 1.5, 'color' => '#f97316', 'icon' => 'Zap'],
            ['name' => "Esprit d'équipe",  'description' => 'Collaboration et entraide au sein du groupe.',   'multiplier' => 1.0, 'color' => '#3b82f6', 'icon' => 'Users2'],
            ['name' => 'Efficacité',       'description' => 'Atteindre les objectifs rapidement et bien.',    'multiplier' => 1.2, 'color' => '#eab308', 'icon' => 'Clock'],
            ['name' => 'Innovation',       'description' => 'Apporter des idées nouvelles et créatives.',     'multiplier' => 2.0, 'color' => '#8b5cf6', 'icon' => 'Lightbulb'],
            ['name' => 'Qualité',          'description' => 'Soin et rigueur dans le travail rendu.',         'multiplier' => 1.3, 'color' => '#10b981', 'icon' => 'Award'],
            ['name' => 'Leadership',       'description' => 'Inspirer et guider l\'équipe vers le succès.',   'multiplier' => 1.8, 'color' => '#ef4444', 'icon' => 'Trophy'],
            ['name' => 'Proactivité',      'description' => 'Anticiper les besoins et prendre des initiatives.', 'multiplier' => 1.4, 'color' => '#06b6d4', 'icon' => 'TrendingUp'],
        ];

        foreach ($values as $value) {
            BravoValue::firstOrCreate(['name' => $value['name']], $value);
        }
    }
}
