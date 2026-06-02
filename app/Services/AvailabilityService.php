<?php

namespace App\Services;

use App\Models\Availability;
use App\Models\AvailabilityException;
use App\Models\User;

class AvailabilityService
{
    /**
     * Retourne les disponibilités hebdomadaires d'un utilisateur.
     */
    public function getWeeklySchedule(int $userId): array
    {
        $slots = Availability::where('user_id', $userId)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        $schedule = [];
        for ($i = 0; $i <= 6; $i++) {
            $schedule[$i] = $slots->where('day_of_week', $i)->values()->toArray();
        }

        return $schedule;
    }

    /**
     * Crée ou remplace le planning hebdomadaire standard d'un utilisateur.
     */
    public function setWeeklySchedule(int $userId, array $schedule): void
    {
        Availability::where('user_id', $userId)->delete();

        foreach ($schedule as $entry) {
            Availability::create([
                'user_id'      => $userId,
                'day_of_week'  => $entry['day_of_week'],
                'start_time'   => $entry['start_time'],
                'end_time'     => $entry['end_time'],
                'is_available' => $entry['is_available'] ?? true,
                'label'        => $entry['label'] ?? null,
            ]);
        }
    }

    /**
     * Retourne les exceptions de disponibilité pour une plage de dates.
     */
    public function getExceptions(int $userId, string $from, string $to): \Illuminate\Database\Eloquent\Collection
    {
        return AvailabilityException::where('user_id', $userId)
            ->whereBetween('date', [$from, $to])
            ->orderBy('date')
            ->get();
    }

    /**
     * Ajoute une exception de disponibilité (congé, jour off, etc.).
     */
    public function addException(int $userId, array $data): AvailabilityException
    {
        return AvailabilityException::create([
            'user_id'      => $userId,
            'date'         => $data['date'],
            'start_time'   => $data['start_time'] ?? null,
            'end_time'     => $data['end_time'] ?? null,
            'is_available' => $data['is_available'] ?? false,
            'type'         => $data['type'] ?? 'custom',
            'reason'       => $data['reason'] ?? null,
        ]);
    }

    /**
     * Initialise les disponibilités par défaut pour un nouvel utilisateur
     * (lundi-vendredi 08h00-17h00).
     */
    public function initDefaultSchedule(int $userId): void
    {
        if (Availability::where('user_id', $userId)->exists()) {
            return;
        }

        $workdays = [1, 2, 3, 4, 5]; // Lundi-Vendredi
        foreach ($workdays as $day) {
            Availability::create([
                'user_id'      => $userId,
                'day_of_week'  => $day,
                'start_time'   => '08:00:00',
                'end_time'     => '17:00:00',
                'is_available' => true,
                'label'        => 'Horaires de travail',
            ]);
        }
    }
}
