<?php

namespace App\Services\Chatbot;

use App\Models\ChatbotMessage;
use Illuminate\Support\Collection;

class ChatbotService
{
    public function __construct(
        private ManualRouter $router,
        private LLMProviderInterface $llm,
    ) {}

    public function ask(int $userId, string $question, ?string $categoryKey = null): array
    {
        // 1. Route to the most relevant manual
        $manualKey = $categoryKey ?? $this->router->route($question);

        // 2. Retrieve top-3 relevant chunks from that manual
        $chunks = $this->router->search($question, $manualKey, topK: 3);

        // 3. Fallback: if routing returned nothing, search all manuals
        if ($chunks->isEmpty() && $manualKey !== null) {
            $chunks    = $this->router->search($question, null, topK: 3);
            $manualKey = null;
        }

        // 4. Build LLM messages with history + context
        $history  = $this->recentHistory($userId);
        $messages = $this->buildMessages($question, $chunks, $history);

        // 5. Call LLM
        $answer = $this->llm->complete($messages);

        // 6. Persist both turns
        ChatbotMessage::create(['user_id' => $userId, 'role' => 'user',      'content' => $question, 'manual_key' => $manualKey]);
        ChatbotMessage::create(['user_id' => $userId, 'role' => 'assistant', 'content' => $answer,   'manual_key' => $manualKey]);

        return [
            'answer'       => $answer,
            'manual_key'   => $manualKey,
            'manual_title' => $this->router->getManualTitle($manualKey),
            'pages'        => $chunks->pluck('page_number')->unique()->sort()->values()->toArray(),
        ];
    }

    private function recentHistory(int $userId): Collection
    {
        return ChatbotMessage::where('user_id', $userId)
            ->latest()
            ->limit(6)
            ->get()
            ->reverse()
            ->values();
    }

    private function buildMessages(string $question, Collection $chunks, Collection $history): array
    {
        $system = implode("\n", [
            "Tu es l'assistant interne de l'entreprise, expert en procédures internes.",
            "Tu réponds UNIQUEMENT à partir des extraits de manuels fournis.",
            "Règles :",
            "- Réponds en français, de façon claire et structurée.",
            "- Cite le numéro de page (ex: « Page 3 ») quand tu donnes une information.",
            "- Si l'information n'est pas dans les extraits, dis-le clairement sans inventer.",
        ]);

        $messages = [['role' => 'system', 'content' => $system]];

        foreach ($history as $msg) {
            $messages[] = ['role' => $msg->role, 'content' => $msg->content];
        }

        $userContent = $question;
        if ($chunks->isNotEmpty()) {
            $context     = $chunks->map(fn ($c) => "[Page {$c->page_number}]\n{$c->content}")->implode("\n\n---\n\n");
            $userContent = "Extraits du manuel :\n\n{$context}\n\n---\n\nQuestion : {$question}";
        }

        $messages[] = ['role' => 'user', 'content' => $userContent];

        return $messages;
    }
}
