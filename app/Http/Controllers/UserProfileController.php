<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserProfileController extends Controller
{
    public function show(User $user)
    {
        $authUser = auth()->user();

        $user->load(['department:id,name', 'direction:id,name,code']);

        $receivedBravos = $user->receivedBravos()
            ->with(['sender:id,name,avatar,role', 'values:id,name,color'])
            ->where('status', 'published')
            ->latest()
            ->take(30)
            ->get();

        $posts = Post::where('user_id', $user->id)
            ->with(['media'])
            ->withCount(['likedBy as likes_count', 'comments as comments_count'])
            ->latest()
            ->take(20)
            ->get();

        $earnedBadges = $user->badges()
            ->wherePivotNotNull('awarded_at')
            ->get();

        $authFollowingIds = $authUser ? $authUser->following()->pluck('users.id')->toArray() : [];

        $followers = $user->followers()->select(['users.id', 'users.name', 'users.avatar', 'users.role'])->get();
        $following = $user->following()->select(['users.id', 'users.name', 'users.avatar', 'users.role'])->get();

        $followerIds = $followers->pluck('id')->toArray();
        $followingIds = $following->pluck('id')->toArray();

        return Inertia::render('UserProfile', [
            'profileUser' => [
                'id'                   => $user->id,
                'name'                 => $user->name,
                'avatar'               => $user->avatar,
                'role'                 => $user->role,
                'department'           => $user->direction?->code ?? $user->direction?->name ?? $user->department?->name,
                'points_total'         => $user->points_total,
                'hired_at'             => $user->hired_at?->format('Y-m-d'),
                'followers_count'      => count($followerIds),
                'following_count'      => count($followingIds),
                'mutual_count'         => $authUser && $authUser->id !== $user->id
                                            ? count(array_intersect($followerIds, $authFollowingIds))
                                            : 0,
                'bravos_received_count' => $user->receivedBravos()->where('status', 'published')->count(),
                'bravos_sent_count'    => $user->sentBravos()->where('status', 'published')->count(),
                'is_following'         => $authUser && $authUser->id !== $user->id
                                            ? $authUser->isFollowing($user)
                                            : false,
                'is_connected'         => $authUser && $authUser->id !== $user->id
                                            ? ($authUser->isFollowing($user) && in_array($authUser->id, $followerIds))
                                            : false,
                'is_own_profile'       => $authUser && $authUser->id === $user->id,
            ],
            'receivedBravos' => $receivedBravos->map(fn ($b) => [
                'id'         => $b->id,
                'message'    => $b->message,
                'points'     => $b->points,
                'badge'      => $b->badge,
                'created_at' => $b->created_at->toISOString(),
                'sender'     => $b->sender ? [
                    'id'     => $b->sender->id,
                    'name'   => $b->sender->name,
                    'avatar' => $b->sender->avatar,
                    'role'   => $b->sender->role,
                ] : null,
                'values' => $b->values->map(fn ($v) => [
                    'id'    => $v->id,
                    'name'  => $v->name,
                    'color' => $v->color,
                ]),
            ]),
            'posts' => $posts->map(fn ($p) => [
                'id'             => $p->id,
                'content'        => $p->content,
                'type'           => $p->type,
                'media'          => $p->media->map(fn ($m) => [
                    'id'   => $m->id,
                    'url'  => $m->url,
                    'type' => $m->type,
                ]),
                'likes_count'    => $p->likes_count,
                'comments_count' => $p->comments_count,
                'created_at'     => $p->created_at->toISOString(),
            ]),
            'earnedBadges' => $earnedBadges->map(fn ($b) => [
                'id'          => $b->id,
                'name'        => $b->name,
                'slug'        => $b->slug,
                'description' => $b->description,
                'rarity'      => $b->rarity,
                'awarded_at'  => $b->pivot->awarded_at,
            ]),
            'followers' => $followers->map(fn ($f) => [
                'id'           => $f->id,
                'name'         => $f->name,
                'avatar'       => $f->avatar,
                'role'         => $f->role,
                'is_following' => in_array($f->id, $authFollowingIds),
                'is_me'        => $authUser && $authUser->id === $f->id,
            ]),
            'following' => $following->map(fn ($f) => [
                'id'           => $f->id,
                'name'         => $f->name,
                'avatar'       => $f->avatar,
                'role'         => $f->role,
                'is_following' => in_array($f->id, $authFollowingIds),
                'is_me'        => $authUser && $authUser->id === $f->id,
            ]),
        ]);
    }

    public function follow(Request $request, User $user)
    {
        $authUser = $request->user();

        if ($authUser->id === $user->id) {
            return back();
        }

        if ($authUser->isFollowing($user)) {
            $authUser->following()->detach($user->id);
        } else {
            $authUser->following()->attach($user->id);
        }

        return back();
    }
}
