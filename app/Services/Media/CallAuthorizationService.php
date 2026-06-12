<?php

namespace App\Services\Media;

use App\Models\MessengerCall;
use App\Models\MessengerCallParticipant;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class CallAuthorizationService
{
    public function assertCanJoinMedia(MessengerCall $call, User $user): void
    {
        $call->loadMissing('conversation.participants');

        if (! $call->conversation->hasParticipant($user)) {
            abort(403);
        }

        if (in_array($call->status, ['ended', 'declined'], true)) {
            throw ValidationException::withMessages([
                'call' => 'Cet appel est termine ou indisponible.',
            ]);
        }

        if ($call->isGroupCall()) {
            $participant = $this->participantFor($call, $user);

            if (! $participant || ! in_array($participant->status, ['joined'], true)) {
                throw ValidationException::withMessages([
                    'call' => 'Rejoignez d abord l appel avant de demander un jeton media.',
                ]);
            }
        }
    }

    public function assertCanManageRecording(MessengerCall $call, User $user): void
    {
        $this->assertCanJoinMedia($call, $user);

        if ((int) $call->started_by !== (int) $user->id && ! $user->isAdmin()) {
            abort(403);
        }

        if (! (bool) config('media.recording.enabled', false)) {
            throw ValidationException::withMessages([
                'recording' => 'L enregistrement des appels est desactive.',
            ]);
        }
    }

    public function assertRecordingConsentReady(MessengerCall $call): void
    {
        $call->loadMissing('participants');

        $missingConsent = $call->participants
            ->where('status', 'joined')
            ->contains(fn (MessengerCallParticipant $participant) => ! $participant->recording_consented_at);

        if ($missingConsent) {
            throw ValidationException::withMessages([
                'recording' => 'Tous les participants actifs doivent consentir avant l enregistrement.',
            ]);
        }
    }

    private function participantFor(MessengerCall $call, User $user): ?MessengerCallParticipant
    {
        return $call->participants()
            ->where('user_id', $user->id)
            ->first();
    }
}
