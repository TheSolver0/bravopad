<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BravoLike extends Model
{
    public $timestamps = false;

    protected $fillable = ['bravo_id', 'user_id'];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function bravo()
    {
        return $this->belongsTo(Bravo::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
