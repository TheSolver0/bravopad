<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messenger_call_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_id')->constrained('messenger_calls')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('source', 40);
            $table->string('type', 80);
            $table->string('event_id')->nullable();
            $table->json('payload_json')->nullable();
            $table->timestamp('occurred_at')->nullable()->index();
            $table->timestamps();

            $table->unique(['source', 'event_id']);
            $table->index(['call_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messenger_call_events');
    }
};
