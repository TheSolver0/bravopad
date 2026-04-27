<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiController extends Controller
{
    /**
     * Rephrase a bravo message using Groq (Llama 3, free tier).
     */
    public function rephrase(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        $apiKey = config('services.groq.key');

        if (! $apiKey) {
            return response()->json(['error' => 'Clé API Groq non configurée.'], 503);
        }

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type'  => 'application/json',
        ])->post('https://api.groq.com/openai/v1/chat/completions', [
            'model'      => 'llama-3.1-8b-instant',
            'max_tokens' => 512,
            'messages'   => [
                [
                    'role'    => 'system',
                    'content' => 'Tu es un assistant RH bienveillant. Reformule les messages de reconnaissance professionnelle pour les rendre plus chaleureux, précis et inspirants, tout en conservant le sens original. Réponds uniquement avec le message reformulé, sans introduction ni commentaire.',
                ],
                [
                    'role'    => 'user',
                    'content' => $request->message,
                ],
            ],
        ]);

        if ($response->failed()) {
            return response()->json(['error' => 'Erreur lors de la requête IA.'], 502);
        }

        $rephrased = $response->json('choices.0.message.content') ?? '';

        return response()->json(['message' => trim($rephrased)]);
    }
}
