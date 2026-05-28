<?php

namespace App\Http\Controllers;

use App\Models\AgendaEvent;
use App\Models\Calendar;
use App\Models\EventAttendee;
use App\Models\EventReminder;
use App\Notifications\EventInvitationNotification;
use App\Notifications\EventReminderNotification;
use App\Services\AgendaConflictService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class EventController extends Controller
{
    public function __construct(private readonly AgendaConflictService $conflictService) {}

    /**
     * Retourne les événements dans une plage de dates.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'start' => 'required|date',
            'end'   => 'required|date|after:start',
        ]);

        $calendarIds = Calendar::active()
            ->forUser($user->id)
            ->pluck('id')
            ->toArray();

        $events = AgendaEvent::with(['calendar', 'organizer:id,name,avatar', 'attendees.user:id,name,avatar'])
            ->forCalendars($calendarIds)
            ->inRange($request->start, $request->end)
            ->where('status', '!=', 'cancelled')
            ->orderBy('start_at')
            ->get()
            ->map(fn (AgendaEvent $e) => $this->formatEvent($e, $user->id));

        return response()->json($events);
    }

    /**
     * Crée un nouvel événement.
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'title'          => 'required|string|max:255',
            'description'    => 'nullable|string',
            'start_at'       => 'required|date',
            'end_at'         => 'required|date|after_or_equal:start_at',
            'all_day'        => 'boolean',
            'location'       => 'nullable|string|max:255',
            'meeting_url'    => 'nullable|url|max:500',
            'type'           => 'required|in:meeting,appointment,reminder,task,out_of_office,holiday,other',
            'status'         => 'required|in:confirmed,pending,cancelled,postponed,completed,absent',
            'priority'       => 'required|in:low,normal,high,urgent',
            'color'          => 'nullable|string|max:7',
            'tags'           => 'nullable|array',
            'internal_notes' => 'nullable|string',
            'calendar_id'    => 'required|exists:calendars,id',
            'attendee_ids'   => 'nullable|array',
            'attendee_ids.*' => 'exists:users,id',
            'reminders'      => 'nullable|array',
            'reminders.*.minutes_before' => 'integer|min:0|max:10080',
            'reminders.*.channel'        => 'in:email,push',
        ]);

        // Vérifier que l'utilisateur peut écrire dans ce calendrier
        $calendar = Calendar::where('id', $validated['calendar_id'])
            ->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                  ->orWhereHas('members', fn ($m) => $m->where('user_id', $user->id)->whereIn('calendar_user.permission', ['edit', 'admin']));
            })
            ->firstOrFail();

        // Détection de conflits
        $calendarIds = Calendar::active()->forUser($user->id)->pluck('id')->toArray();
        $conflicts = $this->conflictService->detectConflicts(
            $user->id,
            $validated['start_at'],
            $validated['end_at'],
            $calendarIds
        );

        return DB::transaction(function () use ($validated, $user, $conflicts) {
            $event = AgendaEvent::create([
                ...$validated,
                'organizer_id' => $user->id,
            ]);

            // Ajouter l'organisateur comme participant
            EventAttendee::create([
                'event_id'     => $event->id,
                'user_id'      => $user->id,
                'status'       => 'accepted',
                'is_organizer' => true,
            ]);

            // Ajouter les autres participants
            $attendeeIds = array_diff($validated['attendee_ids'] ?? [], [$user->id]);
            foreach ($attendeeIds as $attendeeId) {
                EventAttendee::create([
                    'event_id' => $event->id,
                    'user_id'  => $attendeeId,
                    'status'   => 'invited',
                ]);

                // Notifier chaque participant
                $attendee = \App\Models\User::find($attendeeId);
                $attendee?->notify(new EventInvitationNotification($event->load('organizer')));
            }

            // Créer les rappels
            foreach ($validated['reminders'] ?? [] as $reminder) {
                EventReminder::create([
                    'event_id'      => $event->id,
                    'user_id'       => $user->id,
                    'channel'       => $reminder['channel'] ?? 'push',
                    'minutes_before'=> $reminder['minutes_before'] ?? 15,
                ]);
            }

            $event->load(['calendar', 'organizer:id,name,avatar', 'attendees.user:id,name,avatar']);

            return response()->json([
                'event'     => $this->formatEvent($event, $user->id),
                'conflicts' => $conflicts->map(fn ($c) => ['id' => $c->id, 'title' => $c->title, 'start_at' => $c->start_at])->values(),
            ], 201);
        });
    }

    /**
     * Met à jour un événement.
     */
    public function update(Request $request, AgendaEvent $event): JsonResponse
    {
        $user = Auth::user();
        $this->authorizeEventAccess($event, $user->id);

        $validated = $request->validate([
            'title'          => 'sometimes|string|max:255',
            'description'    => 'nullable|string',
            'start_at'       => 'sometimes|date',
            'end_at'         => 'sometimes|date|after_or_equal:start_at',
            'all_day'        => 'boolean',
            'location'       => 'nullable|string|max:255',
            'meeting_url'    => 'nullable|url|max:500',
            'type'           => 'sometimes|in:meeting,appointment,reminder,task,out_of_office,holiday,other',
            'status'         => 'sometimes|in:confirmed,pending,cancelled,postponed,completed,absent',
            'priority'       => 'sometimes|in:low,normal,high,urgent',
            'color'          => 'nullable|string|max:7',
            'tags'           => 'nullable|array',
            'internal_notes' => 'nullable|string',
            'calendar_id'    => 'sometimes|exists:calendars,id',
            'attendee_ids'   => 'nullable|array',
            'attendee_ids.*' => 'exists:users,id',
        ]);

        $event->update($validated);

        // Mettre à jour les participants si fournis
        if (isset($validated['attendee_ids'])) {
            $currentAttendees = $event->attendees->pluck('user_id')->toArray();
            $newAttendees = $validated['attendee_ids'];

            // Nouveaux participants
            $toAdd = array_diff($newAttendees, $currentAttendees);
            foreach ($toAdd as $attendeeId) {
                if ($attendeeId !== $user->id) {
                    EventAttendee::firstOrCreate(
                        ['event_id' => $event->id, 'user_id' => $attendeeId],
                        ['status' => 'invited']
                    );
                    $attendee = \App\Models\User::find($attendeeId);
                    $attendee?->notify(new EventInvitationNotification($event->load('organizer')));
                }
            }

            // Participants retirés (sauf l'organisateur)
            $toRemove = array_diff($currentAttendees, $newAttendees);
            EventAttendee::where('event_id', $event->id)
                ->whereIn('user_id', $toRemove)
                ->where('is_organizer', false)
                ->delete();
        }

        $event->load(['calendar', 'organizer:id,name,avatar', 'attendees.user:id,name,avatar']);

        return response()->json($this->formatEvent($event, $user->id));
    }

    /**
     * Supprime un événement.
     */
    public function destroy(AgendaEvent $event): JsonResponse
    {
        $this->authorizeEventAccess($event, Auth::id());
        $event->delete();

        return response()->json(['message' => 'Événement supprimé.']);
    }

    /**
     * Change le statut de présence d'un participant.
     */
    public function rsvp(Request $request, AgendaEvent $event): JsonResponse
    {
        $user = Auth::user();
        $validated = $request->validate([
            'status' => 'required|in:accepted,declined,tentative',
        ]);

        $attendee = EventAttendee::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $attendee->update(['status' => $validated['status']]);

        return response()->json(['status' => $validated['status']]);
    }

    /**
     * Check-in à un événement.
     */
    public function checkIn(AgendaEvent $event): JsonResponse
    {
        $user = Auth::user();
        $attendee = EventAttendee::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $attendee->update([
            'checked_in'    => true,
            'checked_in_at' => now(),
        ]);

        return response()->json(['checked_in' => true]);
    }

    /**
     * Retourne les créneaux libres pour une date donnée.
     */
    public function freeSlots(Request $request): JsonResponse
    {
        $user = Auth::user();
        $request->validate([
            'date'     => 'required|date',
            'duration' => 'required|integer|min:15|max:480',
            'user_id'  => 'nullable|exists:users,id',
        ]);

        $targetUserId  = $request->integer('user_id', $user->id);
        $calendarIds   = Calendar::active()->forUser($targetUserId)->pluck('id')->toArray();

        /** @var AgendaConflictService $conflictService */
        $conflictService = app(AgendaConflictService::class);
        $slots = $conflictService->getFreeSlots(
            $targetUserId,
            $request->date,
            $request->integer('duration'),
            $calendarIds
        );

        return response()->json($slots);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function authorizeEventAccess(AgendaEvent $event, int $userId): void
    {
        $canEdit = $event->organizer_id === $userId
            || Calendar::where('id', $event->calendar_id)
                ->whereHas('members', fn ($m) => $m->where('user_id', $userId)->whereIn('calendar_user.permission', ['edit', 'admin']))
                ->exists();

        abort_unless($canEdit, 403, 'Action non autorisée.');
    }

    private function formatEvent(AgendaEvent $event, int $currentUserId): array
    {
        $myAttendee = $event->attendees->firstWhere('user_id', $currentUserId);

        return [
            'id'             => $event->id,
            'title'          => $event->title,
            'description'    => $event->description,
            'start_at'       => $event->start_at?->toIso8601String(),
            'end_at'         => $event->end_at?->toIso8601String(),
            'all_day'        => $event->all_day,
            'location'       => $event->location,
            'meeting_url'    => $event->meeting_url,
            'type'           => $event->type,
            'status'         => $event->status,
            'priority'       => $event->priority,
            'color'          => $event->color ?? $event->calendar?->color,
            'tags'           => $event->tags ?? [],
            'internal_notes' => $event->internal_notes,
            'is_recurring'   => $event->is_recurring,
            'calendar_id'    => $event->calendar_id,
            'calendar_color' => $event->calendar?->color,
            'calendar_name'  => $event->calendar?->name,
            'organizer'      => [
                'id'     => $event->organizer?->id,
                'name'   => $event->organizer?->name,
                'avatar' => $event->organizer?->avatar,
            ],
            'attendees' => $event->attendees->map(fn (EventAttendee $a) => [
                'id'           => $a->id,
                'user_id'      => $a->user_id,
                'name'         => $a->user?->name,
                'avatar'       => $a->user?->avatar,
                'status'       => $a->status,
                'is_organizer' => $a->is_organizer,
                'checked_in'   => $a->checked_in,
            ])->values()->toArray(),
            'my_status'      => $myAttendee?->status,
            'is_organizer'   => $event->organizer_id === $currentUserId,
            'duration_minutes' => $event->duration_minutes,
        ];
    }
}
