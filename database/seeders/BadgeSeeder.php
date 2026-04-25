<?php

namespace Database\Seeders;

use App\Services\Engagement\BadgeProgressService;
use Illuminate\Database\Seeder;

class BadgeSeeder extends Seeder
{
    public function run(): void
    {
        app(BadgeProgressService::class)->ensureDefaultBadges();
    }
}
