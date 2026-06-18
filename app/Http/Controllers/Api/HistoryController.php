<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\YandexPlace;

class HistoryController extends Controller
{
    public function index(Request $request)
    {
        $places = YandexPlace::where(
                'user_id',
                $request->user()->id
            )
            ->orderByDesc('synced_at')
            ->get();

        return response()->json([
            'data' => $places,
        ]);
    }
}