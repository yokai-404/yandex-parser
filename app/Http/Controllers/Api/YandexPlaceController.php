<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SyncYandexPlaceJob;
use App\Models\YandexPlace;
use Illuminate\Http\Request;

class YandexPlaceController extends Controller
{
    public function sync(Request $request)
    {
        SyncYandexPlaceJob::dispatchSync($request->user()->id);

        $place = YandexPlace::where('user_id', $request->user()->id)
            ->latest('id')
            ->first();

        return response()->json([
            'message' => 'Синхронизация завершена',
            'data' => $place,
        ]);
    }

    public function show(Request $request)
    {
        $place = YandexPlace::where('user_id', $request->user()->id)
            ->latest('id')
            ->first();

        if (! $place) {
            return response()->json([
                'message' => 'Карточка не найдена',
            ], 404);
        }

        return response()->json([
            'data' => $place,
        ]);
    }

    public function reviews(Request $request)
    {
        $place = YandexPlace::where('user_id', $request->user()->id)
            ->latest('id')
            ->first();

        if (! $place) {
            return response()->json([
                'message' => 'Карточка не найдена',
            ], 404);
        }

        $reviews = $place->reviews()
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate(50);

        return response()->json([
            'data' => $reviews,
        ]);
    }
}