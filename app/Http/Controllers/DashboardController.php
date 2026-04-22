<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Bravo;
use App\Models\BravoValue;
use App\Models\Challenge;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $users = User::orderByDesc('points_total')->get();

        $bravos = Bravo::with(['sender', 'receiver', 'values'])
            ->latest()
            ->get();

        $activeChallenge = Challenge::first();

        $currentUser = Auth::user();

        return Inertia::render('dashboard', [
            'users' => $users,
            'bravos' => $bravos,
            'activeChallenge' => $activeChallenge,
            'currentUser' => array_merge($currentUser->toArray(), [
                'monthly_points_remaining' => $currentUser->monthly_points_remaining,
                'monthly_points_allowance' => $currentUser->monthly_points_allowance ?? 100,
            ]),
            'bravoValues' => BravoValue::where('is_active', true)->get(),
        ]);
    }
}