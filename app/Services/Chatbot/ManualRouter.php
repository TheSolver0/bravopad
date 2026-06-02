<?php

namespace App\Services\Chatbot;

use App\Models\ManualChunk;
use Illuminate\Support\Collection;

class ManualRouter
{
    private array $manifest;

    public function __construct()
    {
        $path = public_path('assets/manuels/manifest.json');
        $this->manifest = file_exists($path)
            ? (json_decode(file_get_contents($path), true) ?? [])
            : [];
    }

    /**
     * Return the manual key that best matches the query, or null if no match.
     */
    public function route(string $query): ?string
    {
        $queryLower = mb_strtolower($query);
        $bestKey    = null;
        $bestScore  = 0;

        foreach ($this->manifest as $key => $meta) {
            $score = 0;
            foreach ($meta['keywords'] as $keyword) {
                if (str_contains($queryLower, mb_strtolower((string) $keyword))) {
                    $score++;
                }
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestKey   = $key;
            }
        }

        return $bestScore > 0 ? $bestKey : null;
    }

    /**
     * Retrieve top-K relevant chunks from a specific manual (or all manuals if null).
     */
    public function search(string $query, ?string $manualKey = null, int $topK = 3): Collection
    {
        $terms = $this->tokenize($query);

        $chunks = ManualChunk::when($manualKey, fn ($q) => $q->where('manual_key', $manualKey))->get();

        return $chunks
            ->map(function ($chunk) use ($terms) {
                $lower       = mb_strtolower($chunk->content);
                $score       = 0;
                foreach ($terms as $term) {
                    $score += substr_count($lower, $term);
                }
                $chunk->score = $score;

                return $chunk;
            })
            ->filter(fn ($chunk) => $chunk->score > 0)
            ->sortByDesc('score')
            ->take($topK)
            ->values();
    }

    public function getManualTitle(?string $key): string
    {
        return $key ? ($this->manifest[$key]['title'] ?? $key) : 'Documentation générale';
    }

    public function getManifest(): array
    {
        return $this->manifest;
    }

    private function tokenize(string $text): array
    {
        $text = mb_strtolower($text);
        // Transliterate accents so "procédure" matches "procedure"
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT', $text);
        preg_match_all('/\b\w{3,}\b/', $ascii ?: $text, $matches);

        return array_unique($matches[0]);
    }
}
