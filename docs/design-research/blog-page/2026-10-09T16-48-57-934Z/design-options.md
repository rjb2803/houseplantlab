# HouseplantLab blog design directions

> Status: human review required. These are design proposals, not live-site changes.

## Current state

HouseplantLab has an approved calm, premium visual language and a WordPress archive template that currently renders a basic three-column post grid with pagination. The index should evolve into a useful UK houseplant discovery hub linking editorial posts to plant authority hubs, symptoms, care techniques and the deterministic plant-problem checker. The supplied live subjects provide a strong initial content set, especially around Monstera deliciosa, Peace Lily, Snake Plant, Spider Plant, Pothos and Phalaenopsis orchid.

## Reader and business goals

- Find a relevant plant-care answer quickly.
- Browse by plant, symptom, care topic and editorial format.
- Move naturally between articles, plant authority hubs, related problems and the diagnosis tool.
- Trust that content is evidence-led, UK-relevant and based on clearly labelled original photography where applicable.
- Experience a premium archive without intrusive advertising, layout shift or deceptive interactions.
- Use the index comfortably with keyboard, screen reader, touch, zoom and reduced-motion preferences.

## Research principles

### Problem-first discovery

The audience often arrives with a symptom or immediate care question rather than a desire to browse chronologically.

**HouseplantLab application:** Lead with search, symptom shortcuts and plant/topic filters; make the plant-problem checker a prominent but non-disruptive route.

### Editorial hierarchy over feed mechanics

A premium publication should distinguish authoritative guides, timely observations, experiments and reviews instead of presenting an undifferentiated post stream.

**HouseplantLab application:** Use content-format labels, featured editorial selections and clear metadata such as reviewed dates, plant and problem relationships.

### Semantic structure and orientation

Clear headings and landmarks reduce scanning effort and improve keyboard and assistive-technology navigation.

**HouseplantLab application:** Use one descriptive h1, labelled filter/search regions, landmarked results, logical h2 sections and a skip link.

### Stable, image-led performance

Photography is central to trust, but unreserved image and ad space can shift content and cause accidental activation.

**HouseplantLab application:** Store intrinsic dimensions, use aspect-ratio wrappers, reserve ad slots, lazy-load below-fold media and prioritise the first meaningful image.

### Calm monetisation

Ads must not obstruct diagnosis, interrupt reading or resemble controls and editorial cards.

**HouseplantLab application:** Use a small number of labelled, reserved placements; exclude ads from the filter toolbar and diagnosis callout; never use interstitials or sticky overlays that cover content.

### Explicit commercial disclosure

Affiliate relationships can otherwise make editorial recommendations appear independent when they are commercial communications.

**HouseplantLab application:** Label affiliate article cards and relevant content blocks with “Ad” or “Affiliate” before engagement, and keep disclosure visually and semantically associated with the commercial content.

### Direct manipulation with safe targets

Filters, cards and mobile controls must be usable without precision pointing or accidental taps.

**HouseplantLab application:** Provide generous controls, separated hit areas, visible focus, no hover-only meaning, and a clear apply/reset model on mobile.

### Respect user preferences

Animation, focus treatment and text scaling must remain usable for people with vestibular, low-vision or cognitive needs.

**HouseplantLab application:** Honour prefers-reduced-motion, support zoom and text resizing, preserve focus visibility below sticky headers and avoid auto-advancing content.

## 1. The Editorial Desk

A curated magazine-style index that prioritises the latest and most useful HouseplantLab work while retaining strong routes into plants, problems and care topics.

**Intended reader behaviour:** Scan a small set of featured stories, then refine by topic or browse the chronological archive. Readers should understand why an article is useful before opening it.

**Visual character:** Most faithful to the approved premium editorial direction: generous cream space, deep-green feature panel, large serif headlines, asymmetrical photography and quiet metadata.

### Page zones

#### Header and context

- Purpose: Orient the reader within Blog and provide immediate global actions.
- Desktop: Sticky compact header, breadcrumb, h1 “HouseplantLab journal”, short explanatory dek, search action and plant-checker CTA.
- Mobile: Header condenses to brand, search and menu; breadcrumb remains short; h1 and dek stack with comfortable spacing.
- Interaction: Skip link targets main; search opens a labelled page or dialog only when explicitly activated; no automatic overlay.
- Content: Blog archive description, current date or update framing only when editorially meaningful.
- Advertising: No ad in the header or first hero region.

#### Featured editorial rail

- Purpose: Surface the most useful or representative pieces without implying that every item is equally current.
- Desktop: One large lead card beside two stacked secondary cards; lead may feature a Monstera deliciosa problem or a seasonal care guide.
- Mobile: Lead card first, followed by two full-width cards; no horizontal carousel required.
- Interaction: Each card has one clear destination; entire card may be linked, but metadata is not a separate competing target.
- Content: Lead subjects can include brown spots, drooping, curled leaves, watering, repotting and growing media. Include format, plant/problem tags, reading time and reviewed date where available.
- Advertising: Editorial cards only; no paid card in the featured rail.

#### Discovery toolbar

- Purpose: Let readers switch from curated browsing to deliberate discovery.
- Desktop: Search field, content-type select, plant select, problem select and sort control in a horizontal toolbar; active filters appear as removable chips below.
- Mobile: A prominent search field followed by a single “Filter and sort” button opening a native-feeling bottom sheet or dialog; active chips remain visible above results.
- Interaction: Filters update on explicit apply on mobile; desktop may update immediately if the result count is announced. Escape closes dialogs; focus returns to invoking control.
- Content: Real relationships include Monstera deliciosa, Peace Lily, Snake Plant, Spider Plant, Pothos and Phalaenopsis orchid; problems include yellow leaves, brown tips/spots, drooping, curling, watering and root concerns.
- Advertising: No ad inside the toolbar or immediately adjacent to filter controls.

#### Results archive

- Purpose: Provide a dependable, indexable list of all qualifying editorial posts.
- Desktop: Three-column rounded cards below the featured area, with consistent image ratio, format label, title, excerpt, plant/problem context and date. Use numbered pagination or a clearly labelled “Load more” that preserves URL state.
- Mobile: Single-column cards with compact metadata and 44px-plus link/control targets; avoid overly dense two-column cards.
- Interaction: Card links are keyboard reachable in source order. “Load more” appends content, announces the new range and updates history or provides a crawlable paginated fallback.
- Content: Initial subjects include why Peace Lily leaves turn yellow, why Pothos leaves turn yellow, why Snake Plant leaves turn yellow, why Spider Plant tips turn brown, why Monstera deliciosa is drooping, not splitting or curling, and how to repot or water.
- Advertising: Optional reserved ad slot after the first results row on desktop and after approximately four cards on mobile; never insert an ad between title and excerpt.

#### Related pathways

- Purpose: Turn the archive into a connected knowledge system rather than a dead-end feed.
- Desktop: A quiet bottom section with three route cards: Browse plants, Explore problems, Use the plant checker.
- Mobile: Stacked route cards after results and before pagination/footer.
- Interaction: Standard links with descriptive names; route cards do not use deceptive button styling.
- Content: Link to /plants/, /plants/monstera-deliciosa/, problem taxonomy pages where genuinely populated, and /tools/plant-problem-checker/.
- Advertising: No ad between results and diagnostic pathway.

#### Empty, loading and error states

- Purpose: Maintain trust when filtering or loading fails.
- Desktop: Skeleton cards preserve image and text geometry; empty state explains the active criteria and offers reset, broader browse and plant-checker routes.
- Mobile: Same content hierarchy, with concise status announcement and full-width reset button.
- Interaction: Use aria-live status for result counts and loading completion; retain the toolbar and active criteria.
- Content: Example: “No articles match Monstera deliciosa + mould. Try removing one filter or browse all problems.” Do not invent content counts.
- Advertising: Do not show ads in empty or error states.

### Interaction patterns

- Featured editorial selection with transparent labels such as “Featured guide” or “Recently reviewed”.
- URL-persisted search, filters, sort and page state for shareability and crawlable fallback.
- Removable filter chips with an explicit “Clear all”.
- Pagination as the robust baseline; progressive enhancement may offer load more.
- Focus return from filter dialog and polite result-count announcements.
- Respect prefers-reduced-motion; hover elevation is disabled or minimised when requested.

### Monetisation placements

- One reserved responsive display slot below the first archive row on desktop.
- One reserved responsive slot after approximately four mobile result cards, never in the header, toolbar or diagnosis route.
- Affiliate labels on commercial articles or cards before the reader opens them.
- No sticky mobile footer ad, pop-up, interstitial or ad that resembles a result card.

### Accessibility requirements

- Use one h1 and logical h2 sections for featured, discovery, results and pathways.
- Use semantic main, nav, search/form, complementary and footer landmarks.
- Ensure all controls are keyboard-operable and focus indicators remain visible below the sticky header.
- Provide visible labels, programmatic names and error messages for search and filters.
- Use at least 44 by 44 CSS pixel touch targets where practical and sufficient spacing between adjacent controls.
- Preserve image aspect ratios and meaningful alt text; decorative images use empty alt.
- Provide reduced-motion CSS and no auto-advancing rail.

### Strengths

- Strongest editorial and premium brand expression.
- Clear distinction between curated work and the full archive.
- Good initial experience while the content library is still modest.
- Supports original photography and reviewed-date trust signals.

### Trade-offs

- Requires editorial curation rules and a featured-content field.
- More vertical space before the full archive.
- The first screen may favour editorial browsing over immediate symptom filtering.

---

## 2. The Plant Problem Index

A utility-led archive organised around the reader’s plant, visible symptom and desired task, with editorial content as the answer layer.

**Intended reader behaviour:** Start with a plant or symptom, narrow to a manageable set of relevant guides, then continue into the authority plant hub or checker.

**Visual character:** Calm cream utility interface with a deep-green diagnostic band, compact serif section headings, larger filter controls and photography used as evidence cues rather than decoration.

### Page zones

#### Utility hero

- Purpose: Make the archive immediately useful for a reader arriving with a problem.
- Desktop: Deep-green band containing h1 “Find the right plant guide”, concise explanation, search input and three large routes: Choose a plant, Choose a symptom, Browse care guides.
- Mobile: Search appears first, followed by vertically stacked route buttons with explanatory microcopy.
- Interaction: Search submits with Enter and a visible button; route controls move to anchored filter sections or set URL parameters without a page reload where enhanced.
- Content: Use real symptom language: yellow leaves, brown tips/spots, drooping, curled leaves, not splitting, watering, repotting, aerial roots and growing media.
- Advertising: No advertising in the utility hero.

#### Plant and symptom quick filters

- Purpose: Make the information architecture visible and teach readers how HouseplantLab is organised.
- Desktop: Two columns: popular plants list with Monstera deliciosa first and symptom list with counts only when backed by actual query data; selected terms show state and related topic hints.
- Mobile: Horizontal scroll is avoided for essential options; use stacked lists or a disclosure group with large buttons.
- Interaction: Selecting a plant exposes related symptoms and updates results; selecting a symptom exposes relevant plants. Keyboard users can operate native links or checkboxes.
- Content: Plants: Monstera deliciosa, Peace Lily, Snake Plant, Spider Plant, Pothos and Phalaenopsis orchid. Do not publicly present provisional plants as an agreed purchase list.
- Advertising: No ads between filters and first result.

#### Diagnostic result panel

- Purpose: Show a focused set of articles relevant to the chosen combination.
- Desktop: Results area with a prominent context summary, active filters, sort options and a two-column card grid with a slim complementary plant-hub panel.
- Mobile: Context summary and active filters precede a single-column result list; plant-hub panel becomes an inline related card after the first or second result.
- Interaction: Changing filters updates the result region and moves focus to its heading or status, not the page top. Provide a reset action.
- Content: For Monstera deliciosa + drooping, surface the drooping article, watering article, repotting article and the Monstera hub when relevant. For Peace Lily + yellow leaves, surface the yellow-leaf and drooping articles where editorial relationships justify it.
- Advertising: At most one reserved ad after the first three focused results; avoid ads in diagnostic combinations with very few results.

#### Browse by care task

- Purpose: Support non-problem browsing and evergreen discovery.
- Desktop: Four editorial buckets: Watering, Repotting and soil, Light and growth, Propagation and flowering.
- Mobile: Stacked rows with short descriptions and representative article links.
- Interaction: Rows are links or native disclosure components; no hidden content that is inaccessible to keyboard or crawlers.
- Content: Use existing subjects such as how often to water Monstera deliciosa, how to water Snake Plant, how to repot Monstera deliciosa, best growing media for Monstera deliciosa and how to get a Phalaenopsis orchid to flower again.
- Advertising: Commercial buying guidance must be explicitly labelled before engagement; no ads inside task rows.

#### Authority bridge

- Purpose: Connect individual articles to the structured plant database.
- Desktop: A full-width Monstera deliciosa authority panel with “Start with the plant profile” and links to Overview, Care, Problems, Propagation and Soil and feeding where pages exist.
- Mobile: Compact plant-profile card after the results and before related articles.
- Interaction: Descriptive links preserve context and avoid generic “Read more”.
- Content: Use “Grown & photographed by HouseplantLab” only where the production image and provenance are genuine and editorially verified.
- Advertising: No ad between an article result and its plant authority bridge.

#### Empty/loading/error states

- Purpose: Explain combinations that have no published answer yet without pretending the taxonomy is complete.
- Desktop: Show selected criteria, an honest no-match explanation, reset options, nearest plant hub and checker route.
- Mobile: Same with a prominent reset button and concise fallback routes.
- Interaction: Use a status region for asynchronous updates; preserve selected criteria in the URL.
- Content: Avoid fabricated counts, search volumes or claims that a topic is popular unless measured and approved.
- Advertising: No ads in no-match states.

### Interaction patterns

- Progressive narrowing by plant and symptom, with a visible query summary.
- Native checkbox/radio semantics where multiple or exclusive selection is needed.
- Filter state encoded in the URL and restored on back/forward navigation.
- Contextual cross-links from result cards to plant hub and problem taxonomy.
- A deterministic “Use the plant checker” escape route that is clearly separate from article diagnosis.
- No automatic diagnosis claim from archive filters.

### Monetisation placements

- Optional single desktop rail slot only below the focused result set, not beside the filter controls.
- Optional mobile slot after the contextual authority bridge and at least three editorial results.
- Affiliate-labelled buying guides may appear in care-task browsing, but not as indistinguishable diagnostic answers.
- No ad on or adjacent to the checker CTA.

### Accessibility requirements

- Filter controls use native semantics, visible labels and grouped fieldsets where appropriate.
- Result updates have a labelled live status and do not unexpectedly move focus.
- The selected plant/symptom context is conveyed in text, not colour alone.
- All disclosure buttons expose expanded/collapsed state and support Enter, Space and Escape where applicable.
- Sticky utility elements must not obscure focused controls or headings.
- Provide a skip link to results and a direct route to the plant checker.

### Strengths

- Fastest route for symptom-led readers.
- Makes the plant/problem taxonomy tangible and reusable.
- Strongest bridge between blog, plant database and diagnostic tool.
- Works well with the current subject set, which is rich in symptom-led articles.

### Trade-offs

- More complex filter and relationship implementation.
- Can feel utilitarian if photography and editorial curation are underplayed.
- Requires careful taxonomy governance to avoid misleading or thin combinations.

---

## 3. The Field Journal

A visual, chronological and thematic journal that treats HouseplantLab’s observations, experiments and original photography as the primary discovery experience.

**Intended reader behaviour:** Browse visually, notice a plant or theme, open an article, then follow a deliberate trail through related observations, care guidance and the plant profile.

**Visual character:** Most distinctive and image-led: warm off-white canvas, alternating editorial bands, large rounded photography, restrained clay accents and generous serif titles. It remains calmer and less promotional than a social feed.

### Page zones

#### Journal masthead

- Purpose: Frame the blog as an evolving record of practical houseplant work.
- Desktop: Large serif h1 “The HouseplantLab journal”, short mission statement, search and a compact row of thematic links.
- Mobile: Stacked masthead with search below the introduction and themes as a wrapping chip/list group.
- Interaction: Theme links are ordinary navigational links; search is labelled and keyboard accessible.
- Content: Themes: Plant problems, Care experiments, Watering, Soil and repotting, Growth and flowering, Reviews and updates.
- Advertising: No ad in the masthead.

#### Visual journal stream

- Purpose: Create a recognisable editorial rhythm while preserving scanability.
- Desktop: Alternating wide feature rows: image-led story on one side, concise title/excerpt/context on the other; every third item may use a compact two-card row.
- Mobile: All items become a single ordered stream with image, label, title, excerpt and metadata; visual alternation is removed from source order.
- Interaction: Each story has one primary link and optional secondary context links. No auto-scrolling carousel.
- Content: Feature subjects can include Monstera aerial roots, not splitting, brown spots, drooping and Phalaenopsis reblooming. Distinguish observation, guide, review and experiment labels.
- Advertising: No ad inserted into the alternating editorial stream until after the third story; use a reserved full-width slot only after a complete story group.

#### Theme navigator

- Purpose: Let readers switch from chronology to subject-led browsing.
- Desktop: A horizontal but keyboard-scrollable theme navigation beneath the masthead or beside the stream; selected theme has a text and border state.
- Mobile: Wrapped links or a native select; avoid requiring horizontal swipe to discover core themes.
- Interaction: Themes route to stable filtered archive URLs, not client-only state.
- Content: Link themes to actual categories/taxonomies only when enough content exists; avoid thin archive pages.
- Advertising: No paid placement styled as a theme.

#### Plant notebook rail

- Purpose: Make original photography and plant authority relationships visible.
- Desktop: Right-side complementary rail containing “Plant notebooks”: Monstera deliciosa first, then confirmed profiles as available; each includes image, status and links to care/problems.
- Mobile: Inline notebook cards after a small group of journal entries.
- Interaction: Cards link to plant hubs and selected related articles; provenance label appears only when true.
- Content: Monstera deliciosa is the confirmed first authority plant. Other provisional plants remain internal planning material until approved.
- Advertising: No ads within notebook cards.

#### Archive controls and pagination

- Purpose: Prevent the visual journal from becoming difficult to search or traverse.
- Desktop: Search, format, plant, problem and date controls appear in a collapsible but always available archive-control panel; pagination remains visible.
- Mobile: A “Filter journal” button opens a focus-managed sheet; pagination uses previous/next plus page numbers where space permits.
- Interaction: Control state persists in URL; closing the sheet returns focus; pagination is crawlable.
- Content: Metadata includes published or updated date only when editorially maintained, plus reading time if computed consistently.
- Advertising: Ad slots are outside the controls and pagination.

#### Empty/loading/error states

- Purpose: Preserve the journal’s visual rhythm when content is unavailable.
- Desktop: Skeleton rows mirror the alternating structure; empty state switches to a simple centred panel with browse links.
- Mobile: Skeleton cards preserve fixed image ratios; empty state is compact and action-led.
- Interaction: Loading status is announced; retry is a real button; no content jumps when imagery resolves.
- Content: Offer “Browse all guides”, “Browse plants” and “Try the plant checker” as fallbacks.
- Advertising: Never show advertising in an error or no-results panel.

### Interaction patterns

- Chronological editorial stream with stable server-rendered pagination.
- Theme navigation as a taxonomy teaching device.
- Alternating visual layout with DOM order matching reading order.
- Notebook-style plant authority cross-links.
- Optional “show more” enhancement only if crawlable pagination remains available.
- Reduced-motion mode removes hover transforms and image movement.

### Monetisation placements

- One reserved full-width display slot after a complete group of three journal entries on desktop.
- One mobile slot after four entries, with a defined minimum height to prevent layout shift.
- Commercial reviews and buying guides carry a clear “Ad” or “Affiliate” label before the title or link.
- No ad in the visual masthead, plant notebook rail, filter sheet or diagnosis pathway.

### Accessibility requirements

- DOM order follows reading order; visual alternation must not create confusing screen-reader sequence.
- Images have stable aspect ratios, accurate alt text and responsive sources.
- Theme navigation has an accessible name and selected state that is not colour-only.
- Cards retain clear headings and link purpose without relying on image recognition.
- Motion effects are non-essential and disabled or reduced under prefers-reduced-motion.
- All controls remain usable at 200% zoom and reflow to one column.

### Strengths

- Strongest expression of original photography and evidence-led fieldwork.
- Distinctive editorial identity without copying another publication.
- Encourages deeper browsing and repeat discovery.
- Good fit for experiments, observations, reviews and timely updates.

### Trade-offs

- Less direct for a reader with an urgent symptom unless search and theme routes are prominent.
- Alternating layouts are more implementation-sensitive.
- Chronological prominence may under-serve evergreen authority unless plant and problem bridges are strong.

## Research sources

- [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/) — Provides the governing accessibility requirements, including focus visibility, target sizing, reflow, contrast and keyboard-operable interaction.
- [Page Structure Tutorial](https://www.w3.org/WAI/tutorials/page-structure/) — Supports semantic landmarks, logical heading hierarchy and structured page regions for navigation and assistive technology.
- [What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) — Highlights Focus Not Obscured and Focus Appearance considerations relevant to sticky headers, filters and cards.
- [Browser-level image lazy loading for the web](https://web.dev/articles/browser-level-image-lazy-loading) — Explains that image dimensions or aspect ratios should reserve space and reduce cumulative layout shift, particularly with lazy loading.
- [Serve images with correct dimensions](https://web.dev/articles/serve-images-with-correct-dimensions) — Recommends explicit image dimensions or aspect-ratio containers to prevent content movement and accidental taps.
- [Ad Best Practices](https://developers.google.com/publisher-tag/guides/ad-best-practices) — Supports fixed ad-slot planning, prioritised above-the-fold loading and lazy loading below-the-fold ads.
- [Reduce ads to page-height ratio](https://developers.google.com/publisher-ads-audits/reference/audits/viewport-ad-density) — Uses a 30% page-height ad-density recommendation as a useful restraint benchmark.
- [Interstitials and dialogs](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials) — Recommends avoiding promotional overlays that obstruct content and suggests unobtrusive banners instead.
- [Mobile-first indexing best practices](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing) — Supports equivalent mobile content and careful mobile ad placement, particularly avoiding ads that dominate the initial viewport.
- [Online Affiliate Marketing](https://www.asa.org.uk/advice-online/affiliate-marketing.html) — Affiliate content should be obviously identifiable as advertising before engagement; generic disclaimers may be insufficient.
- [Landmarks Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/) — Supports labelled landmarks, limited landmark proliferation and meaningful main, navigation, complementary and contentinfo regions.
- [prefers-reduced-motion CSS media feature](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) — Provides implementation guidance for honouring reduced-motion preferences.
