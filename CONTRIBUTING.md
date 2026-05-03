# Contributing to MyKnowledgeRAG

Thank you for considering contributing! This document outlines the workflow for making changes to this project.

## Project Layout

```
MyKnowledgeRAG/
├── Backend/     # FastAPI (Python 3.12, uv)
└── Frontend/    # React + Vite (Node 20, npm)
```

## Development Setup

Follow the **Manual Setup** section in the [README](./README.md) to get both services running locally.

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `develop` | Integration branch |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `chore/*` | Tooling / config changes |

## Making Changes

1. **Fork** the repository and create your branch from `develop`:
   ```bash
   git checkout -b feature/your-feature-name develop
   ```

2. **Make your changes** — keep commits small and focused.

3. **Follow commit conventions** (Conventional Commits):
   ```
   feat: add BM25 weight tuning endpoint
   fix: handle empty PDF gracefully
   docs: update environment variable table
   ```

4. **Test your changes** before opening a PR.

5. **Open a Pull Request** targeting `develop`.

## Code Style

### Python
- Formatter: `ruff format` (88-char line length)
- Linter: `ruff check`
- Type hints encouraged throughout

### JavaScript / JSX
- Follow existing patterns in `src/components`
- Use functional components with hooks
- Keep components focused and reusable

## Environment Variables

- **Never commit `.env` files** — use `.env.example` as a template
- Document any new environment variables in both `.env.example` and the README table

## Questions?

Open an issue or start a discussion — happy to help!
