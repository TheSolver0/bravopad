<?php

namespace App\Services\Insights;

use App\Models\Bravo;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Anti-biais + indicateurs de qualité pour l’écran d’envoi de Bravo.
 */
class BravoInsightsService
{
    /**
     * @return array{concentration_alerts: string[], balancing_suggestions: array<int, array{id:int,name:string,department:?string,reason:string,received_30d:int}>, quality: array{score:int,tips:string[]}}
     */
    public function forSender(User $sender): array
    {
        $since = now()->subDays(30);

        $sent = Bravo::query()
            ->where('sender_id', $sender->id)
            ->where('created_at', '>=', $since)
            ->get(['receiver_id']);

        $totalSent = $sent->count();
        $byReceiver = $sent->countBy('receiver_id')->sortDesc();

        $concentrationAlerts = [];
        $topReceiverId = null;
        if ($totalSent >= 5 && $byReceiver->isNotEmpty()) {
            $topReceiverId = (int) $byReceiver->keys()->first();
            $topCount      = (int) $byReceiver->first();
            $ratio         = $topCount / $totalSent;
            if ($ratio >= 0.45) {
                $name = User::whereKey($topReceiverId)->value('name') ?? 'Un collègue';
                $pct  = (int) round($ratio * 100);
                $concentrationAlerts[] = "Sur 30 jours, {$pct}% de vos Bravo vont vers {$name}. Pensez à diversifier les destinataires.";
            }
        }

        $sender->loadMissing('department');
        $senderDept = $sender->department?->name;
        $balancingSuggestions = $this->balancingCandidates($sender, $senderDept, 5);

        $quality = $this->qualityPreview($sender, $byReceiver, $topReceiverId, $totalSent);

        return [
            'concentration_alerts'   => $concentrationAlerts,
            'balancing_suggestions'  => $balancingSuggestions,
            'quality'                => $quality,
        ];
    }

    /**
     * @return array<int, array{id:int,name:string,department:?string,reason:string,received_recent:int}>
     */
    private function balancingCandidates(User $sender, ?string $senderDept, int $limit): array
    {
        $since = now()->subDays(90);

        $receivedCounts = Bravo::query()
            ->selectRaw('receiver_id, COUNT(*) as c')
            ->where('created_at', '>=', $since)
            ->groupBy('receiver_id')
            ->pluck('c', 'receiver_id');

        return User::query()
            ->whereKeyNot($sender->id)
            ->where('is_automation', false)
            ->orderBy('name')
            ->with('department:id,name')
            ->get(['id', 'name', 'department_id'])
            ->filter(function (User $u) use ($senderDept) {
                if ($senderDept === null || $senderDept === '') {
                    return true;
                }

                return $u->department?->name !== $senderDept;
            })
            ->map(function (User $u) use ($receivedCounts) {
                $c = (int) ($receivedCounts[$u->id] ?? 0);

                return [
                    'id'           => $u->id,
                    'name'         => $u->name,
                    'department'   => $u->department?->name,
                    'reason'       => 'Autre direction / service — visibilité croisée.',
                    'received_90d' => $c,
                ];
            })
            ->sortBy('received_90d')
            ->take($limit)
            ->values()
            ->map(function (array $row) {
                $row['received_recent'] = $row['received_90d'];
                unset($row['received_90d']);

                return $row;
            })
            ->all();
    }

    /**
     * @param  Collection<int,int>|null  $byReceiver
     */
    private function qualityPreview(User $sender, Collection $byReceiver, ?int $topReceiverId, int $totalSent): array
    {
        $tips = [];
        $score = 50;

        // Sera recalculé côté client au fil de la saisie ; ici score “habitudes” expéditeur
        if ($totalSent >= 8 && $byReceiver->isNotEmpty()) {
            $top = (int) $byReceiver->first();
            if ($top / max(1, $totalSent) >= 0.4) {
                $score -= 20;
                $tips[] = 'Réduisez la concentration sur les mêmes personnes pour un score anti-biais plus élevé.';
            }
        }

        $distinctReceivers30d = Bravo::query()
            ->where('sender_id', $sender->id)
            ->where('created_at', '>=', now()->subDays(30))
            ->pluck('receiver_id')
            ->unique()
            ->count();

        if ($distinctReceivers30d >= 4) {
            $score += 15;
        } else {
            $tips[] = 'Variez les destinataires : au moins 4 personnes différentes sur 30 jours améliore l’équité perçue.';
        }

        $score = max(0, min(100, $score));

        if ($score >= 75) {
            $tips[] = 'Bonnes habitudes de distribution. Ajoutez un message personnalisé pour la qualité perçue.';
        }

        return [
            'score' => $score,
            'tips'  => array_values(array_unique($tips)),
        ];
    }
}
