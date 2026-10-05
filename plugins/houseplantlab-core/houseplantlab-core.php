<?php
/**
 * Plugin Name: HouseplantLab Core
 * Plugin URI: https://github.com/rjb2803/houseplantlab
 * Description: Permanent content types, taxonomies and structured plant fields for HouseplantLab.
 * Version: 0.6.0
 * Requires at least: 6.6
 * Requires PHP: 8.1
 * Author: HouseplantLab
 * Text Domain: houseplantlab-core
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const HOUSEPLANTLAB_CORE_VERSION = '0.6.0';

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
        'houseplantlab_common_name',
        'houseplantlab_botanical_name',
        'houseplantlab_origin',
        'houseplantlab_difficulty',
        'houseplantlab_light',
        'houseplantlab_watering',
        'houseplantlab_humidity',
        'houseplantlab_growth',
        'houseplantlab_mature_size',
        'houseplantlab_pet_safety',
        'houseplantlab_photo_provenance',
        'houseplantlab_care_light_image',
        'houseplantlab_care_watering_image',
        'houseplantlab_care_humidity_image',
    ];

    $textarea_fields = [
        'houseplantlab_care_intro',
        'houseplantlab_care_light_body',
        'houseplantlab_care_light_tip',
        'houseplantlab_care_watering_body',
        'houseplantlab_care_watering_tip',
        'houseplantlab_care_humidity_body',
        'houseplantlab_care_humidity_tip',
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

    foreach ($textarea_fields as $field) {
        register_post_meta('plant', $field, [
            'type' => 'string',
            'single' => true,
            'show_in_rest' => true,
            'sanitize_callback' => 'sanitize_textarea_field',
            'auth_callback' => static fn (): bool => current_user_can('edit_posts'),
        ]);
    }
}
add_action('init', 'houseplantlab_register_meta');

/**
 * Give editors one fixed place to complete every reusable plant-profile field.
 */
function houseplantlab_add_plant_profile_box(): void
{
    add_meta_box(
        'houseplantlab-plant-profile',
        __('Plant profile checklist', 'houseplantlab-core'),
        'houseplantlab_render_plant_profile_box',
        'plant',
        'normal',
        'high'
    );
}
add_action('add_meta_boxes', 'houseplantlab_add_plant_profile_box');

function houseplantlab_render_plant_profile_box(WP_Post $post): void
{
    wp_nonce_field('houseplantlab_save_plant_profile', 'houseplantlab_plant_profile_nonce');

    $facts = [
        'houseplantlab_common_name' => 'Common name',
        'houseplantlab_botanical_name' => 'Botanical name',
        'houseplantlab_origin' => 'Origin',
        'houseplantlab_difficulty' => 'Difficulty',
        'houseplantlab_light' => 'Light',
        'houseplantlab_watering' => 'Watering',
        'houseplantlab_humidity' => 'Humidity',
        'houseplantlab_growth' => 'Growth rate',
        'houseplantlab_mature_size' => 'Mature size',
        'houseplantlab_pet_safety' => 'Pet safety',
    ];

    echo '<p><strong>Publishing process:</strong> complete the hero excerpt and featured image, every quick fact below, then all three care sections. The front end always renders these fields in the approved order.</p>';
    echo '<h3>Quick facts</h3><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 18px">';
    foreach ($facts as $key => $label) {
        printf(
            '<label><strong>%s</strong><input type="text" name="%s" value="%s" required style="display:block;width:100%%;margin-top:5px"></label>',
            esc_html($label),
            esc_attr($key),
            esc_attr((string) get_post_meta($post->ID, $key, true))
        );
    }
    echo '</div>';

    $sections = [
        'light' => 'Light',
        'watering' => 'Watering',
        'humidity' => 'Humidity',
    ];

    printf(
        '<h3 style="margin-top:24px">Care guide</h3><label><strong>Care guide introduction</strong><textarea name="houseplantlab_care_intro" rows="3" required style="display:block;width:100%%;margin-top:5px">%s</textarea></label>',
        esc_textarea((string) get_post_meta($post->ID, 'houseplantlab_care_intro', true))
    );

    foreach ($sections as $slug => $label) {
        $body_key = "houseplantlab_care_{$slug}_body";
        $tip_key = "houseplantlab_care_{$slug}_tip";
        $image_key = "houseplantlab_care_{$slug}_image";
        printf(
            '<fieldset style="border-top:1px solid #dcdcde;margin-top:20px;padding-top:12px"><legend><strong>%s</strong></legend><label>Guidance<textarea name="%s" rows="4" required style="display:block;width:100%%;margin:5px 0 12px">%s</textarea></label><label>Top tip<textarea name="%s" rows="2" required style="display:block;width:100%%;margin:5px 0 12px">%s</textarea></label><label>Optional image URL<input type="url" name="%s" value="%s" placeholder="Leave empty to use the approved fallback image" style="display:block;width:100%%;margin-top:5px"></label></fieldset>',
            esc_html($label),
            esc_attr($body_key),
            esc_textarea((string) get_post_meta($post->ID, $body_key, true)),
            esc_attr($tip_key),
            esc_textarea((string) get_post_meta($post->ID, $tip_key, true)),
            esc_attr($image_key),
            esc_attr((string) get_post_meta($post->ID, $image_key, true))
        );
    }
}

function houseplantlab_save_plant_profile(int $post_id): void
{
    if (
        ! isset($_POST['houseplantlab_plant_profile_nonce'])
        || ! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['houseplantlab_plant_profile_nonce'])), 'houseplantlab_save_plant_profile')
        || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)
        || ! current_user_can('edit_post', $post_id)
    ) {
        return;
    }

    $fields = array_merge(
        [
            'houseplantlab_common_name',
            'houseplantlab_botanical_name',
            'houseplantlab_origin',
            'houseplantlab_difficulty',
            'houseplantlab_light',
            'houseplantlab_watering',
            'houseplantlab_humidity',
            'houseplantlab_growth',
            'houseplantlab_mature_size',
            'houseplantlab_pet_safety',
            'houseplantlab_care_intro',
        ],
        array_map(static fn (string $section): string => "houseplantlab_care_{$section}_body", ['light', 'watering', 'humidity']),
        array_map(static fn (string $section): string => "houseplantlab_care_{$section}_tip", ['light', 'watering', 'humidity'])
    );

    foreach ($fields as $field) {
        if (isset($_POST[$field])) {
            update_post_meta($post_id, $field, sanitize_textarea_field(wp_unslash($_POST[$field])));
        }
    }

    foreach (['light', 'watering', 'humidity'] as $section) {
        $field = "houseplantlab_care_{$section}_image";
        if (isset($_POST[$field])) {
            update_post_meta($post_id, $field, esc_url_raw(wp_unslash($_POST[$field])));
        }
    }
}
add_action('save_post_plant', 'houseplantlab_save_plant_profile');

/**
 * Render the four most important care signals in the plant hero. Keeping this
 * data in post meta means the same hero works for every plant profile.
 */
function houseplantlab_render_plant_hero_signals(): string
{
    if (get_post_type() !== 'plant') {
        return '';
    }

    $signals = [
        [
            'label' => 'Care level',
            'key' => 'houseplantlab_difficulty',
            'icon' => '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M12 7v5l3 2"/>',
        ],
        [
            'label' => 'Light',
            'key' => 'houseplantlab_light',
            'icon' => '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>',
        ],
        [
            'label' => 'Watering',
            'key' => 'houseplantlab_watering',
            'icon' => '<path d="M12 2.75S6.5 9.1 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.1 12 2.75 12 2.75Z"/>',
        ],
        [
            'label' => 'Pet safety',
            'key' => 'houseplantlab_pet_safety',
            'icon' => '<path d="M8.7 12.3c-2.25 1.3-3.6 3.15-3.05 5.05.55 1.85 2.6 2.15 4.15 1.4 1.35-.65 3.05-.65 4.4 0 1.55.75 3.6.45 4.15-1.4.55-1.9-.8-3.75-3.05-5.05-2.05-1.2-4.55-1.2-6.6 0Z"/><circle cx="6.25" cy="8.25" r="1.55"/><circle cx="10.25" cy="5.75" r="1.55"/><circle cx="17.75" cy="8.25" r="1.55"/><circle cx="13.75" cy="5.75" r="1.55"/>',
        ],
    ];

    $items = '';
    foreach ($signals as $signal) {
        $value = trim((string) get_post_meta(get_the_ID(), $signal['key'], true));
        if ($value === '') {
            continue;
        }

        $items .= sprintf(
            '<div class="hpl-profile-signal"><span class="hpl-profile-signal__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">%s</svg></span><span><small>%s</small><strong>%s</strong></span></div>',
            $signal['icon'],
            esc_html($signal['label']),
            esc_html($value)
        );
    }

    return $items === '' ? '' : '<div class="hpl-profile-signals">' . $items . '</div>';
}
add_shortcode('houseplantlab_plant_hero_signals', 'houseplantlab_render_plant_hero_signals');

/**
 * Render editorially useful plant facts from the registered plant metadata.
 */
function houseplantlab_render_plant_facts(): string
{
    if (get_post_type() !== 'plant') {
        return '';
    }

    $facts = [
        'Common name' => 'houseplantlab_common_name',
        'Botanical name' => 'houseplantlab_botanical_name',
        'Origin' => 'houseplantlab_origin',
        'Difficulty' => 'houseplantlab_difficulty',
        'Light' => 'houseplantlab_light',
        'Watering' => 'houseplantlab_watering',
        'Humidity' => 'houseplantlab_humidity',
        'Growth rate' => 'houseplantlab_growth',
        'Mature size' => 'houseplantlab_mature_size',
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

    if ($items === '') {
        return '';
    }

    $image = get_the_post_thumbnail(
        get_the_ID(),
        'large',
        [
            'class' => 'hpl-facts-card__image',
            'loading' => 'lazy',
        ]
    );

    $media = $image !== ''
        ? $image
        : '<span class="hpl-facts-card__fallback" role="img" aria-label="Close-up of Monstera deliciosa foliage"></span>';

    return '<div class="hpl-facts-card"><dl class="hpl-facts">' . $items . '</dl><figure class="hpl-facts-card__media">' . $media . '</figure></div>';
}
add_shortcode('houseplantlab_plant_facts', 'houseplantlab_render_plant_facts');

/**
 * Render the fixed three-part care guide from structured Plant fields.
 */
function houseplantlab_render_care_guide(): string
{
    if (get_post_type() !== 'plant') {
        return '';
    }

    $sections = [
        'light' => [
            'title' => 'Light',
            'icon' => '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>',
        ],
        'watering' => [
            'title' => 'Watering',
            'icon' => '<path d="M12 2.75S6.5 9.1 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.1 12 2.75 12 2.75Z"/>',
        ],
        'humidity' => [
            'title' => 'Humidity',
            'icon' => '<path d="M7 19c-2-2-2-4 0-6s2-4 0-6M12 19c-2-2-2-4 0-6s2-4 0-6M17 19c-2-2-2-4 0-6s2-4 0-6"/>',
        ],
    ];

    $cards = '';
    foreach ($sections as $slug => $section) {
        $body = trim((string) get_post_meta(get_the_ID(), "houseplantlab_care_{$slug}_body", true));
        $tip = trim((string) get_post_meta(get_the_ID(), "houseplantlab_care_{$slug}_tip", true));
        $image_url = trim((string) get_post_meta(get_the_ID(), "houseplantlab_care_{$slug}_image", true));

        if ($body === '') {
            continue;
        }

        $media = $image_url !== ''
            ? sprintf('<img src="%s" alt="%s care for %s" loading="lazy">', esc_url($image_url), esc_attr($section['title']), esc_attr(get_the_title()))
            : sprintf('<span class="hpl-care-card__fallback hpl-care-card__fallback--%s" role="img" aria-label="%s care for %s"></span>', esc_attr($slug), esc_attr($section['title']), esc_attr(get_the_title()));

        $tip_markup = $tip === ''
            ? ''
            : sprintf('<div class="hpl-care-tip"><span aria-hidden="true">♧</span><p><strong>Top tip</strong>%s</p></div>', esc_html($tip));

        $cards .= sprintf(
            '<article class="hpl-care-card"><figure class="hpl-care-card__media">%s</figure><div class="hpl-care-card__content"><div class="hpl-care-card__heading"><span class="hpl-care-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">%s</svg></span><h3>%s</h3></div><p>%s</p>%s</div></article>',
            $media,
            $section['icon'],
            esc_html($section['title']),
            esc_html($body),
            $tip_markup
        );
    }

    if ($cards === '') {
        return '';
    }

    $intro = trim((string) get_post_meta(get_the_ID(), 'houseplantlab_care_intro', true));
    $intro_markup = $intro === '' ? '' : '<p class="hpl-care-guide__intro">' . esc_html($intro) . '</p>';

    return '<div class="hpl-care-guide">' . $intro_markup . $cards . '</div>';
}
add_shortcode('houseplantlab_care_guide', 'houseplantlab_render_care_guide');

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

