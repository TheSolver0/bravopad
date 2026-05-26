<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MessengerCall extends Model
{
    use HasFactory;

    public const VIDEO_PARTICIPANT_LIMIT = 4;

    public const AUDIO_PARTICIPANT_LIMIT = 8;

    protected $fillable = [
        'conversation_id',
        'started_by',
        'callee_id',
        'type',
        'status',
        'room_key',
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

    public function participants(): HasMany
    {
        return $this->hasMany(MessengerCallParticipant::class, 'call_id');
    }

    public function hasParticipant(User|int $user): bool
    {
        $userId = $user instanceof User ? $user->id : $user;

        if ($this->callee_id !== null) {
            return $this->started_by === $userId || $this->callee_id === $userId;
        }

        return $this->participants()->where('user_id', $userId)->exists()
            || $this->conversation()->whereHas('participants', fn ($query) => $query->where('users.id', $userId))->exists();
    }

    public function isGroupCall(): bool
    {
        return $this->callee_id === null;
    }

    public function participantLimit(): int
    {
        return $this->type === 'video'
            ? self::VIDEO_PARTICIPANT_LIMIT
            : self::AUDIO_PARTICIPANT_LIMIT;
    }

    public function joinedParticipantsCount(): int
    {
        return $this->participants()->where('status', 'joined')->count();
    }
}
