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
            'currentUser' => $currentUser,
            'bravoValues' => BravoValue::where('is_active', true)->get(),
        ]);
    }
}