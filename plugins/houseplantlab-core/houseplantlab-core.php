<?php
/**
 * Plugin Name: HouseplantLab Core
 * Plugin URI: https://github.com/rjb2803/houseplantlab
 * Description: Permanent content types, taxonomies and structured plant fields for HouseplantLab.
 * Version: 0.1.0
 * Requires at least: 6.6
 * Requires PHP: 8.1
 * Author: HouseplantLab
 * Text Domain: houseplantlab-core
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const HOUSEPLANTLAB_CORE_VERSION = '0.1.0';

/**
 * Register permanent site content structures.
 */
function houseplantlab_register_content(): void
{
    register_post_type('plant', [
        'labels' => [
            'name' => __('Plants', 'houseplantlab-core'),
            'singular_name' => __('Plant', 'houseplantlab-core'),
            'add_new_item' => __('Add new plant', 'houseplantlab-core'),
            'edit_item' => __('Edit plant', 'houseplantlab-core'),
        ],
        'public' => true,
        'show_in_rest' => true,
        'menu_icon' => 'dashicons-palmtree',
        'has_archive' => 'plants',
        'rewrite' => ['slug' => 'plants', 'with_front' => false],
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail', 'revisions', 'custom-fields'],
        'menu_position' => 20,
    ]);

    register_taxonomy('plant_family', ['plant'], [
        'labels' => [
            'name' => __('Plant families', 'houseplantlab-core'),
            'singular_name' => __('Plant family', 'houseplantlab-core'),
        ],
        'public' => true,
        'show_in_rest' => true,
        'hierarchical' => true,
        'rewrite' => ['slug' => 'plant-family', 'with_front' => false],
    ]);

    register_taxonomy('problem', ['plant', 'post'], [
        'labels' => [
            'name' => __('Problems', 'houseplantlab-core'),
            'singular_name' => __('Problem', 'houseplantlab-core'),
        ],
        'public' => true,
        'show_in_rest' => true,
        'hierarchical' => true,
        'rewrite' => ['slug' => 'problem', 'with_front' => false],
    ]);
}
add_action('init', 'houseplantlab_register_content');

/**
 * Register the first small set of REST-visible plant fields.
 */
function houseplantlab_register_meta(): void
{
    $text_fields = [
        'houseplantlab_botanical_name',
        'houseplantlab_difficulty',
        'houseplantlab_light',
        'houseplantlab_watering',
        'houseplantlab_pet_safety',
        'houseplantlab_photo_provenance',
    ];

    foreach ($text_fields as $field) {
        register_post_meta('plant', $field, [
            'type' => 'string',
            'single' => true,
            'show_in_rest' => true,
            'sanitize_callback' => 'sanitize_text_field',
            'auth_callback' => static fn (): bool => current_user_can('edit_posts'),
        ]);
    }
}
add_action('init', 'houseplantlab_register_meta');

register_activation_hook(__FILE__, static function (): void {
    houseplantlab_register_content();
    flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, 'flush_rewrite_rules');

