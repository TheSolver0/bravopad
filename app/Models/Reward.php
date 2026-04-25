<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Reward extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'description', 'category', 'cost_points',
        'image_url', 'stock', 'is_active',
    ];

    protected $casts = [
        'is_active'   => 'boolean',
        'cost_points' => 'integer',
        'stock'       => 'integer',
    ];

    public function redemptions()
    {
        return $this->hasMany(Redemption::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function isAffordableBy(User $user): bool
    {
        return $user->points_total >= $this->cost_points;
    }

    public function hasStock(): bool
    {
        if (is_null($this->stock)) {
            return true; // illimité
        }

        $used = $this->redemptions()
            ->whereNotIn('status', ['rejected'])
            ->count();

        return $used < $this->stock;
    }
}
