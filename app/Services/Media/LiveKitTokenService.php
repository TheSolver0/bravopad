<?php

namespace App\Services\Media;

use App\Models\MessengerCall;
use App\Models\User;
use Illuminate\Support\Carbon;
use RuntimeException;

class LiveKitTokenService
{
    public function makeJoinToken(MessengerCall $call, User $user, string $roomName, string $identity): string
    {
        $apiKey = (string) config('media.livekit.api_key');
        $apiSecret = (string) config('media.livekit.api_secret');

        if ($apiKey === '' || $apiSecret === '') {
            throw new RuntimeException('LiveKit API credentials are not configured.');
        }

        $now = Carbon::now()->timestamp;
        $ttl = (int) config('media.token_ttl', 600);

        $payload = [
            'iss' => $apiKey,
            'sub' => $identity,
            'name' => $user->name,
            'nbf' => $now - 10,
            'iat' => $now,
            'exp' => $now + $ttl,
            'metadata' => json_encode([
                'user_id' => $user->id,
                'call_id' => $call->id,
                'conversation_id' => $call->conversation_id,
            ], JSON_THROW_ON_ERROR),
            'video' => [
                'room' => $roomName,
                'roomJoin' => true,
                'canPublish' => true,
                'canSubscribe' => true,
                'canPublishData' => true,
            ],
        ];

        return $this->encodeJwt($payload, $apiSecret);
    }

    private function encodeJwt(array $payload, string $secret): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $segments = [
            $this->base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR)),
            $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR)),
        ];

        $signature = hash_hmac('sha256', implode('.', $segments), $secret, true);
        $segments[] = $this->base64UrlEncode($signature);

        return implode('.', $segments);
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
