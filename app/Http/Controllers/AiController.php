<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiController extends Controller
{
    /**
     * Rephrase a bravo message using Claude (Anthropic API).
     */
    public function rephrase(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        $apiKey = config('services.anthropic.key');

        if (! $apiKey) {
            return response()->json(['error' => 'Clé API Anthropic non configurée.'], 503);
        }

        $response = Http::withHeaders([
            'x-api-key'         => $apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type'      => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model'      => 'claude-haiku-4-5-20251001',
            'max_tokens' => 512,
            'messages'   => [
                [
                    'role'    => 'user',
                    'content' => "Tu es un assistant RH bienveillant. Reformule le message de reconnaissance professionnelle suivant pour le rendre plus chaleureux, précis et inspirant, tout en conservant le sens original. Réponds uniquement avec le message reformulé, sans introduction ni commentaire.\n\nMessage original :\n{$request->message}",
                ],
            ],
        ]);

        if ($response->failed()) {
            return response()->json(['error' => 'Erreur lors de la requête IA.'], 502);
        }

        $rephrased = $response->json('content.0.text') ?? '';

        return response()->json(['message' => trim($rephrased)]);
    }
}
