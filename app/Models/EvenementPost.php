<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvenementPost extends Model
{
    protected $table = 'evenement_posts';

    protected $fillable = [
        'evenement_id', 'auteur_id', 'titre',
        'contenu', 'image_url', 'published_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    public function evenement(): BelongsTo
    {
        return $this->belongsTo(Evenement::class);
    }

    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auteur_id');
    }
}
