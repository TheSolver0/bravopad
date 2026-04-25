<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Badge extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'type',
        'rarity',
        'level',
        'description',
        'visibility_score',
        'criteria',
        'is_active',
    ];

    protected $casts = [
        'criteria' => 'array',
        'is_active' => 'boolean',
        'level' => 'integer',
        'visibility_score' => 'integer',
    ];

    public function users()
    {
        return $this->belongsToMany(User::class)
            ->withPivot(['progress', 'awarded_at', 'metadata'])
            ->withTimestamps();
    }
}
