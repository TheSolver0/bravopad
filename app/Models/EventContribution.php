<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventContribution extends Model
{
    use HasFactory;

    protected $fillable = [
        'creator_id',
        'title',
        'description',
        'event_type',
        'goal_amount',
        'deadline_at',
        'banner_path',
        'visibility',
        'amount_mode',
        'amount_per_participant',
        'payment_methods',
        'allow_view_total',
        'allow_view_participants',
        'allow_view_individual_amounts',
        'allow_view_participant_count',
    ];

    protected function casts(): array
    {
        return [
            'goal_amount' => 'decimal:2',
            'amount_per_participant' => 'decimal:2',
            'deadline_at' => 'date',
            'payment_methods' => 'array',
            'allow_view_total' => 'boolean',
            'allow_view_participants' => 'boolean',
            'allow_view_individual_amounts' => 'boolean',
            'allow_view_participant_count' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function invites(): HasMany
    {
        return $this->hasMany(EventContributionInvite::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(EventContributionPayment::class);
    }
}
