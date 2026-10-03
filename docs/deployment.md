# Deployment

## Requirements

- WordPress 6.6 or newer
- PHP 8.1 or newer
- A host that can deploy from GitHub or accept the generated archive

## Build locally

```bash
npm ci
npm test
```

The build output is written to `dist/wp-content`.

## GitHub-connected hosting

Connect the host to `rjb2803/houseplantlab`, use `main` as the production branch, and configure:

- Build command: `npm ci && npm test`
- Publish/deploy source: `dist/wp-content`
- Destination: the WordPress installation's `wp-content` directory
- Node.js: 22

The destination mapping must preserve `themes/houseplantlab` and `plugins/houseplantlab-core`. Do not configure a destructive mirror of the whole WordPress installation; WordPress core, third-party plugins, media uploads and configuration are outside this repository.

If the host cannot build from GitHub, run the **Package deployment** workflow and download its `houseplantlab-deploy-<commit>` artifact. Extract the archive into the WordPress root so its `wp-content` directory merges with the existing one.

After the first deployment:

1. Activate **HouseplantLab Core** in Plugins.
2. Activate **HouseplantLab** in Appearance → Themes.
3. Open Settings → Permalinks and save once if `/plants/` does not resolve immediately.
4. Confirm the homepage, `/plants/`, one post and the mobile navigation before sending traffic.

## Rollback

Redeploy a previously successful commit or use its retained workflow artifact. Database and uploads need the host's normal backup process because they are not stored in Git.

