<?php

namespace App\Services\Media;

use App\Models\MessengerCall;
use App\Models\MessengerCallRecording;
use App\Models\User;

class CallRecordingService
{
    public function __construct(
        private readonly CallAuthorizationService $authorization,
        private readonly MediaProviderInterface $mediaProvider,
    ) {}

    public function start(MessengerCall $call, User $user, string $layout): MessengerCallRecording
    {
        $this->authorization->assertCanManageRecording($call, $user);
        $this->authorization->assertRecordingConsentReady($call);

        $this->mediaProvider->ensureRoom($call);

        return $this->mediaProvider->startRecording($call->fresh(), $user, $layout);
    }

    public function stop(MessengerCall $call, MessengerCallRecording $recording, User $user): MessengerCallRecording
    {
        $this->authorization->assertCanManageRecording($call, $user);

        if ((int) $recording->call_id !== (int) $call->id) {
            abort(404);
        }

        return $this->mediaProvider->stopRecording($recording);
    }
}
