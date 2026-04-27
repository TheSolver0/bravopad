<?php

namespace App\Services\Engagement;

use App\Models\Badge;
use App\Models\Bravo;
use App\Models\User;
use Illuminate\Support\Collection;

class BadgeProgressService
{
    public function ensureDefaultBadges(): void
    {
        $defaults = [
            [
                'name' => 'Niveau Bronze',
                'slug' => 'level-bronze',
                'type' => 'points',
                'rarity' => 'common',
                'level' => 1,
                'description' => 'Seuil de points cumules atteint.',
                'visibility_score' => 15,
                'criteria' => ['metric' => 'points_total', 'threshold' => 500],
            ],
            [
                'name' => 'Niveau Argent',
                'slug' => 'level-silver',
                'type' => 'points',
                'rarity' => 'rare',
                'level' => 2,
                'description' => 'Seuil de points cumules atteint.',
                'visibility_score' => 25,
                'criteria' => ['metric' => 'points_total', 'threshold' => 1500],
            ],
            [
                'name' => 'Niveau Or',
                'slug' => 'level-gold',
                'type' => 'points',
                'rarity' => 'epic',
                'level' => 3,
                'description' => 'Seuil de points cumules atteint.',
                'visibility_score' => 40,
                'criteria' => ['metric' => 'points_total', 'threshold' => 3000],
            ],
            [
                'name' => 'Niveau Diamant',
                'slug' => 'level-diamond',
                'type' => 'points',
                'rarity' => 'legendary',
                'level' => 4,
                'description' => 'Seuil de points cumules atteint.',
                'visibility_score' => 60,
                'criteria' => ['metric' => 'points_total', 'threshold' => 6000],
            ],
            [
                'name' => 'Premier Bravo',
                'slug' => 'first-bravo',
                'type' => 'milestone',
                'rarity' => 'common',
                'level' => 1,
                'description' => 'Recoit son premier Bravo.',
                'visibility_score' => 10,
                'criteria' => ['metric' => 'received_bravos', 'threshold' => 1],
            ],
            [
                'name' => 'Ancien combattant',
                'slug' => 'tenure-10y',
                'type' => 'milestone',
                'rarity' => 'epic',
                'level' => 1,
                'description' => '10 ans de maison celebres.',
                'visibility_score' => 35,
                'criteria' => ['metric' => 'years_in_company', 'threshold' => 10],
            ],
            [
                'name' => 'Leader',
                'slug' => 'value-leader',
                'type' => 'value',
                'rarity' => 'rare',
                'level' => 1,
                'description' => 'Reconnu pour le leadership.',
                'visibility_score' => 30,
                'criteria' => ['metric' => 'received_value_keyword', 'keyword' => 'leader', 'threshold' => 8],
            ],
            [
                'name' => 'Team Player',
                'slug' => 'value-team-player',
                'type' => 'value',
                'rarity' => 'rare',
                'level' => 1,
                'description' => "Reconnu pour l'esprit d'equipe.",
                'visibility_score' => 30,
                'criteria' => ['metric' => 'received_value_keyword', 'keyword' => 'team', 'threshold' => 8],
            ],
            [
                'name' => 'Innovateur',
                'slug' => 'value-innovator',
                'type' => 'value',
                'rarity' => 'epic',
                'level' => 1,
                'description' => "Reconnu pour l'innovation.",
                'visibility_score' => 35,
                'criteria' => ['metric' => 'received_value_keyword', 'keyword' => 'innov', 'threshold' => 8],
            ],
        ];

        foreach ($defaults as $badge) {
            Badge::query()->updateOrCreate(['slug' => $badge['slug']], $badge);
        }
    }

    public function syncForUsers(Collection $users): void
    {
        $this->ensureDefaultBadges();
        $badges = Badge::query()->where('is_active', true)->get();

        foreach ($users as $user) {
            $this->syncForUser($user, $badges);
        }
    }

    public function syncForUser(User $user, ?Collection $badges = null): void
    {
        $badges ??= Badge::query()->where('is_active', true)->get();

        $receivedBravos = Bravo::query()
            ->where('receiver_id', $user->id)
            ->count();

        foreach ($badges as $badge) {
            $criteria = $badge->criteria ?? [];
            $metric = $criteria['metric'] ?? null;
            $threshold = (int) ($criteria['threshold'] ?? 0);

            $progress = max(0, match ($metric) {
                'points_total' => (int) $user->points_total,
                'received_bravos' => $receivedBravos,
                'years_in_company' => $user->hired_at ? (int) now()->diffInYears($user->hired_at) : 0,
                'received_value_keyword' => $this->valueKeywordCount($user, (string) ($criteria['keyword'] ?? '')),
                default => 0,
            });

            $existing = $user->badges()->where('badge_id', $badge->id)->first();
            $awardedAt = $progress >= $threshold && $threshold > 0
                ? ($existing?->pivot?->awarded_at ?? now())
                : null;

            $attributes = [
                'progress' => $progress,
                'awarded_at' => $awardedAt,
                'metadata' => json_encode(['threshold' => $threshold], JSON_THROW_ON_ERROR),
            ];

            if ($existing) {
                $user->badges()->updateExistingPivot($badge->id, $attributes);
            } else {
                $user->badges()->attach($badge->id, $attributes);
            }
        }
    }

    private function valueKeywordCount(User $user, string $keyword): int
    {
        if ($keyword === '') {
            return 0;
        }

        return Bravo::query()
            ->where('receiver_id', $user->id)
            ->whereHas('values', fn ($query) => $query->whereRaw('LOWER(name) like ?', ['%' . strtolower($keyword) . '%']))
            ->count();
    }
}
