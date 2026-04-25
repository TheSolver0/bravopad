<?php

namespace App\Http\Controllers;

use App\Models\Bravo;
use App\Models\BravoComment;
use App\Models\BravoLike;
use Illuminate\Http\Request;

class BravoInteractionController extends Controller
{
    /**
     * Toggle like/unlike — retourne le nouvel état
     */
    public function toggleLike(Request $request, Bravo $bravo)
    {
        $userId = $request->user()->id;

        $existing = BravoLike::where('bravo_id', $bravo->id)
            ->where('user_id', $userId)
            ->first();

        if ($existing) {
            $existing->delete();
            $bravo->decrement('likes_count');
            $liked = false;
        } else {
            BravoLike::create(['bravo_id' => $bravo->id, 'user_id' => $userId]);
            $bravo->increment('likes_count');
            $liked = true;
        }

        return response()->json([
            'liked'       => $liked,
            'likes_count' => $bravo->fresh()->likes_count,
        ]);
    }

    /**
     * Liste des commentaires d'un Bravo
     */
    public function comments(Bravo $bravo)
    {
        $comments = $bravo->comments()
            ->with('user:id,name,avatar')
            ->get()
            ->map(fn ($c) => [
                'id'         => $c->id,
                'content'    => $c->content,
                'created_at' => $c->created_at->diffForHumans(),
                'user'       => $c->user ? [
                    'id'     => $c->user->id,
                    'name'   => $c->user->name,
                    'avatar' => $c->user->avatar,
                ] : null,
            ]);

        return response()->json($comments);
    }

    /**
     * Ajouter un commentaire
     */
    public function addComment(Request $request, Bravo $bravo)
    {
        $validated = $request->validate([
            'content' => 'required|string|min:1|max:500',
        ]);

        $comment = BravoComment::create([
            'bravo_id' => $bravo->id,
            'user_id'  => $request->user()->id,
            'content'  => $validated['content'],
        ]);

        $comment->load('user:id,name,avatar');

        return response()->json([
            'id'         => $comment->id,
            'content'    => $comment->content,
            'created_at' => $comment->created_at->diffForHumans(),
            'user'       => $comment->user ? [
                'id'     => $comment->user->id,
                'name'   => $comment->user->name,
                'avatar' => $comment->user->avatar,
            ] : null,
        ], 201);
    }

    /**
     * Supprimer un commentaire (auteur ou admin/RH)
     */
    public function deleteComment(Request $request, Bravo $bravo, BravoComment $comment)
    {
        $user = $request->user();

        $canDelete = $comment->user_id === $user->id || $user->isAdmin() || $user->isHr();

        if (! $canDelete) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $comment->delete(); // soft delete

        return response()->json(['message' => 'Commentaire supprimé.']);
    }
}
