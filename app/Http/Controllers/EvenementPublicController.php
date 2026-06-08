<?php

namespace App\Http\Controllers;

use App\Models\Direction;
use App\Models\Evenement;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
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
                'video_url'        => $evenement->slug === 'festival-nutrisante-bien-etre-2026'
                    ? '/assets/videos/video_festnutrisante.mp4'
                    : null,
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

    /** Returns a 1200×630 landscape-cropped OG image for social previews. */
    public function ogImage(string $slug): Response
    {
        $evenement = Evenement::where('slug', $slug)->firstOrFail();

        $cacheKey = 'og_' . $slug . '_' . md5($evenement->cover_image ?? '');
        $cachePath = storage_path('app/og-cache/' . $cacheKey . '.jpg');

        if (! file_exists($cachePath)) {
            $jpeg = $this->buildOgJpeg($evenement->cover_image);
            @mkdir(dirname($cachePath), 0755, true);
            file_put_contents($cachePath, $jpeg);
        }

        return response(file_get_contents($cachePath), 200, [
            'Content-Type'  => 'image/jpeg',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    private function buildOgJpeg(?string $coverImage): string
    {
        $ogW = 1200;
        $ogH = 630;

        // ── Resolve file path ────────────────────────────────────────────────
        $src = null;
        if ($coverImage) {
            if (filter_var($coverImage, FILTER_VALIDATE_URL)) {
                $tmp = tempnam(sys_get_temp_dir(), 'og_');
                file_put_contents($tmp, file_get_contents($coverImage));
                $src = $tmp;
            } elseif (str_starts_with($coverImage, '/')) {
                $src = public_path(ltrim($coverImage, '/'));
            } else {
                $src = storage_path('app/public/' . $coverImage);
            }
        }

        $canvas = imagecreatetruecolor($ogW, $ogH);
        $bg     = imagecolorallocate($canvas, 0, 29, 82); // PAD navy
        imagefill($canvas, 0, 0, $bg);

        if ($src && file_exists($src)) {
            $info = @getimagesize($src);
            $mime = $info['mime'] ?? '';
            $orig = match ($mime) {
                'image/jpeg' => @imagecreatefromjpeg($src),
                'image/png'  => @imagecreatefrompng($src),
                'image/webp' => @imagecreatefromwebp($src),
                default      => false,
            };

            if ($orig) {
                $srcW = imagesx($orig);
                $srcH = imagesy($orig);

                // Center-crop to target ratio (cover, not letterbox)
                $srcRatio = $srcW / $srcH;
                $dstRatio = $ogW / $ogH;

                if ($srcRatio > $dstRatio) {
                    // Source is wider — crop sides
                    $cropH = $srcH;
                    $cropW = (int) round($srcH * $dstRatio);
                    $cropX = (int) round(($srcW - $cropW) / 2);
                    $cropY = 0;
                } else {
                    // Source is taller — show top of poster (title/logo area)
                    $cropW = $srcW;
                    $cropH = (int) round($srcW / $dstRatio);
                    $cropX = 0;
                    $cropY = 0;
                }

                imagecopyresampled($canvas, $orig, 0, 0, $cropX, $cropY, $ogW, $ogH, $cropW, $cropH);
                imagedestroy($orig);
            }
        }

        ob_start();
        imagejpeg($canvas, null, 92);
        $jpeg = ob_get_clean();
        imagedestroy($canvas);

        return $jpeg;
    }
}
