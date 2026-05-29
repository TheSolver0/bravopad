<?php

namespace App\Services\Agenda;

use App\Models\AgendaEvent;
use App\Models\Bravo;
use App\Models\Calendar;
use App\Models\EventAttendee;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AgendaNetworkService
{
    /**
     * Utilisateurs avec lesquels l'utilisateur a un lien (Bravo, messagerie, calendriers partagés, co-participants).
     *
     * @return list<int>
     */
    public function connectedUserIds(User $user): array
    {
        $ids = collect([$user->id]);

        $bravoPartnerIds = Bravo::query()
            ->where('sender_id', $user->id)
            ->pluck('receiver_id')
            ->merge(
                Bravo::query()
                    ->where('receiver_id', $user->id)
                    ->pluck('sender_id')
            );

        $conversationIds = $user->conversations()->pluck('conversations.id');
        $messengerPartnerIds = User::query()
            ->where('is_automation', false)
            ->where('id', '!=', $user->id)
            ->whereHas('conversations', fn ($q) => $q->whereIn('conversations.id', $conversationIds))
            ->pluck('id');

        $calendarIds = Calendar::query()->active()->forUser($user->id)->pluck('id');
        $calendarOwnerIds = Calendar::query()->whereIn('id', $calendarIds)->pluck('owner_id');
        $calendarMemberIds = $calendarIds->isEmpty()
            ? collect()
            : DB::table('calendar_user')
                ->whereIn('calendar_id', $calendarIds)
                ->where('user_id', '!=', $user->id)
                ->pluck('user_id');

        $eventIds = AgendaEvent::query()
            ->whereIn('calendar_id', $calendarIds)
            ->pluck('id');
        $coAttendeeIds = EventAttendee::query()
            ->whereIn('event_id', $eventIds)
            ->where('user_id', '!=', $user->id)
            ->pluck('user_id');

        return $ids
            ->merge($bravoPartnerIds)
            ->merge($messengerPartnerIds)
            ->merge($calendarOwnerIds)
            ->merge($calendarMemberIds)
            ->merge($coAttendeeIds)
            ->map(static fn ($id) => (int) $id)
            ->unique()
            ->filter(fn (int $id) => $id > 0 && User::query()->whereKey($id)->where('is_automation', false)->exists())
            ->values()
            ->all();
    }

    /**
     * @return Collection<int, User>
     */
    public function connectedUsers(User $user): Collection
    {
        $ids = $this->connectedUserIds($user);

        return User::query()
            ->whereIn('id', $ids)
            ->where('is_automation', false)
            ->orderBy('name')
            ->get(['id', 'name', 'avatar', 'email', 'birth_date']);
    }
}
