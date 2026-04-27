<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Bravo;
use App\Models\BravoValue;
use App\Models\Challenge;
use App\Services\Insights\BravoInsightsService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(BravoInsightsService $insightsService)
    {
        $users = User::query()->where('is_automation', false)->orderByDesc('points_total')->get();

        $rawBravos = Bravo::with(['sender', 'receiver', 'values', 'comments.user'])
            ->latest()
            ->get()
            ->map(fn ($b) => array_merge($b->toArray(), [
                'comments' => $b->comments->map(fn ($c) => [
                    'id'         => $c->id,
                    'content'    => $c->content,
                    'created_at' => $c->created_at->diffForHumans(),
                    'user' => [
                        'id'     => $c->user->id,
                        'name'   => $c->user->name,
                        'avatar' => $c->user->avatar,
                    ],
                ])->values()->toArray(),
            ]));

        // Regrouper les bravos d'un même envoi (même batch_id) en une seule carte
        $bravos = $rawBravos
            ->groupBy(fn ($b) => $b['batch_id'] ?? ('_' . $b['id']))
            ->map(function ($group) {
                $first = $group->first();
                $first['receivers'] = $group
                    ->pluck('receiver')
                    ->filter()
                    ->unique('id')
                    ->values()
                    ->toArray();
                return $first;
            })
            ->values();

        $activeChallenge = Challenge::where('status', 'active')
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->first();

        $currentUser = Auth::user();

        // Célébrations du jour
        $today      = Carbon::today();
        $todayMonth = $today->month;
        $todayDay   = $today->day;
        $currentYear = $today->year;
        $anniversaryYears = [1, 5, 10, 20];

        $celebrations = collect();
        User::whereNotNull('birth_date')->orWhereNotNull('hire_date')->get()
            ->each(function (User $u) use ($todayMonth, $todayDay, $currentYear, $anniversaryYears, &$celebrations) {
                if ($u->birth_date && $u->birth_date->month === $todayMonth && $u->birth_date->day === $todayDay) {
                    $celebrations->push(['type' => 'birthday', 'name' => $u->name, 'years' => null]);
                }
                if ($u->hire_date) {
                    $hireDate = \Carbon\Carbon::parse($u->hire_date);
                    if ($hireDate->month === $todayMonth && $hireDate->day === $todayDay) {
                        $years = $currentYear - $hireDate->year;
                        if ($years > 0 && in_array($years, $anniversaryYears)) {
                            $celebrations->push(['type' => 'anniversary', 'name' => $u->name, 'years' => $years]);
                        }
                    }
                }
            });

        // Compteur de notifications non lues
        $unreadCount = $currentUser->unreadNotifications()->count();

        return Inertia::render('dashboard', [
            'users'           => $users,
            'bravos'          => $bravos,
            'activeChallenge' => $activeChallenge,
            'currentUser'         => array_merge($currentUser->toArray(), [
                'monthly_points_remaining' => $currentUser->monthly_points_remaining,
                'monthly_points_allowance' => $currentUser->monthly_points_allowance ?? 100,
            ]),
            'bravoValues'         => BravoValue::where('is_active', true)->get(),
            'celebrations'    => $celebrations->values(),
            'unreadCount'     => $unreadCount,
            'bravoInsights'   => $insightsService->forSender($currentUser),
        ]);
    }
}