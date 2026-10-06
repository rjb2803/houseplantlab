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
    update_option('houseplantlab_bootstrapped', '0.7.0');

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
            'houseplantlab_overview_standfirst' => 'Monstera deliciosa earns its place as an icon. Give it room, steady warmth and something to climb, and each new leaf can become larger and more deeply divided than the last.',
            'houseplantlab_overview_body_one' => 'In its natural habitat, Monstera climbs towards the canopy using aerial roots. That climbing habit explains most of what the plant wants indoors: filtered light, an open but moisture-retentive compost, and a sturdy support. It is forgiving enough for a first-time grower, but responds visibly to thoughtful care.',
            'houseplantlab_overview_body_two' => 'Position it near an east- or west-facing window, or set it back from strong south-facing glass. Rotate the pot occasionally for balanced growth, but avoid repeatedly moving a settled plant between very different conditions.',
            'houseplantlab_overview_quote' => 'The secret is not more water or more feed—it is giving the plant enough light to use them well.',
            'houseplantlab_problem_1_title' => 'Yellow leaves',
            'houseplantlab_problem_1_body' => 'Often linked to persistently wet compost, low light or the natural loss of an older leaf.',
            'houseplantlab_problem_2_title' => 'Brown marks',
            'houseplantlab_problem_2_body' => 'Separate dry edges from spreading lesions; the pattern tells you where to look first.',
            'houseplantlab_problem_3_title' => 'No new splits',
            'houseplantlab_problem_3_body' => 'Young leaves and low light are the usual explanations—not a special fertiliser deficiency.',
            'houseplantlab_propagation_intro' => 'A leaf without a node may remain attractive in water, but it cannot produce a complete new plant. Choose a healthy cutting with one node and, ideally, an aerial root.',
            'houseplantlab_propagation_step_1' => 'Take a clean cutting just below a viable node.',
            'houseplantlab_propagation_step_2' => 'Root in water or an airy propagation mix in bright, indirect light.',
            'houseplantlab_propagation_step_3' => 'Pot on once several branching roots have formed.',
            'houseplantlab_faq_1_question' => 'How often should I water a Monstera?',
            'houseplantlab_faq_1_answer' => 'Check the compost rather than following a calendar. Water when the top 3–5 cm feels dry, then let excess water drain fully.',
            'houseplantlab_faq_2_question' => 'Why are there no splits in the leaves?',
            'houseplantlab_faq_2_answer' => 'Juvenile plants naturally have solid leaves. Mature plants also need strong filtered light and climbing support to produce larger, divided foliage.',
            'houseplantlab_faq_3_question' => 'Should I mist the leaves?',
            'houseplantlab_faq_3_answer' => 'Misting changes humidity only briefly. Wiping dust from the leaves and avoiding radiators and cold draughts are more useful.',
            'houseplantlab_faq_4_question' => 'Is Monstera safe around pets?',
            'houseplantlab_faq_4_answer' => 'No. The plant contains calcium oxalate crystals and should be kept away from pets and children likely to chew it.',
            'houseplantlab_product_1_name' => 'Soil moisture meter',
            'houseplantlab_product_1_reason' => 'A simple check that can help confirm whether the compost is still moist before watering again.',
            'houseplantlab_product_2_name' => 'Balanced liquid houseplant feed',
            'houseplantlab_product_2_reason' => 'Useful during active spring and summer growth when applied at the label rate.',
            'houseplantlab_product_3_name' => 'Sturdy moss or coir pole',
            'houseplantlab_product_3_reason' => 'Support gives mature stems somewhere to climb and keeps a large plant manageable indoors.',
        ];

        foreach ($meta as $key => $value) {
            update_post_meta($plant_id, $key, $value);
        }
    }

    flush_rewrite_rules(false);
    @unlink(__FILE__);
}, 99);

