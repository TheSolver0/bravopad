<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Events\MessageUpdated;
use App\Events\MessengerCallUpdated;
use App\Events\MessengerConversationRead;
use App\Events\MessengerInboxUpdated;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessengerCall;
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
            ->with(['participants:id,name,avatar,role,last_seen_at', 'lastMessage.sender:id,name,avatar,last_seen_at'])
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
            ->get(['id', 'name', 'email', 'avatar', 'role', 'last_seen_at']);

        return response()->json([
            'users' => $users->map(fn (User $candidate) => $this->userPayload($candidate))->values(),
        ]);
    }

    public function heartbeat(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $user->forceFill([
            'last_seen_at' => now(),
        ])->save();

        return response()->json([
            'user' => $this->userPayload($user->fresh()),
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
            ->load(['participants:id,name,avatar,role,last_seen_at', 'lastMessage.sender:id,name,avatar,last_seen_at']);

        return response()->json([
            'conversation' => $this->conversationPayload($conversation, $user),
            'unread_total' => $this->unreadTotal($user),
        ], $alreadyExists ? 200 : 201);
    }

    public function group(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $name = trim($validated['name']);
        $members = $this->resolveGroupMembers($validated['user_ids'], $user);

        if ($name === '' || $members->isEmpty()) {
            throw ValidationException::withMessages([
                $name === '' ? 'name' : 'user_ids' => $name === ''
                    ? 'Le nom du groupe est obligatoire.'
                    : 'Selectionnez au moins un membre valide.',
            ]);
        }

        $conversation = DB::transaction(function () use ($user, $name, $members) {
            $conversation = Conversation::query()->create([
                'type' => 'group',
                'name' => $name,
                'created_by' => $user->id,
            ]);

            $participantIds = collect([$user->id])
                ->merge($members->pluck('id'))
                ->unique()
                ->values();

            foreach ($participantIds as $participantId) {
                $conversation->participants()->attach($participantId, [
                    'joined_at' => now(),
                    'last_read_at' => null,
                ]);
            }

            return $conversation->fresh(['participants:id,name,avatar,role,last_seen_at', 'lastMessage.sender:id,name,avatar,last_seen_at']);
        });

        $this->dispatchInboxUpdatesFor($conversation);

        return response()->json([
            'conversation' => $this->conversationPayload($conversation, $user),
            'unread_total' => $this->unreadTotal($user),
        ], 201);
    }

    public function updateGroup(Request $request, Conversation $conversation): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessGroupCreator($conversation, $user);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
        ]);

        $name = trim($validated['name']);

        if ($name === '') {
            throw ValidationException::withMessages([
                'name' => 'Le nom du groupe est obligatoire.',
            ]);
        }

        $conversation->forceFill(['name' => $name])->save();
        $conversation = $conversation->fresh(['participants:id,name,avatar,role,last_seen_at', 'lastMessage.sender:id,name,avatar,last_seen_at']);
        $this->dispatchInboxUpdatesFor($conversation);

        return response()->json([
            'conversation' => $this->conversationPayload($conversation, $user),
        ]);
    }

    public function addMembers(Request $request, Conversation $conversation): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessGroupCreator($conversation, $user);

        $validated = $request->validate([
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        if (collect($validated['user_ids'])->map(fn ($id) => (int) $id)->contains((int) $user->id)) {
            throw ValidationException::withMessages([
                'user_ids' => 'Le createur est deja membre du groupe.',
            ]);
        }

        $members = $this->resolveGroupMembers($validated['user_ids'], $user);
        $existingIds = $conversation->participants()->pluck('users.id');

        if ($members->isEmpty() || $members->pluck('id')->intersect($existingIds)->isNotEmpty()) {
            throw ValidationException::withMessages([
                'user_ids' => 'Selectionnez uniquement de nouveaux membres valides.',
            ]);
        }

        foreach ($members as $member) {
            $conversation->participants()->attach($member->id, [
                'joined_at' => now(),
                'last_read_at' => null,
            ]);
        }

        $conversation = $conversation->fresh(['participants:id,name,avatar,role,last_seen_at', 'lastMessage.sender:id,name,avatar,last_seen_at']);
        $this->dispatchInboxUpdatesFor($conversation);

        return response()->json([
            'conversation' => $this->conversationPayload($conversation, $user),
        ]);
    }

    public function removeMember(Request $request, Conversation $conversation, User $member): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessGroupCreator($conversation, $user);

        if ($member->id === $user->id) {
            throw ValidationException::withMessages([
                'member' => 'Le createur ne peut pas se retirer du groupe.',
            ]);
        }

        if (! $conversation->hasParticipant($member)) {
            abort(404);
        }

        $conversation->participants()->detach($member->id);
        $conversation = $conversation->fresh(['participants:id,name,avatar,role,last_seen_at', 'lastMessage.sender:id,name,avatar,last_seen_at']);
        $this->dispatchInboxUpdatesFor($conversation);

        return response()->json([
            'conversation' => $this->conversationPayload($conversation, $user),
        ]);
    }

    public function deleteConversation(Request $request, Conversation $conversation): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessGroupCreator($conversation, $user);

        $conversation->delete();

        return response()->json([
            'deleted' => true,
            'conversation_id' => $conversation->id,
        ]);
    }

    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessParticipant($conversation, $user);

        $messages = $conversation->messages()
            ->with('sender:id,name,avatar,last_seen_at')
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

        $conversation = $conversation->fresh(['participants:id,name,avatar,role,last_seen_at', 'lastMessage.sender:id,name,avatar,last_seen_at']);
        $message->load('sender:id,name,avatar,last_seen_at');

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

        $message->load('sender:id,name,email,avatar,role,last_seen_at');
        $this->dispatchMessengerEvent(new MessageUpdated($message, 'edited'));
        $this->dispatchInboxUpdatesFor($conversation->fresh(['participants:id,name,avatar,role,last_seen_at', 'lastMessage.sender:id,name,avatar,last_seen_at']));

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

        $message->load('sender:id,name,email,avatar,role,last_seen_at');
        $this->dispatchMessengerEvent(new MessageUpdated($message, 'deleted'));
        $this->dispatchInboxUpdatesFor($conversation->fresh(['participants:id,name,avatar,role,last_seen_at', 'lastMessage.sender:id,name,avatar,last_seen_at']));

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

        $conversation = $conversation->fresh(['participants:id,name,avatar,role,last_seen_at', 'lastMessage.sender:id,name,avatar,last_seen_at']);
        $this->dispatchMessengerEvent(new MessengerConversationRead($user, $conversation, $readAt->toIso8601String()));
        $this->dispatchMessengerEvent(new MessengerInboxUpdated($user, $conversation));

        return response()->json([
            'conversation' => $this->conversationPayload($conversation, $user),
            'unread_total' => $this->unreadTotal($user),
        ]);
    }

    public function startCall(Request $request, Conversation $conversation): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessParticipant($conversation, $user);
        $conversation->loadMissing('participants:id,name,email,avatar,role,last_seen_at');

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:audio,video'],
        ]);

        if ($conversation->type !== 'direct') {
            throw ValidationException::withMessages([
                'conversation' => 'Les appels de groupe ne sont pas encore disponibles.',
            ]);
        }

        $callee = $conversation->otherParticipantFor($user);

        if (! $callee || $callee->is_automation) {
            throw ValidationException::withMessages([
                'conversation' => 'Cette conversation ne peut pas recevoir un appel.',
            ]);
        }

        $call = MessengerCall::query()->create([
            'conversation_id' => $conversation->id,
            'started_by' => $user->id,
            'callee_id' => $callee->id,
            'type' => $validated['type'],
            'status' => 'ringing',
        ]);

        $call->load(['starter:id,name,email,avatar,role', 'callee:id,name,email,avatar,role']);
        $this->dispatchMessengerEvent(new MessengerCallUpdated($call));

        return response()->json([
            'call' => $this->callPayload($call),
        ], 201);
    }

    public function updateCall(Request $request, Conversation $conversation, MessengerCall $call): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessParticipant($conversation, $user);
        $this->abortUnlessCallInConversation($conversation, $call);
        $this->abortUnlessCallParticipant($call, $user);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:accepted,declined,ended'],
        ]);

        $status = $validated['status'];

        if (in_array($status, ['accepted', 'declined'], true) && $call->callee_id !== $user->id) {
            abort(403);
        }

        if ($status === 'accepted' && $call->status !== 'ringing') {
            abort(422, 'Cet appel ne peut plus etre accepte.');
        }

        if ($status === 'declined' && $call->status !== 'ringing') {
            abort(422, 'Cet appel ne peut plus etre refuse.');
        }

        if ($status === 'ended' && in_array($call->status, ['declined', 'ended'], true)) {
            abort(422, 'Cet appel est deja termine.');
        }

        $call->forceFill([
            'status' => $status,
            'accepted_at' => $status === 'accepted' ? now() : $call->accepted_at,
            'ended_at' => in_array($status, ['declined', 'ended'], true) ? now() : $call->ended_at,
        ])->save();

        $call->load(['starter:id,name,email,avatar,role', 'callee:id,name,email,avatar,role']);
        $this->dispatchMessengerEvent(new MessengerCallUpdated($call));

        return response()->json([
            'call' => $this->callPayload($call),
        ]);
    }

    private function abortUnlessParticipant(Conversation $conversation, User $user): void
    {
        if (! $conversation->hasParticipant($user)) {
            abort(403);
        }
    }

    private function abortUnlessGroupCreator(Conversation $conversation, User $user): void
    {
        if ($conversation->type !== 'group') {
            throw ValidationException::withMessages([
                'conversation' => 'Cette action est reservee aux conversations de groupe.',
            ]);
        }

        if ((int) $conversation->created_by !== (int) $user->id) {
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

    private function abortUnlessCallInConversation(Conversation $conversation, MessengerCall $call): void
    {
        if ($call->conversation_id !== $conversation->id) {
            abort(404);
        }
    }

    private function abortUnlessCallParticipant(MessengerCall $call, User $user): void
    {
        if (! $call->hasParticipant($user)) {
            abort(403);
        }
    }

    private function conversationPayload(Conversation $conversation, User $viewer): array
    {
        $conversation->loadMissing(['participants:id,name,avatar,role,last_seen_at', 'lastMessage.sender:id,name,avatar,last_seen_at']);
        $other = $conversation->type === 'direct'
            ? $conversation->otherParticipantFor($viewer)
            : null;

        return [
            'id' => $conversation->id,
            'type' => $conversation->type,
            'name' => $conversation->type === 'group' ? $conversation->name : null,
            'is_creator' => (int) $conversation->created_by === (int) $viewer->id,
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
        $message->loadMissing('sender:id,name,avatar,last_seen_at');

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
            'last_seen_at' => $user->last_seen_at?->toIso8601String(),
        ];
    }

    private function callPayload(MessengerCall $call): array
    {
        $call->loadMissing(['starter:id,name,email,avatar,role,last_seen_at', 'callee:id,name,email,avatar,role,last_seen_at']);

        return [
            'id' => $call->id,
            'conversation_id' => $call->conversation_id,
            'started_by' => $call->started_by,
            'callee_id' => $call->callee_id,
            'type' => $call->type,
            'status' => $call->status,
            'accepted_at' => $call->accepted_at?->toIso8601String(),
            'ended_at' => $call->ended_at?->toIso8601String(),
            'created_at' => $call->created_at?->toIso8601String(),
            'starter' => $this->userPayload($call->starter),
            'callee' => $this->userPayload($call->callee),
        ];
    }

    private function unreadTotal(User $user): int
    {
        return $user->conversations()
            ->with(['participants:id', 'messages'])
            ->get()
            ->sum(fn (Conversation $conversation) => $conversation->unreadCountFor($user));
    }

    private function resolveGroupMembers(array $requestedIds, User $creator)
    {
        $requestedIds = collect($requestedIds)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->reject(fn (int $id) => $id === (int) $creator->id)
            ->values();

        if ($requestedIds->isEmpty()) {
            return collect();
        }

        $members = User::query()
            ->whereIn('id', $requestedIds)
            ->where('is_automation', false)
            ->get(['id', 'name', 'email', 'avatar', 'role', 'last_seen_at']);

        if ($members->count() !== $requestedIds->count()) {
            throw ValidationException::withMessages([
                'user_ids' => 'Selectionnez uniquement des membres valides.',
            ]);
        }

        return $members;
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
