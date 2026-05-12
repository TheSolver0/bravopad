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

class PostController extends Controller
{
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
            'content'   => 'required|string|max:5000',
            'type'      => 'in:post,announcement',
            'media_url' => 'nullable|url|max:2048',
        ]);

        $user = Auth::user();

        // Seuls admins/RH peuvent créer des annonces
        if (($data['type'] ?? 'post') === 'announcement' && ! in_array($user->permission, ['admin', 'manager'])) {
            abort(403);
        }

        Post::create([
            'user_id'   => $user->id,
            'content'   => $data['content'],
            'type'      => $data['type'] ?? 'post',
            'media_url' => $data['media_url'] ?? null,
        ]);

        return back();
    }

    public function update(Request $request, Post $post)
    {
        $this->authorize('update', $post);

        $data = $request->validate([
            'content'   => 'required|string|max:5000',
            'media_url' => 'nullable|url|max:2048',
        ]);

        $post->update($data);

        return back();
    }

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
