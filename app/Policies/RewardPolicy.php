<?php

namespace App\Policies;

use App\Models\Redemption;
use App\Models\Reward;
use App\Models\User;

class RewardPolicy
{
    public function create(User $user): bool   { return $user->isHr(); }
    public function update(User $user): bool   { return $user->isHr(); }
    public function viewAny(User $user): bool  { return $user->isHr(); }
}
