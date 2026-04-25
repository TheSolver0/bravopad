<?php

namespace Database\Seeders;

use App\Models\AppSetting;
use Illuminate\Database\Seeder;

class AppSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            [
                'key'         => 'base_points_per_bravo',
                'value'       => '10',
                'cast'        => 'int',
                'description' => 'Points de base attribués par Bravo (multiplié par la somme des multipliers des valeurs)',
            ],
            [
                'key'         => 'max_bravos_per_day',
                'value'       => '5',
                'cast'        => 'int',
                'description' => 'Nombre maximum de Bravos qu\'un employé peut envoyer par jour',
            ],
            [
                'key'         => 'max_points_per_day',
                'value'       => '500',
                'cast'        => 'int',
                'description' => 'Budget maximum de points qu\'un employé peut distribuer par jour',
            ],
            [
                'key'         => 'max_same_receiver_per_period',
                'value'       => '2',
                'cast'        => 'int',
                'description' => 'Nombre maximum de Bravos vers la même personne sur la fenêtre glissante',
            ],
            [
                'key'         => 'same_receiver_window_hours',
                'value'       => '24',
                'cast'        => 'int',
                'description' => 'Durée (en heures) de la fenêtre glissante pour limiter les envois répétés',
            ],
            [
                'key'         => 'notify_bravo_by_email',
                'value'       => 'false',
                'cast'        => 'boolean',
                'description' => 'Activer les notifications email lors de la réception d\'un Bravo',
            ],
        ];

        foreach ($defaults as $setting) {
            AppSetting::firstOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }
}
