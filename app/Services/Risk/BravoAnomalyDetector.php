<?php

namespace App\Services\Risk;

use App\Models\Bravo;
use App\Models\User;
use App\Notifications\BravoAnomalyAlert;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\Notification;

class BravoAnomalyDetector
{
    /**
     * Règles simples : rafale d’envois sur une courte fenêtre.
     */
    public function evaluateAfterSend(User $sender): void
    {
        if ($sender->is_automation) {
            return;
        }

        $windowMinutes = 60;
        $threshold      = 12;

        $recent = Bravo::query()
            ->where('sender_id', $sender->id)
            ->where('created_at', '>=', now()->subMinutes($windowMinutes))
            ->count();

        if ($recent < $threshold) {
            return;
        }

        AuditLogger::log(
            'anomaly_spike_bravo',
            [
                'sender_id'       => $sender->id,
                'window_minutes'  => $windowMinutes,
                'count'           => $recent,
                'threshold'       => $threshold,
            ],
            $sender,
            User::class,
            $sender->id,
            'warning',
            "Rafale d'envoi de Bravos détectée ({$recent} en {$windowMinutes} min).",
        );

        $hrUsers = User::query()
            ->where('is_automation', false)
            ->role(['hr', 'admin', 'super_admin'])
            ->get();

        Notification::send($hrUsers, new BravoAnomalyAlert($sender, $recent, $windowMinutes));
    }
}
