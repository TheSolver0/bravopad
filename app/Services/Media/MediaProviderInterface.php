<?php

namespace App\Services\Media;

use App\Models\MessengerCall;
use App\Models\MessengerCallRecording;
use App\Models\User;

interface MediaProviderInterface
{
    public function ensureRoom(MessengerCall $call): MessengerCall;

    public function joinToken(MessengerCall $call, User $user): array;

    public function startRecording(MessengerCall $call, User $user, string $layout): MessengerCallRecording;

    public function stopRecording(MessengerCallRecording $recording): MessengerCallRecording;
}
