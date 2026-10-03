<?php
/**
 * One-time production bootstrap. Uploaded as a must-use plugin and removed
 * immediately after the first request by both this file and the workflow.
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

add_action('init', static function (): void {
    $theme = wp_get_theme('houseplantlab');

    if (! $theme->exists()) {
        return;
    }

    switch_theme('houseplantlab');

    require_once ABSPATH . 'wp-admin/includes/plugin.php';
    if (! is_plugin_active('houseplantlab-core/houseplantlab-core.php')) {
        activate_plugin('houseplantlab-core/houseplantlab-core.php');
    }

    update_option('blogname', 'HouseplantLab');
    update_option('blogdescription', 'Healthy Houseplants. Happier Homes.');
    update_option('home', 'https://houseplantlab.co.uk');
    update_option('siteurl', 'https://houseplantlab.co.uk');
    update_option('houseplantlab_bootstrapped', '0.2.0');

    flush_rewrite_rules(false);
    @unlink(__FILE__);
}, 0);

