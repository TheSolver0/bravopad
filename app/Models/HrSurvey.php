<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HrSurvey extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'question',
        'options',
        'is_active',
        'created_by',
        'starts_at',
        'ends_at',
    ];

    protected $casts = [
        'options' => 'array',
        'is_active' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public function responses()
    {
        return $this->hasMany(HrSurveyResponse::class, 'survey_id');
    }
}
