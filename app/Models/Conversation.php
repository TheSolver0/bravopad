<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'direct_key',
        'created_by',
        'last_message_id',
        'last_message_at',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
        ];
    }

    public static function directKeyFor(User|int $first, User|int $second): string
    {
        $ids = [
            $first instanceof User ? $first->id : $first,
            $second instanceof User ? $second->id : $second,
        ];
        sort($ids, SORT_NUMERIC);

        return implode(':', $ids);
    }

    public static function createDirectBetween(User $creator, User $recipient): self
    {
        $directKey = self::directKeyFor($creator, $recipient);

        return DB::transaction(function () use ($creator, $recipient, $directKey) {
            $conversation = self::query()->firstOrCreate(
                ['direct_key' => $directKey],
                [
                    'type' => 'direct',
                    'created_by' => $creator->id,
                ],
            );

            foreach ([$creator->id, $recipient->id] as $participantId) {
                if (! $conversation->participants()->where('users.id', $participantId)->exists()) {
                    $conversation->participants()->attach($participantId, [
                        'joined_at' => now(),
                        'last_read_at' => null,
                    ]);
                }
            }

            return $conversation->fresh(['participants', 'lastMessage.sender']);
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot(['joined_at', 'last_read_at'])
            ->withTimestamps();
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function calls(): HasMany
    {
        return $this->hasMany(MessengerCall::class);
    }

    public function lastMessage(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'last_message_id');
    }

    public function hasParticipant(User|int $user): bool
    {
        $userId = $user instanceof User ? $user->id : $user;

        return $this->participants()->where('users.id', $userId)->exists();
    }

    public function otherParticipantFor(User $user): ?User
    {
        return $this->participants->firstWhere('id', '!=', $user->id);
    }

    public function unreadCountFor(User $user): int
    {
        $participant = $this->participants->firstWhere('id', $user->id)
            ?? $this->participants()->where('users.id', $user->id)->first();

        if (! $participant) {
            return 0;
        }

        return $this->messages()
            ->where('sender_id', '!=', $user->id)
            ->when(
                $participant->pivot->last_read_at,
                fn ($query, $lastReadAt) => $query->where('created_at', '>', $lastReadAt),
            )
            ->count();
    }
}
