<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class BravoComment extends Model
{
    use HasFactory;

    protected $fillable = ['bravo_id', 'user_id', 'content'];

    public function bravo()
    {
        return $this->belongsTo(Bravo::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
