<?php

// FRONTEND_URL accepts a comma-separated list, so a site reachable at both the
// apex and www (or a staging origin) can call the API without a code change:
//   FRONTEND_URL=https://example.com,https://www.example.com
$origins = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env('FRONTEND_URL', 'http://localhost:3000'))
)));

return [
    'paths' => ['api/*', 'storage/*', 'up'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $origins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
