<?php

namespace App\Http\Controllers;

use App\Models\Bravo;
use App\Models\BravoValue;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class StatsController extends Controller
{
    public function index(Request $request)
    {
        $userId       = Auth::id();
        $departmentId = $request->input('department_id') ? (int) $request->input('department_id') : null;

        $departments = Department::orderBy('name')->get(['id', 'name']);

        // ── Métriques globales ────────────────────────────────────────────────
        $users = User::when($departmentId, fn($q) => $q->where('department_id', $departmentId))
            ->orderByDesc('points_total')
            ->get();

        $sentCount     = Bravo::where('sender_id', $userId)->count();
        $receivedCount = Bravo::where('receiver_id', $userId)->count();

        $totalPoints = User::when($departmentId, fn($q) => $q->where('department_id', $departmentId))
            ->sum('points_total');

        // ── Bravos par semaine (8 dernières semaines) ─────────────────────────
        $weeklyData = Bravo::selectRaw('YEAR(bravos.created_at) AS yr, WEEK(bravos.created_at) AS wk, COUNT(*) AS bravos')
            ->when($departmentId, fn($q) => $q
                ->join('users as wd_u', 'bravos.receiver_id', '=', 'wd_u.id')
                ->where('wd_u.department_id', $departmentId)
            )
            ->where('bravos.created_at', '>=', now()->subWeeks(8))
            ->groupBy('yr', 'wk')
            ->orderBy('yr')
            ->orderBy('wk')
            ->get()
            ->map(fn($row) => [
                'name'   => 'S' . $row->wk,
                'bravos' => (int) $row->bravos,
            ])
            ->values();

        // ── Répartition par valeurs ───────────────────────────────────────────
        $valueStats = BravoValue::withCount(['bravos' => fn($q) => $q
                ->when($departmentId, fn($q2) => $q2
                    ->whereHas('receiver', fn($q3) => $q3->where('department_id', $departmentId))
                )
            ])
            ->get()
            ->map(fn($v) => [
                'name'  => $v->name,
                'value' => $v->bravos_count,
                'color' => $v->color ?? '#3b82f6',
                'icon'  => $v->icon  ?? 'Award',
            ])
            ->values();

        // ── Répartition par badge ─────────────────────────────────────────────
        $badgeMeta = [
            'good_job'   => ['label' => 'Good Job',   'emoji' => '👍', 'color' => '#4CAF50'],
            'excellent'  => ['label' => 'Excellent',  'emoji' => '⭐', 'color' => '#2196F3'],
            'impressive' => ['label' => 'Impressive', 'emoji' => '🚀', 'color' => '#9C27B0'],
        ];

        $badgeStats = Bravo::selectRaw('badge, COUNT(*) as count')
            ->whereNotNull('badge')
            ->when($departmentId, fn($q) => $q
                ->whereHas('receiver', fn($q2) => $q2->where('department_id', $departmentId))
            )
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

        // ── Top Givers ────────────────────────────────────────────────────────
        $topGivers = User::select('users.id', 'users.name', 'users.avatar', 'departments.name as department_name')
            ->selectRaw('COUNT(bravos.id) as bravo_count')
            ->leftJoin('bravos', 'users.id', '=', 'bravos.sender_id')
            ->leftJoin('departments', 'users.department_id', '=', 'departments.id')
            ->when($departmentId, fn($q) => $q->where('users.department_id', $departmentId))
            ->groupBy('users.id', 'users.name', 'users.avatar', 'departments.name')
            ->orderByDesc('bravo_count')
            ->limit(5)
            ->get()
            ->map(fn($u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'avatar'     => $u->avatar ?? '',
                'department' => $u->department_name,
                'count'      => (int) $u->bravo_count,
            ]);

        // ── Top Receivers ─────────────────────────────────────────────────────
        $topReceivers = User::select('users.id', 'users.name', 'users.avatar', 'departments.name as department_name')
            ->selectRaw('COUNT(bravos.id) as bravo_count')
            ->leftJoin('bravos', 'users.id', '=', 'bravos.receiver_id')
            ->leftJoin('departments', 'users.department_id', '=', 'departments.id')
            ->when($departmentId, fn($q) => $q->where('users.department_id', $departmentId))
            ->groupBy('users.id', 'users.name', 'users.avatar', 'departments.name')
            ->orderByDesc('bravo_count')
            ->limit(5)
            ->get()
            ->map(fn($u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'avatar'     => $u->avatar ?? '',
                'department' => $u->department_name,
                'count'      => (int) $u->bravo_count,
            ]);

        return Inertia::render('Stats', [
            'users'         => $users,
            'sentCount'     => $sentCount,
            'receivedCount' => $receivedCount,
            'totalPoints'   => (int) $totalPoints,
            'weeklyData'    => $weeklyData,
            'valueStats'    => $valueStats,
            'badgeStats'    => $badgeStats,
            'topGivers'     => $topGivers,
            'topReceivers'  => $topReceivers,
            'departments'   => $departments,
            'filters'       => ['department_id' => $departmentId],
        ]);
    }
}
