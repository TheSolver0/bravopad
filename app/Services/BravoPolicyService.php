<?php

namespace App\Services;

use App\Exceptions\BravoRuleException;
use App\Models\AppSetting;
use App\Models\Bravo;
use App\Models\User;

class BravoPolicyService
{
    /**
     * Vérifie toutes les règles anti-abus avant la création d'un Bravo.
     * Lance BravoRuleException si une règle est violée.
     */
    public function validate(User $sender, int $receiverId, int $points): void
    {
        if ($sender->is_automation) {
            return;
        }

        $this->noSelfAttribution($sender, $receiverId);
        $this->maxBravosPerDay($sender);
        $this->maxPointsPerDay($sender, $points);
        $this->maxSameReceiverInWindow($sender, $receiverId);
    }

    private function noSelfAttribution(User $sender, int $receiverId): void
    {
        if ($sender->id === $receiverId) {
            throw new BravoRuleException('Vous ne pouvez pas vous attribuer un Bravo.');
        }
    }

    private function maxBravosPerDay(User $sender): void
    {
        $max = (int) AppSetting::get('max_bravos_per_day', 5);

        $count = Bravo::where('sender_id', $sender->id)
            ->whereDate('created_at', today())
            ->count();

        if ($count >= $max) {
            throw new BravoRuleException(
                "Limite atteinte : vous ne pouvez envoyer que {$max} Bravos par jour."
            );
        }
    }

    private function maxPointsPerDay(User $sender, int $points): void
    {
        $max = (int) AppSetting::get('max_points_per_day', 500);

        $distributed = Bravo::where('sender_id', $sender->id)
            ->whereDate('created_at', today())
            ->sum('points');

        if (($distributed + $points) > $max) {
            $remaining = max(0, $max - $distributed);
            throw new BravoRuleException(
                "Budget quotidien insuffisant. Il vous reste {$remaining} points à distribuer aujourd'hui."
            );
        }
    }

    private function maxSameReceiverInWindow(User $sender, int $receiverId): void
    {
        $windowHours = (int) AppSetting::get('same_receiver_window_hours', 24);
        $max         = (int) AppSetting::get('max_same_receiver_per_period', 2);

        $count = Bravo::where('sender_id', $sender->id)
            ->where('receiver_id', $receiverId)
            ->where('created_at', '>=', now()->subHours($windowHours))
            ->count();

        if ($count >= $max) {
            throw new BravoRuleException(
                "Vous avez déjà félicité cette personne récemment. Attendez {$windowHours}h avant de la reconnaître à nouveau."
            );
        }
    }
}
