<?php

namespace App\Policies;

use App\Models\Challenge;
use App\Models\User;

class ChallengePolicy
{
    public function create(User $user): bool
    {
        return $user->isHr();
    }

    public function update(User $user, Challenge $challenge): bool
    {
        return $user->isHr();
    }

    public function delete(User $user, Challenge $challenge): bool
    {
        return $user->isAdmin();
    }

    public function activate(User $user, Challenge $challenge): bool
    {
        return $user->isHr();
    }

    public function finish(User $user, Challenge $challenge): bool
    {
        return $user->isHr();
    }
}
