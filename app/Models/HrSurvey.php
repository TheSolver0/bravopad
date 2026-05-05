<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class HrSurvey extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'cover_image',
        'question',
        'options',
        'questions',
        'token',
        'is_active',
        'created_by',
        'starts_at',
        'ends_at',
    ];

    protected $casts = [
        'options'    => 'array',
        'questions'  => 'array',
        'is_active'  => 'boolean',
        'starts_at'  => 'datetime',
        'ends_at'    => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (HrSurvey $survey) {
            if (empty($survey->token)) {
                $survey->token = Str::random(32);
            }
        });
    }

    public function responses()
    {
        return $this->hasMany(HrSurveyResponse::class, 'survey_id');
    }

    public function isMultiQuestion(): bool
    {
        return ! empty($this->questions);
    }
}
