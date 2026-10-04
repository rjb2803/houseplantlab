<?php
/**
 * Plugin Name: HouseplantLab Core
 * Plugin URI: https://github.com/rjb2803/houseplantlab
 * Description: Permanent content types, taxonomies and structured plant fields for HouseplantLab.
 * Version: 0.3.0
 * Requires at least: 6.6
 * Requires PHP: 8.1
 * Author: HouseplantLab
 * Text Domain: houseplantlab-core
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const HOUSEPLANTLAB_CORE_VERSION = '0.3.0';

/**
 * Keep public traffic on the configured HTTPS origin.
 */
function houseplantlab_enforce_https(): void
{
    if (is_ssl()) {
        return;
    }

    $host = wp_parse_url(home_url('/'), PHP_URL_HOST);
    if (! is_string($host) || $host === '') {
        return;
    }

    $request_uri = isset($_SERVER['REQUEST_URI'])
        ? wp_unslash((string) $_SERVER['REQUEST_URI'])
        : '/';

    wp_safe_redirect('https://' . $host . $request_uri, 301, 'HouseplantLab');
    exit;
}
add_action('template_redirect', 'houseplantlab_enforce_https', -100);

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
        'houseplantlab_humidity',
        'houseplantlab_growth',
        'houseplantlab_pet_safety',
        'houseplantlab_photo_provenance',
    ];

    for ($product = 1; $product <= 3; $product++) {
        $text_fields[] = "houseplantlab_product_{$product}_name";
        $text_fields[] = "houseplantlab_product_{$product}_reason";
        $text_fields[] = "houseplantlab_product_{$product}_label";
        $text_fields[] = "houseplantlab_product_{$product}_url";
    }

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

/**
 * Render editorially useful plant facts from the registered plant metadata.
 */
function houseplantlab_render_plant_facts(): string
{
    if (get_post_type() !== 'plant') {
        return '';
    }

    $facts = [
        'Botanical name' => 'houseplantlab_botanical_name',
        'Difficulty' => 'houseplantlab_difficulty',
        'Light' => 'houseplantlab_light',
        'Watering' => 'houseplantlab_watering',
        'Humidity' => 'houseplantlab_humidity',
        'Growth rate' => 'houseplantlab_growth',
        'Pet safety' => 'houseplantlab_pet_safety',
    ];

    $items = '';
    foreach ($facts as $label => $key) {
        $value = trim((string) get_post_meta(get_the_ID(), $key, true));
        if ($value === '') {
            continue;
        }

        $items .= sprintf(
            '<div class="hpl-fact"><dt>%s</dt><dd>%s</dd></div>',
            esc_html($label),
            esc_html($value)
        );
    }

    return $items === '' ? '' : '<dl class="hpl-facts">' . $items . '</dl>';
}
add_shortcode('houseplantlab_plant_facts', 'houseplantlab_render_plant_facts');

/**
 * Render up to three contextual recommendations. Empty URLs deliberately do
 * not become buttons, so an untested placeholder can never masquerade as a
 * product endorsement.
 */
function houseplantlab_render_recommended_products(): string
{
    if (get_post_type() !== 'plant') {
        return '';
    }

    $cards = '';
    for ($product = 1; $product <= 3; $product++) {
        $name = trim((string) get_post_meta(get_the_ID(), "houseplantlab_product_{$product}_name", true));
        if ($name === '') {
            continue;
        }

        $reason = trim((string) get_post_meta(get_the_ID(), "houseplantlab_product_{$product}_reason", true));
        $label = trim((string) get_post_meta(get_the_ID(), "houseplantlab_product_{$product}_label", true));
        $url = trim((string) get_post_meta(get_the_ID(), "houseplantlab_product_{$product}_url", true));
        $action = $url !== ''
            ? sprintf('<a class="hpl-product__link" href="%s" rel="sponsored nofollow">%s <span aria-hidden="true">→</span></a>', esc_url($url), esc_html($label !== '' ? $label : 'Check price'))
            : '<span class="hpl-product__pending">Recommendation link added after testing</span>';

        $cards .= sprintf(
            '<article class="hpl-product"><span class="hpl-product__number">%02d</span><h3>%s</h3><p>%s</p>%s</article>',
            $product,
            esc_html($name),
            esc_html($reason),
            $action
        );
    }

    if ($cards === '') {
        return '';
    }

    return '<div class="hpl-products">' . $cards . '</div><p class="hpl-affiliate-disclosure"><strong>How we recommend:</strong> products are selected for a specific care job and links are added only after review. Some future links may be affiliate links, which can earn HouseplantLab a commission at no extra cost to you.</p>';
}
add_shortcode('houseplantlab_recommended_products', 'houseplantlab_render_recommended_products');

register_activation_hook(__FILE__, static function (): void {
    houseplantlab_register_content();
    flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, 'flush_rewrite_rules');

