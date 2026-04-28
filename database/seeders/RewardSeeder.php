<?php

namespace Database\Seeders;

use App\Models\Reward;
use Illuminate\Database\Seeder;

class RewardSeeder extends Seeder
{
    public function run(): void
    {
        $rewards = [
            [
                'name'        => 'Bon de carburant — 25 000 FCFA',
                'description' => 'Bon de carburant d’une valeur de 25 000 FCFA.',
                'category'    => 'vouchers',
                'cost_points' => 1000,
                'image_url'   => '/assets/images/rewards/total.jpeg',
                'stock'       => null,
                'is_active'   => true,
            ],
            [
                'name'        => 'Bon de réduction Super U — 50 000 FCFA',
                'description' => 'Bon de réduction Super U d’une valeur de 50 000 FCFA.',
                'category'    => 'vouchers',
                'cost_points' => 1500,
                'image_url'   => '/assets/images/rewards/super_u.jpeg',
                'stock'       => null,
                'is_active'   => true,
            ],
        ];

        foreach ($rewards as $data) {
            Reward::updateOrCreate(['name' => $data['name']], $data);
        }
    }
}
