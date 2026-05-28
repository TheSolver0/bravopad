<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventAttendee extends Model
{
    protected $fillable = [
        'event_id', 'user_id', 'status', 'is_organizer', 'checked_in', 'checked_in_at',
    ];

    protected $casts = [
        'is_organizer'  => 'boolean',
        'checked_in'    => 'boolean',
        'checked_in_at' => 'datetime',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(AgendaEvent::class, 'event_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
