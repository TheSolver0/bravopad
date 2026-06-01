<?php

namespace App\Http\Controllers;

use App\Models\ClubPadRegistration;
use App\Models\Direction;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClubPadRegistrationController extends Controller
{
    public function show()
    {
        $directions = Direction::orderBy('name')->get(['id', 'name', 'code']);

        return Inertia::render('ClubPadInscription', [
            'directions' => $directions,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom'          => ['required', 'string', 'max:255'],
            'matricule'    => ['required', 'string', 'max:50', 'unique:club_pad_registrations,matricule'],
            'sexe'         => ['required', 'in:M,F'],
            'direction_id' => ['required', 'exists:directions,id'],
            'participera'  => ['required', 'boolean'],
        ], [
            'nom.required'          => 'Le nom est obligatoire.',
            'matricule.required'    => 'Le matricule est obligatoire.',
            'matricule.unique'      => 'Ce matricule est déjà inscrit.',
            'sexe.required'         => 'Le sexe est obligatoire.',
            'direction_id.required' => 'La direction est obligatoire.',
            'direction_id.exists'   => 'Direction invalide.',
            'participera.required'  => 'Veuillez indiquer votre participation.',
        ]);

        $validated['ip_address'] = $request->ip();

        ClubPadRegistration::create($validated);

        return back()->with('success', 'Inscription enregistrée avec succès !');
    }

    public function index()
    {
        $registrations = ClubPadRegistration::with('direction:id,name,code')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($r) => [
                'id'          => $r->id,
                'nom'         => $r->nom,
                'matricule'   => $r->matricule,
                'sexe'        => $r->sexe,
                'direction'   => $r->direction?->code ?? $r->direction?->name,
                'participera' => $r->participera,
                'created_at'  => $r->created_at?->format('d/m/Y H:i'),
            ]);

        $stats = [
            'total'       => $registrations->count(),
            'participants' => $registrations->where('participera', true)->count(),
            'absents'     => $registrations->where('participera', false)->count(),
            'hommes'      => $registrations->where('sexe', 'M')->count(),
            'femmes'      => $registrations->where('sexe', 'F')->count(),
            'par_direction' => $registrations
                ->groupBy('direction')
                ->map(fn ($g) => $g->count())
                ->sortDesc()
                ->toArray(),
        ];

        return Inertia::render('ClubPadParticipants', [
            'registrations' => $registrations,
            'stats'         => $stats,
        ]);
    }
}
