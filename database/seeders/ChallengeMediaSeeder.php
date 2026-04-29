<?php

namespace Database\Seeders;

use App\Models\ChallengeMedia;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ChallengeMediaSeeder extends Seeder
{
    public function run(): void
    {
        // Olympiade MultiSport du PAD
        $challengeId = 13;

        $uploaderId = User::query()
            ->where('email', 'superadmin@bravo.test')
            ->value('id')
            ?? User::query()->where('email', 'admin@bravo.test')->value('id')
            ?? User::query()->where('email', 'rh@bravo.test')->value('id')
            ?? User::query()->value('id');

        if (! $uploaderId) {
            return;
        }

        $dir = public_path('assets/images/challenges/olympiade');
        if (! File::exists($dir)) {
            return;
        }

        $files = collect(File::files($dir))
            ->filter(fn ($f) => in_array(strtolower($f->getExtension()), ['jpg', 'jpeg', 'png', 'webp', 'gif'], true))
            ->values();

        if ($files->isEmpty()) {
            return;
        }

        // Idempotent seeding: remove previously seeded olympiade assets media
        ChallengeMedia::query()
            ->where('challenge_id', $challengeId)
            ->where('file_path', 'like', '/assets/images/challenges/olympiade/%')
            ->delete();

        foreach ($files as $file) {
            $basename = $file->getFilename();
            $encodedName = Str::of($basename)->explode('/')->last();
            // Encode spaces and special chars for browser URLs
            $encodedName = rawurlencode((string) $encodedName);

            ChallengeMedia::create([
                'challenge_id' => $challengeId,
                'uploaded_by'  => $uploaderId,
                'file_path'    => "/assets/images/challenges/olympiade/{$encodedName}",
                'file_type'    => 'image',
                'caption'      => null,
            ]);
        }
    }
}

