<?php
/**
 * The Field Journal editorial landing page.
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

$post_tags = static function (int $post_id): array {
    $tags = wp_get_post_tags($post_id, ['fields' => 'names']);
    if (! is_wp_error($tags) && $tags !== []) {
        return array_slice($tags, 0, 3);
    }

    $title = strtolower(get_the_title($post_id));
    $derived = [];
    $rules = [
        'water' => 'Watering',
        'root' => 'Root health',
        'light' => 'Light',
        'yellow' => 'Leaf health',
        'brown' => 'Leaf health',
        'repot' => 'Repotting',
        'soil' => 'Growing media',
        'media' => 'Growing media',
        'orchid' => 'Orchids',
        'monstera' => 'Monstera',
        'peace lily' => 'Peace lily',
        'snake plant' => 'Snake plant',
    ];

    foreach ($rules as $needle => $label) {
        if (str_contains($title, $needle)) {
            $derived[] = $label;
        }
        if (count($derived) === 2) {
            break;
        }
    }

    $derived[] = 'Plant care';

    return array_values(array_unique(array_slice($derived, 0, 3)));
};

$render_tags = static function (int $post_id) use ($post_tags): void {
    echo '<ul class="hpl-journal-tags" aria-label="Article topics">';
    foreach ($post_tags($post_id) as $tag) {
        echo '<li>' . esc_html($tag) . '</li>';
    }
    echo '</ul>';
};

$lead = new WP_Query([
    'post_type' => 'post',
    'post_status' => 'publish',
    'posts_per_page' => 1,
    'ignore_sticky_posts' => false,
]);

$bench = new WP_Query([
    'post_type' => 'post',
    'post_status' => 'publish',
    'posts_per_page' => 3,
    'offset' => 1,
    'ignore_sticky_posts' => true,
]);

$notes = new WP_Query([
    'post_type' => 'post',
    'post_status' => 'publish',
    'posts_per_page' => 2,
    'offset' => 4,
    'ignore_sticky_posts' => true,
]);

$guides = new WP_Query([
    'post_type' => 'post',
    'post_status' => 'publish',
    'posts_per_page' => 2,
    'offset' => 6,
    'ignore_sticky_posts' => true,
]);
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
<div class="wp-site-blocks">
    <?php block_template_part('header'); ?>

    <main id="wp--skip-link--target" class="hpl-journal-main">
        <header class="hpl-journal-masthead mx-auto grid w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[1fr_420px]">
            <div class="hpl-journal-masthead__copy">
                <p class="hpl-journal-kicker">The Field Journal</p>
                <h1>The Field Journal</h1>
                <p class="hpl-journal-deck">Notes from real plants, practical care and seasonal growing</p>
                <span class="hpl-journal-rule" aria-hidden="true"></span>
                <p class="hpl-journal-intro">Seasonal observations, hands-on experiments and practical advice from the HouseplantLab team. Real plants, real homes, real results.</p>
            </div>
            <div class="hpl-journal-masthead__art" aria-hidden="true">
                <svg class="hpl-journal-leaf-art" viewBox="0 0 360 230" role="img">
                    <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M177 220c4-69 5-134-16-198M176 140c-38-13-61-42-57-78 36 6 62 35 57 78Zm-1 36c38-17 66-49 70-91-43 4-70 37-70 91Z"/>
                        <path d="M158 22c-8 29-3 66 18 118M123 67c15 20 32 40 53 73M243 86c-30 20-48 50-68 90M194 220c12-48 42-91 89-119M206 177c30 1 59-17 72-48-33-7-64 12-72 48Zm34-43c1-29 20-55 47-65 8 31-11 59-47 65Z"/>
                    </g>
                </svg>
                <p>Observe<br>Learn<br>Grow<br>Repeat</p>
            </div>
        </header>

        <?php if ($lead->have_posts()) : ?>
            <section class="hpl-journal-feature mx-auto grid w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[1.25fr_0.9fr]" aria-label="Featured article">
                <?php while ($lead->have_posts()) : $lead->the_post(); ?>
                    <a class="hpl-journal-feature__image" href="<?php the_permalink(); ?>" aria-label="Read <?php echo esc_attr(get_the_title()); ?>">
                        <img src="<?php echo esc_url($post_image(get_the_ID(), 'full')); ?>" alt="<?php echo esc_attr($post_image_alt(get_the_ID())); ?>">
                    </a>
                    <article class="hpl-journal-feature__story">
                        <div class="hpl-journal-meta"><span>Seasonal notes</span><time datetime="<?php echo esc_attr(get_the_date(DATE_W3C)); ?>"><?php echo esc_html(strtoupper(get_the_date('j M Y'))); ?></time></div>
                        <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
                        <p><?php echo esc_html(wp_trim_words(get_the_excerpt(), 31)); ?></p>
                        <a class="hpl-journal-button" href="<?php the_permalink(); ?>">Read the full story <span aria-hidden="true">→</span></a>
                        <div class="hpl-journal-observations">
                            <span class="hpl-journal-observations__label">Observations</span>
                            <?php $render_tags(get_the_ID()); ?>
                        </div>
                    </article>
                <?php endwhile; ?>
            </section>
            <?php wp_reset_postdata(); ?>
        <?php endif; ?>

        <section class="hpl-journal-section mx-auto w-full max-w-[1440px]" aria-labelledby="growing-bench-title">
            <div class="hpl-journal-section__heading">
                <h2 id="growing-bench-title">From the growing bench</h2>
                <a href="#all-journal-articles">View all articles <span aria-hidden="true">→</span></a>
            </div>
            <div class="hpl-journal-bench grid grid-cols-1 gap-6 md:grid-cols-3">
                <?php while ($bench->have_posts()) : $bench->the_post(); ?>
                    <article class="hpl-journal-card">
                        <a class="hpl-journal-card__image" href="<?php the_permalink(); ?>"><img src="<?php echo esc_url($post_image(get_the_ID(), 'large')); ?>" alt="<?php echo esc_attr($post_image_alt(get_the_ID())); ?>"></a>
                        <time datetime="<?php echo esc_attr(get_the_date(DATE_W3C)); ?>"><?php echo esc_html(strtoupper(get_the_date('j M Y'))); ?></time>
                        <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
                        <p><?php echo esc_html(wp_trim_words(get_the_excerpt(), 18)); ?></p>
                        <?php $render_tags(get_the_ID()); ?>
                    </article>
                <?php endwhile; ?>
                <?php wp_reset_postdata(); ?>
            </div>
        </section>

        <section id="all-journal-articles" class="hpl-journal-columns mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-12 lg:grid-cols-2" aria-label="Journal collections">
            <div>
                <div class="hpl-journal-section__heading">
                    <h2>Plant notes</h2>
                    <a href="/?s=plant">View all notes <span aria-hidden="true">→</span></a>
                </div>
                <div class="hpl-journal-mini-grid grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <?php while ($notes->have_posts()) : $notes->the_post(); ?>
                        <article class="hpl-journal-mini-card">
                            <a class="hpl-journal-mini-card__image" href="<?php the_permalink(); ?>"><img src="<?php echo esc_url($post_image(get_the_ID(), 'medium_large')); ?>" alt="<?php echo esc_attr($post_image_alt(get_the_ID())); ?>"></a>
                            <time datetime="<?php echo esc_attr(get_the_date(DATE_W3C)); ?>"><?php echo esc_html(strtoupper(get_the_date('j M Y'))); ?></time>
                            <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
                            <?php $render_tags(get_the_ID()); ?>
                        </article>
                    <?php endwhile; ?>
                    <?php wp_reset_postdata(); ?>
                </div>
            </div>
            <div>
                <div class="hpl-journal-section__heading">
                    <h2>Practical guides</h2>
                    <a href="/category/care-guides/">View all guides <span aria-hidden="true">→</span></a>
                </div>
                <div class="hpl-journal-mini-grid grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <?php while ($guides->have_posts()) : $guides->the_post(); ?>
                        <article class="hpl-journal-mini-card">
                            <a class="hpl-journal-mini-card__image" href="<?php the_permalink(); ?>"><img src="<?php echo esc_url($post_image(get_the_ID(), 'medium_large')); ?>" alt="<?php echo esc_attr($post_image_alt(get_the_ID())); ?>"></a>
                            <time datetime="<?php echo esc_attr(get_the_date(DATE_W3C)); ?>"><?php echo esc_html(strtoupper(get_the_date('j M Y'))); ?></time>
                            <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
                            <?php $render_tags(get_the_ID()); ?>
                        </article>
                    <?php endwhile; ?>
                    <?php wp_reset_postdata(); ?>
                </div>
            </div>
        </section>

        <aside class="hpl-journal-ad mx-auto w-full max-w-[1440px]" aria-label="Advertisement">
            <span class="hpl-journal-ad__label">Advertisement</span>
            <div class="hpl-journal-ad__content">
                <p><strong>Beautiful tools<br>for a happier home</strong><span>Quality pots, compost and care essentials for houseplant lovers.</span></p>
                <a href="/tools/plant-problem-checker/">Explore our tools <span aria-hidden="true">→</span></a>
            </div>
            <div class="hpl-journal-ad__brand"><span aria-hidden="true">⌁</span>The Botanical Room</div>
        </aside>

        <section class="hpl-journal-connect mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-6 lg:grid-cols-[2fr_0.85fr]" aria-label="Keep exploring HouseplantLab">
            <div class="hpl-journal-newsletter">
                <div>
                    <p class="hpl-journal-kicker">Stay in touch</p>
                    <h2>Notes, not noise</h2>
                    <p>Get seasonal advice, new articles and plant care tips straight to your inbox.</p>
                </div>
                <div class="hpl-journal-newsletter__form" aria-label="Newsletter coming soon">
                    <input type="email" placeholder="Your email address" disabled aria-label="Your email address">
                    <button type="button" disabled>Subscribe</button>
                    <small>Newsletter signup is opening soon.</small>
                </div>
            </div>
            <aside class="hpl-journal-explore">
                <p class="hpl-journal-kicker">Explore more</p>
                <h2>Go deeper with<br>HouseplantLab</h2>
                <p>Find plant profiles, solve a problem or check a plant’s needs.</p>
                <nav aria-label="Explore more"><a href="/plants/">Plants</a><a href="/problem/">Problems</a><a class="hpl-journal-explore__primary" href="/tools/plant-problem-checker/">Plant Checker</a></nav>
            </aside>
        </section>
    </main>

    <footer class="hpl-journal-footer">
        <div class="mx-auto flex w-full max-w-[1440px] flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div><a class="hpl-journal-footer__brand" href="/">HouseplantLab</a><p>Real plants. A calmer home.™</p></div>
            <nav aria-label="Footer"><a href="/plants/">Plants</a><a href="/problem/">Problems</a><a href="/tools/plant-problem-checker/">Plant Checker</a><a href="/blog/">The Field Journal</a><a href="/about/">About</a></nav>
            <div class="hpl-journal-footer__legal"><a href="/privacy-policy/">Privacy Policy</a><a href="/contact/">Contact</a></div>
        </div>
    </footer>
</div>
<?php wp_footer(); ?>
</body>
</html>
