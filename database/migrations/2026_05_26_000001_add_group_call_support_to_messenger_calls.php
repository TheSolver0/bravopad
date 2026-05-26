<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            $this->rebuildMessengerCallsForSqlite(nullableCallee: true, includeRoomKey: true);
        } else {
            Schema::table('messenger_calls', function (Blueprint $table) {
                $table->string('room_key')->nullable()->unique()->after('status');
                $table->foreignId('callee_id')->nullable()->change();
            });
        }

        Schema::create('messenger_call_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_id')->constrained('messenger_calls')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 20)->default('invited');
            $table->timestamp('joined_at')->nullable();
            $table->timestamp('left_at')->nullable();
            $table->timestamps();

            $table->unique(['call_id', 'user_id']);
            $table->index(['user_id', 'status']);
            $table->index(['call_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messenger_call_participants');

        if (DB::getDriverName() === 'sqlite') {
            $this->rebuildMessengerCallsForSqlite(nullableCallee: false, includeRoomKey: false);
        } else {
            Schema::table('messenger_calls', function (Blueprint $table) {
                $table->dropUnique(['room_key']);
                $table->dropColumn('room_key');
                $table->foreignId('callee_id')->nullable(false)->change();
            });
        }
    }

    private function rebuildMessengerCallsForSqlite(bool $nullableCallee, bool $includeRoomKey): void
    {
        DB::statement('PRAGMA foreign_keys=OFF');

        $calleeDefinition = $nullableCallee ? '"callee_id" integer' : '"callee_id" integer not null';
        $roomKeyDefinition = $includeRoomKey ? ', "room_key" varchar' : '';

        DB::statement(<<<SQL
            create table "__temp__messenger_calls" (
                "id" integer primary key autoincrement not null,
                "conversation_id" integer not null,
                "started_by" integer not null,
                {$calleeDefinition},
                "type" varchar not null,
                "status" varchar not null default 'ringing'
                {$roomKeyDefinition},
                "accepted_at" datetime,
                "ended_at" datetime,
                "created_at" datetime,
                "updated_at" datetime,
                foreign key("conversation_id") references "conversations"("id") on delete cascade,
                foreign key("started_by") references "users"("id") on delete cascade,
                foreign key("callee_id") references "users"("id") on delete cascade
            )
        SQL);

        $roomKeyInsertColumn = $includeRoomKey ? ', "room_key"' : '';
        $roomKeySelectColumn = $includeRoomKey && Schema::hasColumn('messenger_calls', 'room_key') ? ', "room_key"' : ($includeRoomKey ? ', null' : '');
        $calleeSelectColumn = $nullableCallee ? '"callee_id"' : 'coalesce("callee_id", "started_by")';

        DB::statement(<<<SQL
            insert into "__temp__messenger_calls" (
                "id",
                "conversation_id",
                "started_by",
                "callee_id",
                "type",
                "status"
                {$roomKeyInsertColumn},
                "accepted_at",
                "ended_at",
                "created_at",
                "updated_at"
            )
            select
                "id",
                "conversation_id",
                "started_by",
                {$calleeSelectColumn},
                "type",
                "status"
                {$roomKeySelectColumn},
                "accepted_at",
                "ended_at",
                "created_at",
                "updated_at"
            from "messenger_calls"
        SQL);

        Schema::drop('messenger_calls');
        Schema::rename('__temp__messenger_calls', 'messenger_calls');

        Schema::table('messenger_calls', function (Blueprint $table) use ($includeRoomKey) {
            $table->index(['conversation_id', 'created_at']);
            $table->index(['callee_id', 'status']);
            $table->index(['started_by', 'status']);

            if ($includeRoomKey) {
                $table->unique('room_key');
            }
        });

        DB::statement('PRAGMA foreign_keys=ON');
    }
};
