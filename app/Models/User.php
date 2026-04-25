<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password', 'role', 'department', 'birth_date', 'hired_at', 'is_automation', 'avatar', 'points_total'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable, HasRoles;

    protected function casts(): array
    {
        return [
            'email_verified_at'       => 'datetime',
            'password'                => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'birth_date'              => 'date',
            'hired_at'                => 'date',
            'is_automation'           => 'boolean',
        ];
    }

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function sentBravos()
    {
        return $this->hasMany(Bravo::class, 'sender_id');
    }

    public function receivedBravos()
    {
        return $this->hasMany(Bravo::class, 'receiver_id');
    }

    public function badges()
    {
        return $this->belongsToMany(Badge::class)
            ->withPivot(['progress', 'awarded_at', 'metadata'])
            ->withTimestamps();
    }

    // -------------------------------------------------------------------------
    // Helpers rôles
    // -------------------------------------------------------------------------

    public function isHr(): bool
    {
        return $this->hasRole(['hr', 'admin', 'super_admin']);
    }

    public function isManager(): bool
    {
        return $this->hasRole(['manager', 'hr', 'admin', 'super_admin']);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(['admin', 'super_admin']);
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }
}
