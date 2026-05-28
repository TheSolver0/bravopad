<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AgendaEvent extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title', 'description', 'start_at', 'end_at', 'all_day',
        'location', 'meeting_url', 'type', 'status', 'priority',
        'color', 'tags', 'internal_notes', 'is_recurring',
        'parent_event_id', 'recurrence_rule', 'calendar_id', 'organizer_id',
    ];

    protected $casts = [
        'start_at'       => 'datetime',
        'end_at'         => 'datetime',
        'all_day'        => 'boolean',
        'is_recurring'   => 'boolean',
        'tags'           => 'array',
        'recurrence_rule'=> 'array',
    ];

    public function calendar(): BelongsTo
    {
        return $this->belongsTo(Calendar::class);
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function attendees(): HasMany
    {
        return $this->hasMany(EventAttendee::class, 'event_id');
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(EventReminder::class, 'event_id');
    }

    public function scopeInRange($query, string $start, string $end)
    {
        return $query->where('start_at', '<=', $end)
                     ->where('end_at', '>=', $start);
    }

    public function scopeForCalendars($query, array $calendarIds)
    {
        return $query->whereIn('calendar_id', $calendarIds);
    }

    public function getDurationMinutesAttribute(): int
    {
        return (int) $this->start_at->diffInMinutes($this->end_at);
    }
}
