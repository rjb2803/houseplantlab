<?php
/**
 * One-time production cache purge. Uploaded as a must-use plugin, triggered by
 * the deployment workflow and removed immediately after the request.
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

add_action('init', static function (): void {
    $super_cache_cleared = false;

    if (function_exists('wp_cache_clear_cache')) {
        wp_cache_clear_cache();
        $super_cache_cleared = true;
    }

    wp_cache_flush();
    header(
        'X-HouseplantLab-Cache-Purge: '
        . ($super_cache_cleared ? 'wp-super-cache' : 'object-cache')
    );

    @unlink(__FILE__);
}, 1);
