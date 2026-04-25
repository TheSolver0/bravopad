<?php

namespace Database\Factories;

use App\Models\Bravo;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class BravoFactory extends Factory
{
    protected $model = Bravo::class;

    public function definition(): array
    {
        return [
            'sender_id'   => User::factory(),
            'receiver_id' => User::factory(),
            'message'     => $this->faker->sentence(),
            'points'      => $this->faker->numberBetween(5, 50),
            'likes_count' => 0,
        ];
    }
}
