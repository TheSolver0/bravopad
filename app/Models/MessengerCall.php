<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessengerCall extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'started_by',
        'callee_id',
        'type',
        'status',
        'accepted_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function starter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'started_by');
    }

    public function callee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'callee_id');
    }

    public function hasParticipant(User|int $user): bool
    {
        $userId = $user instanceof User ? $user->id : $user;

        return $this->started_by === $userId || $this->callee_id === $userId;
    }
}
