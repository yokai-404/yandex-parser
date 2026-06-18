<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SyncYandexPlaceJob;
use App\Models\ParseJob;
use Illuminate\Http\Request;

class ParserController extends Controller
{
    public function index(Request $request)
    {
        $jobs = $request->user()
            ->parseJobs()
            ->latest()
            ->paginate(10);

        return response()->json($jobs);
    }

    public function run(Request $request)
    {
        $setting = $request->user()->setting;

        if (! $setting?->yandex_url) {
            return response()->json([
                'message' => 'Сначала сохраните ссылку Яндекс.Карт',
            ], 422);
        }

        $job = ParseJob::create([
            'user_id' => $request->user()->id,
            'yandex_url' => $setting->yandex_url,
            'status' => 'pending',
            'progress' => 0,
        ]);

        SyncYandexPlaceJob::dispatch(
            $request->user()->id,
            $job->id
        );

        return response()->json([
            'message' => 'Парсинг поставлен в очередь',
            'data' => $job,
        ]);
    }

    public function show(Request $request, ParseJob $parseJob)
    {
        abort_unless($parseJob->user_id === $request->user()->id, 403);

        return response()->json([
            'data' => $parseJob,
        ]);
    }
}