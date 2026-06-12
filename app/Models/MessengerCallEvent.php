<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessengerCallEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'call_id',
        'user_id',
        'source',
        'type',
        'event_id',
        'payload_json',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'payload_json' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    public function call(): BelongsTo
    {
        return $this->belongsTo(MessengerCall::class, 'call_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
