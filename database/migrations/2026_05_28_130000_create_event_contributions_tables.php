<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_contributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('event_type');
            $table->decimal('goal_amount', 12, 2)->nullable();
            $table->date('deadline_at')->nullable();
            $table->string('banner_path')->nullable();
            $table->enum('visibility', ['public', 'private'])->default('public');
            $table->json('payment_methods');
            $table->boolean('allow_view_total')->default(true);
            $table->boolean('allow_view_participants')->default(true);
            $table->boolean('allow_view_individual_amounts')->default(false);
            $table->boolean('allow_view_participant_count')->default(true);
            $table->timestamps();

            $table->index(['visibility', 'deadline_at']);
            $table->index('event_type');
        });

        Schema::create('event_contribution_invites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_contribution_id')->constrained('event_contributions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('invited_by')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['pending', 'accepted', 'declined'])->default('pending');
            $table->timestamps();

            $table->unique(['event_contribution_id', 'user_id']);
        });

        Schema::create('event_contribution_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_contribution_id')->constrained('event_contributions')->cascadeOnDelete();
            $table->foreignId('contributor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->cascadeOnDelete();
            $table->string('contributor_name')->nullable();
            $table->decimal('amount', 12, 2);
            $table->enum('payment_method', ['orange_money', 'mtn_money', 'cash']);
            $table->boolean('is_manual')->default(false);
            $table->text('note')->nullable();
            $table->timestamp('paid_at')->useCurrent();
            $table->timestamps();

            $table->index(['event_contribution_id', 'paid_at']);
            $table->index('payment_method');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_contribution_payments');
        Schema::dropIfExists('event_contribution_invites');
        Schema::dropIfExists('event_contributions');
    }
};
