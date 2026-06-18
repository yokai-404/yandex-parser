<?php

namespace App\Services;

use Illuminate\Support\Facades\Process;
use RuntimeException;
use Throwable;

class YandexMapsParserService
{
    private function normalizeUrl(string $url): string
    {
        $url = trim($url);
        $url = preg_replace('/\?.*$/', '', $url);

        if (!str_contains($url, '/reviews/')) {
            $url = rtrim($url, '/') . '/reviews/';
        }

        return $url;
    }

    public function parse(string $url): array
    {
        $url = $this->normalizeUrl($url);

        $process = Process::timeout(600)
            ->env([
                'TEMP' => sys_get_temp_dir(),
                'TMP' => sys_get_temp_dir(),
                'TMPDIR' => sys_get_temp_dir(),
            ])
            ->run([
                'node',
                base_path('scripts/yandex-parser.cjs'),
                $url,
            ]);

        if ($process->failed()) {
            throw new RuntimeException(
                trim($process->errorOutput() ?: $process->output() ?: 'Yandex parser failed')
            );
        }

        $json = trim($process->output());

        if ($json === '') {
            throw new RuntimeException('Empty parser response');
        }

        try {
            $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new RuntimeException('Invalid parser response JSON: ' . $e->getMessage(), 0, $e);
        }

        if (!is_array($data)) {
            throw new RuntimeException('Parser response is not an array');
        }

        return $data;
    }
}