# Repository Guidelines

## Project Structure & Module Organization
This repo delivers a static React SPA via Vite; there is no backend or server-rendered code. Organize source files as:
- `src/app/` routing and global providers.
- `src/components/` shared UI primitives.
- `src/features/<domain>/` feature screens, hooks, services.
- `src/lib/storage/` browser persistence helpers.
- `src/assets/` images, icons, styles.
- `public/` files copied verbatim into the build.
- `tests/unit/` and `tests/e2e/` for Vitest and Playwright suites.

## State & Storage Model
Persist everything in browser storage. Wrap `localStorage`, `sessionStorage`, and IndexedDB in typed modules under `src/lib/storage/`, prefix keys with `orw-` (e.g. `orw-api-key`), and prefer `localStorage` for preferences, `sessionStorage` for transient flags, IndexedDB for larger caches. Provide a single `clearBrowserState()` helper and call it on sign-out. Do not add server endpoints; prompt users to re-enter credentials.

## Build, Test, and Development Commands
Run from the repo root:
- `npm install` installs dependencies.
- `npm run dev` starts Vite at `http://localhost:5173`.
- `npm run build` outputs the static bundle to `dist/`.
- `npm run preview` serves the production bundle locally.
- `npm run lint` runs ESLint and Prettier (`-- --fix` to auto-format).
- `npm run test` runs Vitest; `npm run test:e2e` drives Playwright.

## Coding Style & Naming Conventions
Use TypeScript with `strict` enabled. Prefer function components and hooks. Indent TS/JS with two spaces, JSON/YAML with four. React components use PascalCase, hooks start with `use`, storage helpers end with `Store`, filenames use kebab-case. Run `npm run lint -- --fix` before opening a PR.

## Testing Guidelines
Place unit specs as `*.test.tsx` beside their sources. Keep end-to-end specs in `tests/e2e/` named `<feature>.e2e.ts`. Mock browser storage via fixtures in `tests/unit/mocks/` to cover persistence logic. Target ≥80% branch coverage (`npm run test -- --coverage`) and keep Playwright artifacts under `tests/e2e/artifacts/`.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.) with subjects ≤72 characters. Include or update tests when behaviour changes. Pull requests must describe the user scenario, note storage keys touched, link issues, and attach screenshots or GIFs for UI updates. Ensure `npm run lint` and `npm run test` pass before requesting review.

## Security & Configuration Tips
Because all state stays in the browser, remind users to add API keys only on trusted devices and clear storage on shared machines. Never hardcode secrets; document optional keys and feature flags in `docs/configuration.md`. Run `npm audit` monthly and resolve high or critical findings promptly.