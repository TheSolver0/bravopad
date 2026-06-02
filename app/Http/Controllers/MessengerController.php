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
use App\Models\MessengerCallParticipant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MessengerController extends Controller
{
    private const MAX_MEDIA_KB = 51200;

    private const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    private const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/avi', 'video/webm', 'video/x-msvideo'];

    private const AUDIO_MIMES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/webm', 'audio/x-m4a'];

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
        $department = trim((string) $request->query('department', ''));

        $users = User::query()
            ->where('id', '!=', $user->id)
            ->where('is_automation', false)
            ->when($search !== '', function ($query) use ($search) {
                $term = '%'.$search.'%';
                $query->where(function ($q) use ($term) {
                    $q->where('name', 'like', $term)
                        ->orWhere('email', 'like', $term)
                        ->orWhere('role', 'like', $term)
                        ->orWhereHas('department', fn ($q) => $q->where('name', 'like', $term))
                        ->orWhereHas('direction', fn ($q) => $q->where('name', 'like', $term)->orWhere('code', 'like', $term));
                });
            })
            ->when($department !== '' && $department !== 'Tous les départements', function ($query) use ($department) {
                $query->where(function ($q) use ($department) {
                    $q->whereHas('direction', fn ($q) => $q->where('code', $department)->orWhere('name', $department))
                        ->orWhereHas('department', fn ($q) => $q->where('name', $department));
                });
            })
            ->with(['department:id,name', 'direction:id,name'])
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
            ->with(['sender:id,name,email,avatar,role,last_seen_at', 'replyTo.sender:id,name,email,avatar,role,last_seen_at'])
            ->withCount('likedBy')
            ->oldest()
            ->limit(100)
            ->get();

        return response()->json([
            'messages' => $messages->map(fn (Message $message) => $this->messagePayload($message, $user))->values(),
        ]);
    }

    public function sendMessage(Request $request, Conversation $conversation): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessParticipant($conversation, $user);

        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:2000'],
            'reply_to_id' => ['nullable', 'integer', 'exists:messages,id'],
            'media' => [
                'nullable',
                'file',
                'mimetypes:'.implode(',', array_merge(self::IMAGE_MIMES, self::VIDEO_MIMES, self::AUDIO_MIMES)),
                'max:'.self::MAX_MEDIA_KB,
            ],
        ]);

        $body = trim((string) ($validated['body'] ?? ''));
        $media = $request->file('media');

        if ($body === '' && ! $media) {
            throw ValidationException::withMessages([
                'body' => 'Le message ne peut pas etre vide.',
            ]);
        }

        $replyTo = null;
        if (! empty($validated['reply_to_id'])) {
            $replyTo = Message::query()->findOrFail((int) $validated['reply_to_id']);
            if ($replyTo->conversation_id !== $conversation->id || $replyTo->deleted_at) {
                throw ValidationException::withMessages([
                    'reply_to_id' => 'Le message cite est indisponible dans cette conversation.',
                ]);
            }
        }

        $mediaData = $media ? $this->storeMessageMedia($conversation, $media) : [
            'type' => 'text',
            'media_path' => null,
            'media_url' => null,
            'media_mime' => null,
            'media_size' => null,
        ];

        $message = DB::transaction(function () use ($conversation, $user, $body, $replyTo, $mediaData) {
            $message = Message::query()->create([
                'conversation_id' => $conversation->id,
                'sender_id' => $user->id,
                'type' => $mediaData['type'],
                'body' => $body,
                'reply_to_id' => $replyTo?->id,
                'media_path' => $mediaData['media_path'],
                'media_url' => $mediaData['media_url'],
                'media_mime' => $mediaData['media_mime'],
                'media_size' => $mediaData['media_size'],
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
        $message->load(['sender:id,name,email,avatar,role,last_seen_at', 'replyTo.sender:id,name,email,avatar,role,last_seen_at']);
        $message->loadCount('likedBy');

        $this->dispatchMessengerEvent(new MessageSent($message, $conversation));

        foreach ($conversation->participants as $participant) {
            $this->dispatchMessengerEvent(new MessengerInboxUpdated($participant, $conversation));
        }

        return response()->json([
            'message' => $this->messagePayload($message, $user),
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

        if ($message->type !== 'text') {
            abort(422, 'Seuls les messages texte peuvent etre modifies.');
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
        $message->load(['replyTo.sender:id,name,email,avatar,role,last_seen_at']);
        $message->loadCount('likedBy');
        $this->dispatchMessengerEvent(new MessageUpdated($message, 'edited'));
        $this->dispatchInboxUpdatesFor($conversation->fresh(['participants:id,name,avatar,role,last_seen_at', 'lastMessage.sender:id,name,avatar,last_seen_at']));

        return response()->json([
            'message' => $this->messagePayload($message, $user),
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
        $message->load(['replyTo.sender:id,name,email,avatar,role,last_seen_at']);
        $message->loadCount('likedBy');
        $this->dispatchMessengerEvent(new MessageUpdated($message, 'deleted'));
        $this->dispatchInboxUpdatesFor($conversation->fresh(['participants:id,name,avatar,role,last_seen_at', 'lastMessage.sender:id,name,avatar,last_seen_at']));

        return response()->json([
            'message' => $this->messagePayload($message, $user),
        ]);
    }

    public function toggleMessageLike(Request $request, Conversation $conversation, Message $message): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessParticipant($conversation, $user);
        $this->abortUnlessMessageInConversation($conversation, $message);

        $alreadyLiked = $message->likedBy()->where('users.id', $user->id)->exists();

        if ($alreadyLiked) {
            $message->likedBy()->detach($user->id);
        } else {
            $message->likedBy()->attach($user->id);
        }

        $message = $message->fresh(['sender:id,name,email,avatar,role,last_seen_at', 'replyTo.sender:id,name,email,avatar,role,last_seen_at']);
        $message->loadCount('likedBy');
        $this->dispatchMessengerEvent(new MessageUpdated($message, $alreadyLiked ? 'unliked' : 'liked'));

        return response()->json([
            'message' => $this->messagePayload($message, $user),
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

    public function calls(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $calls = MessengerCall::query()
            ->where(fn ($query) => $query
                ->where('started_by', $user->id)
                ->orWhere('callee_id', $user->id)
                ->orWhereHas('conversation.participants', fn ($participants) => $participants->where('users.id', $user->id)))
            ->with([
                'conversation.participants:id,name,email,avatar,role,last_seen_at',
                'starter:id,name,email,avatar,role,last_seen_at',
                'callee:id,name,email,avatar,role,last_seen_at',
                'participants.user:id,name,email,avatar,role,last_seen_at',
            ])
            ->latest()
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json([
            'calls' => $calls->map(fn (MessengerCall $call) => $this->callPayload($call))->values(),
        ]);
    }

    public function conversationCalls(Request $request, Conversation $conversation): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->abortUnlessParticipant($conversation, $user);

        $calls = $conversation->calls()
            ->with([
                'conversation.participants:id,name,email,avatar,role,last_seen_at',
                'starter:id,name,email,avatar,role,last_seen_at',
                'callee:id,name,email,avatar,role,last_seen_at',
                'participants.user:id,name,email,avatar,role,last_seen_at',
            ])
            ->latest()
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return response()->json([
            'calls' => $calls->map(fn (MessengerCall $call) => $this->callPayload($call))->values(),
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
            return $this->startGroupCall($conversation, $user, $validated['type']);
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
            'status' => ['required', 'string', 'in:accepted,declined,left,ended'],
        ]);

        $status = $validated['status'];

        if ($call->isGroupCall()) {
            return $this->updateGroupCall($conversation, $call, $user, $status);
        }

        if ($status === 'left') {
            abort(422, 'Cet appel ne peut pas utiliser ce statut.');
        }

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

    private function startGroupCall(Conversation $conversation, User $starter, string $type): JsonResponse
    {
        $activeCallExists = $conversation->calls()
            ->whereNull('callee_id')
            ->whereNotIn('status', ['declined', 'ended'])
            ->exists();

        if ($activeCallExists) {
            throw ValidationException::withMessages([
                'conversation' => 'Un appel de groupe est deja en cours.',
            ]);
        }

        $conversation->loadMissing('participants:id,name,email,avatar,role,last_seen_at');

        $participantIds = $conversation->participants
            ->reject(fn (User $participant) => $participant->is_automation)
            ->pluck('id')
            ->values();

        if (! $participantIds->contains((int) $starter->id) || $participantIds->count() < 2) {
            throw ValidationException::withMessages([
                'conversation' => 'Cette conversation ne peut pas recevoir un appel de groupe.',
            ]);
        }

        $call = DB::transaction(function () use ($conversation, $starter, $type, $participantIds) {
            $call = MessengerCall::query()->create([
                'conversation_id' => $conversation->id,
                'started_by' => $starter->id,
                'callee_id' => null,
                'type' => $type,
                'status' => 'accepted',
                'room_key' => 'messenger-'.$conversation->id.'-'.Str::uuid()->toString(),
                'accepted_at' => now(),
            ]);

            foreach ($participantIds as $participantId) {
                MessengerCallParticipant::query()->create([
                    'call_id' => $call->id,
                    'user_id' => $participantId,
                    'status' => (int) $participantId === (int) $starter->id ? 'joined' : 'invited',
                    'joined_at' => (int) $participantId === (int) $starter->id ? now() : null,
                    'left_at' => null,
                ]);
            }

            return $call->fresh([
                'conversation.participants:id,name,email,avatar,role,last_seen_at',
                'starter:id,name,email,avatar,role,last_seen_at',
                'participants.user:id,name,email,avatar,role,last_seen_at',
            ]);
        });

        $this->dispatchMessengerEvent(new MessengerCallUpdated($call));

        return response()->json([
            'call' => $this->callPayload($call),
        ], 201);
    }

    private function updateGroupCall(Conversation $conversation, MessengerCall $call, User $user, string $status): JsonResponse
    {
        if ($call->status === 'ended') {
            abort(422, 'Cet appel est deja termine.');
        }

        $participant = $call->participants()
            ->where('user_id', $user->id)
            ->first();

        if (! $participant) {
            abort(403);
        }

        if ($status === 'accepted') {
            if (! in_array($participant->status, ['invited', 'left'], true)) {
                abort(422, 'Cet appel ne peut pas etre rejoint.');
            }

            if ($call->joinedParticipantsCount() >= $call->participantLimit()) {
                abort(422, 'Cet appel a atteint sa capacite maximale.');
            }

            $participant->forceFill([
                'status' => 'joined',
                'joined_at' => now(),
                'left_at' => null,
            ])->save();
        }

        if ($status === 'declined') {
            if ($participant->status !== 'invited') {
                abort(422, 'Cet appel ne peut pas etre refuse.');
            }

            $participant->forceFill([
                'status' => 'declined',
                'left_at' => now(),
            ])->save();
        }

        if ($status === 'left') {
            if ($participant->status !== 'joined') {
                abort(422, 'Cet appel ne peut pas etre quitte.');
            }

            $participant->forceFill([
                'status' => 'left',
                'left_at' => now(),
            ])->save();
        }

        if ($status === 'ended') {
            if ((int) $call->started_by !== (int) $user->id) {
                abort(403);
            }

            $call->forceFill([
                'status' => 'ended',
                'ended_at' => now(),
            ])->save();

            $call->participants()
                ->whereIn('status', ['invited', 'joined'])
                ->update([
                    'status' => 'left',
                    'left_at' => now(),
                    'updated_at' => now(),
                ]);
        }

        if ($status !== 'ended' && $call->fresh()->joinedParticipantsCount() === 0) {
            $call->forceFill([
                'status' => 'ended',
                'ended_at' => now(),
            ])->save();
        }

        $call = $call->fresh([
            'conversation.participants:id,name,email,avatar,role,last_seen_at',
            'starter:id,name,email,avatar,role,last_seen_at',
            'participants.user:id,name,email,avatar,role,last_seen_at',
        ]);
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
            'last_message' => $conversation->lastMessage ? $this->messagePayload($conversation->lastMessage, $viewer) : null,
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

    private function messagePayload(Message $message, ?User $viewer = null): array
    {
        $message->loadMissing(['sender:id,name,email,avatar,role,last_seen_at', 'replyTo.sender:id,name,email,avatar,role,last_seen_at']);
        $message->loadCount('likedBy');
        $userHasLiked = $viewer
            ? $message->likedBy()->where('users.id', $viewer->id)->exists()
            : false;

        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_id' => $message->sender_id,
            'type' => $message->type ?? 'text',
            'body' => $message->deleted_at ? '' : $message->body,
            'reply_to' => $message->replyTo ? $this->quotedMessagePayload($message->replyTo) : null,
            'media_url' => $message->deleted_at ? null : $message->media_url,
            'media_mime' => $message->deleted_at ? null : $message->media_mime,
            'media_size' => $message->deleted_at ? null : $message->media_size,
            'likes_count' => $message->liked_by_count ?? 0,
            'user_has_liked' => $userHasLiked,
            'created_at' => $message->created_at?->toIso8601String(),
            'edited_at' => $message->edited_at?->toIso8601String(),
            'deleted_at' => $message->deleted_at?->toIso8601String(),
            'is_edited' => filled($message->edited_at),
            'is_deleted' => filled($message->deleted_at),
            'sender' => $this->userPayload($message->sender),
        ];
    }

    private function quotedMessagePayload(Message $message): array
    {
        $message->loadMissing('sender:id,name,email,avatar,role,last_seen_at');

        return [
            'id' => $message->id,
            'sender_id' => $message->sender_id,
            'type' => $message->type ?? 'text',
            'body' => $message->deleted_at ? '' : $message->body,
            'media_url' => $message->deleted_at ? null : $message->media_url,
            'media_mime' => $message->deleted_at ? null : $message->media_mime,
            'is_deleted' => filled($message->deleted_at),
            'sender' => $this->userPayload($message->sender),
        ];
    }

    private function userPayload(User $user): array
    {
        $department = $user->direction?->code ?? $user->direction?->name ?? $user->department?->name;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar,
            'role' => $user->role,
            'last_seen_at' => $user->last_seen_at?->toIso8601String(),
        ];
    }

    private function storeMessageMedia(Conversation $conversation, UploadedFile $file): array
    {
        $mime = $file->getMimeType();
        $type = match (true) {
            in_array($mime, self::IMAGE_MIMES, true) => 'image',
            in_array($mime, self::VIDEO_MIMES, true) => 'video',
            in_array($mime, self::AUDIO_MIMES, true) => 'audio',
            default => null,
        };

        if (! $type) {
            throw ValidationException::withMessages([
                'media' => 'Ce type de media n est pas pris en charge.',
            ]);
        }

        $path = $file->store("messenger/{$conversation->id}/media", 'public');

        return [
            'type' => $type,
            'media_path' => $path,
            'media_url' => Storage::disk('public')->url($path),
            'media_mime' => $mime,
            'media_size' => $file->getSize(),
        ];
    }

    private function callPayload(MessengerCall $call): array
    {
        $call->loadMissing([
            'starter:id,name,email,avatar,role,last_seen_at',
            'callee:id,name,email,avatar,role,last_seen_at',
            'participants.user:id,name,email,avatar,role,last_seen_at',
        ]);

        return [
            'id' => $call->id,
            'conversation_id' => $call->conversation_id,
            'started_by' => $call->started_by,
            'callee_id' => $call->callee_id,
            'type' => $call->type,
            'status' => $call->status,
            'room_key' => $call->room_key,
            'joined_count' => $call->isGroupCall() ? $call->participants->where('status', 'joined')->count() : null,
            'max_participants' => $call->isGroupCall() ? $call->participantLimit() : null,
            'accepted_at' => $call->accepted_at?->toIso8601String(),
            'ended_at' => $call->ended_at?->toIso8601String(),
            'duration_seconds' => $this->callDurationSeconds($call),
            'created_at' => $call->created_at?->toIso8601String(),
            'starter' => $this->userPayload($call->starter),
            'callee' => $call->callee ? $this->userPayload($call->callee) : null,
            'participants' => $call->isGroupCall()
                ? $call->participants
                    ->mapWithKeys(fn (MessengerCallParticipant $participant) => [
                        (string) $participant->user_id => [
                            'user_id' => $participant->user_id,
                            'status' => $participant->status,
                            'joined_at' => $participant->joined_at?->toIso8601String(),
                            'left_at' => $participant->left_at?->toIso8601String(),
                            'user' => $participant->user ? $this->userPayload($participant->user) : null,
                        ],
                    ])
                : [],
        ];
    }

    private function callDurationSeconds(MessengerCall $call): ?int
    {
        if ($call->accepted_at && $call->ended_at) {
            return max(0, $call->accepted_at->diffInSeconds($call->ended_at, false));
        }

        if (in_array($call->status, ['declined', 'ended'], true)) {
            return 0;
        }

        return null;
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
