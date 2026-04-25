<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class RewardFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'        => $this->faker->words(3, true),
            'description' => $this->faker->sentence(),
            'category'    => $this->faker->randomElement(['vouchers', 'tickets', 'experiences', 'equipment']),
            'cost_points' => $this->faker->numberBetween(100, 2000),
            'image_url'   => null,
            'stock'       => null,
            'is_active'   => true,
        ];
    }
}
