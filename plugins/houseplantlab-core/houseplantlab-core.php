<?php
/**
 * Plugin Name: HouseplantLab Core
 * Plugin URI: https://github.com/rjb2803/houseplantlab
 * Description: Permanent content types, taxonomies and structured plant fields for HouseplantLab.
 * Version: 0.7.1
 * Requires at least: 6.6
 * Requires PHP: 8.1
 * Author: HouseplantLab
 * Text Domain: houseplantlab-core
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const HOUSEPLANTLAB_CORE_VERSION = '0.7.1';

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

    return '<div class="hpl-products">' . $cards . '</div><p id="affiliate-disclosure" class="hpl-affiliate-disclosure"><strong>How we recommend:</strong> products are selected for a specific care job and links are added only after review. Some future links may be affiliate links, which can earn HouseplantLab a commission at no extra cost to you.</p>';
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
            : '<span class="hpl-pub-problem__pending">Detailed guide in preparation</span>';
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
                <div class="hpl-pub-byline"><span class="hpl-pub-byline__mark" aria-hidden="true">⌁</span><span><strong>Grown and observed by HouseplantLab</strong><small>Last reviewed <?php echo esc_html($modified); ?> · Practical UK growing guide</small></span></div>
            </div>
            <figure class="hpl-pub-hero__media"><?php echo $hero_image; ?><figcaption><?php echo esc_html($title); ?> in bright, indirect light</figcaption></figure>
            <div class="hpl-pub-facts"><?php echo $fact_markup; ?></div>
        </section>

        <nav class="hpl-pub-nav" aria-label="Plant guide sections"><a class="is-active" href="#overview">Overview</a><a href="#care">Care</a><a href="#problems">Problems</a><a href="#propagation">Propagation</a><a href="#recommended-kit">Recommended kit</a><a href="#faq">FAQ</a></nav>

        <section class="hpl-pub-editorial" id="overview">
            <article class="hpl-pub-story"><span class="hpl-pub-kicker">At home with <?php echo esc_html($title); ?></span><h2>A tropical climber with real presence</h2>
                <?php if ($overview_standfirst !== '') : ?><p class="hpl-pub-standfirst"><?php echo esc_html($overview_standfirst); ?></p><?php endif; ?>
                <?php if ($overview_body_one !== '') : ?><p class="hpl-pub-intro"><?php echo esc_html($overview_body_one); ?></p><?php endif; ?>
                <?php if ($overview_body_two !== '') : ?><p><?php echo esc_html($overview_body_two); ?></p><?php endif; ?>
                <?php if ($overview_quote !== '') : ?><blockquote><?php echo esc_html($overview_quote); ?></blockquote><?php endif; ?>
                <span class="hpl-pub-kicker" id="care">The essential care</span><h2>Four decisions that matter</h2><?php echo $care_markup; ?>
            </article>
            <aside class="hpl-pub-rail"><nav aria-label="In this guide"><h2>In this guide</h2><a href="#care">Care essentials <span>→</span></a><a href="#problems">Common problems <span>→</span></a><a href="#propagation">Propagation <span>→</span></a><a href="#recommended-kit">Recommended kit <span>→</span></a><a href="#faq">Questions answered <span>→</span></a></nav><div class="hpl-pub-ad" aria-label="Advertisement">Advertisement · 300 × 250</div><div class="hpl-pub-promise"><strong>Our promise</strong><br>Advice is based on plants we grow, supported by reputable horticultural sources and updated when our evidence changes.</div></aside>
        </section>

        <?php if ($problems !== '') : ?><section class="hpl-pub-section hpl-pub-section--sage" id="problems"><div class="hpl-pub-section__heading"><div><span class="hpl-pub-kicker">Read the leaves</span><h2>What is your <?php echo esc_html($title); ?> telling you?</h2></div><p>Start with the pattern of damage, then check roots, compost and recent changes before reaching for a treatment.</p></div><div class="hpl-pub-problems"><?php echo $problems; ?></div></section><?php endif; ?>

        <?php if ($propagation_intro !== '' || $propagation_steps !== '') : ?><section class="hpl-pub-section" id="propagation"><div class="hpl-pub-propagation"><span class="hpl-pub-propagation__image" role="img" aria-label="Propagating <?php echo esc_attr($title); ?>"></span><div><span class="hpl-pub-kicker">Make another plant</span><h2>Propagation starts with a node</h2><p><?php echo esc_html($propagation_intro); ?></p><ol><?php echo $propagation_steps; ?></ol></div></div></section><?php endif; ?>

        <?php if ($product_markup !== '') : ?><section class="hpl-pub-commerce" id="recommended-kit"><div class="hpl-pub-commerce__heading"><div><span class="hpl-pub-kicker">Considered recommendations</span><h2>The <?php echo esc_html($title); ?> care kit</h2></div><p>Three useful tools, each tied to a genuine care job. Products are linked only after assessment.</p></div><?php echo $product_markup; ?></section><?php endif; ?>

        <?php if ($faqs !== '') : ?><section class="hpl-pub-section" id="faq"><div class="hpl-pub-faq"><div><span class="hpl-pub-kicker">Straight answers</span><h2><?php echo esc_html($title); ?> questions, answered</h2><p>Practical answers for the situations UK growers encounter most often.</p></div><div class="hpl-pub-faq__list"><?php echo $faqs; ?></div></div></section><?php endif; ?>

        <section class="hpl-pub-evidence"><h2>How we know</h2><div><p>This profile combines first-hand growing observations with guidance from reputable horticultural sources. Product claims and photographs are labelled according to their provenance.</p><a href="<?php echo esc_url(home_url('/about/')); ?>">Read our editorial and testing policy <span aria-hidden="true">→</span></a></div></section>
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

register_activation_hook(__FILE__, static function (): void {
    houseplantlab_register_content();
    flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, 'flush_rewrite_rules');

