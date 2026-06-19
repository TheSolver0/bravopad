<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Bravo;
use App\Models\BravoValue;
use App\Models\Challenge;
use App\Models\Post;
use App\Models\Story;
use App\Models\StoryView;
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

        // Bravos reçus cette semaine par l'utilisateur courant
        $weeklyBravosReceived = Bravo::where('receiver_id', $currentUser->id)
            ->where('created_at', '>=', Carbon::now()->startOfWeek())
            ->count();

        // Total de bravos envoyés ce mois
        $monthlyBravosCount = Bravo::where('created_at', '>=', Carbon::now()->startOfMonth())
            ->count();

        // Stories actives (24h)
        $stories = Story::active()
            ->with('user:id,name,avatar,role')
            ->withCount('views')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($s) => [
                'id'               => $s->id,
                'user_id'          => $s->user_id,
                'type'             => $s->type,
                'content'          => $s->content,
                'media_url'        => $s->media_url,
                'background_color' => $s->background_color,
                'font_style'       => $s->font_style,
                'text_align'       => $s->text_align,
                'views_count'      => $s->views_count,
                'expires_at'       => $s->expires_at->toIso8601String(),
                'created_at'       => $s->created_at->diffForHumans(),
                'seen'             => $s->isViewedBy($currentUser->id),
                'user' => [
                    'id'         => $s->user->id,
                    'name'       => $s->user->name,
                    'avatar'     => $s->user->avatar,
                    'role'       => $s->user->role,
                    'department' => null,
                ],
            ]);

        // Posts récents pour le fil unifié (30 derniers)
        $posts = Post::with(['user', 'comments.user'])
            ->withCount('likedBy')
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at')
            ->limit(30)
            ->get()
            ->map(fn ($p) => [
                'id'           => $p->id,
                'type'         => $p->type ?? 'post',
                'content'      => $p->content,
                'user'         => $p->user ? [
                    'id'         => $p->user->id,
                    'name'       => $p->user->name,
                    'avatar'     => $p->user->avatar,
                    'role'       => $p->user->role,
                    'department' => $p->user->department,
                ] : null,
                'is_pinned'    => (bool) $p->is_pinned,
                'media'        => $p->media ?? [],
                'likes_count'  => $p->liked_by_count,
                'user_has_liked' => false,
                'comments'     => $p->comments->map(fn ($c) => [
                    'id'         => $c->id,
                    'content'    => $c->content,
                    'created_at' => $c->created_at->diffForHumans(),
                    'user'       => ['id' => $c->user->id, 'name' => $c->user->name, 'avatar' => $c->user->avatar],
                ])->values()->toArray(),
                'created_at'   => $p->created_at->toIso8601String(),
                'updated_at'   => $p->updated_at->toIso8601String(),
            ])->values()->toArray();

        return Inertia::render('dashboard', [
            'users'           => $users,
            'bravos'          => $bravos,
            'posts'           => $posts,
            'stories'         => $stories,
            'activeChallenge' => $activeChallenge,
            'currentUser'         => array_merge($currentUser->toArray(), [
                'monthly_points_remaining' => $currentUser->monthly_points_remaining,
                'monthly_points_allowance' => $currentUser->monthly_points_allowance ?? 100,
            ]),
            'bravoValues'         => BravoValue::where('is_active', true)->get(),
            'celebrations'    => $celebrations->values(),
            'unreadCount'             => $unreadCount,
            'weeklyBravosReceived'    => $weeklyBravosReceived,
            'monthlyBravosCount'      => $monthlyBravosCount,
            'bravoInsights'           => $insightsService->forSender($currentUser),
        ]);
    }
}