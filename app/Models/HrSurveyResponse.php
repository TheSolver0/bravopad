<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HrSurveyResponse extends Model
{
    use HasFactory;

    protected $fillable = [
        'survey_id',
        'user_id',
        'option_key',
    ];

    public function survey()
    {
        return $this->belongsTo(HrSurvey::class, 'survey_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
