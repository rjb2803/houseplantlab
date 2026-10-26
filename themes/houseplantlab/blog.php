<?php
/**
 * HouseplantLab Journal landing page.
 *
 * @package HouseplantLab
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

$fallback_image = get_theme_file_uri('assets/images/hero-monstera-mock-v1.png');
$post_image = static function (int $post_id, string $size = 'large') use ($fallback_image): string {
    $image = get_the_post_thumbnail_url($post_id, $size);
    return is_string($image) && $image !== '' ? $image : $fallback_image;
};
$post_image_alt = static function (int $post_id): string {
    $thumbnail_id = get_post_thumbnail_id($post_id);
    $alt = $thumbnail_id ? get_post_meta($thumbnail_id, '_wp_attachment_image_alt', true) : '';
    return is_string($alt) && trim($alt) !== '' ? trim($alt) : get_the_title($post_id);
};
$journal_posts = new WP_Query([
    'post_type' => 'post',
    'post_status' => 'publish',
    'posts_per_page' => 5,
    'ignore_sticky_posts' => true,
]);
$posts = $journal_posts->posts;
$plant_filters = [
    ['Monstera', '/plants/monstera-deliciosa/'],
    ['Pothos', '/?s=pothos'],
    ['Philodendron', '/?s=philodendron'],
    ['Spider Plant', '/?s=spider+plant'],
    ['Peace Lily', '/?s=peace+lily'],
    ['Snake Plant', '/?s=snake+plant'],
    ['Ficus', '/?s=ficus'],
    ['Calathea', '/?s=calathea'],
];
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
</head>
<body <?php body_class('hpl-field-journal-page'); ?>>
<?php wp_body_open(); ?>
<div class="hpl-journal-shell">
    <header class="hpl-journal-header">
        <div class="hpl-journal-header__desktop">
            <a class="hpl-journal-brand" href="/" aria-label="HouseplantLab home">
                <img class="hpl-journal-brand__logo" src="<?php echo esc_url(get_theme_file_uri('assets/images/houseplantlab-logo-primary-v2.png')); ?>" alt="HouseplantLab">
            </a>
            <div class="hpl-journal-nav-panel">
                <div class="hpl-journal-utility">
                    <div><span>Journal / <?php echo esc_html(wp_date('d.m.y')); ?></span><a href="/blog/">Field notes</a></div>
                    <a class="hpl-journal-utility__search" href="/?s=">Search the archive</a>
                </div>
                <nav class="hpl-journal-nav" aria-label="Primary navigation">
                    <a href="/plants/"><small>Explore</small><strong>Plants</strong></a>
                    <a href="/problems/"><small>Diagnose</small><strong>Problems</strong></a>
                    <a href="/care-guides/"><small>Learn</small><strong>Care guides</strong></a>
                    <a class="is-current" href="/blog/"><small>Read</small><strong>Journal</strong></a>
                    <a class="hpl-journal-nav__checker" href="/tools/plant-problem-checker/"><small>Start here</small><strong>Plant checker <span aria-hidden="true">↗</span></strong></a>
                </nav>
                <div class="hpl-journal-nav-note"><span><b>Made for real homes,</b> not perfect greenhouses.</span><span>100+ practical articles</span></div>
            </div>
        </div>
        <div class="hpl-journal-header__mobile">
            <a class="hpl-journal-mobile-brand" href="/" aria-label="HouseplantLab home"><img class="hpl-journal-mobile-brand__logo" src="<?php echo esc_url(get_theme_file_uri('assets/images/houseplantlab-logo-primary-v2.png')); ?>" alt="HouseplantLab"></a>
            <details class="hpl-journal-mobile-menu">
                <summary aria-label="Open navigation"><span></span><span></span></summary>
                <nav aria-label="Mobile navigation">
                    <a href="/plants/"><small>Explore</small>Plants</a>
                    <a href="/problems/"><small>Diagnose</small>Problems</a>
                    <a href="/care-guides/"><small>Learn</small>Care guides</a>
                    <a class="is-current" href="/blog/"><small>Read</small>Journal</a>
                    <a class="hpl-journal-mobile-menu__checker" href="/tools/plant-problem-checker/"><small>Start here</small>Plant checker <span aria-hidden="true">↗</span></a>
                </nav>
            </details>
            <div class="hpl-journal-mobile-sub"><span>Journal / <?php echo esc_html(wp_date('d.m.y')); ?></span><a href="/?s=">Search <span aria-hidden="true">↗</span></a></div>
        </div>
    </header>

    <main id="wp--skip-link--target" class="hpl-journal-main">
        <header class="hpl-journal-masthead">
            <div class="hpl-journal-masthead__leaf hpl-journal-masthead__leaf--left" aria-hidden="true"></div>
            <div class="hpl-journal-masthead__copy"><h1>HouseplantLab Journal</h1><p>Practical care. Healthier plants. A calmer, greener home.</p><span aria-hidden="true"></span></div>
            <p class="hpl-journal-masthead__words">Plants<br>People<br>Brighter<br>Homes</p>
            <div class="hpl-journal-masthead__leaf hpl-journal-masthead__leaf--right" aria-hidden="true"></div>
        </header>

        <section class="hpl-journal-feature-grid" aria-label="Featured guides">
            <article class="hpl-journal-lead">
                <a href="/plants/monstera-deliciosa/">
                    <img src="<?php echo esc_url(get_theme_file_uri('assets/images/hero-monstera-mock-v1.png')); ?>" alt="Large healthy Monstera deliciosa growing in a bright room">
                    <span class="hpl-journal-lead__shade" aria-hidden="true"></span>
                    <div class="hpl-journal-lead__copy"><span>Featured guide</span><h2>Monstera care guide</h2><p>Everything you need to know to keep your Monstera happy, healthy and growing beautifully.</p></div>
                    <span class="hpl-journal-arrow" aria-hidden="true">→</span>
                </a>
            </article>
            <div class="hpl-journal-side-stories">
                <?php foreach (array_slice($posts, 0, 2) as $post) : setup_postdata($post); ?>
                    <article class="hpl-journal-side-card">
                        <a class="hpl-journal-side-card__image" href="<?php the_permalink(); ?>"><img src="<?php echo esc_url($post_image(get_the_ID(), 'medium_large')); ?>" alt="<?php echo esc_attr($post_image_alt(get_the_ID())); ?>"></a>
                        <div class="hpl-journal-side-card__copy"><h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2><p><?php echo esc_html(wp_trim_words(get_the_excerpt(), 13)); ?></p><a class="hpl-journal-arrow" href="<?php the_permalink(); ?>" aria-label="Read <?php echo esc_attr(get_the_title()); ?>">→</a></div>
                    </article>
                <?php endforeach; wp_reset_postdata(); ?>
            </div>
        </section>

        <section class="hpl-journal-plant-browser" aria-labelledby="browse-by-plant-title">
            <p class="hpl-journal-index-label"><span aria-hidden="true"></span>Plant index</p>
            <div class="hpl-journal-heading-row"><div><h2 id="browse-by-plant-title">Browse by plant</h2><p>Explore care guides, tips and advice for your favourite houseplants.</p></div><a href="/plants/">View all plants <span aria-hidden="true">→</span></a></div>
            <nav class="hpl-journal-plant-pills" aria-label="Browse articles by plant">
                <?php foreach ($plant_filters as $plant_index => [$label, $url]) : ?><a href="<?php echo esc_url($url); ?>"><span class="hpl-plant-index" aria-hidden="true"><?php echo esc_html(str_pad((string) ($plant_index + 1), 2, '0', STR_PAD_LEFT)); ?></span><span><?php echo esc_html($label); ?></span></a><?php endforeach; ?><a href="/plants/"><span class="hpl-plant-index" aria-hidden="true">+</span><span>More</span></a>
            </nav>
        </section>

        <section class="hpl-journal-latest" aria-labelledby="latest-articles-title">
            <div class="hpl-journal-heading-row"><h2 id="latest-articles-title">Latest articles</h2><a href="/?s=plant">View all articles <span aria-hidden="true">→</span></a></div>
            <div class="hpl-journal-latest__grid">
                <?php foreach (array_slice($posts, 2, 3) as $post) : setup_postdata($post); ?>
                    <article class="hpl-journal-article-card">
                        <a class="hpl-journal-article-card__image" href="<?php the_permalink(); ?>"><img src="<?php echo esc_url($post_image(get_the_ID(), 'large')); ?>" alt="<?php echo esc_attr($post_image_alt(get_the_ID())); ?>"></a>
                        <div class="hpl-journal-article-card__copy"><h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3><p><?php echo esc_html(wp_trim_words(get_the_excerpt(), 18)); ?></p><a class="hpl-journal-arrow" href="<?php the_permalink(); ?>" aria-label="Read <?php echo esc_attr(get_the_title()); ?>">→</a></div>
                    </article>
                <?php endforeach; wp_reset_postdata(); ?>
            </div>
        </section>

    </main>

    <footer class="hpl-journal-footer">
        <div class="hpl-journal-footer__grid">
            <div class="hpl-journal-footer__intro"><a href="/">❧ HouseplantLab</a><p>Practical plant care to help you create a healthier, greener home.</p></div>
            <nav aria-label="Plant links"><strong>Plants</strong><a href="/plants/">A–Z plant directory</a><a href="/plants/">Plant care guides</a><a href="/plants/">Popular plants</a><a href="/plants/">New to houseplants</a></nav>
            <nav aria-label="Problem links"><strong>Problems</strong><a href="/problems/">Diagnose plant problems</a><a href="/problems/yellow-leaves/">Yellow leaves</a><a href="/problems/pests/">Pests and diseases</a><a href="/problems/curling-and-drooping/">Curling and drooping</a></nav>
            <nav aria-label="Care guide links"><strong>Care Guides</strong><a href="/care-guides/watering/">Watering advice</a><a href="/care-guides/light-and-location/">Light and location</a><a href="/care-guides/repotting/">Repotting and growing media</a><a href="/care-guides/propagation/">Propagation</a></nav>
            <nav aria-label="Plant checker links"><strong>Plant Checker</strong><a href="/tools/plant-problem-checker/">Identify your plant</a><a href="/tools/plant-problem-checker/">Check for problems</a><a href="/tools/plant-problem-checker/">Get care advice</a></nav>
        </div>
        <div class="hpl-journal-footer__bottom"><nav aria-label="Legal"><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/privacy-policy/">Privacy</a><a href="/cookie-policy/">Cookies</a></nav><p>A greener home for brighter days. &nbsp; HouseplantLab © <?php echo esc_html(wp_date('Y')); ?></p></div>
    </footer>
</div>
<?php wp_footer(); ?>
</body>
</html>
