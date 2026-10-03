<?php
/**
 * Theme setup.
 *
 * @package HouseplantLab
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

add_action('after_setup_theme', static function (): void {
    add_theme_support('wp-block-styles');
    add_theme_support('editor-styles');
    add_editor_style('style.css');
});

add_action('wp_enqueue_scripts', static function (): void {
    wp_enqueue_style(
        'houseplantlab',
        get_stylesheet_uri(),
        [],
        (string) wp_get_theme()->get('Version')
    );
});

