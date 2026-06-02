<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Calendar extends Model
{
    protected $fillable = [
        'name', 'description', 'color', 'type', 'timezone',
        'visibility', 'is_default', 'is_archived', 'owner_id',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_archived' => 'boolean',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'calendar_user')
            ->withPivot('permission')
            ->withTimestamps();
    }

    public function events(): HasMany
    {
        return $this->hasMany(AgendaEvent::class);
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('owner_id', $userId)
                ->orWhereHas('members', fn ($m) => $m->where('users.id', $userId));
        });
    }

    /** Calendriers où l'utilisateur peut créer / modifier des événements */
    public function scopeWritableBy($query, int $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('owner_id', $userId)
                ->orWhereHas('members', fn ($m) => $m
                    ->where('users.id', $userId)
                    ->whereIn('calendar_user.permission', ['edit', 'admin']));
        });
    }

    public function scopeActive($query)
    {
        return $query->where('is_archived', false);
    }
}
