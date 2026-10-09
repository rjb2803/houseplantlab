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

    if (hpl_is_field_journal_request()) {
        $journal_css = get_theme_file_path('assets/css/field-journal.css');
        wp_enqueue_style(
            'houseplantlab-field-journal',
            get_theme_file_uri('assets/css/field-journal.css'),
            ['houseplantlab'],
            file_exists($journal_css) ? (string) filemtime($journal_css) : (string) wp_get_theme()->get('Version')
        );
    }
});

/**
 * Detect the dedicated journal route without requiring a database page.
 */
function hpl_is_field_journal_request(): bool
{
    $request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash((string) $_SERVER['REQUEST_URI']) : '';
    $request_path = trim((string) wp_parse_url($request_uri, PHP_URL_PATH), '/');
    $home_path = trim((string) wp_parse_url(home_url('/'), PHP_URL_PATH), '/');

    if ($home_path !== '' && str_starts_with($request_path, $home_path . '/')) {
        $request_path = substr($request_path, strlen($home_path) + 1);
    }

    return trim($request_path, '/') === 'blog';
}

add_filter('redirect_canonical', static function ($redirect_url) {
    return hpl_is_field_journal_request() ? false : $redirect_url;
});

add_filter('template_include', static function (string $template): string {
    if (! hpl_is_field_journal_request()) {
        return $template;
    }

    global $wp_query;
    if ($wp_query instanceof WP_Query) {
        $wp_query->is_404 = false;
    }
    status_header(200);

    return get_theme_file_path('blog.php');
}, 99);

add_filter('pre_get_document_title', static function (string $title): string {
    return hpl_is_field_journal_request()
        ? 'The Field Journal – HouseplantLab'
        : $title;
});

add_action('wp_head', static function (): void {
    echo '<meta name="google-site-verification" content="0q2VJe6VnaDhuZytklPbkyVyVNX7Q0jw0_kazQuBWG8">' . "\n";
}, 1);

