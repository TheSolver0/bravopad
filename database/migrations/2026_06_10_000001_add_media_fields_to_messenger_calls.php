<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messenger_calls', function (Blueprint $table) {
            $table->string('media_provider', 30)->nullable()->after('room_key');
            $table->string('media_room_name')->nullable()->unique()->after('media_provider');
            $table->string('media_room_sid')->nullable()->after('media_room_name');
            $table->string('media_status', 30)->nullable()->index()->after('media_room_sid');
            $table->string('recording_status', 30)->nullable()->index()->after('media_status');
            $table->timestamp('recording_started_at')->nullable()->after('recording_status');
            $table->timestamp('recording_ended_at')->nullable()->after('recording_started_at');
            $table->string('ended_reason')->nullable()->after('recording_ended_at');
        });

        Schema::table('messenger_call_participants', function (Blueprint $table) {
            $table->string('media_identity')->nullable()->unique()->after('status');
            $table->timestamp('last_joined_at')->nullable()->after('media_identity');
            $table->timestamp('last_left_at')->nullable()->after('last_joined_at');
            $table->unsignedTinyInteger('network_quality')->nullable()->after('last_left_at');
            $table->json('permissions_json')->nullable()->after('network_quality');
            $table->timestamp('recording_consented_at')->nullable()->after('permissions_json');
            $table->timestamp('recording_consent_revoked_at')->nullable()->after('recording_consented_at');
        });
    }

    public function down(): void
    {
        Schema::table('messenger_call_participants', function (Blueprint $table) {
            $table->dropColumn([
                'media_identity',
                'last_joined_at',
                'last_left_at',
                'network_quality',
                'permissions_json',
                'recording_consented_at',
                'recording_consent_revoked_at',
            ]);
        });

        Schema::table('messenger_calls', function (Blueprint $table) {
            $table->dropColumn([
                'media_provider',
                'media_room_name',
                'media_room_sid',
                'media_status',
                'recording_status',
                'recording_started_at',
                'recording_ended_at',
                'ended_reason',
            ]);
        });
    }
};
