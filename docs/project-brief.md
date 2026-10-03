# HouseplantLab project brief

## 1. Concept and positioning

HouseplantLab will be a substantial UK houseplant resource rather than a generic content or affiliate blog. Its distinctive combination is:

- editorial care content;
- a structured plant database;
- symptom-led problem solving;
- practical tools;
- evidence from plants grown and photographed by HouseplantLab.

The initial audience is UK houseplant owners. Advice should reflect UK homes, seasons, light levels, common retailers, product availability, and terminology wherever those details materially affect the answer.

## 2. Approved visual direction

The approved mockup establishes the design direction:

- warm cream or off-white page backgrounds;
- dark botanical green as the principal brand colour;
- large editorial serif headings;
- a clean, highly readable sans-serif for body copy and interface text;
- generously spaced layouts;
- rounded photography and content cards;
- restrained accent colours rather than a noisy multi-colour palette;
- an editorial, trustworthy feel with plant imagery doing most of the visual work.

The design should feel calm, premium, natural, and useful. Accessibility, legible contrast, responsive behaviour, and page speed are part of the design rather than later additions.

The mockup is the visual reference. Before implementation is treated as visually approved, the source mockup or exported reference images should be added to the project so comparisons can be made against it.

## 3. Primary information architecture

The main navigation is:

1. **Plants** — plant profiles and plant-specific authority hubs.
2. **Problems** — symptom and condition-led guidance across plants.
3. **Care Guides** — practical long-form care, technique, and seasonal guidance.
4. **Tools** — interactive helpers, beginning with the diagnosis decision tree.
5. **Blog** — experiments, observations, updates, reviews, and timely editorial content.

### Plant authority hubs

Each important plant should have a strong parent profile. The first confirmed example is **Monstera deliciosa**, organised around:

- Overview
- Care
- Problems
- Propagation
- Soil and feeding
- Frequently asked questions

Supporting long-tail articles can cover topics such as yellow leaves, brown leaf tips, aerial roots, repotting, propagation, and pests. Those articles should link back to the plant hub, and the hub should surface them contextually.

## 4. WordPress approach

Build on WordPress using a lightweight, purpose-built custom theme rather than a large page-builder stack. Use native WordPress and Gutenberg capabilities where practical so editors can manage content without bespoke page-builder lock-in.

Recommended separation of responsibilities:

- `themes/houseplantlab`: presentation, templates, styles, patterns, and editor experience;
- `plugins/houseplantlab-core`: permanent site data structures, metadata, relationships, and diagnostic-tool logic.

The theme may be built as a modern block theme if the final hosting and supported WordPress version make that the best fit. That decision should be recorded before scaffolding begins.

## 5. Content model

### Plant custom post type

Register a public `plant` custom post type with an archive at `/plants/` and individual profiles under `/plants/{plant-name}/`.

Candidate structured fields include:

- common and botanical names;
- summary and difficulty level;
- light, watering, humidity, temperature, soil, feeding, and repotting guidance;
- toxicity and pet-safety note;
- mature size and growth habit;
- propagation methods;
- common symptoms and likely problems;
- original-photography provenance;
- reviewed and updated dates.

Exact field storage should be decided before implementation. Prefer native post metadata and registered REST schema unless a justified editorial requirement calls for an additional field framework.

### Taxonomies

- `plant_family`: botanical grouping for plant profiles.
- `problem`: a shared, hierarchical problem taxonomy that can connect plant profiles and relevant editorial posts. Initial terms may include yellow leaves, brown tips, drooping, root rot, overwatering, underwatering, pests, leaf curl, slow growth, and mould.

Symptoms and underlying causes should not be treated as interchangeable in the diagnostic data. The editorial taxonomy can remain reader-friendly while the tool stores explicit symptom-to-cause relationships.

### Editorial posts

Use standard WordPress posts for long-tail care articles, problem articles, experiments, reviews, and blog content. Categories or a small editorial taxonomy can distinguish these formats without creating unnecessary post types.

## 6. Original photography strategy

Original photography is a core trust and brand asset, not decoration. The working camera is a Nikon D3500 with the 18–55 mm kit lens.

Initial capture approach:

- photograph whole plants around 35–55 mm to reduce wide-angle distortion;
- use a tripod, ISO 100, approximately f/8, and an appropriate shutter speed for stationary subjects;
- capture RAW and JPEG;
- use a large diffused light or softbox, a reflector, and a neutral seamless background;
- establish repeatable framing, colour, naming, and editing conventions;
- capture arrival, whole-plant, leaf, stem, soil, root, damage, pest, growth, and treatment-progress views;
- derive web, article, card, vertical-social, and close-up crops from the high-resolution source;
- consider a macro lens later for tiny pests, nodes, roots, and leaf texture, after the site model is proven.

Plant profiles can carry the provenance label:

> Grown & photographed by HouseplantLab

Create a standard photography checklist and retain dated originals so articles can show genuine changes over time.

## 7. Starting plant list

**Confirmed first authority plant:**

- Monstera deliciosa

The referenced conversation confirms a roughly £100 initial plant batch but does not preserve the exact previously discussed shortlist. Until the owner confirms it, use the following only as a proposed launch cohort chosen for UK popularity, distinct care needs, and useful symptom coverage:

- Golden pothos (*Epipremnum aureum*)
- Peace lily (*Spathiphyllum*)
- Spider plant (*Chlorophytum comosum*)
- Snake plant (*Dracaena trifasciata*)
- ZZ plant (*Zamioculcas zamiifolia*)
- Rubber plant (*Ficus elastica*)
- Fiddle-leaf fig (*Ficus lyrata*)
- Prayer plant or Calathea-group plant
- Aloe vera

This provisional list must not be presented publicly as an agreed purchase list until it has been checked against the original plan, budget, available growing space, and photographic priorities.

## 8. “What’s wrong with my plant?” tool

The first version is a deterministic, WordPress-managed decision tree rather than an AI diagnosis product:

1. Choose a plant.
2. Choose the visible symptom.
3. Answer two to four plain-language questions.
4. Receive ranked likely causes.
5. See immediate actions, cautions, and links to relevant guides.

The result must communicate uncertainty and should not pretend that one symptom always has one cause. Editors need to manage questions, branches, causes, recommendations, and related content without changing code.

Photo recognition is a possible later enhancement only after the decision tree, content base, analytics, and evidence standards are working well.

## 9. Monetisation

The intended model combines:

- Google AdSense or an appropriate display-ad platform once traffic and content quality justify it;
- clearly disclosed affiliate links for relevant products;
- useful reviews and buying guidance grounded in actual use wherever possible.

Monetisation must not dictate the early information architecture or undermine trust. Ads should be restrained, performance-aware, and kept away from critical diagnostic steps. Affiliate relationships and commercial content must be clearly disclosed in line with applicable UK requirements.

## 10. Editorial and product principles

- Help the reader solve a real plant problem quickly.
- Distinguish observation, experience, and sourced horticultural guidance.
- Use original photographs whenever available; never imply that stock or generated imagery is original evidence.
- Date material experiments and meaningful content reviews.
- Build internal links intentionally around plant hubs, symptoms, causes, and techniques.
- Avoid publishing thin pages merely to fill every taxonomy term.
- Treat accessibility, privacy, consent, security, structured data, and performance as launch requirements.

## 11. Decisions still needed

- Confirm the exact launch plant purchase list.
- Add the approved mockup/export to the repository as the visual reference.
- Confirm hosting, deployment path, supported PHP version, and target WordPress version.
- Choose block-theme versus classic/hybrid theme implementation.
- Choose the content-field approach after a small editorial prototype.
- Confirm whether user accounts, comments, newsletter signup, or saved diagnoses belong in the first release.
- Approve analytics, cookie-consent, ad, and affiliate providers before integration.

