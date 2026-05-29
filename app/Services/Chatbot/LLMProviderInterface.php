<?php

namespace App\Services\Chatbot;

interface LLMProviderInterface
{
    /**
     * @param array<int, array{role: string, content: string}> $messages
     */
    public function complete(array $messages, int $maxTokens = 1024): string;
}
