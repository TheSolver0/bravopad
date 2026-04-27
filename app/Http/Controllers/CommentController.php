<?php

namespace App\Http\Controllers;

use App\Models\Bravo;
use App\Models\BravoComment;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function store(Request $request, Bravo $bravo)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:500',
        ]);

        $comment = BravoComment::create([
            'bravo_id' => $bravo->id,
            'user_id'  => $request->user()->id,
            'content'  => $validated['content'],
        ]);

        $comment->load('user');

        return response()->json([
            'id'         => $comment->id,
            'content'    => $comment->content,
            'created_at' => $comment->created_at->diffForHumans(),
            'user' => [
                'id'     => $comment->user->id,
                'name'   => $comment->user->name,
                'avatar' => $comment->user->avatar,
            ],
        ], 201);
    }

    public function destroy(Request $request, Bravo $bravo, BravoComment $comment)
    {
        if ($comment->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            abort(403);
        }

        $comment->delete();

        return response()->json(['message' => 'Commentaire supprimé.']);
    }
}
