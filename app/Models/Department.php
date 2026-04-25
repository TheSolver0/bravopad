<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'description', 'manager_id'];

    // Employés du département
    public function employees()
    {
        return $this->hasMany(User::class, 'department_id');
    }

    // Manager du département (un employé)
    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }
}
