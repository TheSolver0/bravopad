<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvenementInscription extends Model
{
    protected $table = 'evenement_inscriptions';

    protected $fillable = [
        'evenement_id', 'nom', 'matricule',
        'sexe', 'direction_id', 'participera', 'activites', 'ip_address',
    ];

    protected $casts = [
        'participera' => 'boolean',
        'activites'   => 'array',
    ];

    public function evenement(): BelongsTo
    {
        return $this->belongsTo(Evenement::class);
    }

    public function direction(): BelongsTo
    {
        return $this->belongsTo(Direction::class);
    }
}
