<?php

namespace App\Services\Chatbot;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GroqProvider implements LLMProviderInterface
{
    public function complete(array $messages, int $maxTokens = 1024): string
    {
        $apiKey = config('services.groq.key');

        if (! $apiKey) {
            throw new RuntimeException('Clé API Groq non configurée.');
        }

        $http = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type'  => 'application/json',
        ]);

        if (app()->environment('local')) {
            $http = $http->withoutVerifying();
        }

        $response = $http->post('https://api.groq.com/openai/v1/chat/completions', [
            'model'      => 'llama-3.1-8b-instant',
            'max_tokens' => $maxTokens,
            'messages'   => $messages,
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Erreur API Groq : ' . $response->body());
        }

        return trim($response->json('choices.0.message.content') ?? '');
    }
}
