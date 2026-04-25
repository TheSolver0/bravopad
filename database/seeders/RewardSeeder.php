<?php

namespace Database\Seeders;

use App\Models\Reward;
use Illuminate\Database\Seeder;

class RewardSeeder extends Seeder
{
    public function run(): void
    {
        $rewards = [
            // Bons cadeaux
            [
                'name'        => 'Bon Amazon 25€',
                'description' => 'Bon d\'achat Amazon valable sur tous les produits.',
                'category'    => 'vouchers',
                'cost_points' => 500,
                'image_url'   => null,
                'stock'       => null,
                'is_active'   => true,
            ],
            [
                'name'        => 'Bon Amazon 50€',
                'description' => 'Bon d\'achat Amazon valable sur tous les produits.',
                'category'    => 'vouchers',
                'cost_points' => 1000,
                'image_url'   => null,
                'stock'       => null,
                'is_active'   => true,
            ],
            [
                'name'        => 'Carte cadeau Fnac 30€',
                'description' => 'Carte cadeau utilisable en magasin ou sur fnac.com.',
                'category'    => 'vouchers',
                'cost_points' => 600,
                'image_url'   => null,
                'stock'       => 50,
                'is_active'   => true,
            ],
            // Tickets événements
            [
                'name'        => 'Ticket cinéma',
                'description' => 'Place de cinéma valable dans tous les cinémas partenaires.',
                'category'    => 'tickets',
                'cost_points' => 300,
                'image_url'   => null,
                'stock'       => 100,
                'is_active'   => true,
            ],
            [
                'name'        => 'Pass musée (Paris)',
                'description' => 'Accès illimité pendant 1 an dans les musées nationaux de Paris.',
                'category'    => 'tickets',
                'cost_points' => 800,
                'image_url'   => null,
                'stock'       => 20,
                'is_active'   => true,
            ],
            // Expériences
            [
                'name'        => 'Déjeuner d\'équipe',
                'description' => 'Déjeuner offert pour vous et votre équipe (jusqu\'à 6 personnes).',
                'category'    => 'experiences',
                'cost_points' => 1500,
                'image_url'   => null,
                'stock'       => 10,
                'is_active'   => true,
            ],
            [
                'name'        => 'Journée de télétravail bonus',
                'description' => 'Une journée de télétravail supplémentaire à placer dans le mois.',
                'category'    => 'experiences',
                'cost_points' => 400,
                'image_url'   => null,
                'stock'       => null,
                'is_active'   => true,
            ],
            [
                'name'        => 'Formation en ligne au choix',
                'description' => 'Accès à une formation en ligne parmi notre catalogue partenaire.',
                'category'    => 'experiences',
                'cost_points' => 1200,
                'image_url'   => null,
                'stock'       => null,
                'is_active'   => true,
            ],
            // Équipement
            [
                'name'        => 'Mug personnalisé Bravo',
                'description' => 'Mug en céramique avec logo Bravo et votre prénom.',
                'category'    => 'equipment',
                'cost_points' => 200,
                'image_url'   => null,
                'stock'       => 200,
                'is_active'   => true,
            ],
            [
                'name'        => 'Casque audio Bluetooth',
                'description' => 'Casque Bluetooth à réduction de bruit active pour le bureau.',
                'category'    => 'equipment',
                'cost_points' => 3000,
                'image_url'   => null,
                'stock'       => 5,
                'is_active'   => true,
            ],
            [
                'name'        => 'Clé USB 64 Go',
                'description' => 'Clé USB 3.0 de 64 Go aux couleurs de l\'organisation.',
                'category'    => 'equipment',
                'cost_points' => 150,
                'image_url'   => null,
                'stock'       => 100,
                'is_active'   => false, // exemple d'article inactif
            ],
        ];

        foreach ($rewards as $data) {
            Reward::firstOrCreate(['name' => $data['name']], $data);
        }
    }
}
