<?php

namespace App\Http\Controllers;

use App\Models\Calendar;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CalendarController extends Controller
{
    public function index(): JsonResponse
    {
        $user = Auth::user();

        $calendars = Calendar::active()
            ->forUser($user->id)
            ->with('owner:id,name,avatar')
            ->get()
            ->map(fn (Calendar $cal) => [
                'id'         => $cal->id,
                'name'       => $cal->name,
                'description'=> $cal->description,
                'color'      => $cal->color,
                'type'       => $cal->type,
                'timezone'   => $cal->timezone,
                'visibility' => $cal->visibility,
                'is_default' => $cal->is_default,
                'is_archived'=> $cal->is_archived,
                'owner_id'   => $cal->owner_id,
                'is_mine'    => $cal->owner_id === $user->id,
            ]);

        return response()->json($calendars);
    }

    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string',
            'color'       => 'required|string|max:7',
            'type'        => 'required|in:personal,team,company,project,shared',
            'visibility'  => 'required|in:private,public,team',
        ]);

        $calendar = Calendar::create([
            ...$validated,
            'owner_id'   => $user->id,
            'is_default' => false,
        ]);

        return response()->json([
            'id'         => $calendar->id,
            'name'       => $calendar->name,
            'color'      => $calendar->color,
            'type'       => $calendar->type,
            'visibility' => $calendar->visibility,
            'is_default' => $calendar->is_default,
            'owner_id'   => $calendar->owner_id,
            'is_mine'    => true,
        ], 201);
    }

    public function update(Request $request, Calendar $calendar): JsonResponse
    {
        $user = Auth::user();
        abort_unless($calendar->owner_id === $user->id, 403);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'color'       => 'sometimes|string|max:7',
            'type'        => 'sometimes|in:personal,team,company,project,shared',
            'visibility'  => 'sometimes|in:private,public,team',
        ]);

        $calendar->update($validated);

        return response()->json(['success' => true]);
    }

    public function destroy(Calendar $calendar): JsonResponse
    {
        $user = Auth::user();
        abort_unless($calendar->owner_id === $user->id, 403);
        abort_if($calendar->is_default, 422, 'Le calendrier par défaut ne peut pas être supprimé.');

        $calendar->delete();

        return response()->json(['success' => true]);
    }

    public function addMember(Request $request, Calendar $calendar): JsonResponse
    {
        $user = Auth::user();
        abort_unless($calendar->owner_id === $user->id, 403);

        $validated = $request->validate([
            'user_id'    => 'required|exists:users,id',
            'permission' => 'required|in:view,edit,admin',
        ]);

        $calendar->members()->syncWithoutDetaching([
            $validated['user_id'] => ['permission' => $validated['permission']],
        ]);

        return response()->json(['success' => true]);
    }

    public function removeMember(Request $request, Calendar $calendar): JsonResponse
    {
        $user = Auth::user();
        abort_unless($calendar->owner_id === $user->id, 403);

        $validated = $request->validate(['user_id' => 'required|exists:users,id']);
        $calendar->members()->detach($validated['user_id']);

        return response()->json(['success' => true]);
    }
}
