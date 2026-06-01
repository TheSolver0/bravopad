<?php

namespace App\Http\Controllers;

use App\Models\Direction;
use App\Models\Evenement;
use App\Models\EvenementPost;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdminEvenementController extends Controller
{
    public function index()
    {
        $evenements = Evenement::withCount('inscriptions')
            ->orderByDesc('date')
            ->get()
            ->map(fn ($e) => [
                'id'                  => $e->id,
                'nom'                 => $e->nom,
                'slug'                => $e->slug,
                'date'                => $e->date?->format('d/m/Y'),
                'lieu'                => $e->lieu,
                'statut'              => $e->statut,
                'cover_image'         => $e->cover_image,
                'inscriptions_count'  => $e->inscriptions_count,
            ]);

        return Inertia::render('AdminEvenements', [
            'evenements' => $evenements,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom'         => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'date'        => ['required', 'date'],
            'heure_debut' => ['nullable', 'date_format:H:i'],
            'heure_fin'   => ['nullable', 'date_format:H:i'],
            'lieu'        => ['nullable', 'string', 'max:255'],
            'cover_image'        => ['nullable', 'string', 'max:500'],
            'programme'          => ['nullable', 'array'],
            'programme.*'        => ['string', 'max:255'],
            'activites_options'  => ['nullable', 'array'],
            'activites_options.*' => ['string', 'max:255'],
            'statut'             => ['required', 'in:brouillon,ouvert,ferme,termine'],
        ]);

        $validated['slug'] = Str::slug($validated['nom'] . '-' . now()->format('Y'));

        // Garantit l'unicité du slug
        $base = $validated['slug'];
        $i = 1;
        while (Evenement::where('slug', $validated['slug'])->exists()) {
            $validated['slug'] = "{$base}-{$i}";
            $i++;
        }

        $evenement = Evenement::create($validated);

        return redirect()->route('admin.evenements.dashboard', $evenement->id)
            ->with('success', 'Événement créé avec succès.');
    }

    public function update(Request $request, Evenement $evenement)
    {
        $validated = $request->validate([
            'nom'         => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'date'        => ['required', 'date'],
            'heure_debut' => ['nullable', 'date_format:H:i'],
            'heure_fin'   => ['nullable', 'date_format:H:i'],
            'lieu'        => ['nullable', 'string', 'max:255'],
            'cover_image'         => ['nullable', 'string', 'max:500'],
            'programme'           => ['nullable', 'array'],
            'programme.*'         => ['string', 'max:255'],
            'activites_options'   => ['nullable', 'array'],
            'activites_options.*' => ['string', 'max:255'],
            'statut'              => ['required', 'in:brouillon,ouvert,ferme,termine'],
        ]);

        $evenement->update($validated);

        return back()->with('success', 'Événement mis à jour.');
    }

    public function destroy(Evenement $evenement)
    {
        $evenement->delete();

        return redirect()->route('admin.evenements.index')
            ->with('success', 'Événement supprimé.');
    }

    public function dashboard(Evenement $evenement)
    {
        $inscriptions = $evenement->inscriptions()
            ->with('direction:id,name,code')
            ->orderByDesc('created_at')
            ->get();

        // Tendances : regroupement par jour
        $parJour = $inscriptions
            ->groupBy(fn ($i) => $i->created_at->format('Y-m-d'))
            ->map(fn ($g, $date) => [
                'date'         => $date,
                'total'        => $g->count(),
                'participants' => $g->where('participera', true)->count(),
                'absents'      => $g->where('participera', false)->count(),
            ])
            ->values()
            ->sortBy('date')
            ->values();

        // Cumulatif d'inscriptions
        $cumul = 0;
        $tendanceCumul = $parJour->map(function ($row) use (&$cumul) {
            $cumul += $row['total'];
            return array_merge($row, ['cumul' => $cumul]);
        });

        // Stats globales
        $stats = [
            'total'        => $inscriptions->count(),
            'participants' => $inscriptions->where('participera', true)->count(),
            'absents'      => $inscriptions->where('participera', false)->count(),
            'hommes'       => $inscriptions->where('sexe', 'M')->count(),
            'femmes'       => $inscriptions->where('sexe', 'F')->count(),
            'par_direction' => $inscriptions
                ->groupBy(fn ($i) => $i->direction?->code ?? $i->direction?->name ?? '—')
                ->map(fn ($g) => [
                    'total'        => $g->count(),
                    'participants' => $g->where('participera', true)->count(),
                ])
                ->sortByDesc(fn ($v) => $v['total'])
                ->values()
                ->map(fn ($v, $k) => array_merge(['direction' => array_keys($inscriptions
                    ->groupBy(fn ($i) => $i->direction?->code ?? $i->direction?->name ?? '—')
                    ->sortByDesc('count')
                    ->toArray())[$k] ?? '—'], $v))
                ->values(),
        ];

        // Rebuild par_direction properly
        $parDirection = $inscriptions
            ->groupBy(fn ($i) => $i->direction?->code ?? $i->direction?->name ?? '—')
            ->map(fn ($g, $dir) => [
                'direction'    => $dir,
                'total'        => $g->count(),
                'participants' => $g->where('participera', true)->count(),
                'absents'      => $g->where('participera', false)->count(),
            ])
            ->values()
            ->sortByDesc('total')
            ->values();

        $stats['par_direction'] = $parDirection;

        $posts = $evenement->posts()
            ->with('auteur:id,name,avatar')
            ->get()
            ->map(fn ($p) => [
                'id'           => $p->id,
                'titre'        => $p->titre,
                'contenu'      => $p->contenu,
                'image_url'    => $p->image_url,
                'auteur'       => $p->auteur?->name,
                'published_at' => $p->published_at?->format('d/m/Y H:i'),
            ]);

        return Inertia::render('AdminEvenementDashboard', [
            'evenement' => [
                'id'          => $evenement->id,
                'nom'         => $evenement->nom,
                'slug'        => $evenement->slug,
                'date'        => $evenement->date?->format('d/m/Y'),
                'heure_debut' => $evenement->heure_debut ? substr($evenement->heure_debut, 0, 5) : null,
                'heure_fin'   => $evenement->heure_fin ? substr($evenement->heure_fin, 0, 5) : null,
                'lieu'        => $evenement->lieu,
                'statut'      => $evenement->statut,
                'description' => $evenement->description,
                'programme'   => $evenement->programme ?? [],
                'cover_image' => $evenement->cover_image,
            ],
            'stats'           => $stats,
            'tendances'       => $tendanceCumul,
            'inscriptions'    => $inscriptions->map(fn ($i) => [
                'id'          => $i->id,
                'nom'         => $i->nom,
                'matricule'   => $i->matricule,
                'sexe'        => $i->sexe,
                'direction'   => $i->direction?->code ?? $i->direction?->name ?? '—',
                'participera' => $i->participera,
                'created_at'  => $i->created_at?->format('d/m/Y H:i'),
            ]),
            'posts' => $posts,
        ]);
    }

    // ── Blog ─────────────────────────────────────────────────────────────────

    public function storePost(Request $request, Evenement $evenement)
    {
        $validated = $request->validate([
            'titre'     => ['required', 'string', 'max:255'],
            'contenu'   => ['required', 'string'],
            'image_url' => ['nullable', 'string', 'max:500'],
        ]);

        $evenement->posts()->create([
            ...$validated,
            'auteur_id'    => auth()->id(),
            'published_at' => now(),
        ]);

        return back()->with('success', 'Article publié.');
    }

    public function destroyPost(Evenement $evenement, EvenementPost $post)
    {
        abort_unless($post->evenement_id === $evenement->id, 404);
        $post->delete();

        return back()->with('success', 'Article supprimé.');
    }

    // ── Statut rapide ─────────────────────────────────────────────────────────

    public function updateStatut(Request $request, Evenement $evenement)
    {
        $request->validate(['statut' => ['required', 'in:brouillon,ouvert,ferme,termine']]);
        $evenement->update(['statut' => $request->statut]);

        return back()->with('success', 'Statut mis à jour.');
    }
}
