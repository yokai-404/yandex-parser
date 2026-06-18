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
        Schema::create('yandex_places', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('source_url')->unique();

            $table->string('title')->nullable();
            $table->decimal('rating', 3, 2)->nullable();

            $table->unsignedInteger('reviews_count')->nullable();
            $table->unsignedInteger('ratings_count')->nullable();

            $table->enum('sync_status', ['idle', 'syncing', 'success', 'failed'])
                ->default('idle');

            $table->text('sync_error')->nullable();

            $table->timestamp('synced_at')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'sync_status']);
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('yandex_places');
    }
};
