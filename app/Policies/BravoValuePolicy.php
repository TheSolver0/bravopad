<?php

namespace App\Policies;

use App\Models\BravoValue;
use App\Models\User;

class BravoValuePolicy
{
    public function create(User $user): bool
    {
        return $user->isHr();
    }

    public function update(User $user, BravoValue $bravoValue): bool
    {
        return $user->isHr();
    }

    public function delete(User $user, BravoValue $bravoValue): bool
    {
        return $user->isAdmin();
    }
}
