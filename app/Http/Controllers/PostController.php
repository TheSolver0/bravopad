<?php

namespace App\Http\Controllers;

use App\Models\Bravo;
use App\Models\BravoValue;
use App\Models\Challenge;
use App\Models\Post;
use App\Models\PostComment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\PostMedia;
use Illuminate\Support\Facades\Storage;

class PostController extends Controller
{
    private const MAX_FILE_SIZE_KB = 51200;
 
    // Nombre max de fichiers par post
    private const MAX_FILES = 10;

    public function index()
    {
        $currentUser = Auth::user();

        $posts = Post::with(['user', 'comments.user'])
            ->withCount('likedBy')
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($post) => array_merge($post->toArray(), [
                'user_has_liked' => $post->likedBy->contains('id', $currentUser->id),
                'likes_count'    => $post->liked_by_count,
                // 'media'          => $this->media,
                'comments'       => $post->comments->map(fn ($c) => [
                    'id'         => $c->id,
                    'content'    => $c->content,
                    'created_at' => $c->created_at->diffForHumans(),
                    'user'       => [
                        'id'     => $c->user->id,
                        'name'   => $c->user->name,
                        'avatar' => $c->user->avatar,
                    ],
                ])->values()->toArray(),
            ]));

            

        $users = User::query()
            ->where('is_automation', false)
            ->orderByDesc('points_total')
            ->get(['id', 'name', 'avatar', 'role', 'points_total']);

        $activeChallenge = Challenge::where('status', 'active')
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->first();

        return Inertia::render('Feed', [
            'posts'           => $posts,
            'currentUser'     => array_merge($currentUser->toArray(), [
                'monthly_points_remaining' => $currentUser->monthly_points_remaining,
                'monthly_points_allowance' => $currentUser->monthly_points_allowance ?? 100,
            ]),
            'users'           => $users,
            'activeChallenge' => $activeChallenge,
            'bravoCount'      => Bravo::count(),
            'bravoValues'     => BravoValue::where('is_active', true)->get(),
        ]);
    }

     public function store(Request $request)
    {
        $data = $request->validate([
            'content'    => 'nullable|string|max:5000',
            'type'       => 'in:post,announcement',
            'media_url'  => 'nullable|url|max:2048',
            // Upload multiple : jusqu'à 10 fichiers image/vidéo
            'media'      => 'nullable|array|max:' . self::MAX_FILES,
            'media.*'    => [
                'file',
                'mimes:jpg,jpeg,png,gif,webp,mp4,mov,avi,webm',
                'max:' . self::MAX_FILE_SIZE_KB,
            ],
        ]);
 
        // Au moins du contenu texte OU des fichiers
        if (empty(trim($data['content'] ?? '')) && empty($request->file('media'))) {
            return back()->withErrors(['content' => 'Le post doit contenir du texte ou des médias.']);
        }
 
        $user = Auth::user();
 
        // Seuls admins/managers peuvent créer des annonces
        if (($data['type'] ?? 'post') === 'announcement'
            && ! in_array($user->permission, ['admin', 'manager'])) {
            abort(403);
        }
 
        // Créer le post
        $post = Post::create([
            'user_id'   => $user->id,
            'content'   => $data['content'] ?? '',
            'type'      => $data['type'] ?? 'post',
            'media_url' => $data['media_url'] ?? null,
        ]);
 
        // Uploader les fichiers si présents
        if ($request->hasFile('media')) {
            $this->attachMedia($post, $request->file('media'));
        }
 
        return back();
    }
 
    public function update(Request $request, Post $post)
    {
        $this->authorize('update', $post);
 
        $data = $request->validate([
            'content'    => 'nullable|string|max:5000',
            'media'      => 'nullable|array|max:' . self::MAX_FILES,
            'media.*'    => [
                'file',
                'mimes:jpg,jpeg,png,gif,webp,mp4,mov,avi,webm',
                'max:' . self::MAX_FILE_SIZE_KB,
            ],
            'remove_media' => 'nullable|array',
            'remove_media.*' => 'integer|exists:post_media,id',
        ]);
 
        $post->update(['content' => $data['content'] ?? $post->content]);
 
        // Supprimer les médias cochés
        if (! empty($data['remove_media'])) {
            $toDelete = $post->media()->whereIn('id', $data['remove_media'])->get();
            foreach ($toDelete as $m) {
                Storage::disk('public')->delete($m->path);
                $m->delete();
            }
        }
 
        // Ajouter de nouveaux fichiers
        if ($request->hasFile('media')) {
            $this->attachMedia($post, $request->file('media'));
        }
 
        return back();
    }
 
    // public function destroy(Post $post)
    // {
    //     $this->authorize('delete', $post);
 
    //     // Supprimer les fichiers physiques
    //     foreach ($post->media as $m) {
    //         Storage::disk('public')->delete($m->path);
    //     }
 
    //     $post->delete();
 
    //     return back();
    // }
 
    // ---------------------------------------------------------------
    //  Helpers
    // ---------------------------------------------------------------
 
    /**
     * Sauvegarde les fichiers uploadés et crée les enregistrements PostMedia.
     *
     * @param  Post                                        $post
     * @param  \Illuminate\Http\UploadedFile[]             $files
     */
    private function attachMedia(Post $post, array $files): void
    {
        $order = $post->media()->max('order') ?? -1;
 
        foreach ($files as $file) {
            $order++;
            $mime = $file->getMimeType();
            $type = str_starts_with($mime, 'video/') ? 'video' : 'image';
 
            // Stocker dans storage/app/public/posts/media/
            $path = $file->store('posts/media', 'public');
            $url  = Storage::disk('public')->url($path);
 
            PostMedia::create([
                'post_id'   => $post->id,
                'path'      => $path,
                'url'       => $url,
                'mime_type' => $mime,
                'type'      => $type,
                'size'      => $file->getSize(),
                'order'     => $order,
            ]);
        }
    }


    // public function update(Request $request, Post $post)
    // {
    //     $this->authorize('update', $post);

    //     $data = $request->validate([
    //         'content'   => 'required|string|max:5000',
    //         'media_url' => 'nullable|url|max:2048',
    //     ]);

    //     $post->update($data);

    //     return back();
    // }

    public function destroy(Post $post)
    {
        $user = Auth::user();

        if ($post->user_id !== $user->id && ! in_array($user->permission, ['admin', 'manager'])) {
            abort(403);
        }

        $post->delete();

        return back();
    }

    public function like(Post $post)
    {
        $user = Auth::user();

        $existing = $post->likedBy()->where('user_id', $user->id)->exists();

        if ($existing) {
            $post->likedBy()->detach($user->id);
            $post->decrement('likes_count');
        } else {
            $post->likedBy()->attach($user->id);
            $post->increment('likes_count');
        }

        return response()->json([
            'likes_count'    => $post->fresh()->likes_count,
            'user_has_liked' => ! $existing,
        ]);
    }

    // ── Commentaires ────────────────────────────────────────────────────────────

    public function storeComment(Request $request, Post $post)
    {
        $data = $request->validate(['content' => 'required|string|max:1000']);

        $comment = PostComment::create([
            'post_id' => $post->id,
            'user_id' => Auth::id(),
            'content' => $data['content'],
        ]);

        $post->increment('comments_count');

        $comment->load('user');

        return response()->json([
            'id'         => $comment->id,
            'content'    => $comment->content,
            'created_at' => $comment->created_at->diffForHumans(),
            'user'       => [
                'id'     => $comment->user->id,
                'name'   => $comment->user->name,
                'avatar' => $comment->user->avatar,
            ],
        ]);
    }

    public function destroyComment(Post $post, PostComment $comment)
    {
        $user = Auth::user();

        if ($comment->user_id !== $user->id && ! in_array($user->permission, ['admin', 'manager'])) {
            abort(403);
        }

        $comment->delete();
        $post->decrement('comments_count');

        return response()->json(['ok' => true]);
    }
}
