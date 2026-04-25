<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\BravoValue;
use Illuminate\Support\Collection;

class BravoPointsService
{
    /**
     * Calcule les points côté serveur à partir des valeurs sélectionnées.
     * Formule: base_points × somme des multipliers des valeurs.
     * Les points sont plafonnés au max journalier restant de l'expéditeur.
     */
    public function calculate(array $valueIds): int
    {
        $base = (int) AppSetting::get('base_points_per_bravo', 10);

        $values = BravoValue::whereIn('id', $valueIds)->get();

        if ($values->isEmpty()) {
            return $base;
        }

        $totalMultiplier = $values->sum('multiplier');

        return (int) round($base * max($totalMultiplier, 1));
    }

    /**
     * Vérifie si l'expéditeur a encore du budget de points pour aujourd'hui.
     * Retourne le nombre de points restants distribuables.
     */
    public function remainingDailyBudget(int $senderId): int
    {
        $maxPointsPerDay = (int) AppSetting::get('max_points_per_day', 500);

        $pointsDistributedToday = \App\Models\Bravo::where('sender_id', $senderId)
            ->whereDate('created_at', today())
            ->sum('points');

        return max(0, $maxPointsPerDay - $pointsDistributedToday);
    }
}
