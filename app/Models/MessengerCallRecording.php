<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessengerCallRecording extends Model
{
    use HasFactory;

    protected $fillable = [
        'call_id',
        'provider_id',
        'layout',
        'storage_disk',
        'storage_path',
        'duration_seconds',
        'status',
        'started_by',
        'started_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'duration_seconds' => 'integer',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function call(): BelongsTo
    {
        return $this->belongsTo(MessengerCall::class, 'call_id');
    }

    public function starter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'started_by');
    }
}
