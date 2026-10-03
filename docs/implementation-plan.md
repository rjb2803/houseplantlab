# Initial implementation plan

This plan deliberately starts with low-risk foundations. It does not assume a hosting provider, deployment secret, or production WordPress database.

## Phase 0 — confirm the delivery boundary

Before application code is added:

1. Add the approved mockup or exported desktop/mobile references to `docs/design-reference/`.
2. Confirm the launch plant list and mark it as approved in the project brief.
3. Record the hosting target, WordPress/PHP support, local-development preference, and deployment method.
4. Decide whether the custom theme will be a block theme or a classic/hybrid theme.
5. Agree the minimum privacy, analytics, cookie-consent, affiliate-disclosure, and accessibility requirements.

**Output:** a short architecture decision record and an acceptance checklist for the homepage.

## Phase 1 — development foundation

1. Add a reproducible local WordPress environment without committing secrets or generated database/media files.
2. Add repository standards: `.gitignore`, coding standards, formatting, linting, and basic CI checks.
3. Scaffold `themes/houseplantlab` with design tokens for colour, typography, spacing, radii, and layout widths.
4. Scaffold `plugins/houseplantlab-core` for site-specific content structures.
5. Add a safe deployment workflow only after the real server path and rollback procedure are confirmed.

**Acceptance:** a fresh checkout can start the site locally, activate the theme and core plugin, and display a minimal page without warnings.

## Phase 2 — content model and editorial workflow

1. Register the `plant` custom post type, `/plants/` archive, and single-plant templates.
2. Register `plant_family` and `problem` taxonomies with intentional rewrite rules.
3. Register the initial plant metadata with REST support and sanitisation.
4. Create editor patterns for plant summaries, care facts, warnings, FAQs, related problems, and photography provenance.
5. Seed one complete Monstera deliciosa profile plus a small set of linked problem articles.
6. Verify URLs, breadcrumbs, canonical behaviour, structured data, search, and empty-state handling.

**Acceptance:** an editor can create and connect the first plant hub and supporting articles without editing code.

## Phase 3 — approved visual system and homepage

1. Translate the approved mockup into global styles and reusable theme patterns.
2. Build the responsive header and primary navigation: Plants, Problems, Care Guides, Tools, Blog.
3. Build homepage sections from real WordPress queries rather than fixed demo cards.
4. Add responsive image sizes and original-photo credit/provenance treatment.
5. Compare desktop and mobile renders directly with the approved visual reference.
6. Test keyboard navigation, focus states, contrast, reduced motion, layout shifts, and page weight.

**Acceptance:** the homepage matches the approved direction at agreed desktop and mobile widths using real seeded content.

## Phase 4 — diagnosis tool MVP

1. Define the explicit data model for plants, symptoms, questions, answers, causes, confidence/ranking, immediate actions, and related guides.
2. Build an editor-managed decision tree with validation for missing or circular branches.
3. Implement the user flow: plant → symptom → questions → likely causes → actions/guides.
4. Ensure results have stable shareable URLs or a privacy-safe state mechanism where useful.
5. Add analytics events that measure completion and helpfulness without collecting unnecessary personal data.
6. Create tests for representative branches, ambiguous symptoms, no-result states, and editorial mistakes.

**Acceptance:** at least three plants and several common symptoms produce transparent, useful results and never imply certainty the data cannot support.

## Phase 5 — launch content and commercial readiness

1. Photograph and publish the confirmed launch cohort progressively; do not delay the entire site for every plant.
2. Build a coherent first content cluster around Monstera deliciosa.
3. Add editorial, photography, review-date, privacy, cookie, affiliate-disclosure, and contact pages.
4. Establish Search Console, analytics, sitemap, robots, backups, security updates, and uptime/error monitoring.
5. Validate Core Web Vitals and real-device responsive behaviour.
6. Add ads and affiliate placements only after content, consent, disclosures, and layout stability are ready.

**Acceptance:** the site has enough original, interconnected content to be useful without ads, and commercial elements do not obstruct care or diagnosis content.

## First implementation slice

Once the Phase 0 choices are confirmed, the safest first coding slice is:

1. reproducible local WordPress setup;
2. empty custom theme with the approved visual tokens;
3. `houseplantlab-core` plugin registering `plant`, `plant_family`, and `problem`;
4. one Monstera profile fixture;
5. automated activation and basic route checks.

That slice proves the repository structure and the core editorial model before significant visual work or production deployment is introduced.

