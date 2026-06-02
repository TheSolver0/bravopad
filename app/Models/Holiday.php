<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    protected $fillable = [
        'name', 'name_en', 'date', 'country_code', 'region', 'type', 'is_active', 'year',
    ];

    protected $casts = [
        'date'      => 'date',
        'is_active' => 'boolean',
        'year'      => 'integer',
    ];

    public static function forYear(int $year, string $country = 'CM'): \Illuminate\Database\Eloquent\Collection
    {
        return static::where('year', $year)
            ->where('is_active', true)
            ->where(function ($q) use ($country) {
                $q->where('country_code', $country)
                  ->orWhere('country_code', 'INTL');
            })
            ->orderBy('date')
            ->get();
    }

    /**
     * Algorithme de Gauss pour calculer la date de Pâques.
     */
    public static function easter(int $year): \DateTime
    {
        $a = $year % 19;
        $b = intdiv($year, 100);
        $c = $year % 100;
        $d = intdiv($b, 4);
        $e = $b % 4;
        $f = intdiv($b + 8, 25);
        $g = intdiv($b - $f + 1, 3);
        $h = (19 * $a + $b - $d - $g + 15) % 30;
        $i = intdiv($c, 4);
        $k = $c % 4;
        $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
        $m = intdiv($a + 11 * $h + 22 * $l, 451);
        $month = intdiv($h + $l - 7 * $m + 114, 31);
        $day   = (($h + $l - 7 * $m + 114) % 31) + 1;

        return new \DateTime("$year-" . str_pad($month, 2, '0', STR_PAD_LEFT) . '-' . str_pad($day, 2, '0', STR_PAD_LEFT));
    }

    /**
     * Seed complet des jours fériés Cameroun + jours internationaux pour une année.
     */
    public static function seedYear(int $year): void
    {
        $easter = static::easter($year);

        $goodFriday      = (clone $easter)->modify('-2 days');
        $easterMonday    = (clone $easter)->modify('+1 day');
        $ascension       = (clone $easter)->modify('+39 days');
        $whitMonday      = (clone $easter)->modify('+50 days');

        $holidays = [
            // ── Jours fériés nationaux Cameroun ──────────────────────────────
            [
                'name'         => 'Jour de l\'An',
                'name_en'      => 'New Year\'s Day',
                'date'         => "$year-01-01",
                'country_code' => 'CM',
                'type'         => 'national',
            ],
            [
                'name'         => 'Fête de la Jeunesse',
                'name_en'      => 'Youth Day',
                'date'         => "$year-02-11",
                'country_code' => 'CM',
                'type'         => 'national',
            ],
            [
                'name'         => 'Vendredi Saint',
                'name_en'      => 'Good Friday',
                'date'         => $goodFriday->format('Y-m-d'),
                'country_code' => 'CM',
                'type'         => 'national',
            ],
            [
                'name'         => 'Lundi de Pâques',
                'name_en'      => 'Easter Monday',
                'date'         => $easterMonday->format('Y-m-d'),
                'country_code' => 'CM',
                'type'         => 'national',
            ],
            [
                'name'         => 'Fête du Travail',
                'name_en'      => 'Labour Day',
                'date'         => "$year-05-01",
                'country_code' => 'CM',
                'type'         => 'national',
            ],
            [
                'name'         => 'Fête Nationale (Indépendance)',
                'name_en'      => 'National Day',
                'date'         => "$year-05-20",
                'country_code' => 'CM',
                'type'         => 'national',
            ],
            [
                'name'         => 'Ascension',
                'name_en'      => 'Ascension Day',
                'date'         => $ascension->format('Y-m-d'),
                'country_code' => 'CM',
                'type'         => 'national',
            ],
            [
                'name'         => 'Lundi de Pentecôte',
                'name_en'      => 'Whit Monday',
                'date'         => $whitMonday->format('Y-m-d'),
                'country_code' => 'CM',
                'type'         => 'national',
            ],
            [
                'name'         => 'Assomption de Marie',
                'name_en'      => 'Assumption Day',
                'date'         => "$year-08-15",
                'country_code' => 'CM',
                'type'         => 'national',
            ],
            [
                'name'         => 'Fête de l\'Unification',
                'name_en'      => 'Unification Day',
                'date'         => "$year-10-01",
                'country_code' => 'CM',
                'type'         => 'national',
            ],
            [
                'name'         => 'Toussaint',
                'name_en'      => 'All Saints\' Day',
                'date'         => "$year-11-01",
                'country_code' => 'CM',
                'type'         => 'national',
            ],
            [
                'name'         => 'Noël',
                'name_en'      => 'Christmas Day',
                'date'         => "$year-12-25",
                'country_code' => 'CM',
                'type'         => 'national',
            ],

            // ── Journées internationales observées ───────────────────────────
            [
                'name'         => 'Journée internationale des droits des femmes',
                'name_en'      => 'International Women\'s Day',
                'date'         => "$year-03-08",
                'country_code' => 'INTL',
                'type'         => 'custom',
            ],
            [
                'name'         => 'Journée mondiale de la santé',
                'name_en'      => 'World Health Day',
                'date'         => "$year-04-07",
                'country_code' => 'INTL',
                'type'         => 'custom',
            ],
            [
                'name'         => 'Journée de l\'Environnement',
                'name_en'      => 'World Environment Day',
                'date'         => "$year-06-05",
                'country_code' => 'INTL',
                'type'         => 'custom',
            ],
            [
                'name'         => 'Journée internationale des droits de l\'enfant',
                'name_en'      => 'World Children\'s Day',
                'date'         => "$year-11-20",
                'country_code' => 'INTL',
                'type'         => 'custom',
            ],
            [
                'name'         => 'Journée des droits de l\'Homme',
                'name_en'      => 'Human Rights Day',
                'date'         => "$year-12-10",
                'country_code' => 'INTL',
                'type'         => 'custom',
            ],
            [
                'name'         => 'Réveillon du Nouvel An',
                'name_en'      => 'New Year\'s Eve',
                'date'         => "$year-12-31",
                'country_code' => 'INTL',
                'type'         => 'custom',
            ],
        ];

        foreach ($holidays as $h) {
            static::firstOrCreate(
                ['date' => $h['date'], 'country_code' => $h['country_code']],
                array_merge($h, ['year' => $year, 'is_active' => true])
            );
        }
    }

    /** Raccourci backward-compatible */
    public static function seedCameroon(int $year): void
    {
        static::seedYear($year);
    }
}
