<?php

namespace App\Http\Controllers;

use App\Models\Story;
use App\Models\StoryView;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class StoryController extends Controller
{
    private const MAX_MEDIA_KB = 51200; // 50 MB
    private const STORY_TTL_HOURS = 24;

    /** GET /stories — active stories grouped by user for the feed */
    public function index()
    {
        $currentUser = Auth::user();

        $stories = Story::active()
            ->with('user:id,name,avatar,role')
            ->withCount('views')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($s) => $this->formatStory($s, $currentUser->id));

        // Group: own stories first, then others ordered by unseen
        $own    = $stories->filter(fn ($s) => $s['user_id'] === $currentUser->id)->values();
        $others = $stories->filter(fn ($s) => $s['user_id'] !== $currentUser->id)
            ->sortBy('seen')   // unseen first
            ->values();

        return response()->json([
            'own'    => $own,
            'others' => $others,
        ]);
    }

    /** POST /stories */
    public function store(Request $request)
    {
        $type = $request->input('type', 'text');

        $rules = [
            'type' => 'required|in:text,image,video,audio',
        ];

        if ($type === 'text') {
            $rules['content']          = 'required|string|max:500';
            $rules['background_color'] = 'sometimes|string|max:20';
            $rules['font_style']       = 'sometimes|string|in:normal,bold,italic';
            $rules['text_align']       = 'sometimes|string|in:left,center,right';
        } else {
            $mimes = match ($type) {
                'image' => 'jpeg,jpg,png,gif,webp',
                'video' => 'mp4,mov,avi,webm',
                'audio' => 'mp3,wav,ogg,m4a,aac,webm',
                default => '',
            };
            $rules['media']   = "required|file|mimes:{$mimes}|max:" . self::MAX_MEDIA_KB;
            $rules['content'] = 'sometimes|string|max:200'; // optional caption
        }

        $validated = $request->validate($rules);

        $data = [
            'user_id'          => Auth::id(),
            'type'             => $type,
            'content'          => $validated['content'] ?? null,
            'background_color' => $validated['background_color'] ?? '#003d7a',
            'font_style'       => $validated['font_style'] ?? 'normal',
            'text_align'       => $validated['text_align'] ?? 'center',
            'expires_at'       => now()->addHours(self::STORY_TTL_HOURS),
        ];

        if ($request->hasFile('media')) {
            $file = $request->file('media');
            $path = $file->store('stories/media', 'public');
            $data['media_path'] = $path;
            $data['media_url']  = Storage::url($path);
        }

        $story = Story::create($data);
        $story->load('user:id,name,avatar,role');
        $story->loadCount('views');

        return response()->json($this->formatStory($story, Auth::id()), 201);
    }

    /** DELETE /stories/{story} */
    public function destroy(Story $story)
    {
        if ($story->user_id !== Auth::id()) {
            abort(403);
        }

        if ($story->media_path) {
            Storage::disk('public')->delete($story->media_path);
        }

        $story->delete();

        return response()->json(['ok' => true]);
    }

    /** POST /stories/{story}/view */
    public function markViewed(Story $story)
    {
        $userId = Auth::id();

        $created = StoryView::firstOrCreate(
            ['story_id' => $story->id, 'user_id' => $userId],
            ['viewed_at' => now()],
        );

        if ($created->wasRecentlyCreated) {
            $story->increment('views_count');
        }

        return response()->json(['views_count' => $story->fresh()->views_count]);
    }

    private function formatStory(Story $story, int $currentUserId): array
    {
        return [
            'id'               => $story->id,
            'user_id'          => $story->user_id,
            'type'             => $story->type,
            'content'          => $story->content,
            'media_url'        => $story->media_url,
            'background_color' => $story->background_color,
            'font_style'       => $story->font_style,
            'text_align'       => $story->text_align,
            'views_count'      => $story->views_count,
            'expires_at'       => $story->expires_at->toIso8601String(),
            'created_at'       => $story->created_at->diffForHumans(),
            'seen'             => $story->isViewedBy($currentUserId),
            'user' => [
                'id'         => $story->user->id,
                'name'       => $story->user->name,
                'avatar'     => $story->user->avatar,
                'role'       => $story->user->role,
                'department' => null,
            ],
        ];
    }
}
