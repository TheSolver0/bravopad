<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Bravo extends Model
{
    use HasFactory;

    protected $table = 'bravos';

    protected $fillable = [
        'sender_id',
        'receiver_id',
        'badge',
        'value_id',
        'challenge_id',
        'message',
        'points',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relations
    |--------------------------------------------------------------------------
    */

    // Auteur du bravo
    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    // Récepteur du bravo
    public function receiver()
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    // Valeurs multiples (many-to-many via pivot bravo_bravo_value)
    public function values()
    {
        return $this->belongsToMany(BravoValue::class, 'bravo_bravo_value', 'bravo_id', 'bravo_value_id');
    }

    // Challenge associé (optionnel)
    public function challenge()
    {
        return $this->belongsTo(Challenge::class, 'challenge_id');
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes utiles (feed social)
    |--------------------------------------------------------------------------
    */

    // Feed récent type réseau social
    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    // Filtrer par receiver (profil utilisateur)
    public function scopeForUser($query, $userId)
    {
        return $query->where('receiver_id', $userId);
    }

    // Filtrer par sender
    public function scopeFromUser($query, $userId)
    {
        return $query->where('sender_id', $userId);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers métier
    |--------------------------------------------------------------------------
    */

    public function getIsInChallengeAttribute()
    {
        return !is_null($this->challenge_id);
    }
}