# HouseplantLab

HouseplantLab is a UK-focused houseplant care and problem-solving website built around practical guidance, structured plant information, useful diagnostic tools, and original photography.

## Brand proposition

**Healthy Houseplants. Happier Homes.**

Practical UK-focused houseplant care guides, problem solutions, and real photography from plants grown by HouseplantLab.

The broader editorial promise is simple:

> We grow it. We test it. We photograph it.

## Project status

The repository now contains a deployable first foundation: a native WordPress block theme, a site-specific core plugin, repeatable validation/build scripts, and GitHub Actions for validation and deployment packaging. The visual system is intentionally restrained until the approved mockup/export is added.

## Quick start

Requirements: Node.js 20+ for packaging, WordPress 6.6+, and PHP 8.1+ on the target host.

```bash
npm ci
npm test
```

The deployable files are written to `dist/wp-content`. Install or deploy its theme and plugin folders to the corresponding WordPress `wp-content` paths, then activate **HouseplantLab Core** and **HouseplantLab**.

To review the current responsive homepage direction without a WordPress installation, run `npm run preview` and open `http://127.0.0.1:4173`. This preview uses illustrated photography placeholders; production photography remains content-managed in WordPress.

## Documentation

- [Project brief and decisions](docs/project-brief.md)
- [Initial implementation plan](docs/implementation-plan.md)
- [Architecture decision](docs/architecture.md)
- [Build and deployment guide](docs/deployment.md)
- [Plant profile editorial process](docs/plant-profile-editorial-process.md)
- [Approved design reference](docs/design-reference/README.md)

## Repository shape

```text
houseplantlab/
├── .github/workflows/          Validation and deployment packaging
├── docs/                       Project decisions and operating guidance
├── themes/houseplantlab/       Lightweight custom WordPress theme
├── plugins/houseplantlab-core/ Site-specific content types and tool logic
├── scripts/                    Dependency-free validation and packaging
└── README.md
```

Keeping the plant data model and diagnostic logic in a small site plugin prevents that content from being tied permanently to one visual theme.

