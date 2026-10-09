# HouseplantLab blog design handoff

> Approval gate: do not implement this handoff until the owner approves the recommended direction.

## Recommended direction: The Editorial Desk

The Editorial Desk best balances the approved premium character, the current modest but useful article library, immediate editorial credibility and scalable discovery. It provides a recognisable publication experience without overbuilding the taxonomy before content governance is proven. Direction 2 should inform the filtering and symptom-led pathways, while Direction 3 should inform photography-led feature modules and notebook bridges.

## Design tokens

| Token | Value | Usage |
| --- | --- | --- |
| --hpl-color-forest | #14372a | Primary brand colour, headings on light surfaces, dark hero backgrounds. |
| --hpl-color-leaf | #397153 | Links, active states, secondary emphasis and accessible focus pairing. |
| --hpl-color-sage | #bfd0bd | Quiet surfaces, selected filter backgrounds and supportive borders. |
| --hpl-color-cream | #f6f1e7 | Primary archive background and editorial section rhythm. |
| --hpl-color-paper | #fffdf8 | Cards, header, controls and high-contrast content surfaces. |
| --hpl-color-clay | #b86645 | Sparse accent for status or editorial markers; never the sole meaning cue. |
| --hpl-border | #d9ded3 | Card and control boundaries. |
| --hpl-radius-card | 1.25rem | Photography-led cards and feature panels. |
| --hpl-radius-control | 999px | Pills and buttons; avoid pill styling for long navigation labels where it harms scanning. |
| --hpl-content-wide | 1180px | Archive grid and feature layout maximum width. |
| --hpl-content-reading | 760px | Long-form supporting copy and explanatory text. |
| --hpl-space-section | clamp(3rem, 6vw, 5.5rem) | Major vertical section rhythm. |
| --hpl-focus | 3px solid #397153 with 3px offset | Visible keyboard focus on light surfaces; provide a contrasting outer treatment on dark surfaces. |
| --hpl-motion | 160ms ease; disabled or reduced under prefers-reduced-motion | Small state transitions only; no essential information depends on motion. |
| --hpl-image-ratio-card | 4 / 3 | Article thumbnails and skeleton reservation. |
| --hpl-image-ratio-feature | 16 / 10 | Lead editorial image reservation. |
| --hpl-ad-min-height | Defined per approved responsive slot size | Reserve space before ad request to prevent cumulative layout shift. |

## Components

### SkipLink

Moves keyboard focus to the main archive content.

States: default, focused

### SiteHeader

Provides brand, primary navigation, search and plant-checker route.

States: desktop, mobile-menu-closed, mobile-menu-open, focused

### ArchiveMasthead

Renders breadcrumb, h1, explanatory dek and optional search action.

States: default, search-focused

### FeaturedEditorialRail

Displays lead and secondary editorial selections with stable image geometry.

States: loading, loaded, image-error, focused

### ArchiveToolbar

Provides search, plant, problem, format and sort controls.

States: default, active-filters, expanded-mobile, validation-error, focused

### FilterChip

Displays and removes one active filter.

States: default, hover, focused, remove-focused

### ResultStatus

Announces result count or loading/error status without disruptive focus movement.

States: idle, loading, updated, empty, error

### ArticleCard

Presents image, content type, title, excerpt, context metadata and primary link.

States: loading, loaded, image-error, hover, focused

### PlantContextCard

Links an article to its relevant plant hub and related care/problem areas.

States: default, focused

### ProblemPathway

Routes readers to populated problem archives and the deterministic checker.

States: default, focused

### AdSlot

Reserves, labels and loads an approved responsive ad placement.

States: reserved, loading, filled, empty, consent-blocked

### Pagination

Provides crawlable archive traversal and current-page context.

States: default, current, disabled, focused

### EmptyState

Explains no matches and provides recovery routes.

States: no-results, error, retrying

## Responsive breakpoints

| Name | Minimum width | Behaviour |
| --- | ---: | --- |
| small-mobile | 0px | Single-column layout; compact header; filter sheet; cards use 4:3 images; controls are at least 44px high; no essential horizontal scrolling. |
| large-mobile-tablet | 600px | Single-column or two-column feature composition; toolbar may wrap; featured cards can use a two-up secondary arrangement; maintain one-column results until card width remains comfortable. |
| desktop | 960px | Full navigation; two- or three-column result grid; featured rail composition; toolbar in one row where it fits; optional complementary pathway panel. |
| wide-desktop | 1280px | Constrain content to 1180px or approved wide size; increase whitespace rather than card count; preserve readable line lengths and ad restraint. |

## Content rules

- Every index page has one descriptive h1 and server-rendered introductory copy.
- Every article card must include a meaningful title link, format or topic context and a stable image ratio.
- Use only confirmed public categories, plants and problems; do not expose the provisional purchase cohort as approved editorial content.
- Link articles to a plant hub when the relationship is editorially valid; link to a problem archive only when that archive has substantive content.
- Use descriptive link text such as “Read the Monstera deliciosa drooping guide”, not repeated generic “Read more”.
- Show published and reviewed/updated dates only when maintained consistently; do not imply a review process that did not occur.
- Use “Grown & photographed by HouseplantLab” only for verified original HouseplantLab photography.
- Affiliate content must be labelled clearly before engagement with the relevant commercial content; maintain a site-wide disclosure page.
- Do not fabricate result counts, popularity labels, user ratings, engagement metrics, search volumes or evidence claims.
- Do not present AI-generated mock imagery as original evidence.
- Keep the diagnosis checker separate from editorial certainty: archive filters suggest relevant content, not a diagnosis.
- Ensure all pagination and primary result links are crawlable without JavaScript.

## Analytics events

| Event | Trigger | Purpose |
| --- | --- | --- |
| archive_search_submitted | Reader submits a non-empty archive search. | Understand query formulation and search refinement without claiming search-volume findings. |
| archive_filter_applied | Reader applies or changes plant, problem, format or sort criteria. | Measure interaction with discovery controls. |
| archive_filter_cleared | Reader removes a chip or clears all filters. | Identify refinement friction and recovery behaviour. |
| archive_result_opened | Reader activates an article card or title link. | Measure content discovery from the archive. |
| archive_pagination_used | Reader activates next, previous, page number or progressively enhanced load-more control. | Understand archive depth and traversal. |
| plant_hub_link_opened | Reader opens a contextual plant profile link from the archive. | Measure movement from editorial content into structured authority content. |
| problem_pathway_opened | Reader opens a populated problem archive or symptom route. | Measure symptom-led discovery. |
| checker_cta_opened | Reader opens the plant-problem checker route from the archive. | Measure transition from reading to practical tool use. |
| ad_slot_viewable | Approved ad slot meets the agreed visibility definition after consent and loading. | Measure monetisation delivery without equating visibility with success. |
| affiliate_link_activated | Reader activates a clearly labelled affiliate link. | Measure commercial interaction with disclosure context. |

## Acceptance criteria

1. The archive renders correctly at small mobile, large mobile/tablet, desktop and wide desktop widths without horizontal page scrolling.
2. The page uses semantic header, navigation, main, search/form, complementary and footer regions, with labelled repeated landmarks.
3. There is exactly one meaningful h1; section headings use a logical hierarchy and describe their content.
4. Keyboard users can reach, operate and leave search, filters, chips, cards, pagination, mobile menu and dialogs without traps.
5. Every keyboard focus indicator is visible, has sufficient contrast and is not entirely obscured by sticky header or other author-created content.
6. Touch controls meet or exceed 44 by 44 CSS pixels where practical, with adequate separation to prevent accidental taps.
7. At 200% zoom and normal text resizing, the archive remains usable with reflow and no essential content hidden or overlapping.
8. Search and filter state is represented textually, persists in the URL and is restorable with back/forward navigation.
9. Filter changes announce a status update; loading, empty, error and retry states are understandable without relying on colour or animation.
10. Cards reserve image space before media loads; ad slots reserve their agreed space before ad requests; no visible content jumps are introduced by archive media or advertising.
11. Below-fold images and ads are deferred appropriately, while critical above-fold content remains available promptly.
12. No promotional overlay, interstitial, sticky mobile footer ad or ad disguised as editorial navigation appears.
13. Ad density remains within the agreed restrained threshold and ads are absent from the header, filter controls, checker pathway and empty/error states.
14. Affiliate content is clearly labelled before engagement, with labels associated with the relevant commercial content.
15. The archive includes deliberate internal links to /plants/, /plants/monstera-deliciosa/, populated problem routes and /tools/plant-problem-checker/.
16. Only verified photography provenance is displayed; mock assets are never labelled as original HouseplantLab evidence.
17. The implementation preserves the approved cream, paper, forest, serif/sans-serif and rounded photography-led character without copying another publication’s trade dress.
18. Server-rendered pagination remains available if progressive enhancement such as load more is added.
19. Analytics events fire once per intended interaction, contain no unnecessary personal data and do not claim outcomes not measured.

## Decisions still needed

- Which editorial taxonomy terms will be approved for public navigation at launch?
- Will the owner approve a featured-content field, manual editorial ordering or both?
- Which ad platform, consent mechanism and responsive slot sizes will be approved?
- Should archive search use native WordPress search, a custom query endpoint or a future search service?
- Will reviewed dates be editorially maintained for every article or only selected evidence-led guides?
- Which launch pages beyond Monstera deliciosa are sufficiently complete to expose as authority hubs?
- Will newsletter signup, accounts, saved diagnoses or comments be excluded from the first archive release?
- Which analytics platform and retention/privacy settings will be approved before implementation?
