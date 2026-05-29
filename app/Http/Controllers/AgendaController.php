<?php

namespace App\Http\Controllers;

use App\Models\AgendaEvent;
use App\Models\Calendar;
use App\Models\Holiday;
use App\Models\User;
use App\Services\Agenda\AgendaNetworkService;
use App\Services\AvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AgendaController extends Controller
{
    public function __construct(
        private readonly AvailabilityService $availabilityService,
        private readonly AgendaNetworkService $networkService,
    ) {}

    public function index(Request $request): Response
    {
        $user = Auth::user();

        // S'assurer que l'utilisateur a un calendrier par défaut
        $defaultCalendar = Calendar::firstOrCreate(
            ['owner_id' => $user->id, 'is_default' => true],
            [
                'name' => 'Mon Agenda',
                'color' => '#3B82F6',
                'type' => 'personal',
                'visibility' => 'private',
            ]
        );

        // Initialiser le planning par défaut si vide
        $this->availabilityService->initDefaultSchedule($user->id);

        // Calendriers accessibles par l'utilisateur
        $calendars = Calendar::active()
            ->forUser($user->id)
            ->with('owner:id,name,avatar')
            ->get()
            ->map(fn (Calendar $cal) => [
                'id' => $cal->id,
                'name' => $cal->name,
                'color' => $cal->color,
                'type' => $cal->type,
                'visibility' => $cal->visibility,
                'is_default' => $cal->is_default,
                'owner_id' => $cal->owner_id,
                'owner_name' => $cal->owner->name,
                'is_mine' => $cal->owner_id === $user->id,
            ]);

        // Jours fériés : année courante + suivante (navigation fluide)
        $currentYear = now()->year;
        $holidays = Holiday::query()
            ->where('is_active', true)
            ->whereIn('year', [$currentYear, $currentYear + 1])
            ->where(function ($q) {
                $q->where('country_code', 'CM')
                    ->orWhere('country_code', 'INTL');
            })
            ->orderBy('date')
            ->get()
            ->map(fn (Holiday $h) => [
                'id' => $h->id,
                'name' => $h->name,
                'name_en' => $h->name_en,
                'date' => $h->date->toDateString(),
                'type' => $h->type,
                'country_code' => $h->country_code,
            ]);

        // Statistiques rapides
        $now = now();
        $todayEvents = AgendaEvent::query()
            ->whereHas('calendar', fn ($q) => $q->forUser($user->id))
            ->whereDate('start_at', $now->toDateString())
            ->where('status', '!=', 'cancelled')
            ->count();

        $weekEvents = AgendaEvent::query()
            ->whereHas('calendar', fn ($q) => $q->forUser($user->id))
            ->whereBetween('start_at', [$now->startOfWeek(), $now->copy()->endOfWeek()])
            ->where('status', '!=', 'cancelled')
            ->count();

        $pendingEvents = AgendaEvent::query()
            ->whereHas('calendar', fn ($q) => $q->forUser($user->id))
            ->where('status', 'pending')
            ->where('start_at', '>=', $now)
            ->count();

        $networkUsers = $this->networkService->connectedUsers($user);

        // Membres liés (réseau) pour invitations et planning
        $teamMembers = $networkUsers
            ->reject(fn (User $member) => (int) $member->id === (int) $user->id)
            ->values();

        // Anniversaires : soi + personnes du réseau uniquement
        $birthdaySources = $networkUsers->map(fn (User $member) => (object) [
            'id' => $member->id,
            'name' => $member->name,
            'avatar' => $member->avatar,
            'birth_date' => $member->birth_date,
            'is_me' => (int) $member->id === (int) $user->id,
        ]);

        $birthdays = collect();
        foreach ([$currentYear, $currentYear + 1] as $yr) {
            foreach ($birthdaySources as $u) {
                $bd = $u->birth_date ?? null;
                if (! $bd) {
                    continue;
                }
                $bdCarbon = Carbon::parse($bd);
                $day = $bdCarbon->day;
                $month = $bdCarbon->month;
                if ($month === 2 && $day === 29 && ! Carbon::create($yr)->isLeapYear()) {
                    $day = 28;
                }
                try {
                    $dateStr = Carbon::create($yr, $month, $day)->toDateString();
                } catch (\Exception $e) {
                    continue;
                }
                $birthdays->push([
                    'user_id' => $u->id,
                    'name' => $u->name,
                    'avatar' => $u->avatar,
                    'date' => $dateStr,
                    'age' => $yr - $bdCarbon->year,
                    'is_me' => (bool) ($u->is_me ?? false),
                ]);
            }
        }

        return Inertia::render('Agenda', [
            'calendars' => $calendars,
            'holidays' => $holidays,
            'birthdays' => $birthdays->unique(fn ($b) => $b['user_id'].'-'.$b['date'])->values(),
            'teamMembers' => $teamMembers->map(fn (User $m) => [
                'id' => $m->id,
                'name' => $m->name,
                'avatar' => $m->avatar,
                'email' => $m->email,
            ])->values(),
            'network_count' => $networkUsers->count(),
            'stats' => [
                'today' => $todayEvents,
                'week' => $weekEvents,
                'pending' => $pendingEvents,
            ],
        ]);
    }
}
