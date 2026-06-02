<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatbotMessage extends Model
{
    protected $fillable = ['user_id', 'role', 'content', 'manual_key'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
