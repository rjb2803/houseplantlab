# HouseplantLab editorial agents

This editorial pipeline prepares evidence-led article packages, creates review-only WordPress drafts and generates review-only editorial hero images. It cannot publish posts, upload media or use FTP.

## Workflow

1. The Editorial Director creates a narrow structured brief.
2. The Researcher builds a source and claim ledger using web search.
3. The Writer produces a structured draft from that approved evidence only.
4. The Evidence Editor reports unsupported claims and required human checks.
5. A failed editorial review receives one automatic revision and a second review.
6. Deterministic code checks the package and all internal URLs before it is saved.

Every draft is hard-coded as `human-review-required`.

## Run the verified offline fixture

```powershell
npm run agents:fixture
```

This needs no API key. It writes a timestamped bundle to `content-production/runs/`, including a Markdown preview and the JSON passed between stages.

## Run the live agents

1. Create an OpenAI API key in your own OpenAI Platform account.
2. Store it locally as `OPENAI_API_KEY`; never paste it into source control.
3. Optionally set `HPL_AGENT_MODEL`. When omitted, the Agents SDK chooses its configured default.
4. Run:

```powershell
npm run agents:live
```

Live mode uses OpenAI-hosted web search. Its output still remains local and still requires human review.

## Run the autonomous newsroom

```powershell
npm run agents:autonomous
npm run agents:status
```

The autonomous worker processes exactly one queued article per run. It uses `content-production/queue/articles.json`, respects the configured daily limit, prevents overlapping workers, performs one automatic revision when required and leaves every successful article at `ready-for-human-review`.

It cannot publish, deploy, push Git, edit WordPress or change the approved internal-link manifest.

## Send an approved package to WordPress as a draft

Copy `.env.example` to the ignored local `.env` file and set `WP_SITE_URL`, `WP_USERNAME` and `WP_APP_PASSWORD` for a dedicated WordPress contributor account, then run:

```powershell
npm run agents:sync-wordpress
```

The connector selects one `ready-for-human-review` package, revalidates its complete bundle, converts its structured Markdown to escaped HTML and creates a normal WordPress post with the status hard-coded to `draft`. It refuses another hostname, a failed quality report, unsupported editorial claims or an unexpected non-draft response. It records the WordPress post ID and edit URL in the queue to prevent duplicate uploads. It has no publish operation.

## Generate an article hero image for review

```powershell
npm run agents:generate-image
```

The Image Director reads the newest article package that passed editorial review, writes a constrained hero-image brief, and uses the OpenAI Image API to create a landscape PNG. The PNG and its manifest are saved inside that article's ignored `content-production/runs/.../images/` folder. The manifest includes the filename, alt text, caption, model, review state and the non-diagnostic classification.

This command does not upload media or alter WordPress. Generated images are editorial illustrations. Genuine symptom photography remains mandatory wherever an image is used as evidence of a diagnosis or HouseplantLab observation.

## Publish a WordPress draft with its hero image

```powershell
npm run agents:publish-with-image
```

This is an explicit production action. It selects the newest tracked WordPress draft, revalidates the article and image manifest, uploads exactly one PNG, records its alt text and illustration caption, attaches it as the featured image and publishes the matching post. The dedicated WordPress account must have `upload_files`, `edit_posts` and `publish_posts`; WordPress's Author role provides these capabilities without granting site administration.

The article is recorded as `published` in the queue and must receive the owner's requested post-publication review. The command refuses another hostname, a failed editorial package, a missing image manifest or a non-editorial image classification.

## Audit structure and create the next SEO-led writer brief

```powershell
npm run agents:seo-plan
```

The Site Architect inventories published posts, pages and plant profiles through the public WordPress REST API, records their real outgoing links, identifies broken paths and orphaned pages, and refreshes the internal-link allowlist from observed live URLs. Default WordPress placeholders are audited but never approved as linking targets.

When read-only Google Search Console credentials are configured, the Search Performance stage requests the most recent 28-day final-data window ending three days ago. It records page/query clicks, impressions, CTR and average position, then identifies queries in positions 11-20 as “striking distance” opportunities. The SEO Brief Director combines those measurements with the site architecture report and produces `next-writer-brief.json`. A genuinely new article brief is added to the editorial queue; an existing-page refresh is saved for the refresh workflow and is never turned into a duplicate post.

Search Console configuration uses OAuth 2.0 with the read-only `webmasters.readonly` scope. Keep these values only in the ignored `.env` file:

- `GSC_SITE_URL=sc-domain:houseplantlab.co.uk`
- `GSC_CLIENT_ID`
- `GSC_CLIENT_SECRET`
- `GSC_REFRESH_TOKEN`

Without these four values, the structural audit still runs and records that performance data is unavailable; it will not invent rankings or search volumes.

## Build and apply the interlinking strategy

```powershell
npm run agents:interlinking-strategy
npm run agents:internal-links
npm run agents:internal-links:apply
```

The strategist combines the live inventory with read-only Search Console evidence. It identifies strong source pages and prioritises relevant targets in positions 11-20, followed by positions 5-10. The dry-run command writes a reviewable plan without changing WordPress. The apply command rechecks every URL and may update no more than three source articles.

Links are inserted as short, natural contextual sentences inside the article body before the final summary. They are not rendered as a generic link list. Every sentence contains one descriptive text hyperlink, and the workflow rejects invented paths, self-links, repeated links, placeholders, unrelated plant families and generic hub links presented as orphan fixes. If Search Console is unavailable, ranking-based priority is paused rather than guessed.

## Research and design the blog index

```powershell
npm run agents:design-blog
```

The Blog Experience Designer researches current interaction, accessibility, performance and responsible-advertising guidance, then combines it with the existing HouseplantLab visual system and live article subjects. Every run produces exactly three distinct design directions plus:

- a cited research record;
- three high-fidelity PNG design concepts for visual review before implementation;
- desktop and mobile layout-zone specifications;
- interaction, accessibility and advertising rules;
- a responsive HTML design board for visual comparison;
- an implementation handoff covering tokens, components, breakpoints, analytics events and acceptance criteria;
- a semantic HTML5 and Tailwind CSS implementation contract.

Artifacts are written under `docs/design-research/blog-page/<timestamp>/`. The package is always marked `human-review-required`. This workflow cannot edit the WordPress theme or publish anything; the owner must approve a direction before implementation begins.

## Verify the system

```powershell
npm run agents:typecheck
npm run agents:test
```

The commands compile to ignored JavaScript under `editorial-agents/dist/`. The project-level `npm test` command also runs the existing WordPress checks and build.

## Security boundary

- WordPress automation accepts only a username and Application Password from the ignored local `.env` file. It never accepts cPanel, FTP or database credentials.
- Search Console automation accepts only read-only OAuth credentials from `.env`; it never requests Search Console write access.
- Public publication is a separate explicit command and requires a WordPress Author account. The draft connector itself remains draft-only.
- `.env` files are ignored by Git and must never be committed or pasted into chat.
- Source records, editorial findings and deterministic checks are preserved with every run.
- `content-production/site-manifest.json` is the allowlist for internal links; agents cannot invent future URLs.
- The WordPress integration must use a dedicated Author account and the documented post-publication review boundary.

