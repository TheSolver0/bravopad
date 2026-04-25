<?php

namespace Database\Factories;

use App\Models\Redemption;
use App\Models\Reward;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class RedemptionFactory extends Factory
{
    protected $model = Redemption::class;

    public function definition(): array
    {
        return [
            'user_id'      => User::factory(),
            'reward_id'    => Reward::factory(),
            'points_spent' => $this->faker->numberBetween(100, 1000),
            'status'       => 'pending',
            'notes'        => null,
            'approved_by'  => null,
            'approved_at'  => null,
        ];
    }
}
