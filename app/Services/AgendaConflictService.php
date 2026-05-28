<?php

namespace App\Services;

use App\Models\AgendaEvent;
use App\Models\Availability;
use App\Models\AvailabilityException;
use App\Models\Holiday;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AgendaConflictService
{
    /**
     * Détecte les conflits pour un utilisateur dans une plage horaire donnée.
     * Retourne la liste des événements en conflit.
     */
    public function detectConflicts(
        int $userId,
        string $startAt,
        string $endAt,
        array $calendarIds,
        ?int $excludeEventId = null
    ): Collection {
        $query = AgendaEvent::query()
            ->with(['calendar', 'attendees'])
            ->where('status', '!=', 'cancelled')
            ->inRange($startAt, $endAt)
            ->forCalendars($calendarIds)
            ->where(function ($q) use ($userId) {
                $q->where('organizer_id', $userId)
                  ->orWhereHas('attendees', fn ($a) => $a->where('user_id', $userId));
            });

        if ($excludeEventId) {
            $query->where('id', '!=', $excludeEventId);
        }

        return $query->get();
    }

    /**
     * Vérifie si un utilisateur est disponible dans le créneau demandé.
     */
    public function isUserAvailable(int $userId, string $startAt, string $endAt): bool
    {
        $start = Carbon::parse($startAt);
        $end   = Carbon::parse($endAt);

        // Vérifier les exceptions (congés, jours off)
        $exception = AvailabilityException::where('user_id', $userId)
            ->whereDate('date', $start->toDateString())
            ->where('is_available', false)
            ->first();

        if ($exception) {
            return false;
        }

        // Vérifier les jours fériés
        $isHoliday = Holiday::where('date', $start->toDateString())
            ->where('is_active', true)
            ->exists();

        if ($isHoliday) {
            return false;
        }

        // Vérifier les horaires de disponibilité
        $dayOfWeek = $start->dayOfWeek; // 0=Dimanche
        $availabilities = Availability::where('user_id', $userId)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_available', true)
            ->get();

        if ($availabilities->isEmpty()) {
            return false;
        }

        $startTime = $start->format('H:i:s');
        $endTime   = $end->format('H:i:s');

        foreach ($availabilities as $avail) {
            if ($avail->start_time <= $startTime && $avail->end_time >= $endTime) {
                return true;
            }
        }

        return false;
    }

    /**
     * Calcule les créneaux libres pour un utilisateur sur une date donnée.
     * Retourne un tableau de ['start' => 'H:i', 'end' => 'H:i'].
     */
    public function getFreeSlots(int $userId, string $date, int $durationMinutes, array $calendarIds): array
    {
        $dayOfWeek = Carbon::parse($date)->dayOfWeek;

        $availabilities = Availability::where('user_id', $userId)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_available', true)
            ->orderBy('start_time')
            ->get();

        if ($availabilities->isEmpty()) {
            return [];
        }

        $busyPeriods = AgendaEvent::query()
            ->forCalendars($calendarIds)
            ->where('status', '!=', 'cancelled')
            ->whereDate('start_at', $date)
            ->orderBy('start_at')
            ->get()
            ->map(fn ($e) => [
                'start' => Carbon::parse($e->start_at)->format('H:i'),
                'end'   => Carbon::parse($e->end_at)->format('H:i'),
            ])
            ->toArray();

        $slots = [];

        foreach ($availabilities as $avail) {
            $cursor = Carbon::parse("$date {$avail->start_time}");
            $availEnd = Carbon::parse("$date {$avail->end_time}");

            while ($cursor->copy()->addMinutes($durationMinutes)->lte($availEnd)) {
                $slotEnd = $cursor->copy()->addMinutes($durationMinutes);
                $slotStart = $cursor->format('H:i');
                $slotEndStr = $slotEnd->format('H:i');

                $overlaps = false;
                foreach ($busyPeriods as $busy) {
                    if ($slotStart < $busy['end'] && $slotEndStr > $busy['start']) {
                        $overlaps = true;
                        // Avancer au-delà du créneau occupé
                        $cursor = Carbon::parse("$date {$busy['end']}");
                        break;
                    }
                }

                if (!$overlaps) {
                    $slots[] = ['start' => $slotStart, 'end' => $slotEndStr];
                    $cursor->addMinutes($durationMinutes);
                }
            }
        }

        return $slots;
    }
}
