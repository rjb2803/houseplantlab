# Architecture decision: deployable WordPress foundation

## Status

Accepted for the initial scaffold.

## Decision

HouseplantLab uses a native WordPress block theme and a separate site plugin:

- `themes/houseplantlab` owns presentation, templates and design tokens.
- `plugins/houseplantlab-core` owns the permanent plant content type, taxonomies and structured metadata.
- Node.js is used only for repeatable validation and packaging; the deployed site has no Node.js runtime requirement.
- WordPress 6.6+ and PHP 8.1+ are the supported baseline.

This follows the existing project brief, avoids a page-builder dependency and ensures plant data survives a future theme change.

## Deployment boundary

The repository does not include WordPress core, uploads, a database or secrets. The build produces `dist/wp-content` containing only the custom theme and plugin. This makes the output suitable for a GitHub-connected WordPress host or an artifact-based deployment without risking unrelated server files.

Production credentials and provider-specific upload steps are intentionally not committed. Add those only when the host, server path and rollback process are confirmed.

