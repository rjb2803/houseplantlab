# HouseplantLab editorial agents

This local editorial pipeline prepares evidence-led article packages for human review. It does not connect to WordPress, publish content, upload media or use FTP.

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

Set `WP_SITE_URL`, `WP_USERNAME` and `WP_APP_PASSWORD` for a dedicated WordPress contributor account, then run:

```powershell
npm run agents:sync-wordpress
```

The connector selects one `ready-for-human-review` package, revalidates its complete bundle, converts its structured Markdown to escaped HTML and creates a normal WordPress post with the status hard-coded to `draft`. It refuses another hostname, a failed quality report, unsupported editorial claims or an unexpected non-draft response. It records the WordPress post ID and edit URL in the queue to prevent duplicate uploads. It has no publish operation.

## Verify the system

```powershell
npm run agents:typecheck
npm run agents:test
```

The commands compile to ignored JavaScript under `editorial-agents/dist/`. The project-level `npm test` command also runs the existing WordPress checks and build.

## Security boundary

- No WordPress, cPanel, FTP, database or Search Console credentials are accepted.
- No publishing tool exists in this phase.
- `.env` files are ignored by Git.
- Source records, editorial findings and deterministic checks are preserved with every run.
- `content-production/site-manifest.json` is the allowlist for internal links; agents cannot invent future URLs.
- A future WordPress integration must use a restricted draft-only account and a separate human approval boundary.

