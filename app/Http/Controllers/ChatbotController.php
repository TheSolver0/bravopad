<?php

namespace App\Http\Controllers;

use App\Models\ChatbotMessage;
use App\Services\Chatbot\ChatbotService;
use Illuminate\Http\Request;
use Throwable;

class ChatbotController extends Controller
{
    public function __construct(private ChatbotService $chatbot) {}

    public function ask(Request $request)
    {
        $request->validate([
            'message'  => 'required|string|max:2000',
            'category' => 'nullable|string|max:100',
        ]);

        try {
            $result = $this->chatbot->ask(
                $request->user()->id,
                $request->string('message'),
                $request->string('category')->value() ?: null,
            );

            return response()->json($result);
        } catch (Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function history(Request $request)
    {
        $messages = ChatbotMessage::where('user_id', $request->user()->id)
            ->orderBy('created_at')
            ->limit(50)
            ->get(['id', 'role', 'content', 'manual_key', 'created_at']);

        return response()->json(['messages' => $messages]);
    }

    public function clear(Request $request)
    {
        ChatbotMessage::where('user_id', $request->user()->id)->delete();

        return response()->json(['ok' => true]);
    }
}
