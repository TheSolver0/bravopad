<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('agenda_events')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('channel', ['email', 'push'])->default('push');
            $table->integer('minutes_before')->default(15);
            $table->boolean('sent')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['event_id', 'sent']);
            $table->index(['user_id', 'sent']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_reminders');
    }
};
