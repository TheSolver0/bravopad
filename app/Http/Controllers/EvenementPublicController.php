<?php

namespace App\Http\Controllers;

use App\Models\Direction;
use App\Models\Evenement;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EvenementPublicController extends Controller
{
    public function index()
    {
        $evenements = Evenement::whereIn('statut', ['ouvert', 'ferme', 'termine'])
            ->orderBy('date')
            ->withCount('inscriptions')
            ->get()
            ->map(fn ($e) => [
                'id'               => $e->id,
                'slug'             => $e->slug,
                'nom'              => $e->nom,
                'description'      => $e->description,
                'date'             => $e->date?->format('d/m/Y'),
                'heure_debut'      => $e->heure_debut ? substr($e->heure_debut, 0, 5) : null,
                'lieu'             => $e->lieu,
                'statut'           => $e->statut,
                'cover_image'      => $e->cover_image,
                'inscriptions_count' => $e->inscriptions_count,
            ]);

        return Inertia::render('Evenements', [
            'evenements' => $evenements,
        ]);
    }

    public function show(string $slug)
    {
        $evenement = Evenement::where('slug', $slug)->firstOrFail();

        if (! $evenement->isOuvert()) {
            return Inertia::render('EvenementFerme', [
                'evenement' => [
                    'nom'    => $evenement->nom,
                    'statut' => $evenement->statut,
                    'date'   => $evenement->date?->format('d/m/Y'),
                ],
            ]);
        }

        $directions = Direction::orderBy('name')->get(['id', 'name', 'code']);

        return Inertia::render('EvenementInscription', [
            'evenement'  => [
                'id'               => $evenement->id,
                'slug'             => $evenement->slug,
                'nom'              => $evenement->nom,
                'description'      => $evenement->description,
                'date'             => $evenement->date?->format('d/m/Y'),
                'date_iso'         => $evenement->date?->toDateString(),
                'heure_debut'      => $evenement->heure_debut ? substr($evenement->heure_debut, 0, 5) : null,
                'heure_fin'        => $evenement->heure_fin ? substr($evenement->heure_fin, 0, 5) : null,
                'lieu'             => $evenement->lieu,
                'cover_image'      => $evenement->cover_image,
                'programme'        => $evenement->programme ?? [],
                'activites_options' => $evenement->activites_options ?? [],
            ],
            'directions' => $directions,
        ]);
    }

    public function store(Request $request, string $slug)
    {
        $evenement = Evenement::where('slug', $slug)->firstOrFail();

        abort_unless($evenement->isOuvert(), 403, 'Les inscriptions sont fermées.');

        $validated = $request->validate([
            'nom'          => ['required', 'string', 'max:255'],
            'matricule'    => ['required', 'string', 'max:50', "unique:evenement_inscriptions,matricule,NULL,id,evenement_id,{$evenement->id}"],
            'sexe'         => ['required', 'in:M,F'],
            'direction_id' => ['required', 'exists:directions,id'],
            'participera'  => ['required', 'boolean'],
        ], [
            'nom.required'          => 'Le nom est obligatoire.',
            'matricule.required'    => 'Le matricule est obligatoire.',
            'matricule.unique'      => 'Ce matricule est déjà inscrit à cet événement.',
            'sexe.required'         => 'Le sexe est obligatoire.',
            'direction_id.required' => 'La direction est obligatoire.',
            'direction_id.exists'   => 'Direction invalide.',
            'participera.required'  => 'Veuillez indiquer votre participation.',
        ]);

        $activites = $request->input('activites', []);

        $evenement->inscriptions()->create([
            ...$validated,
            'activites'  => $activites ?: null,
            'ip_address' => $request->ip(),
        ]);

        return back()->with('success', 'Inscription enregistrée avec succès !');
    }
}
