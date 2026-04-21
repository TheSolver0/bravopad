<?php

namespace App\Http\Controllers;

use App\Models\Bravo;
use App\Models\BravoValue;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class StatsController extends Controller
{
    public function index()
    {
        $userId = Auth::id();

        $users         = User::orderByDesc('points_total')->get();
        $sentCount     = Bravo::where('sender_id', $userId)->count();
        $receivedCount = Bravo::where('receiver_id', $userId)->count();
        $totalPoints   = User::sum('points_total');

        // Bravos par semaine (8 dernières semaines)
        $weeklyData = Bravo::selectRaw('YEAR(created_at) AS yr, WEEK(created_at) AS wk, COUNT(*) AS bravos')
            ->where('created_at', '>=', now()->subWeeks(8))
            ->groupBy('yr', 'wk')
            ->orderBy('yr')
            ->orderBy('wk')
            ->get()
            ->map(fn($row) => [
                'name'   => 'S' . $row->wk,
                'bravos' => (int) $row->bravos,
            ])
            ->values();

        // Répartition par valeurs
        $valueStats = BravoValue::withCount('bravos')
            ->get()
            ->map(fn($v) => [
                'name'  => $v->name,
                'value' => $v->bravos_count,
                'color' => $v->color ?? '#3b82f6',
                'icon'  => $v->icon  ?? 'Award',
            ])
            ->values();

        // Répartition par badge (global)
        $badgeMeta = [
            'good_job'   => ['label' => 'Good Job',   'emoji' => '👍', 'color' => '#4CAF50'],
            'excellent'  => ['label' => 'Excellent',  'emoji' => '⭐', 'color' => '#2196F3'],
            'impressive' => ['label' => 'Impressive', 'emoji' => '🚀', 'color' => '#9C27B0'],
        ];

        $badgeStats = Bravo::selectRaw('badge, COUNT(*) as count')
            ->whereNotNull('badge')
            ->groupBy('badge')
            ->get()
            ->map(fn($row) => [
                'key'   => $row->badge,
                'label' => $badgeMeta[$row->badge]['label'] ?? $row->badge,
                'emoji' => $badgeMeta[$row->badge]['emoji'] ?? '🏅',
                'color' => $badgeMeta[$row->badge]['color'] ?? '#6366f1',
                'count' => (int) $row->count,
            ])
            ->values();

        return Inertia::render('Stats', [
            'users'         => $users,
            'sentCount'     => $sentCount,
            'receivedCount' => $receivedCount,
            'totalPoints'   => (int) $totalPoints,
            'weeklyData'    => $weeklyData,
            'valueStats'    => $valueStats,
            'badgeStats'    => $badgeStats,
        ]);
    }
}
