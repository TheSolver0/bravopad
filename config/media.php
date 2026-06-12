<?php

return [
    'enabled' => env('MEDIA_ENABLED', true),
    'provider' => env('MEDIA_PROVIDER', 'livekit'),

    'token_ttl' => (int) env('MEDIA_TOKEN_TTL', 600),

    'limits' => [
        'video_participants' => (int) env('CALL_MAX_VIDEO_PARTICIPANTS', 4),
        'audio_participants' => (int) env('CALL_MAX_AUDIO_PARTICIPANTS', 8),
    ],

    'recording' => [
        'enabled' => env('CALL_RECORDING_ENABLED', false),
        'retention_days' => (int) env('CALL_RECORDING_RETENTION_DAYS', 30),
        'disk' => env('CALL_RECORDING_DISK', 'private'),
    ],

    'livekit' => [
        'url' => env('LIVEKIT_URL'),
        'api_key' => env('LIVEKIT_API_KEY'),
        'api_secret' => env('LIVEKIT_API_SECRET'),
        'webhook_secret' => env('LIVEKIT_WEBHOOK_SECRET'),
    ],
];
