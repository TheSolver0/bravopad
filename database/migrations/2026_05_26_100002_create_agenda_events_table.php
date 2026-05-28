<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agenda_events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->dateTime('start_at');
            $table->dateTime('end_at');
            $table->boolean('all_day')->default(false);
            $table->string('location')->nullable();
            $table->string('meeting_url')->nullable();
            $table->enum('type', ['meeting', 'appointment', 'reminder', 'task', 'out_of_office', 'holiday', 'other'])->default('meeting');
            $table->enum('status', ['confirmed', 'pending', 'cancelled', 'postponed', 'completed', 'absent'])->default('confirmed');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->string('color', 7)->nullable();
            $table->json('tags')->nullable();
            $table->text('internal_notes')->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->unsignedBigInteger('parent_event_id')->nullable();
            $table->json('recurrence_rule')->nullable();
            $table->foreignId('calendar_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organizer_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['start_at', 'end_at']);
            $table->index(['calendar_id', 'start_at']);
            $table->index('organizer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agenda_events');
    }
};
