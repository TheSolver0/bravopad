<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_badges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('badge_type');   // premier_bravo_recu, premier_bravo_envoye, pont_directions, etc.
            $table->timestamp('earned_at');
            $table->timestamps();

            $table->unique(['user_id', 'badge_type']);
            $table->index(['user_id', 'earned_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_badges');
    }
};
