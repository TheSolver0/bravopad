<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendars', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('color', 7)->default('#3B82F6');
            $table->enum('type', ['personal', 'team', 'company', 'project', 'shared'])->default('personal');
            $table->string('timezone')->default('Africa/Douala');
            $table->enum('visibility', ['private', 'public', 'team'])->default('private');
            $table->boolean('is_default')->default(false);
            $table->boolean('is_archived')->default(false);
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index('owner_id');
            $table->index(['owner_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendars');
    }
};
