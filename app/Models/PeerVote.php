<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PeerVote extends Model
{
    use HasFactory;

    protected $fillable = [
        'voter_id',
        'nominee_id',
        'period',
        'weight',
        'is_anonymous',
        'comment',
    ];

    protected $casts = [
        'weight' => 'float',
        'is_anonymous' => 'boolean',
    ];

    public function voter()
    {
        return $this->belongsTo(User::class, 'voter_id');
    }

    public function nominee()
    {
        return $this->belongsTo(User::class, 'nominee_id');
    }
}
