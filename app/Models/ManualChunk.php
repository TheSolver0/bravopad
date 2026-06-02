<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ManualChunk extends Model
{
    protected $fillable = ['manual_key', 'file_name', 'page_number', 'content'];
}
