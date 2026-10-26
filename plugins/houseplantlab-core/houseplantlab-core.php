<?php
/**
 * Plugin Name: HouseplantLab Core
 * Plugin URI: https://github.com/rjb2803/houseplantlab
 * Description: Permanent content types, taxonomies and structured plant fields for HouseplantLab.
 * Version: 0.8.0
 * Requires at least: 6.6
 * Requires PHP: 8.1
 * Author: HouseplantLab
 * Text Domain: houseplantlab-core
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const HOUSEPLANTLAB_CORE_VERSION = '0.8.0';

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
 * Publish the authorised seller declaration at the root ads.txt URL.
 *
 * The site does not have a writable document-root file in this repository, so
 * WordPress serves the standard declaration before its normal 404 handling.
 */
function houseplantlab_serve_ads_txt(): void
{
    if (is_admin() || wp_doing_ajax() || ! isset($_SERVER['REQUEST_URI'])) {
        return;
    }

    $request_path = wp_parse_url(wp_unslash((string) $_SERVER['REQUEST_URI']), PHP_URL_PATH);
    $home_path = wp_parse_url(home_url('/'), PHP_URL_PATH);

    if (! is_string($request_path) || ! is_string($home_path)) {
        return;
    }

    $relative_path = trim($request_path, '/');
    $normalised_home_path = trim($home_path, '/');
    if ($normalised_home_path !== '' && str_starts_with($relative_path, $normalised_home_path . '/')) {
        $relative_path = substr($relative_path, strlen($normalised_home_path) + 1);
    }

    if ($relative_path !== 'ads.txt') {
        return;
    }

    status_header(200);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: public, max-age=86400');
    echo "google.com, pub-0278710559651957, DIRECT, f08c47fec0942fa0\n";
    exit;
}
add_action('template_redirect', 'houseplantlab_serve_ads_txt', -95);

/**
 * Keep the AdSense ownership and review code available throughout the site.
 * The published Google CMP controls consent for eligible UK/EEA/Swiss users.
 */
function houseplantlab_output_adsense_code(): void
{
    echo '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0278710559651957" crossorigin="anonymous"></script>' . "\n";
}
add_action('wp_head', 'houseplantlab_output_adsense_code', 1);

/**
 * Identify the numeric query-string pattern left by the October 2026 spam
 * injection. Keep this deliberately narrow so ordinary WordPress, analytics
 * and campaign query parameters continue to work normally.
 */
function houseplantlab_is_hacked_numeric_query(string $request_uri): bool
{
    $request_path = wp_parse_url($request_uri, PHP_URL_PATH);
    $query = wp_parse_url($request_uri, PHP_URL_QUERY);
    $home_path = wp_parse_url(home_url('/'), PHP_URL_PATH);

    if (! is_string($request_path) || ! is_string($query) || $query === '') {
        return false;
    }

    $normalised_request_path = '/' . trim($request_path, '/');
    $normalised_home_path = '/' . trim(is_string($home_path) ? $home_path : '/', '/');

    if ($normalised_request_path !== $normalised_home_path) {
        return false;
    }

    // Match the attack's single-letter, long-numeric query URLs while
    // preserving WordPress's legitimate one-letter public query variables:
    // m (date archive), p (post), s (search), and w (week archive).
    return preg_match('/^(?!(?:m|p|s|w)=)[a-z]=\d{7,}$/D', $query) === 1;
}

/**
 * Tell crawlers that the injected spam URLs have been permanently removed.
 * Redirecting these requests to the homepage would create soft-404 responses
 * and could keep the fake URLs in search results for longer.
 */
function houseplantlab_reject_hacked_numeric_queries(): void
{
    if (is_admin() || wp_doing_ajax() || ! isset($_SERVER['REQUEST_URI'])) {
        return;
    }

    $request_uri = wp_unslash((string) $_SERVER['REQUEST_URI']);
    if (! houseplantlab_is_hacked_numeric_query($request_uri)) {
        return;
    }

    status_header(410);
    nocache_headers();
    header('X-Robots-Tag: noindex, nofollow', true);
    header('Content-Type: text/html; charset=' . get_option('blog_charset'));

    echo '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Gone</title></head><body><h1>Gone</h1><p>This URL has been permanently removed.</p></body></html>';
    exit;
}
add_action('template_redirect', 'houseplantlab_reject_hacked_numeric_queries', -90);

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
        'houseplantlab_overview_standfirst',
        'houseplantlab_overview_body_one',
        'houseplantlab_overview_body_two',
        'houseplantlab_overview_quote',
        'houseplantlab_propagation_intro',
    ];

    for ($problem = 1; $problem <= 3; $problem++) {
        $text_fields[] = "houseplantlab_problem_{$problem}_title";
        $text_fields[] = "houseplantlab_problem_{$problem}_link";
        $textarea_fields[] = "houseplantlab_problem_{$problem}_body";
    }

    for ($step = 1; $step <= 3; $step++) {
        $textarea_fields[] = "houseplantlab_propagation_step_{$step}";
    }

    for ($faq = 1; $faq <= 4; $faq++) {
        $text_fields[] = "houseplantlab_faq_{$faq}_question";
        $textarea_fields[] = "houseplantlab_faq_{$faq}_answer";
    }

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

    $publication_fields = [
        'houseplantlab_overview_standfirst' => ['Overview standfirst', 3],
        'houseplantlab_overview_body_one' => ['Overview paragraph one', 5],
        'houseplantlab_overview_body_two' => ['Overview paragraph two', 4],
        'houseplantlab_overview_quote' => ['Pull quote', 2],
        'houseplantlab_propagation_intro' => ['Propagation introduction', 4],
    ];

    echo '<h3 style="margin-top:28px">Publication sections</h3><p>These fields power the long-form magazine layout and stay in the same order for every plant.</p>';
    foreach ($publication_fields as $key => [$label, $rows]) {
        printf(
            '<label style="display:block;margin-top:14px"><strong>%s</strong><textarea name="%s" rows="%d" style="display:block;width:100%%;margin-top:5px">%s</textarea></label>',
            esc_html($label),
            esc_attr($key),
            (int) $rows,
            esc_textarea((string) get_post_meta($post->ID, $key, true))
        );
    }

    echo '<h4>Common problems</h4><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px">';
    for ($problem = 1; $problem <= 3; $problem++) {
        printf(
            '<fieldset style="border:1px solid #dcdcde;padding:12px"><legend><strong>Problem %1$d</strong></legend><label>Title<input type="text" name="houseplantlab_problem_%1$d_title" value="%2$s" style="display:block;width:100%%;margin:5px 0 10px"></label><label>Summary<textarea name="houseplantlab_problem_%1$d_body" rows="4" style="display:block;width:100%%;margin:5px 0 10px">%3$s</textarea></label><label>Optional guide URL<input type="url" name="houseplantlab_problem_%1$d_link" value="%4$s" style="display:block;width:100%%;margin-top:5px"></label></fieldset>',
            $problem,
            esc_attr((string) get_post_meta($post->ID, "houseplantlab_problem_{$problem}_title", true)),
            esc_textarea((string) get_post_meta($post->ID, "houseplantlab_problem_{$problem}_body", true)),
            esc_attr((string) get_post_meta($post->ID, "houseplantlab_problem_{$problem}_link", true))
        );
    }
    echo '</div><h4>Propagation steps</h4>';
    for ($step = 1; $step <= 3; $step++) {
        printf(
            '<label style="display:block;margin-top:10px"><strong>Step %1$d</strong><textarea name="houseplantlab_propagation_step_%1$d" rows="2" style="display:block;width:100%%;margin-top:5px">%2$s</textarea></label>',
            $step,
            esc_textarea((string) get_post_meta($post->ID, "houseplantlab_propagation_step_{$step}", true))
        );
    }

    echo '<h4>Frequently asked questions</h4>';
    for ($faq = 1; $faq <= 4; $faq++) {
        printf(
            '<fieldset style="border-top:1px solid #dcdcde;margin-top:14px;padding-top:10px"><legend><strong>Question %1$d</strong></legend><label>Question<input type="text" name="houseplantlab_faq_%1$d_question" value="%2$s" style="display:block;width:100%%;margin:5px 0 10px"></label><label>Answer<textarea name="houseplantlab_faq_%1$d_answer" rows="3" style="display:block;width:100%%;margin-top:5px">%3$s</textarea></label></fieldset>',
            $faq,
            esc_attr((string) get_post_meta($post->ID, "houseplantlab_faq_{$faq}_question", true)),
            esc_textarea((string) get_post_meta($post->ID, "houseplantlab_faq_{$faq}_answer", true))
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
        array_map(static fn (string $section): string => "houseplantlab_care_{$section}_tip", ['light', 'watering', 'humidity']),
        [
            'houseplantlab_overview_standfirst',
            'houseplantlab_overview_body_one',
            'houseplantlab_overview_body_two',
            'houseplantlab_overview_quote',
            'houseplantlab_propagation_intro',
        ],
        array_map(static fn (int $problem): string => "houseplantlab_problem_{$problem}_body", range(1, 3)),
        array_map(static fn (int $step): string => "houseplantlab_propagation_step_{$step}", range(1, 3)),
        array_map(static fn (int $faq): string => "houseplantlab_faq_{$faq}_answer", range(1, 4))
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

    foreach (range(1, 3) as $problem) {
        foreach (['title', 'link'] as $suffix) {
            $field = "houseplantlab_problem_{$problem}_{$suffix}";
            if (isset($_POST[$field])) {
                $value = wp_unslash($_POST[$field]);
                update_post_meta($post_id, $field, $suffix === 'link' ? esc_url_raw($value) : sanitize_text_field($value));
            }
        }
    }

    foreach (range(1, 4) as $faq) {
        $field = "houseplantlab_faq_{$faq}_question";
        if (isset($_POST[$field])) {
            update_post_meta($post_id, $field, sanitize_text_field(wp_unslash($_POST[$field])));
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
            '<div class="hpl-profile-signal"><span class="hpl-profile-signal__icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">%s</svg></span><span><small>%s</small><strong>%s</strong></span></div>',
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
            '<article id="care-%s" class="hpl-care-card"><figure class="hpl-care-card__media">%s</figure><div class="hpl-care-card__content"><div class="hpl-care-card__heading"><span class="hpl-care-card__icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">%s</svg></span><h3>%s</h3></div><p>%s</p>%s</div></article>',
            esc_attr($slug),
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
        $url = trim((string) get_post_meta(get_the_ID(), "houseplantlab_product_{$product}_url", true));
        if ($name === '' || $url === '') {
            continue;
        }

        $reason = trim((string) get_post_meta(get_the_ID(), "houseplantlab_product_{$product}_reason", true));
        $label = trim((string) get_post_meta(get_the_ID(), "houseplantlab_product_{$product}_label", true));
        $action = sprintf('<a class="hpl-product__link" href="%s" rel="sponsored nofollow">%s <span aria-hidden="true">→</span></a>', esc_url($url), esc_html($label !== '' ? $label : 'Check price'));

        $cards .= sprintf(
            '<article class="hpl-product"><span class="hpl-product__image hpl-product__image--%1$d" role="img" aria-label="%2$s"></span><div class="hpl-product__body"><h3>%2$s</h3><p>%3$s</p>%4$s</div></article>',
            $product,
            esc_html($name),
            esc_html($reason),
            $action
        );
    }

    if ($cards === '') {
        return '';
    }

    return '<div class="hpl-products">' . $cards . '</div><p id="affiliate-disclosure" class="hpl-affiliate-disclosure"><strong>Affiliate disclosure:</strong> products are selected for a specific care job. Where a link is marked as an affiliate link, HouseplantLab may earn a commission at no extra cost to you.</p>';
}
add_shortcode('houseplantlab_recommended_products', 'houseplantlab_render_recommended_products');

/**
 * Read one structured plant field as a trimmed string.
 */
function houseplantlab_plant_field(string $key): string
{
    return trim((string) get_post_meta(get_the_ID(), $key, true));
}

/**
 * Render the complete publication-style plant profile. The WordPress template
 * stays deliberately small while every plant uses this fixed editorial order.
 */
function houseplantlab_render_publication_profile(): string
{
    if (get_post_type() !== 'plant') {
        return '';
    }

    $title = get_the_title();
    $botanical = houseplantlab_plant_field('houseplantlab_botanical_name');
    $excerpt = trim((string) get_the_excerpt());
    $hero_image = get_the_post_thumbnail(
        get_the_ID(),
        'full',
        ['class' => 'hpl-pub-hero__image', 'loading' => 'eager', 'fetchpriority' => 'high']
    );
    if ($hero_image === '') {
        $hero_image = '<span class="hpl-pub-hero__fallback" role="img" aria-label="' . esc_attr($title) . '"></span>';
    }

    $facts = [
        'Difficulty' => houseplantlab_plant_field('houseplantlab_difficulty'),
        'Best light' => houseplantlab_plant_field('houseplantlab_light'),
        'Water when' => houseplantlab_plant_field('houseplantlab_watering'),
        'Growth' => houseplantlab_plant_field('houseplantlab_growth'),
        'Pet safety' => houseplantlab_plant_field('houseplantlab_pet_safety'),
    ];

    $fact_markup = '';
    foreach ($facts as $label => $value) {
        if ($value !== '') {
            $fact_markup .= '<div class="hpl-pub-fact"><span>' . esc_html($label) . '</span><strong>' . esc_html($value) . '</strong></div>';
        }
    }

    $overview_standfirst = houseplantlab_plant_field('houseplantlab_overview_standfirst');
    $overview_body_one = houseplantlab_plant_field('houseplantlab_overview_body_one');
    $overview_body_two = houseplantlab_plant_field('houseplantlab_overview_body_two');
    $overview_quote = houseplantlab_plant_field('houseplantlab_overview_quote');
    $care_markup = houseplantlab_render_care_guide();

    $problems = '';
    for ($problem = 1; $problem <= 3; $problem++) {
        $problem_title = houseplantlab_plant_field("houseplantlab_problem_{$problem}_title");
        $problem_body = houseplantlab_plant_field("houseplantlab_problem_{$problem}_body");
        $problem_link = houseplantlab_plant_field("houseplantlab_problem_{$problem}_link");
        if ($problem_title === '') {
            continue;
        }
        $problem_action = $problem_link !== ''
            ? '<a href="' . esc_url($problem_link) . '">Read the full guide <span aria-hidden="true">→</span></a>'
            : '';
        $problems .= sprintf(
            '<article class="hpl-pub-problem"><span class="hpl-pub-problem__image hpl-pub-problem__image--%1$d" role="img" aria-label="%2$s"></span><div><h3>%2$s</h3><p>%3$s</p>%4$s</div></article>',
            $problem,
            esc_html($problem_title),
            esc_html($problem_body),
            $problem_action
        );
    }

    $propagation_intro = houseplantlab_plant_field('houseplantlab_propagation_intro');
    $propagation_steps = '';
    for ($step = 1; $step <= 3; $step++) {
        $step_text = houseplantlab_plant_field("houseplantlab_propagation_step_{$step}");
        if ($step_text !== '') {
            $propagation_steps .= '<li>' . esc_html($step_text) . '</li>';
        }
    }

    $faqs = '';
    for ($faq = 1; $faq <= 4; $faq++) {
        $question = houseplantlab_plant_field("houseplantlab_faq_{$faq}_question");
        $answer = houseplantlab_plant_field("houseplantlab_faq_{$faq}_answer");
        if ($question !== '' && $answer !== '') {
            $faqs .= sprintf(
                '<details%1$s><summary>%2$s</summary><p>%3$s</p></details>',
                $faq === 1 ? ' open' : '',
                esc_html($question),
                esc_html($answer)
            );
        }
    }

    $product_markup = houseplantlab_render_recommended_products();
    $modified = get_the_modified_date('j F Y');

    ob_start();
    ?>
    <main class="hpl-publication" id="wp--skip-link--target">
        <p class="hpl-pub-breadcrumb"><a href="<?php echo esc_url(home_url('/')); ?>">Home</a><span>/</span><a href="<?php echo esc_url(get_post_type_archive_link('plant')); ?>">Plant profiles</a><span>/</span><?php echo esc_html($title); ?></p>
        <section class="hpl-pub-hero">
            <div class="hpl-pub-hero__copy">
                <span class="hpl-pub-kicker">The definitive growing guide</span>
                <h1><?php echo esc_html($title); ?></h1>
                <?php if ($botanical !== '') : ?><p class="hpl-pub-botanical"><?php echo esc_html($botanical); ?></p><?php endif; ?>
                <?php if ($excerpt !== '') : ?><p class="hpl-pub-deck"><?php echo esc_html($excerpt); ?></p><?php endif; ?>
                <div class="hpl-pub-byline"><span class="hpl-pub-byline__mark" aria-hidden="true">⌁</span><span><strong>Reviewed by HouseplantLab</strong><small>Last reviewed <?php echo esc_html($modified); ?> · Practical UK growing guide</small></span></div>
            </div>
            <figure class="hpl-pub-hero__media"><?php echo $hero_image; ?><figcaption><?php echo esc_html($title); ?> in bright, indirect light</figcaption></figure>
            <div class="hpl-pub-facts"><?php echo $fact_markup; ?></div>
        </section>

        <nav class="hpl-pub-nav" aria-label="Plant guide sections"><a class="is-active" href="#overview">Overview</a><a href="#care">Care</a><?php if ($problems !== '') : ?><a href="#problems">Problems</a><?php endif; ?><?php if ($propagation_intro !== '' || $propagation_steps !== '') : ?><a href="#propagation">Propagation</a><?php endif; ?><?php if ($product_markup !== '') : ?><a href="#recommended-kit">Recommended kit</a><?php endif; ?><?php if ($faqs !== '') : ?><a href="#faq">FAQ</a><?php endif; ?></nav>

        <section class="hpl-pub-editorial" id="overview">
            <article class="hpl-pub-story"><span class="hpl-pub-kicker">At home with <?php echo esc_html($title); ?></span><h2>A tropical climber with real presence</h2>
                <?php if ($overview_standfirst !== '') : ?><p class="hpl-pub-standfirst"><?php echo esc_html($overview_standfirst); ?></p><?php endif; ?>
                <?php if ($overview_body_one !== '') : ?><p class="hpl-pub-intro"><?php echo esc_html($overview_body_one); ?></p><?php endif; ?>
                <?php if ($overview_body_two !== '') : ?><p><?php echo esc_html($overview_body_two); ?></p><?php endif; ?>
                <?php if ($overview_quote !== '') : ?><blockquote><?php echo esc_html($overview_quote); ?></blockquote><?php endif; ?>
                <span class="hpl-pub-kicker" id="care">The essential care</span><h2>Four decisions that matter</h2><?php echo $care_markup; ?>
            </article>
            <aside class="hpl-pub-rail"><nav aria-label="In this guide"><h2>In this guide</h2><a href="#care">Care essentials <span>→</span></a><?php if ($problems !== '') : ?><a href="#problems">Common problems <span>→</span></a><?php endif; ?><?php if ($propagation_intro !== '' || $propagation_steps !== '') : ?><a href="#propagation">Propagation <span>→</span></a><?php endif; ?><?php if ($product_markup !== '') : ?><a href="#recommended-kit">Recommended kit <span>→</span></a><?php endif; ?><?php if ($faqs !== '') : ?><a href="#faq">Questions answered <span>→</span></a><?php endif; ?></nav><div class="hpl-pub-promise"><strong>Our promise</strong><br>Advice is checked against reputable horticultural sources and updated when the evidence changes.</div></aside>
        </section>

        <?php if ($problems !== '') : ?><section class="hpl-pub-section hpl-pub-section--sage" id="problems"><div class="hpl-pub-section__heading"><div><span class="hpl-pub-kicker">Read the leaves</span><h2>What is your <?php echo esc_html($title); ?> telling you?</h2></div><p>Start with the pattern of damage, then check roots, compost and recent changes before reaching for a treatment.</p></div><div class="hpl-pub-problems"><?php echo $problems; ?></div></section><?php endif; ?>

        <?php if ($propagation_intro !== '' || $propagation_steps !== '') : ?><section class="hpl-pub-section" id="propagation"><div class="hpl-pub-propagation"><span class="hpl-pub-propagation__image" role="img" aria-label="Propagating <?php echo esc_attr($title); ?>"></span><div><span class="hpl-pub-kicker">Make another plant</span><h2>Propagation starts with a node</h2><p><?php echo esc_html($propagation_intro); ?></p><ol><?php echo $propagation_steps; ?></ol></div></div></section><?php endif; ?>

        <?php if ($product_markup !== '') : ?><section class="hpl-pub-commerce" id="recommended-kit"><div class="hpl-pub-commerce__heading"><div><span class="hpl-pub-kicker">Considered recommendations</span><h2>The <?php echo esc_html($title); ?> care kit</h2></div><p>Three useful tools, each tied to a genuine care job. Products are linked only after assessment.</p></div><?php echo $product_markup; ?></section><?php endif; ?>

        <?php if ($faqs !== '') : ?><section class="hpl-pub-section" id="faq"><div class="hpl-pub-faq"><div><span class="hpl-pub-kicker">Straight answers</span><h2><?php echo esc_html($title); ?> questions, answered</h2><p>Practical answers for the situations UK growers encounter most often.</p></div><div class="hpl-pub-faq__list"><?php echo $faqs; ?></div></div></section><?php endif; ?>

        <section class="hpl-pub-evidence"><h2>How we know</h2><div><p>This profile is reviewed against reputable horticultural sources. Product claims and editorial illustrations are labelled according to their provenance.</p><a href="<?php echo esc_url(home_url('/about/')); ?>">Read our editorial and testing policy <span aria-hidden="true">→</span></a></div></section>
    </main>
    <?php
    $profile = (string) ob_get_clean();

    // Core's Shortcode block can run paragraph formatting over returned HTML.
    // Removing whitespace between tags prevents stray paragraphs from becoming
    // grid children and breaking the carefully controlled publication layout.
    $compact_profile = preg_replace('/>\s+</', '><', $profile);

    return is_string($compact_profile) ? $compact_profile : $profile;
}
add_shortcode('houseplantlab_publication_profile', 'houseplantlab_render_publication_profile');

/**
 * Render an accessible first-step problem checker. It narrows the existing
 * evidence-reviewed guides by visible symptom and, optionally, plant. It does
 * not claim to diagnose a plant from a single symptom.
 */
function houseplantlab_render_problem_checker(): string
{
    $guides = [
        ['yellow', 'pothos', 'Why are my Pothos leaves turning yellow?', '/why-are-my-pothos-leaves-turning-yellow/'],
        ['yellow', 'peace-lily', 'Why are my Peace Lily leaves turning yellow?', '/why-are-my-peace-lily-leaves-turning-yellow/'],
        ['yellow', 'snake-plant', 'Why are my Snake Plant leaves turning yellow?', '/why-are-my-snake-plant-leaves-turning-yellow/'],
        ['yellow', 'rubber-plant', 'Why are my Rubber Plant leaves turning yellow?', '/why-are-my-rubber-plant-leaves-turning-yellow/'],
        ['yellow', 'fiddle-leaf-fig', 'Why are my Fiddle-leaf Fig leaves turning yellow?', '/why-are-my-fiddle-leaf-fig-leaves-turning-yellow/'],
        ['yellow', 'phalaenopsis-orchid', 'Why are my Phalaenopsis Orchid leaves turning yellow?', '/why-are-my-phalaenopsis-orchid-leaves-turning-yellow/'],
        ['yellow', 'zz-plant', 'Why are my ZZ Plant leaves turning yellow?', '/why-are-my-zz-plant-leaves-turning-yellow/'],
        ['yellow', 'spider-plant', 'Why are my Spider Plant leaves turning yellow?', '/why-are-my-spider-plant-leaves-turning-yellow/'],
        ['brown', 'monstera-deliciosa', 'Brown spots on Monstera deliciosa leaves', '/brown-spots-monstera-deliciosa-leaves/'],
        ['brown', 'pothos', 'Brown spots on Pothos leaves', '/brown-spots-on-pothos-leaves/'],
        ['brown', 'rubber-plant', 'Brown spots on Rubber Plant leaves', '/brown-spots-rubber-plant-leaves/'],
        ['brown', 'fiddle-leaf-fig', 'Brown spots on Fiddle-leaf Fig leaves', '/brown-spots-fiddle-leaf-fig-leaves/'],
        ['brown', 'aloe-vera', 'Brown tips on Aloe Vera leaves', '/why-are-my-aloe-vera-leaves-turning-brown-at-the-tips/'],
        ['brown', 'calathea', 'Brown edges on Calathea leaves', '/why-are-my-calathea-leaves-turning-brown-at-the-edges/'],
        ['brown', 'spider-plant', 'Brown tips on Spider Plant leaves', '/why-are-my-spider-plant-tips-turning-brown/'],
        ['curling', 'calathea', 'Why are my Calathea leaves curling?', '/why-are-my-calathea-leaves-curling/'],
        ['curling', 'monstera-deliciosa', 'Why are my Monstera deliciosa leaves curling?', '/why-are-my-monstera-deliciosa-leaves-curling/'],
        ['curling', 'pothos', 'Why are my Pothos leaves curling?', '/why-are-my-pothos-leaves-curling/'],
        ['drooping', 'monstera-deliciosa', 'Why is my Monstera deliciosa drooping?', '/why-is-my-monstera-deliciosa-drooping/'],
        ['drooping', 'peace-lily', 'Why is my Peace Lily drooping?', '/why-is-my-peace-lily-drooping/'],
        ['drooping', 'rubber-plant', 'Why is my Rubber Plant drooping?', '/why-is-my-rubber-plant-drooping/'],
        ['pests', 'all', 'Fungus gnats on houseplants', '/fungus-gnats-houseplants-identification-control/'],
        ['pests', 'all', 'Mealybugs on houseplants', '/mealybugs-on-houseplants/'],
        ['pests', 'all', 'Scale insects on houseplants', '/scale-insects-on-houseplants/'],
        ['pests', 'all', 'Spider mites on houseplants', '/spider-mites-on-houseplants/'],
        ['pests', 'all', 'Thrips on houseplants', '/thrips-on-houseplants/'],
        ['roots', 'all', 'Suspected root rot in houseplants', '/suspected-root-rot-houseplants/'],
        ['roots', 'all', 'Choosing a well-drained growing medium', '/well-drained-growing-medium-houseplants/'],
    ];

    $plants = [
        '' => 'Any or unknown plant',
        'aloe-vera' => 'Aloe Vera',
        'calathea' => 'Calathea',
        'fiddle-leaf-fig' => 'Fiddle-leaf Fig',
        'monstera-deliciosa' => 'Monstera deliciosa',
        'peace-lily' => 'Peace Lily',
        'phalaenopsis-orchid' => 'Phalaenopsis Orchid',
        'pothos' => 'Pothos',
        'rubber-plant' => 'Rubber Plant',
        'snake-plant' => 'Snake Plant',
        'spider-plant' => 'Spider Plant',
        'zz-plant' => 'ZZ Plant',
    ];

    $checker_id = wp_unique_id('hpl-problem-checker-');
    $cards = '';
    foreach ($guides as [$symptom, $plant, $title, $path]) {
        $cards .= sprintf(
            '<li class="hpl-checker__result" data-symptom="%1$s" data-plant="%2$s" hidden><a href="%3$s"><strong>%4$s</strong><span>Open guide →</span></a></li>',
            esc_attr($symptom),
            esc_attr($plant),
            esc_url(home_url($path)),
            esc_html($title)
        );
    }

    $plant_options = '';
    foreach ($plants as $value => $label) {
        $plant_options .= '<option value="' . esc_attr($value) . '">' . esc_html($label) . '</option>';
    }

    ob_start();
    ?>
    <section class="hpl-checker" id="<?php echo esc_attr($checker_id); ?>">
        <div class="hpl-checker__intro">
            <p class="hpl-hub-kicker">Start with what you can see</p>
            <h2>Find the most relevant troubleshooting guides</h2>
            <p>A leaf symptom can have several causes. This checker narrows the reading list; it does not diagnose a plant from one sign alone.</p>
        </div>
        <form class="hpl-checker__form">
            <label>What is the clearest symptom?
                <select name="symptom" required>
                    <option value="">Choose a symptom</option>
                    <option value="yellow">Yellow leaves</option>
                    <option value="brown">Brown tips, edges or spots</option>
                    <option value="curling">Curling leaves</option>
                    <option value="drooping">Drooping or wilting</option>
                    <option value="pests">Visible pests or sticky residue</option>
                    <option value="roots">Wet compost, damaged roots or repotting concern</option>
                </select>
            </label>
            <label>Which plant is affected?
                <select name="plant"><?php echo $plant_options; ?></select>
            </label>
            <button type="submit">Show relevant guides</button>
        </form>
        <div class="hpl-checker__output" aria-live="polite">
            <p class="hpl-checker__status">Choose a symptom to begin.</p>
            <ul class="hpl-checker__results"><?php echo $cards; ?></ul>
            <p class="hpl-checker__none" hidden>No plant-specific match is available yet. Try “Any or unknown plant” or browse the complete <a href="<?php echo esc_url(home_url('/problems/')); ?>">Plant Problems hub</a>.</p>
        </div>
    </section>
    <script>
    (() => {
        const root = document.getElementById(<?php echo wp_json_encode($checker_id); ?>);
        if (!root) return;
        const form = root.querySelector('form');
        const status = root.querySelector('.hpl-checker__status');
        const empty = root.querySelector('.hpl-checker__none');
        const cards = [...root.querySelectorAll('.hpl-checker__result')];
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const symptom = form.elements.symptom.value;
            const plant = form.elements.plant.value;
            let matches = 0;
            cards.forEach((card) => {
                const plantMatches = !plant || card.dataset.plant === plant || card.dataset.plant === 'all';
                const show = card.dataset.symptom === symptom && plantMatches;
                card.hidden = !show;
                if (show) matches += 1;
            });
            status.textContent = matches === 1 ? '1 relevant guide found.' : `${matches} relevant guides found.`;
            empty.hidden = matches !== 0;
        });
    })();
    </script>
    <?php
    return (string) ob_get_clean();
}
add_shortcode('houseplantlab_problem_checker', 'houseplantlab_render_problem_checker');

/**
 * Render a small, privacy-conscious contact form without exposing the
 * WordPress administrator email address in the page source.
 */
function houseplantlab_render_contact_form(): string
{
    $status = isset($_GET['contact'])
        ? sanitize_key(wp_unslash((string) $_GET['contact']))
        : '';
    $notice = '';

    if ($status === 'sent') {
        $notice = '<p class="hpl-contact-form__notice hpl-contact-form__notice--success" role="status">Thank you. Your message has been sent to HouseplantLab.</p>';
    } elseif ($status === 'error') {
        $notice = '<p class="hpl-contact-form__notice hpl-contact-form__notice--error" role="alert">We could not send your message. Please check the fields and try again later.</p>';
    }

    $nonce = wp_nonce_field('houseplantlab_contact', 'houseplantlab_contact_nonce', true, false);
    $privacy_url = home_url('/privacy-policy/');

    return $notice . sprintf(
        '<form class="hpl-contact-form" action="%1$s" method="post"><input type="hidden" name="action" value="houseplantlab_contact">%2$s<div class="hpl-contact-form__grid"><label>Name <input type="text" name="name" autocomplete="name" maxlength="120" required></label><label>Email <input type="email" name="email" autocomplete="email" maxlength="254" required></label></div><label>Subject <input type="text" name="subject" maxlength="160"></label><label>Message <textarea name="message" rows="8" minlength="20" maxlength="5000" required></textarea></label><div class="hpl-contact-form__trap" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div><label class="hpl-contact-form__consent"><input type="checkbox" name="privacy_consent" value="1" required> I agree that HouseplantLab may use my details to reply to this enquiry, as explained in the <a href="%3$s">Privacy Policy</a>.</label><button type="submit">Send message</button></form>',
        esc_url(admin_url('admin-post.php')),
        $nonce,
        esc_url($privacy_url)
    );
}
add_shortcode('houseplantlab_contact_form', 'houseplantlab_render_contact_form');

/**
 * Deliver contact enquiries to the configured WordPress administrator email.
 * The plugin does not store submissions in WordPress.
 */
function houseplantlab_handle_contact_form(): void
{
    $redirect = home_url('/contact/');

    $nonce = isset($_POST['houseplantlab_contact_nonce'])
        ? sanitize_text_field(wp_unslash((string) $_POST['houseplantlab_contact_nonce']))
        : '';
    if ($nonce === '' || ! wp_verify_nonce($nonce, 'houseplantlab_contact')) {
        wp_safe_redirect(add_query_arg('contact', 'error', $redirect));
        exit;
    }

    // Silently accept honeypot submissions so bots receive no useful signal.
    $website = isset($_POST['website'])
        ? trim(sanitize_text_field(wp_unslash((string) $_POST['website'])))
        : '';
    if ($website !== '') {
        wp_safe_redirect(add_query_arg('contact', 'sent', $redirect));
        exit;
    }

    $name = isset($_POST['name'])
        ? trim(sanitize_text_field(wp_unslash((string) $_POST['name'])))
        : '';
    $email = isset($_POST['email'])
        ? sanitize_email(wp_unslash((string) $_POST['email']))
        : '';
    $subject = isset($_POST['subject'])
        ? trim(sanitize_text_field(wp_unslash((string) $_POST['subject'])))
        : '';
    $message = isset($_POST['message'])
        ? trim(sanitize_textarea_field(wp_unslash((string) $_POST['message'])))
        : '';
    $consented = isset($_POST['privacy_consent']) && wp_unslash((string) $_POST['privacy_consent']) === '1';

    if (
        $name === ''
        || strlen($name) > 120
        || ! is_email($email)
        || strlen($subject) > 160
        || strlen($message) < 20
        || strlen($message) > 5000
        || ! $consented
    ) {
        wp_safe_redirect(add_query_arg('contact', 'error', $redirect));
        exit;
    }

    $mail_subject = '[HouseplantLab enquiry] ' . ($subject !== '' ? $subject : 'Website message');
    $mail_body = "Name: {$name}\nEmail: {$email}\n\n{$message}";
    $headers = ['Reply-To: ' . $name . ' <' . $email . '>'];
    $sent = wp_mail((string) get_option('admin_email'), $mail_subject, $mail_body, $headers);

    wp_safe_redirect(add_query_arg('contact', $sent ? 'sent' : 'error', $redirect));
    exit;
}
add_action('admin_post_nopriv_houseplantlab_contact', 'houseplantlab_handle_contact_form');
add_action('admin_post_houseplantlab_contact', 'houseplantlab_handle_contact_form');

register_activation_hook(__FILE__, static function (): void {
    houseplantlab_register_content();
    flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, 'flush_rewrite_rules');

