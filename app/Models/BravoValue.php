<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class BravoValue extends Model
{
    use HasFactory;

    protected $table = 'bravo_values';

    protected $fillable = [
        'name',
        'description',
        'multiplier',
        'color',
        'icon',
        'is_active',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relations
    |--------------------------------------------------------------------------
    */

    // Tous les bravos liés à cette valeur
    public function bravos()
    {
        return $this->hasMany(Bravo::class, 'value_id');
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers métier
    |--------------------------------------------------------------------------
    */

    // Calcul de points final avec multiplicateur
    public function calculatePoints(int $basePoints): int
    {
        return (int) round($basePoints * ($this->multiplier ?? 1));
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}