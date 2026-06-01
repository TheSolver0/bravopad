<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClubPadRegistration extends Model
{
    protected $fillable = [
        'nom',
        'matricule',
        'sexe',
        'direction_id',
        'participera',
        'ip_address',
    ];

    protected $casts = [
        'participera' => 'boolean',
    ];

    public function direction(): BelongsTo
    {
        return $this->belongsTo(Direction::class);
    }
}
