# FlexiChat

FlexiChat is a single‑user, browser‑only chat client for OpenRouter‑compatible large language models. It helps you manage multiple conversations, switch between reusable request presets (model, instructions, endpoint, API key, extra parameters), and iterate quickly by editing, branching, or regenerating messages — all persisted locally in your browser.

For the full product contract and behavior details, see DOC.md.

## Features
- Multiple chat threads with search, rename, and delete
- Reusable presets: model, system instructions, API endpoint, API key, extra JSON parameters
- Message lifecycle: pending/cancel/error states, edit, regenerate, branch
- Model catalogue with fallback list; works offline for core flows
- Hash‑based routing to `#/chat/{id}` and session‑scoped active chat
- 100% client‑side: no server, all data in browser storage

## Quick Start
Prerequisites: Node.js 18+ and npm.

- Install: `npm install`
- Develop: `npm run dev` (Vite at http://localhost:5173)
- Build: `npm run build` (outputs to `dist/`)
- Preview production build: `npm run preview`
- Lint: `npm run lint` (use `-- --fix` to auto‑format)
- Test: `npm run test` (Vitest)

## Usage Overview
1. Start the app and open it in your browser.
2. Create or select a chat in the sidebar. The URL hash reflects the active chat.
3. Open the Preset manager to create or edit a preset:
   - Choose a model (fetched from OpenRouter, with fallbacks when offline).
   - Optionally add system instructions and extra request parameters (JSON‑parseable values).
   - Set an API endpoint (defaults to `https://openrouter.ai/api/v1/chat/completions` when blank).
   - Paste an OpenRouter API key. Keys are stored locally in your browser.
4. Send prompts from the composer. Messages show pending, error, or cancelled states and can be edited, regenerated, or branched.

Keyboard shortcuts:
- Enter to send, Shift+Enter for newline
- Escape to cancel rename/edit dialogs

## Configuration & Security
- API keys are kept in browser localStorage per preset. Do not use on shared devices unless you plan to clear storage afterwards.
- There is no backend. If you clear your browser storage, you will need to re‑enter keys and presets.
- The app attempts to fetch the OpenRouter model list without a key; failures do not block usage.

## Storage Model
All persistence uses browser storage with `orw-`‑prefixed keys via typed helpers.

- `orw-chats` (localStorage): array of chat threads
- `orw-presets` (localStorage): array of presets
- `orw-active-chat` (sessionStorage): active chat ID for the current session
- `orw-active-preset` (localStorage): active preset ID

Use the reset action in the UI to remove these keys and restore seeded defaults (Welcome chat and one preset: “Default (openrouter)”).

## Project Structure
This is a static React SPA built with Vite. High‑level organization:

- `src/app/` routing and global providers
- `src/components/` shared UI primitives
- `src/features/<domain>/` feature screens, hooks, services
- `src/lib/storage/` browser persistence helpers
- `src/assets/` images, icons, styles
- `public/` files copied verbatim into the build
- `tests/unit/` for Vitest; `tests/e2e/` reserved for Playwright

Coding style: TypeScript (strict), function components and hooks, two‑space indent. Run `npm run lint -- --fix` before committing.

## Testing
- Unit tests: `npm run test` (Vitest). Aim for ≥80% branch coverage (`npm run test -- --coverage`).
- E2E (optional): place specs under `tests/e2e/` if/when Playwright is added.

## Contributing
Follow Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`). For PRs, describe the user scenario, list storage keys touched, link issues, and add screenshots/GIFs for UI changes. Ensure `npm run lint` and `npm run test` pass.

## License
MIT — see LICENSE.
