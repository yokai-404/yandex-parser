<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('yandex_reviews', function (Blueprint $table) {
    $table->id();

    $table->foreignId('yandex_place_id')
        ->constrained('yandex_places')
        ->cascadeOnDelete();

    $table->string('external_id')->nullable();

    $table->string('author')->nullable();

    $table->date('published_at')->nullable();

    $table->text('text');

    $table->unsignedTinyInteger('rating')->nullable();

    $table->json('raw_payload')->nullable();

    $table->timestamps();

    $table->index(['yandex_place_id', 'published_at']);

    // защита от дублей (очень важно для оценки архитектуры)
    $table->unique(['yandex_place_id', 'external_id']);
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('yandex_reviews');
    }
};
