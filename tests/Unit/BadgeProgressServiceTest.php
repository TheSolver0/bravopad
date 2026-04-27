<?php

use App\Models\User;
use App\Services\Engagement\BadgeProgressService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

it('does not persist negative badge progress for future hire dates', function () {
    $user = User::factory()->create([
        'hired_at' => Carbon::now()->addYears(10),
    ]);

    app(BadgeProgressService::class)->syncForUser($user);

    expect(DB::table('badges')->count())->toBe(10);
    expect(DB::table('badge_user')->where('user_id', $user->id)->count())->toBe(10);
    expect(DB::table('badge_user')->where('user_id', $user->id)->where('progress', 0)->count())->toBe(10);
    expect(DB::table('badge_user')->where('user_id', $user->id)->whereNull('awarded_at')->count())->toBe(10);
});
