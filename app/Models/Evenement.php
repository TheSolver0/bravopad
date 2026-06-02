<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Evenement extends Model
{
    protected $table = 'evenements';

    protected $fillable = [
        'nom', 'slug', 'description', 'date',
        'heure_debut', 'heure_fin', 'lieu',
        'cover_image', 'programme', 'activites_options', 'statut',
    ];

    protected $casts = [
        'date'              => 'date',
        'programme'         => 'array',
        'activites_options' => 'array',
    ];

    public function inscriptions(): HasMany
    {
        return $this->hasMany(EvenementInscription::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(EvenementPost::class)->orderByDesc('published_at');
    }

    public function isOuvert(): bool
    {
        return $this->statut === 'ouvert';
    }
}
