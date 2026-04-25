<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('peer_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('nominee_id')->constrained('users')->cascadeOnDelete();
            $table->string('period', 7); // YYYY-MM
            $table->decimal('weight', 5, 2)->default(1);
            $table->boolean('is_anonymous')->default(true);
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->unique(['voter_id', 'period']);
            $table->index(['period', 'nominee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('peer_votes');
    }
};
