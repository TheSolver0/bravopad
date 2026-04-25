<?php

namespace App\Policies;

use App\Models\Redemption;
use App\Models\User;

class RedemptionPolicy
{
    public function viewAny(User $user): bool              { return $user->isHr(); }
    public function update(User $user, Redemption $r): bool { return $user->isHr(); }
}
