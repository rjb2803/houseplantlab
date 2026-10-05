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
    update_option('permalink_structure', '/%postname%/');
    update_option('houseplantlab_bootstrapped', '0.6.0');

    $monstera = get_page_by_path('monstera-deliciosa', OBJECT, 'plant');
    if (! $monstera instanceof WP_Post) {
        $plant_id = wp_insert_post([
            'post_type' => 'plant',
            'post_status' => 'publish',
            'post_name' => 'monstera-deliciosa',
            'post_title' => 'Monstera Deliciosa',
            'post_excerpt' => 'A practical guide to light, watering, feeding and common Monstera problems for healthy growth in UK homes.',
            'post_content' => <<<'HTML'
<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Light</h3><!-- /wp:heading -->
<!-- wp:paragraph --><p>Give your Monstera plenty of bright, indirect light. A little gentle morning or evening sun can help, but harsh midday sun through glass may scorch the leaves.</p><!-- /wp:paragraph -->
<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Watering</h3><!-- /wp:heading -->
<!-- wp:paragraph --><p>Water thoroughly when the upper few centimetres of compost feel dry, then let excess water drain away. Avoid leaving the pot standing in water.</p><!-- /wp:paragraph -->
<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Humidity and temperature</h3><!-- /wp:heading -->
<!-- wp:paragraph --><p>Average household humidity is usually adequate, although growth is happier away from cold draughts and directly above radiators. Wipe broad leaves occasionally so they can make the most of available light.</p><!-- /wp:paragraph -->
<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Feeding and support</h3><!-- /wp:heading -->
<!-- wp:paragraph --><p>Feed lightly during active spring and summer growth. As the plant matures, a sturdy support helps the stems climb and encourages a more natural form.</p><!-- /wp:paragraph -->
<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Common warning signs</h3><!-- /wp:heading -->
<!-- wp:list --><ul class="wp-block-list"><li><strong>Yellow leaves:</strong> often linked to persistently wet compost, although older leaves also yellow naturally.</li><li><strong>Brown edges:</strong> check watering consistency, dry air and salt build-up.</li><li><strong>Small leaves or leggy growth:</strong> the plant may need brighter light or better climbing support.</li></ul><!-- /wp:list -->
HTML,
        ], true);

    } else {
        $plant_id = $monstera->ID;
    }

    if (isset($plant_id) && ! is_wp_error($plant_id)) {
        $meta = [
            'houseplantlab_common_name' => 'Monstera, Swiss cheese plant',
            'houseplantlab_botanical_name' => 'Monstera deliciosa',
            'houseplantlab_origin' => 'Central America',
            'houseplantlab_difficulty' => 'Easy to moderate',
            'houseplantlab_light' => 'Bright, indirect light',
            'houseplantlab_watering' => 'When the top 3–5 cm feels dry',
            'houseplantlab_humidity' => 'Average to humid',
            'houseplantlab_growth' => 'Fast in good light',
            'houseplantlab_mature_size' => 'Up to 2–3 metres indoors',
            'houseplantlab_pet_safety' => 'Toxic if chewed',
            'houseplantlab_photo_provenance' => 'Temporary generated mock image',
            'houseplantlab_care_intro' => 'Monstera deliciosa is a striking, easy-to-love houseplant with dramatic split leaves. With the right light, watering and humidity, it can grow quickly and bring a lush tropical feel to a UK home.',
            'houseplantlab_care_light_body' => 'Monstera deliciosa prefers bright, indirect light. Place it near a bright window, ideally east or west-facing, where it receives plenty of natural light without harsh direct sun. Too little light can result in smaller leaves and fewer splits, while strong direct sun can scorch the leaves.',
            'houseplantlab_care_light_tip' => 'A few hours of gentle morning sun is usually fine, but avoid strong midday sun, especially in summer.',
            'houseplantlab_care_watering_body' => 'Water when the top 3–5 cm of compost feels dry. Water thoroughly, allowing excess water to drain away, and never leave the pot standing in water. In most UK homes this is roughly every one to two weeks, depending on the season, light and pot size.',
            'houseplantlab_care_watering_tip' => 'It is safer to underwater slightly than to overwater. Yellow leaves are often an early sign of persistently wet compost.',
            'houseplantlab_care_humidity_body' => 'Monstera deliciosa is comfortable in average household humidity but appreciates moderately humid air. Keep it away from cold draughts and directly above radiators, and wipe the broad leaves occasionally so they can make the most of available light.',
            'houseplantlab_care_humidity_tip' => 'Misting raises humidity only briefly. Grouping plants or using a humidifier is more effective during dry winter months.',
            'houseplantlab_product_1_name' => 'Free-draining houseplant compost',
            'houseplantlab_product_1_reason' => 'A balanced, airy mix helps roots receive oxygen while avoiding long periods of waterlogging.',
            'houseplantlab_product_2_name' => 'Sturdy moss or coir pole',
            'houseplantlab_product_2_reason' => 'Support gives mature stems somewhere to climb and keeps a large plant manageable indoors.',
            'houseplantlab_product_3_name' => 'Balanced liquid houseplant feed',
            'houseplantlab_product_3_reason' => 'Useful during active growth when applied at the label rate rather than as a cure for poor conditions.',
        ];

        foreach ($meta as $key => $value) {
            update_post_meta($plant_id, $key, $value);
        }
    }

    flush_rewrite_rules(false);
    @unlink(__FILE__);
}, 99);

