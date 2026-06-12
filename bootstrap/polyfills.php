<?php

// Polyfill for request_parse_body() introduced in PHP 8.4.
// Symfony HttpFoundation calls it unconditionally for PUT/DELETE/PATCH requests.
if (! function_exists('request_parse_body')) {
    function request_parse_body(int $flags = 0): array
    {
        $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');

        if (str_starts_with($contentType, 'multipart/form-data')) {
            return [$_POST, $_FILES];
        }

        if (str_starts_with($contentType, 'application/x-www-form-urlencoded')) {
            $rawInput = file_get_contents('php://input');
            if ($rawInput !== false && $rawInput !== '') {
                parse_str($rawInput, $data);
                return [$data, []];
            }
        }

        return [$_POST, $_FILES];
    }
}
