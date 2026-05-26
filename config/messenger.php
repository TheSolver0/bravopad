<?php

return [
    'calls' => [
        'ice_servers' => array_values(array_filter([
            [
                'urls' => explode(',', (string) env('MESSENGER_CALL_STUN_URLS', 'stun:stun.l.google.com:19302')),
            ],
            env('MESSENGER_CALL_TURN_URLS') ? [
                'urls' => explode(',', (string) env('MESSENGER_CALL_TURN_URLS')),
                'username' => env('MESSENGER_CALL_TURN_USERNAME'),
                'credential' => env('MESSENGER_CALL_TURN_CREDENTIAL'),
            ] : null,
        ])),
    ],
];
