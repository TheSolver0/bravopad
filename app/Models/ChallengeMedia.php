<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChallengeMedia extends Model
{
    protected $table = 'challenge_media';

    protected $fillable = [
        'challenge_id',
        'uploaded_by',
        'file_path',
        'file_type',
        'caption',
    ];

    public function challenge()
    {
        return $this->belongsTo(Challenge::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
