<?php

namespace App\Services\Survey;

class SurveyStatsService
{
    /**
     * Descriptive statistics for a rating question (1–5 scale).
     */
    public function ratingStats(array $values, int $totalRespondents): array
    {
        $n = count($values);

        if ($n === 0) {
            return [
                'average'             => null,
                'median'              => null,
                'std_dev'             => null,
                'mode'                => null,
                'confidence_interval' => null,
                'answered'            => 0,
                'response_rate'       => 0,
            ];
        }

        $avg    = array_sum($values) / $n;
        $sorted = $values;
        sort($sorted);

        $mid    = (int) floor($n / 2);
        $median = $n % 2 === 0
            ? ($sorted[$mid - 1] + $sorted[$mid]) / 2
            : (float) $sorted[$mid];

        $variance = array_sum(array_map(fn ($v) => ($v - $avg) ** 2, $values)) / $n;
        $stdDev   = sqrt($variance);

        $counts = array_count_values($values);
        arsort($counts);
        $mode = (int) array_key_first($counts);

        $ci = null;
        if ($n > 1) {
            $se     = $stdDev / sqrt($n);
            $margin = 1.96 * $se;
            $ci     = [
                'lower' => round(max(1, $avg - $margin), 2),
                'upper' => round(min(5, $avg + $margin), 2),
            ];
        }

        return [
            'average'             => round($avg, 2),
            'median'              => round($median, 1),
            'std_dev'             => round($stdDev, 2),
            'mode'                => $mode,
            'confidence_interval' => $ci,
            'answered'            => $n,
            'response_rate'       => $totalRespondents > 0 ? (int) round(($n / $totalRespondents) * 100) : 0,
        ];
    }

    /**
     * eNPS from 1-5 rating values.
     * Maps 5→Promoteur, 4→Passif, 1-3→Détracteur.
     */
    public function computeEnps(array $ratingValues): ?array
    {
        $n = count($ratingValues);
        if ($n < 3) {
            return null;
        }

        $promoters  = count(array_filter($ratingValues, fn ($v) => $v === 5));
        $detractors = count(array_filter($ratingValues, fn ($v) => $v <= 3));
        $passives   = $n - $promoters - $detractors;

        $nps = (int) round((($promoters - $detractors) / $n) * 100);

        return [
            'score'      => $nps,
            'promoters'  => $promoters,
            'passives'   => $passives,
            'detractors' => $detractors,
            'total'      => $n,
            'label'      => $this->npsLabel($nps),
        ];
    }

    /**
     * Chi-square goodness-of-fit test (uniform distribution hypothesis).
     */
    public function chiSquareTest(array $observedCounts, int $total): ?array
    {
        $k = count($observedCounts);
        if ($total < 10 || $k < 2) {
            return null;
        }

        $expected = $total / $k;
        $chiSq    = array_sum(
            array_map(fn ($obs) => (($obs - $expected) ** 2) / $expected, $observedCounts)
        );
        $df     = $k - 1;
        $pValue = $this->chiSquarePValue($chiSq, $df);

        return [
            'chi_square'  => round($chiSq, 3),
            'df'          => $df,
            'p_value'     => round($pValue, 4),
            'significant' => $pValue < 0.05,
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function npsLabel(int $nps): string
    {
        return match (true) {
            $nps >= 50  => 'Excellent',
            $nps >= 20  => 'Favorable',
            $nps >= 0   => 'Passable',
            $nps >= -20 => 'Négatif',
            default     => 'Critique',
        };
    }

    private function chiSquarePValue(float $chiSq, int $df): float
    {
        if ($chiSq <= 0) {
            return 1.0;
        }
        $x     = ($chiSq / $df) ** (1 / 3);
        $mu    = 1 - (2 / (9 * $df));
        $sigma = sqrt(2 / (9 * $df));
        if ($sigma == 0) {
            return 0.5;
        }
        $z = ($x - $mu) / $sigma;
        return 1 - $this->normalCdf($z);
    }

    private function normalCdf(float $z): float
    {
        $t    = 1 / (1 + 0.2316419 * abs($z));
        $poly = $t * (0.319381530 + $t * (-0.356563782 + $t * (1.781477937 + $t * (-1.821255978 + $t * 1.330274429))));
        $pdf  = exp(-0.5 * $z * $z) / sqrt(2 * M_PI);
        $cdf  = 1 - $pdf * $poly;
        return $z >= 0 ? $cdf : 1 - $cdf;
    }
}
