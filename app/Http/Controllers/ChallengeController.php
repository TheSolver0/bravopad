<?php

namespace App\Http\Controllers;

use App\Models\Challenge;
use App\Models\ChallengeMedia;
use App\Models\Department;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ChallengeController extends Controller
{
    private function resolveCoverImage(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        // External URL
        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }

        // Local public assets (ex: /assets/images/challenges/olympiade.jpg)
        if (str_starts_with($value, '/')) {
            return $value;
        }

        // Local assets without leading slash
        if (str_starts_with($value, 'assets/')) {
            return '/' . $value;
        }

        // Stored file path in public disk
        return asset('storage/' . $value);
    }

    private function resolveMediaUrl(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }

        if (str_starts_with($value, '/')) {
            return $value;
        }

        if (str_starts_with($value, 'assets/')) {
            return '/' . $value;
        }

        return asset('storage/' . $value);
    }

    private function isStoragePath(?string $value): bool
    {
        if (! $value) {
            return false;
        }

        // Anything that looks like /assets/... should not be deleted from Storage disk.
        if (str_starts_with($value, '/') || str_starts_with($value, 'assets/')) {
            return false;
        }

        // For now, only treat non-url, non-asset paths as storage paths.
        return ! filter_var($value, FILTER_VALIDATE_URL);
    }

    public function page(Request $request)
    {
        $userId = $request->user()?->id;

        $challenges = Challenge::withCount(['bravos', 'participants'])
            ->with(['participants' => function ($q) use ($userId) {
                $q->where('users.id', $userId);
            }])
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
            ->orderBy('end_date')
            ->get()
            ->map(function ($challenge) {
                return [
                    'id'                 => $challenge->id,
                    'name'               => $challenge->name,
                    'description'        => $challenge->description,
                    'cover_image'        => $this->resolveCoverImage($challenge->cover_image),
                    'category'           => $challenge->category ?? 'autre',
                    'start_date'         => $challenge->start_date,
                    'end_date'           => $challenge->end_date,
                    'points_bonus'       => $challenge->points_bonus,
                    'status'             => $challenge->status,
                    'for_all'            => (bool) $challenge->for_all,
                    'bravos_count'       => $challenge->bravos_count,
                    'participants_count' => $challenge->participants_count,
                    'is_participating'   => $challenge->participants->isNotEmpty(),
                    'days_left'          => max(0, (int) now()->diffInDays($challenge->end_date, false)),
                ];
            });

        $user = $request->user();
        $user?->loadMissing('department');

        return Inertia::render('Challenges', [
            'challenges'  => $challenges,
            'currentUser' => $user ? [
                'id'         => $user->id,
                'name'       => $user->name,
                'avatar'     => $user->avatar,
                'role'       => $user->role,
                'permission' => $user->permission ?? 'employee',
                'department' => $user->department?->name ?? null,
                'points_total' => $user->points_total,
            ] : null,
        ]);
    }

    public function participate(Request $request, $id)
    {
        $challenge = Challenge::where('status', 'active')->findOrFail($id);
        $user = $request->user();

        $already = $challenge->participants()->where('users.id', $user->id)->exists();

        if ($already) {
            $challenge->participants()->detach($user->id);
            $participating = false;
        } else {
            $challenge->participants()->attach($user->id);
            $participating = true;
        }

        return back()->with([
            'participating' => $participating,
            'challenge_id'  => $challenge->id,
        ]);
    }

    public function index()
    {
        return response()->json(
            Challenge::withCount('bravos')->latest()->paginate(20)
        );
    }

    /**
     * Page d'administration — liste tous les challenges avec options CRUD
     */
    public function adminPage(Request $request)
    {
        $this->authorize('create', Challenge::class);

        $challenges = Challenge::withCount(['bravos', 'participants'])
            ->with(['creator:id,name', 'division:id,name'])
            ->latest()
            ->get()
            ->map(function ($challenge) {
                return [
                    'id'                 => $challenge->id,
                    'name'               => $challenge->name,
                    'description'        => $challenge->description,
                    'cover_image'        => $this->resolveCoverImage($challenge->cover_image),
                    'category'           => $challenge->category ?? 'autre',
                    'start_date'         => $challenge->start_date,
                    'end_date'           => $challenge->end_date,
                    'points_bonus'       => $challenge->points_bonus,
                    'status'             => $challenge->status,
                    'for_all'            => (bool) $challenge->for_all,
                    'division_id'        => $challenge->division_id,
                    'division_name'      => $challenge->division?->name,
                    'bravos_count'       => $challenge->bravos_count,
                    'participants_count' => $challenge->participants_count,
                    'created_by_name'    => $challenge->creator?->name,
                    'days_left'          => max(0, (int) now()->diffInDays($challenge->end_date, false)),
                    'created_at'         => $challenge->created_at->format('d/m/Y'),
                ];
            });

        $departments = Department::orderBy('name')->select('id', 'name')->get();

        return Inertia::render('AdminChallenges', [
            'challenges'  => $challenges,
            'departments' => $departments,
        ]);
    }

    /**
     * Créer un challenge — RH/Admin uniquement (page publique Challenges)
     */
    public function store(Request $request)
    {
        $this->authorize('create', Challenge::class);

        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string',
            'cover_image'  => 'nullable|image|max:5120',
            'category'     => 'nullable|string|in:sport,accueil,creativite,bien_etre,cohesion,autre',
            'start_date'   => 'required|date',
            'end_date'     => 'required|date|after_or_equal:start_date',
            'points_bonus' => 'nullable|integer|min:0',
            'for_all'      => 'boolean',
        ]);

        $coverPath = null;
        if ($request->hasFile('cover_image')) {
            $coverPath = $request->file('cover_image')->store('challenges/covers', 'public');
        }

        $challenge = Challenge::create([
            'name'         => $validated['name'],
            'description'  => $validated['description'] ?? null,
            'cover_image'  => $coverPath,
            'category'     => $validated['category'] ?? 'autre',
            'start_date'   => $validated['start_date'],
            'end_date'     => $validated['end_date'],
            'points_bonus' => $validated['points_bonus'] ?? 0,
            'for_all'      => $validated['for_all'] ?? true,
            'status'       => 'active',
            'created_by'   => $request->user()->id,
        ]);

        AuditLogger::log(
            'challenge_created',
            [
                'name'         => $challenge->name,
                'category'     => $challenge->category,
                'start_date'   => $challenge->start_date,
                'end_date'     => $challenge->end_date,
                'points_bonus' => $challenge->points_bonus,
            ],
            $request->user(),
            Challenge::class,
            $challenge->id,
            'info',
            'Creation d un challenge.',
        );

        return redirect()->back();
    }

    /**
     * Créer un challenge via page admin (Inertia redirect)
     */
    public function adminStore(Request $request)
    {
        $this->authorize('create', Challenge::class);

        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string',
            'cover_image'  => 'nullable',
            'category'     => 'nullable|string|in:sport,accueil,creativite,bien_etre,cohesion,autre',
            'start_date'   => 'required|date',
            'end_date'     => 'required|date|after_or_equal:start_date',
            'points_bonus' => 'nullable|integer|min:0',
            'for_all'      => 'boolean',
            'division_id'  => 'nullable|exists:departments,id',
        ]);

        $coverPath = null;
        if ($request->hasFile('cover_image')) {
            $coverPath = $request->file('cover_image')->store('challenges/covers', 'public');
        } elseif ($request->input('cover_image') && filter_var($request->input('cover_image'), FILTER_VALIDATE_URL)) {
            // Download and store the image from URL
            $imageContent = file_get_contents($request->input('cover_image'));
            if ($imageContent !== false) {
                $extension = pathinfo(parse_url($request->input('cover_image'), PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'jpg';
                $filename = 'challenges/covers/' . uniqid() . '.' . $extension;
                Storage::disk('public')->put($filename, $imageContent);
                $coverPath = $filename;
            }
        }

        $forAll = $validated['for_all'] ?? true;

        $challenge = Challenge::create([
            'name'         => $validated['name'],
            'description'  => $validated['description'] ?? null,
            'cover_image'  => $coverPath,
            'category'     => $validated['category'] ?? 'autre',
            'start_date'   => $validated['start_date'],
            'end_date'     => $validated['end_date'],
            'points_bonus' => $validated['points_bonus'] ?? 0,
            'for_all'      => $forAll,
            'division_id'  => $forAll ? null : ($validated['division_id'] ?? null),
            'status'       => 'active',
            'created_by'   => $request->user()->id,
        ]);

        AuditLogger::log(
            'challenge_created',
            ['name' => $challenge->name, 'start_date' => $challenge->start_date, 'end_date' => $challenge->end_date],
            $request->user(),
            Challenge::class,
            $challenge->id,
            'info',
            'Creation d un challenge via admin.',
        );

        return redirect()->route('admin.challenges.index')->with('success', 'Défi créé avec succès.');
    }

    /**
     * Modifier un challenge — RH/Admin uniquement
     */
    public function update(Request $request, $id)
    {
        $challenge = Challenge::findOrFail($id);
        $this->authorize('update', $challenge);

        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string',
            'cover_image'  => 'nullable',
            'category'     => 'nullable|string|in:sport,accueil,creativite,bien_etre,cohesion,autre',
            'start_date'   => 'required|date',
            'end_date'     => 'required|date|after_or_equal:start_date',
            'points_bonus' => 'nullable|integer|min:0',
            'for_all'      => 'boolean',
            'division_id'  => 'nullable|exists:departments,id',
        ]);

        // Handle cover_image: file upload or URL
        if ($request->hasFile('cover_image')) {
            // File upload
            if ($challenge->cover_image) {
                Storage::disk('public')->delete($challenge->cover_image);
            }
            $validated['cover_image'] = $request->file('cover_image')->store('challenges/covers', 'public');
        } elseif ($request->input('cover_image') && filter_var($request->input('cover_image'), FILTER_VALIDATE_URL)) {
            // URL provided
            if ($challenge->cover_image) {
                Storage::disk('public')->delete($challenge->cover_image);
            }
            // Download and store the image from URL
            $imageContent = file_get_contents($request->input('cover_image'));
            if ($imageContent !== false) {
                $extension = pathinfo(parse_url($request->input('cover_image'), PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'jpg';
                $filename = 'challenges/covers/' . uniqid() . '.' . $extension;
                Storage::disk('public')->put($filename, $imageContent);
                $validated['cover_image'] = $filename;
            } else {
                // Invalid URL or unable to download
                unset($validated['cover_image']);
            }
        } else {
            unset($validated['cover_image']);
        }

        $forAll = $validated['for_all'] ?? $challenge->for_all;
        $validated['division_id'] = $forAll ? null : ($validated['division_id'] ?? null);

        $challenge->update($validated);

        AuditLogger::log(
            'challenge_updated',
            ['name' => $challenge->name],
            $request->user(),
            Challenge::class,
            $challenge->id,
            'info',
            'Modification d un challenge.',
        );

        return redirect()->route('admin.challenges.index')->with('success', 'Défi mis à jour.');
    }

    /**
     * Supprimer un challenge — Admin uniquement
     */
    public function destroy(Request $request, $id)
    {
        $challenge = Challenge::findOrFail($id);
        $this->authorize('delete', $challenge);

        if ($challenge->cover_image) {
            Storage::disk('public')->delete($challenge->cover_image);
        }

        AuditLogger::log(
            'challenge_deleted',
            ['name' => $challenge->name],
            $request->user(),
            Challenge::class,
            $challenge->id,
            'warning',
            'Suppression d un challenge.',
        );

        $challenge->delete();

        return redirect()->route('admin.challenges.index')->with('success', 'Défi supprimé.');
    }

    /**
     * Détail + stats d'un challenge (API)
     */
    public function show($id)
    {
        $challenge   = Challenge::with(['bravos.sender', 'bravos.receiver', 'bravos.values'])->findOrFail($id);
        $totalPoints = $challenge->bravos->sum('points');

        return response()->json([
            'challenge' => $challenge,
            'stats' => [
                'total_bravos'  => $challenge->bravos->count(),
                'total_points'  => $totalPoints,
            ]
        ]);
    }

    /**
     * Activer un challenge — RH/Admin uniquement
     */
    public function activate(Request $request, $id)
    {
        $challenge = Challenge::findOrFail($id);
        $this->authorize('activate', $challenge);

        $challenge->update(['status' => 'active']);

        AuditLogger::log(
            'challenge_activated',
            ['name' => $challenge->name],
            $request->user(),
            Challenge::class,
            $challenge->id,
            'info',
            'Activation d un challenge.',
        );

        return redirect()->route('admin.challenges.index')->with('success', 'Défi activé.');
    }

    /**
     * Terminer un challenge + calcul leaderboard — RH/Admin uniquement
     */
    public function finish(Request $request, $id)
    {
        return DB::transaction(function () use ($id, $request) {
            $challenge = Challenge::with('bravos.receiver')->findOrFail($id);
            $this->authorize('finish', $challenge);

            $challenge->update(['status' => 'finished']);

            AuditLogger::log(
                'challenge_finished',
                [
                    'name' => $challenge->name,
                    'total_entries' => $challenge->bravos->count(),
                ],
                $request->user(),
                Challenge::class,
                $challenge->id,
                'info',
                'Cloture d un challenge.',
            );

            return redirect()->route('admin.challenges.index')->with('success', 'Défi clôturé.');
        });
    }

    /**
     * Challenge actif en cours (API)
     */
    public function active()
    {
        $challenge = Challenge::where('status', 'active')
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->withCount('bravos')
            ->first();

        return response()->json($challenge);
    }

    /**
     * Retourne les médias d'un challenge (JSON — chargement lazy pour le blog)
     */
    public function getMedia($id)
    {
        $media = ChallengeMedia::where('challenge_id', $id)
            ->with('uploader:id,name')
            ->latest()
            ->get()
            ->map(fn ($m) => [
                'id'            => $m->id,
                'url'           => $this->resolveMediaUrl($m->file_path),
                'file_type'     => $m->file_type,
                'caption'       => $m->caption,
                'uploader_name' => $m->uploader->name,
                'created_at'    => $m->created_at->diffForHumans(),
            ]);

        return response()->json($media);
    }

    /**
     * Upload de photos/vidéos dans le blog d'un challenge — RH/Admin uniquement
     */
    public function uploadMedia(Request $request, $id)
    {
        $challenge = Challenge::findOrFail($id);
        $this->authorize('update', $challenge);

        $request->validate([
            'files'    => 'required|array|min:1',
            'files.*'  => 'required|file|max:102400|mimes:jpg,jpeg,png,gif,webp,mp4,mov,avi,webm',
            'caption'  => 'nullable|string|max:255',
        ]);

        $videoMimes = ['video/mp4', 'video/quicktime', 'video/avi', 'video/webm', 'video/x-msvideo'];

        foreach ($request->file('files', []) as $file) {
            $fileType = in_array($file->getMimeType(), $videoMimes) ? 'video' : 'image';
            $path = $file->store("challenges/{$id}/media", 'public');

            ChallengeMedia::create([
                'challenge_id' => $id,
                'uploaded_by'  => $request->user()->id,
                'file_path'    => $path,
                'file_type'    => $fileType,
                'caption'      => $request->caption,
            ]);
        }

        return back();
    }

    /**
     * Supprimer un média du blog — RH/Admin uniquement
     */
    public function deleteMedia(Request $request, $mediaId)
    {
        $media = ChallengeMedia::findOrFail($mediaId);
        $this->authorize('update', $media->challenge);

        if ($this->isStoragePath($media->file_path)) {
            Storage::disk('public')->delete($media->file_path);
        }
        $media->delete();

        return back();
    }
}
