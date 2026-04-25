<?php

namespace App\Http\Controllers;

use App\Models\Bravo;
use App\Models\BravoComment;
use App\Models\BravoLike;
use App\Services\Audit\AuditLogger;
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
            $action = 'bravo_unliked';
        } else {
            BravoLike::create(['bravo_id' => $bravo->id, 'user_id' => $userId]);
            $bravo->increment('likes_count');
            $liked = true;
            $action = 'bravo_liked';
        }

        AuditLogger::log(
            $action,
            [
                'bravo_id' => $bravo->id,
                'receiver_id' => $bravo->receiver_id,
                'likes_count' => (int) $bravo->fresh()->likes_count,
            ],
            $request->user(),
            Bravo::class,
            $bravo->id,
            'info',
            $liked ? 'Reaction positive sur un Bravo.' : 'Retrait de reaction sur un Bravo.',
        );

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

        AuditLogger::log(
            'bravo_comment_added',
            [
                'bravo_id' => $bravo->id,
                'receiver_id' => $bravo->receiver_id,
                'comment_id' => $comment->id,
            ],
            $request->user(),
            BravoComment::class,
            $comment->id,
            'info',
            'Commentaire ajoute sur un Bravo.',
        );

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

        AuditLogger::log(
            'bravo_comment_deleted',
            [
                'bravo_id' => $bravo->id,
                'comment_id' => $comment->id,
                'comment_author_id' => $comment->user_id,
            ],
            $user,
            BravoComment::class,
            $comment->id,
            'warning',
            'Commentaire supprime sur un Bravo.',
        );

        return response()->json(['message' => 'Commentaire supprimé.']);
    }
}
