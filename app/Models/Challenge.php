<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class Challenge extends Model
{
    use HasFactory;

    protected $table = 'challenges';

    protected $fillable = [
        'name',
        'description',
        'cover_image',
        'category',
        'start_date',
        'end_date',
        'points_bonus',
        'status',
        'for_all',
        'division_id',
        'created_by',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relations
    |--------------------------------------------------------------------------
    */

    // Division ciblée (null = tous)
    public function division()
    {
        return $this->belongsTo(\App\Models\Department::class, 'division_id');
    }

    // RH ou admin qui a créé le challenge
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Tous les bravos liés à ce challenge
    public function bravos()
    {
        return $this->hasMany(Bravo::class, 'challenge_id');
    }

    // Participants volontaires
    public function participants()
    {
        return $this->belongsToMany(User::class, 'challenge_participants')->withTimestamps();
    }

    // Médias du blog (photos/vidéos)
    public function media()
    {
        return $this->hasMany(ChallengeMedia::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers métier
    |--------------------------------------------------------------------------
    */

    // Vérifie si le challenge est actif
    public function isActive(): bool
    {
        $now = Carbon::now();

        return $this->status === 'active'
            && $now->between($this->start_date, $this->end_date);
    }

    // Vérifie si terminé
    public function isFinished(): bool
    {
        return Carbon::now()->gt($this->end_date);
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    public function scopeActive($query)
    {
        return $query->where('status', 'active')
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now());
    }

    public function scopeFinished($query)
    {
        return $query->where('end_date', '<', now());
    }
}