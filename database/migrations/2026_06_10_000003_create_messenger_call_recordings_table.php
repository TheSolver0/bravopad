<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messenger_call_recordings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_id')->constrained('messenger_calls')->cascadeOnDelete();
            $table->string('provider_id')->nullable()->unique();
            $table->string('layout', 30)->default('grid');
            $table->string('storage_disk', 40)->nullable();
            $table->string('storage_path')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->string('status', 30)->default('starting')->index();
            $table->foreignId('started_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['call_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messenger_call_recordings');
    }
};
