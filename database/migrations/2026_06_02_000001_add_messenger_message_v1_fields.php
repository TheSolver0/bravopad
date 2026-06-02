<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('type', 20)->default('text')->after('sender_id');
            $table->foreignId('reply_to_id')->nullable()->after('body')->constrained('messages')->nullOnDelete();
            $table->string('media_path')->nullable()->after('reply_to_id');
            $table->string('media_url')->nullable()->after('media_path');
            $table->string('media_mime', 120)->nullable()->after('media_url');
            $table->unsignedBigInteger('media_size')->nullable()->after('media_mime');

            $table->index(['conversation_id', 'type']);
            $table->index('reply_to_id');
        });

        Schema::create('message_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('messages')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['message_id', 'user_id']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_likes');

        Schema::table('messages', function (Blueprint $table) {
            $table->dropForeign(['reply_to_id']);
            $table->dropIndex(['conversation_id', 'type']);
            $table->dropIndex(['reply_to_id']);
            $table->dropColumn([
                'type',
                'reply_to_id',
                'media_path',
                'media_url',
                'media_mime',
                'media_size',
            ]);
        });
    }
};
