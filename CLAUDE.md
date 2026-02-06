# Project: Theme Showcase

Next.js app demonstrating multi-theme support with AG Grid, charts, modals, and input controls.

## Commands

- `npm run dev` / `make run` — start dev server
- `npm run build` / `make build` — production build
- `npm run lint` / `make lint` — run ESLint

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19, TypeScript 5
- AG Grid Community (ag-grid-react)
- CSS Modules (no Tailwind, no CSS-in-JS)

## Architecture

- `src/app/` — App Router pages and global styles
- `src/components/` — client components, each with a co-located `.module.css`
- `src/context/ThemeContext.tsx` — theme provider (light, dark, ocean, forest, sunset)

## Conventions

- All interactive components use `"use client"` directive
- Theming uses CSS custom properties on `[data-theme="..."]` selectors in `globals.css`
- Components reference theme via `var(--color-*)` variables — never hard-code colors
- Each component is a default export with a co-located `ComponentName.module.css`
- No external charting library — charts are pure SVG
- Native `<dialog>` element for modals (no portal libraries)
- Key CSS variables: `--color-bg`, `--color-surface`, `--color-text`, `--color-text-secondary`, `--color-primary`, `--color-primary-hover`, `--color-primary-text`, `--color-accent`, `--color-border`, `--color-border-focus`, `--color-input-bg`, `--color-success`, `--color-warning`, `--color-danger`, `--color-shadow`, `--color-surface-hover`
