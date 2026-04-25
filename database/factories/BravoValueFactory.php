<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class BravoValueFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'        => $this->faker->word(),
            'multiplier'  => $this->faker->randomFloat(1, 1.0, 3.0),
            'color'       => $this->faker->hexColor(),
            'icon'        => null,
            'is_active'   => true,
        ];
    }
}
