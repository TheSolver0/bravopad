<?php

namespace App\Services\Survey;

use App\Models\User;
use Illuminate\Support\Collection;

class SamplingService
{
    private const Z_SCORES = [
        90 => 1.645,
        95 => 1.96,
        99 => 2.576,
    ];

    /**
     * Cochran's formula with finite population correction.
     * n0 = z²·p(1-p) / e²
     * n  = n0 / (1 + (n0-1)/N)
     */
    public function calculateSampleSize(int $population, float $marginOfError, int $confidenceLevel = 95): array
    {
        $z  = self::Z_SCORES[$confidenceLevel] ?? 1.96;
        $p  = 0.5;
        $e  = $marginOfError / 100;

        $n0 = ($z * $z * $p * (1 - $p)) / ($e * $e);
        $n  = $population > 0
            ? (int) round($n0 / (1 + ($n0 - 1) / $population))
            : (int) round($n0);

        $n = max(1, min($n, $population));

        return [
            'population'       => $population,
            'sample_size'      => $n,
            'margin_of_error'  => $marginOfError,
            'confidence_level' => $confidenceLevel,
            'coverage_rate'    => $population > 0 ? round(($n / $population) * 100, 1) : 100.0,
        ];
    }

    /**
     * Return a stratified or random employee sample.
     */
    public function getStratifiedSample(int $sampleSize, string $stratifyBy = 'department'): array
    {
        $users = User::query()
            ->where('is_automation', false)
            ->with('department:id,name')
            ->get(['id', 'name', 'department_id', 'hired_at', 'avatar']);

        if ($users->isEmpty()) {
            return [];
        }

        return match ($stratifyBy) {
            'department' => $this->stratifyByDepartment($users, $sampleSize),
            'seniority'  => $this->stratifyBySeniority($users, $sampleSize),
            default      => $this->randomSample($users, $sampleSize),
        };
    }

    private function randomSample(Collection $users, int $sampleSize): array
    {
        return $users->shuffle()->take($sampleSize)->map(fn ($u) => [
            'id'     => $u->id,
            'name'   => $u->name,
            'avatar' => $u->avatar,
            'strata' => 'Population générale',
        ])->values()->all();
    }

    private function stratifyByDepartment(Collection $users, int $sampleSize): array
    {
        $total  = $users->count();
        $result = [];

        foreach ($users->groupBy('department_id') as $deptUsers) {
            $proportion = $deptUsers->count() / $total;
            $quota      = max(1, (int) round($sampleSize * $proportion));
            $deptName   = $deptUsers->first()->department?->name ?? 'Sans département';

            foreach ($deptUsers->shuffle()->take($quota) as $u) {
                $result[] = [
                    'id'     => $u->id,
                    'name'   => $u->name,
                    'avatar' => $u->avatar,
                    'strata' => $deptName,
                ];
            }
        }

        shuffle($result);
        return array_slice($result, 0, $sampleSize);
    }

    private function stratifyBySeniority(Collection $users, int $sampleSize): array
    {
        $now    = now();
        $strata = [
            '< 1 an'    => $users->filter(fn ($u) => $u->hired_at && $now->diffInMonths($u->hired_at) < 12),
            '1 – 3 ans' => $users->filter(fn ($u) => $u->hired_at && $now->diffInYears($u->hired_at) >= 1 && $now->diffInYears($u->hired_at) < 3),
            '3 – 5 ans' => $users->filter(fn ($u) => $u->hired_at && $now->diffInYears($u->hired_at) >= 3 && $now->diffInYears($u->hired_at) < 5),
            '5 ans +'   => $users->filter(fn ($u) => $u->hired_at && $now->diffInYears($u->hired_at) >= 5),
            'Inconnu'   => $users->filter(fn ($u) => ! $u->hired_at),
        ];

        $total  = $users->count();
        $result = [];

        foreach ($strata as $label => $group) {
            if ($group->isEmpty()) {
                continue;
            }
            $proportion = $group->count() / $total;
            $quota      = max(1, (int) round($sampleSize * $proportion));
            foreach ($group->shuffle()->take($quota) as $u) {
                $result[] = [
                    'id'     => $u->id,
                    'name'   => $u->name,
                    'avatar' => $u->avatar,
                    'strata' => $label,
                ];
            }
        }

        shuffle($result);
        return array_slice($result, 0, $sampleSize);
    }
}
