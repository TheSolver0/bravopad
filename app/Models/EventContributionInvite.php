<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventContributionInvite extends Model
{
    protected $fillable = [
        'event_contribution_id',
        'user_id',
        'invited_by',
        'status',
    ];

    public function contribution(): BelongsTo
    {
        return $this->belongsTo(EventContribution::class, 'event_contribution_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }
}
