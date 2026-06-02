<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'content', 'type', 'media_url', 'is_pinned', 'original_post_id'];

    protected $casts = [
        'is_pinned' => 'boolean',
    ];
    
    protected $with = ['media']; 

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function originalPost()
    {
        return $this->belongsTo(self::class, 'original_post_id');
    }

    public function comments()
    {
        return $this->hasMany(PostComment::class)->with('user')->latest();
    }

    public function likedBy()
    {
        return $this->belongsToMany(User::class, 'post_likes')->withTimestamps();
    }
     /**
     * Médias attachés au post (images, vidéos).
     */
    public function media(): HasMany
    {
        return $this->hasMany(PostMedia::class)->orderBy('order');
    }
 
    /**
     * Indique si le post contient des médias.
     */
    public function hasMedia(): bool
    {
        return $this->media()->exists();
    }
}
