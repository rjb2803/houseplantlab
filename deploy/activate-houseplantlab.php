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
    update_option('houseplantlab_bootstrapped', '0.3.0');

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

        if (! is_wp_error($plant_id)) {
            $meta = [
                'houseplantlab_botanical_name' => 'Monstera deliciosa',
                'houseplantlab_difficulty' => 'Easy to moderate',
                'houseplantlab_light' => 'Bright, indirect light',
                'houseplantlab_watering' => 'When the top 3–5 cm feels dry',
                'houseplantlab_humidity' => 'Average to humid',
                'houseplantlab_growth' => 'Fast in good light',
                'houseplantlab_pet_safety' => 'Toxic if chewed',
                'houseplantlab_photo_provenance' => 'Temporary generated mock image',
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
    }

    flush_rewrite_rules(false);
    @unlink(__FILE__);
}, 0);

