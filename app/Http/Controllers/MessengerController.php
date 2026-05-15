<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Events\MessageUpdated;
use App\Events\MessengerConversationRead;
use App\Events\MessengerInboxUpdated;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MessengerController extends Controller
{
    public function conversations(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $conversations = $user->conversations()
            ->with(['participants:id,name,avatar,role', 'lastMessage.sender:id,name,avatar'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('conversations.updated_at')
            ->limit(30)
            ->get();

        return response()->json([
            'conversations' => $conversations
                ->map(fn (Conversation $conversation) => $this->conversationPayload($conversation, $user))
                ->values(),
            'unread_total' => $this->unreadTotal($user),
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $search = trim((string) $request->query('search', ''));

        $users = User::query()
            ->where('id', '!=', $user->id)
            ->where('is_automation', false)
            ->when($search !== '', function ($query) use ($search) {
                $term = '%'.$search.'%';
                $query->where(fn ($q) => $q
                    ->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term));
            })
            ->orderBy('name')
            ->limit(15)
            ->get(['id', 'name', 'email', 'avatar', 'role']);

        return response()->json([
            'users' => $users->map(fn (User $candidate) => $this->userPayload($candidate))->values(),
        ]);
    }

    public function direct(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $recipient = User::query()->findOrFail((int) $validated['user_id']);

        if ($recipient->id === $user->id || $recipient->is_automation) {
            throw ValidationException::withMessages([
                'user_id' => 'Ce destinataire ne peut pas recevoir de message direct.',
            ]);
        }

        $directKey = Conversation::directKeyFor($user, $recipient);
        $alreadyExists = Conversation::query()->where('direct_key', $directKey)->exists();
        $conversation = Conversation::createDirectBetween($user, $recipient)
            ->load(['participants:id,name,avatar,role', 'lastMessage.sender:id,name,avatar']);

        return response()->json([
            'conversation' => $this->conversationPayload($conversation, $user),
            'unread_total' => $this->unreadTotal($user),
        ], $alreadyExists ? 200 : 201);
    }

    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessParticipant($conversation, $user);

        $messages = $conversation->messages()
            ->with('sender:id,name,avatar')
            ->oldest()
            ->limit(100)
            ->get();

        return response()->json([
            'messages' => $messages->map(fn (Message $message) => $this->messagePayload($message))->values(),
        ]);
    }

    public function sendMessage(Request $request, Conversation $conversation): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessParticipant($conversation, $user);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $body = trim($validated['body']);

        if ($body === '') {
            throw ValidationException::withMessages([
                'body' => 'Le message ne peut pas etre vide.',
            ]);
        }

        $message = DB::transaction(function () use ($conversation, $user, $body) {
            $message = Message::query()->create([
                'conversation_id' => $conversation->id,
                'sender_id' => $user->id,
                'body' => $body,
            ]);

            $conversation->forceFill([
                'last_message_id' => $message->id,
                'last_message_at' => $message->created_at,
            ])->save();

            $conversation->participants()->updateExistingPivot($user->id, [
                'last_read_at' => $message->created_at,
            ]);

            return $message;
        });

        $conversation = $conversation->fresh(['participants:id,name,avatar,role', 'lastMessage.sender:id,name,avatar']);
        $message->load('sender:id,name,avatar');

        $this->dispatchMessengerEvent(new MessageSent($message, $conversation));

        foreach ($conversation->participants as $participant) {
            $this->dispatchMessengerEvent(new MessengerInboxUpdated($participant, $conversation));
        }

        return response()->json([
            'message' => $this->messagePayload($message),
            'conversation' => $this->conversationPayload($conversation, $user),
            'unread_total' => $this->unreadTotal($user),
        ], 201);
    }

    public function updateMessage(Request $request, Conversation $conversation, Message $message): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessParticipant($conversation, $user);
        $this->abortUnlessMessageInConversation($conversation, $message);
        $this->abortUnlessMessageAuthor($message, $user);

        if ($message->deleted_at) {
            abort(422, 'Ce message a deja ete supprime.');
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $body = trim($validated['body']);

        if ($body === '') {
            throw ValidationException::withMessages([
                'body' => 'Le message ne peut pas etre vide.',
            ]);
        }

        $message->forceFill([
            'body' => $body,
            'edited_at' => now(),
        ])->save();

        $message->load('sender:id,name,email,avatar,role');
        $this->dispatchMessengerEvent(new MessageUpdated($message, 'edited'));
        $this->dispatchInboxUpdatesFor($conversation->fresh(['participants:id,name,avatar,role', 'lastMessage.sender:id,name,avatar']));

        return response()->json([
            'message' => $this->messagePayload($message),
        ]);
    }

    public function deleteMessage(Request $request, Conversation $conversation, Message $message): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessParticipant($conversation, $user);
        $this->abortUnlessMessageInConversation($conversation, $message);
        $this->abortUnlessMessageAuthor($message, $user);

        if (! $message->deleted_at) {
            $message->forceFill([
                'deleted_at' => now(),
            ])->save();
        }

        $message->load('sender:id,name,email,avatar,role');
        $this->dispatchMessengerEvent(new MessageUpdated($message, 'deleted'));
        $this->dispatchInboxUpdatesFor($conversation->fresh(['participants:id,name,avatar,role', 'lastMessage.sender:id,name,avatar']));

        return response()->json([
            'message' => $this->messagePayload($message),
        ]);
    }

    public function markRead(Request $request, Conversation $conversation): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessParticipant($conversation, $user);

        $readAt = now();

        $conversation->participants()->updateExistingPivot($user->id, [
            'last_read_at' => $readAt,
        ]);

        $conversation = $conversation->fresh(['participants:id,name,avatar,role', 'lastMessage.sender:id,name,avatar']);
        $this->dispatchMessengerEvent(new MessengerConversationRead($user, $conversation, $readAt->toIso8601String()));
        $this->dispatchMessengerEvent(new MessengerInboxUpdated($user, $conversation));

        return response()->json([
            'conversation' => $this->conversationPayload($conversation, $user),
            'unread_total' => $this->unreadTotal($user),
        ]);
    }

    private function abortUnlessParticipant(Conversation $conversation, User $user): void
    {
        if (! $conversation->hasParticipant($user)) {
            abort(403);
        }
    }

    private function abortUnlessMessageInConversation(Conversation $conversation, Message $message): void
    {
        if ($message->conversation_id !== $conversation->id) {
            abort(404);
        }
    }

    private function abortUnlessMessageAuthor(Message $message, User $user): void
    {
        if ($message->sender_id !== $user->id) {
            abort(403);
        }
    }

    private function conversationPayload(Conversation $conversation, User $viewer): array
    {
        $conversation->loadMissing(['participants:id,name,avatar,role', 'lastMessage.sender:id,name,avatar']);
        $other = $conversation->otherParticipantFor($viewer);

        return [
            'id' => $conversation->id,
            'type' => $conversation->type,
            'other_user' => $other ? $this->userPayload($other) : null,
            'participants' => $conversation->participants->map(fn (User $participant) => $this->userPayload($participant))->values(),
            'last_message' => $conversation->lastMessage ? $this->messagePayload($conversation->lastMessage) : null,
            'last_message_at' => $conversation->last_message_at?->toIso8601String(),
            'unread_count' => $conversation->unreadCountFor($viewer),
            'read_at_by_user' => $conversation->participants
                ->mapWithKeys(fn (User $participant) => [
                    (string) $participant->id => $participant->pivot->last_read_at
                        ? Carbon::parse($participant->pivot->last_read_at)->toIso8601String()
                        : null,
                ]),
        ];
    }

    private function messagePayload(Message $message): array
    {
        $message->loadMissing('sender:id,name,avatar');

        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_id' => $message->sender_id,
            'body' => $message->deleted_at ? '' : $message->body,
            'created_at' => $message->created_at?->toIso8601String(),
            'edited_at' => $message->edited_at?->toIso8601String(),
            'deleted_at' => $message->deleted_at?->toIso8601String(),
            'is_edited' => filled($message->edited_at),
            'is_deleted' => filled($message->deleted_at),
            'sender' => $this->userPayload($message->sender),
        ];
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar,
            'role' => $user->role,
        ];
    }

    private function unreadTotal(User $user): int
    {
        return $user->conversations()
            ->with(['participants:id', 'messages'])
            ->get()
            ->sum(fn (Conversation $conversation) => $conversation->unreadCountFor($user));
    }

    private function dispatchMessengerEvent(object $event): void
    {
        try {
            event($event);
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    private function dispatchInboxUpdatesFor(Conversation $conversation): void
    {
        foreach ($conversation->participants as $participant) {
            $this->dispatchMessengerEvent(new MessengerInboxUpdated($participant, $conversation));
        }
    }
}
