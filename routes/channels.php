<?php

use App\Models\Conversation;
use App\Models\MessengerCall;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('messenger.conversation.{conversationId}', function (User $user, int $conversationId): bool {
    return Conversation::query()
        ->whereKey($conversationId)
        ->whereHas('participants', fn ($query) => $query->where('users.id', $user->id))
        ->exists();
});

Broadcast::channel('messenger.user.{userId}', function (User $user, int $userId): bool {
    return $user->id === $userId;
});

Broadcast::channel('messenger.presence', function (User $user): array {
    return [
        'id' => $user->id,
        'name' => $user->name,
        'avatar' => $user->avatar,
        'role' => $user->role,
        'last_seen_at' => $user->last_seen_at?->toIso8601String(),
    ];
});

Broadcast::channel('messenger.call.{callId}', function (User $user, int $callId): bool {
    return MessengerCall::query()
        ->whereKey($callId)
        ->where(fn ($query) => $query
            ->where('started_by', $user->id)
            ->orWhere('callee_id', $user->id)
            ->orWhereHas('conversation.participants', fn ($participants) => $participants->where('users.id', $user->id)))
        ->exists();
});
