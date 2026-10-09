# Blog frontend implementation contract

This contract applies to every approved HouseplantLab blog design. It is deliberately framework-specific so the visual direction can be handed to implementation without reinterpretation.

## Required stack

- Use semantic HTML5 landmarks and elements: `header`, `nav`, `main`, `section`, `article`, `aside`, `figure`, `form`, `footer` and correctly ordered headings.
- Use Tailwind CSS for layout, spacing, typography, colour, responsive behaviour, interaction states and reduced-motion variants.
- Keep WordPress data and template responsibilities intact; Tailwind must style server-rendered content rather than replace it with a client-only application.
- Prefer reusable components and documented utility compositions over one-off arbitrary values.
- Custom CSS is allowed only for approved design tokens, WordPress integration seams or behaviour Tailwind cannot express cleanly.

## Responsive rules

- Mobile-first source order must remain meaningful without CSS.
- Use a one-column base layout, add editorial spans at `md`/`lg`, and constrain wide layouts with an approved `max-w-*` container.
- Avoid absolute positioning for primary content and any layout that depends on fixed text height.
- Reserve image and advertisement space with `aspect-*`, explicit dimensions or approved min-height tokens.
- Verify 320px, 390px, 768px, 1024px, 1440px and 1920px widths with no horizontal page overflow.

## Interaction and accessibility

- Every interactive state needs Tailwind `focus-visible`, hover, active and disabled treatment where applicable.
- Use native controls first; dialogs and mobile filter sheets must manage focus, Escape and focus return correctly.
- Honour `motion-reduce`; no essential information may depend on animation or hover.
- Maintain WCAG 2.2 AA contrast and logical keyboard/source order.
- Use descriptive links and real labels; never make a whole card contain conflicting nested actions.

## Advertising and performance

- Ads require a semantic, clearly labelled reserved component and may not resemble article cards or filters.
- Do not use sticky overlays, interstitials or placements that interrupt the diagnostic pathway.
- Above-fold imagery must have intrinsic dimensions and appropriate priority; below-fold imagery should be lazy-loaded.
- The approved implementation must pass layout-shift checks before deployment.

## Handoff boundary

The generated PNGs are visual targets, not pixel-perfect specifications. Implementation must preserve hierarchy, rhythm and intent while using maintainable HTML5 and Tailwind CSS. No design is approved for production until the owner selects a direction.
