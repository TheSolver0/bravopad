<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventContributionPayment extends Model
{
    protected $fillable = [
        'event_contribution_id',
        'contributor_user_id',
        'recorded_by',
        'contributor_name',
        'amount',
        'payment_method',
        'is_manual',
        'note',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'is_manual' => 'boolean',
            'paid_at' => 'datetime',
        ];
    }

    public function contribution(): BelongsTo
    {
        return $this->belongsTo(EventContribution::class, 'event_contribution_id');
    }

    public function contributor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'contributor_user_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
