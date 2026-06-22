<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessengerCallParticipant extends Model
{
    use HasFactory;

    protected $fillable = [
        'call_id',
        'user_id',
        'status',
        'media_identity',
        'last_joined_at',
        'last_left_at',
        'network_quality',
        'permissions_json',
        'recording_consented_at',
        'recording_consent_revoked_at',
        'joined_at',
        'left_at',
    ];

    protected function casts(): array
    {
        return [
            'joined_at' => 'datetime',
            'left_at' => 'datetime',
            'last_joined_at' => 'datetime',
            'last_left_at' => 'datetime',
            'network_quality' => 'integer',
            'permissions_json' => 'array',
            'recording_consented_at' => 'datetime',
            'recording_consent_revoked_at' => 'datetime',
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
