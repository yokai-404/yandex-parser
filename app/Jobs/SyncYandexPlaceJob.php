<?php

namespace App\Jobs;

use App\Models\ParseJob;
use App\Models\User;
use App\Models\YandexPlace;
use App\Models\YandexReview;
use App\Services\YandexMapsParserService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Throwable;

class SyncYandexPlaceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $userId,
        public int $parseJobId
    ) {
    }

    public function handle(YandexMapsParserService $parser): void
    {
        $user = User::findOrFail($this->userId);
        $parseJob = ParseJob::find($this->parseJobId);

        $parseJob?->update([
            'status' => 'running',
            'started_at' => now(),
        ]);

        $setting = $user->setting;

        if (! $setting?->yandex_url) {
            $parseJob?->update([
                'status' => 'failed',
                'error_message' => 'Не найдена ссылка Яндекс.Карт',
                'finished_at' => now(),
            ]);

            return;
        }

        $oldPlaces = YandexPlace::where('user_id', $user->id)
            ->where('source_url', $setting->yandex_url)
            ->get();


        foreach ($oldPlaces as $oldPlace) {

            $oldPlace->reviews()->delete();

            $oldPlace->delete();

        }



        $place = YandexPlace::create([
            'user_id' => $user->id,
            'parse_job_id' => $parseJob->id,
            'source_url' => $setting->yandex_url,
            'sync_status' => 'syncing',
            'sync_error' => null,
        ]);

        try {
            $payload = $parser->parse($setting->yandex_url);

            $reviews = $payload['reviews'] ?? [];
            $placeData = $payload['place'] ?? [];

            DB::transaction(function () use ($place, $placeData, $reviews, $setting) {
                $place->update([
                    'source_url' => $place->source_url,
                    'title' => $placeData['title'] ?? null,
                    'rating' => $placeData['rating'] ?? null,
                    'reviews_count' => isset($placeData['reviews_count'])
                        ? (int) $placeData['reviews_count']
                        : count($reviews),
                    'ratings_count' => isset($placeData['ratings_count'])
                        ? (int) $placeData['ratings_count']
                        : null,
                    'sync_status' => 'success',
                    'sync_error' => null,
                    'synced_at' => now(),
                ]);

                $place->reviews()->delete();

                $now = now();
                $rows = [];

                foreach ($reviews as $review) {
                    $rows[] = [
                        'yandex_place_id' => $place->id,
                        'external_id' => (string) ($review['external_id'] ?? ''),
                        'author' => $review['author'] ?? null,
                        'published_at' => !empty($review['date'])
                            ? Carbon::parse($review['date'])->toDateString()
                            : null,
                        'text' => $review['text'] ?? null,
                        'rating' => isset($review['rating']) ? (int) $review['rating'] : null,
                        'raw_payload' => json_encode($review, JSON_UNESCAPED_UNICODE),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if (!empty($rows)) {
                    YandexReview::insert($rows);
                }

                $setting->update([
                    'last_synced_at' => now(),
                ]);
            });

            $parseJob?->update([
                'status' => 'completed',
                'progress' => 100,
                'result' => $payload,
                'finished_at' => now(),
            ]);
        } catch (Throwable $e) {
            $place->update([
                'sync_status' => 'failed',
                'sync_error' => $e->getMessage(),
            ]);

            $parseJob?->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'finished_at' => now(),
            ]);

            throw $e;
        }
    }
}