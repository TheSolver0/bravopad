<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('holidays', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_en')->nullable();
            $table->date('date');
            $table->string('country_code', 2)->default('CM');
            $table->string('region')->nullable();
            $table->enum('type', ['national', 'regional', 'company', 'custom'])->default('national');
            $table->boolean('is_active')->default(true);
            $table->integer('year')->index();
            $table->timestamps();

            $table->index(['country_code', 'year']);
            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('holidays');
    }
};
