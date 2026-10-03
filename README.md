# HouseplantLab

HouseplantLab is a UK-focused houseplant care and problem-solving website built around practical guidance, structured plant information, useful diagnostic tools, and original photography.

## Brand proposition

**Healthy Houseplants. Happier Homes.**

Practical UK-focused houseplant care guides, problem solutions, and real photography from plants grown by HouseplantLab.

The broader editorial promise is simple:

> We grow it. We test it. We photograph it.

## Project status

This repository currently contains the agreed project direction and an implementation roadmap. No production theme, plugin, or deployment configuration has been selected or created yet.

## Documentation

- [Project brief and decisions](docs/project-brief.md)
- [Initial implementation plan](docs/implementation-plan.md)

## Proposed repository shape

```text
houseplantlab/
├── docs/                       Project decisions and operating guidance
├── themes/houseplantlab/       Lightweight custom WordPress theme
├── plugins/houseplantlab-core/ Site-specific content types and tool logic
└── README.md
```

Keeping the plant data model and diagnostic logic in a small site plugin prevents that content from being tied permanently to one visual theme.

