# FlexiChat Functional Specification

## 1. Purpose and Scope
FlexiChat is a single-user browser application that lets people conduct text-based conversations with OpenRouter-compatible large language models. The tool focuses on:
- Managing multiple conversations ("chats") with stored history.
- Creating and switching between reusable request presets that bundle model, instructions, API endpoint, API key, and extra parameters.
- Sending prompts to OpenRouter, receiving responses, and refining conversations through editing, branching, or regenerating replies.
All functionality runs entirely in the browser. Data is persisted only to browser storage so the experience can be reimplemented on any client platform capable of local persistence and HTTP requests.

## 2. Terminology
- **Chat Thread**: A conversation instance containing ordered messages and metadata. Exactly one chat can be active at a time.
- **Message**: A single user or assistant utterance belonging to a chat thread. Messages carry status flags to represent pending, error, and cancellation states.
- **Preset**: A reusable configuration describing how to talk to OpenRouter (model, instructions, endpoint, API key, extras). One preset is considered active at a time and is applied to the active chat when requests are sent.
- **Request Parameters**: Named JSON fragments attached to requests as top-level OpenRouter options (e.g., `temperature`).
- **Model Catalogue**: The list of models fetched from the OpenRouter models endpoint, augmented with built-in fallbacks.

## 3. High-Level Experience
The interface is divided into three primary regions:
1. **Sidebar (left)** – Lists chats, enables search, creation, renaming, deletion, and full reset. The sidebar width is adjustable by dragging the right edge between 240 px and 520 px.
2. **Preset Toolbar (top of main area)** – Displays the currently selected preset and opens a management dialog for creating, editing, cloning, or deleting presets.
3. **Conversation Area (below toolbar)** – Shows the active chat thread and provides a message composer to send new prompts.

On first launch (or after clearing storage) the app seeds:
- One chat titled "Welcome" with no messages.
- One preset: “Default (openrouter)” with OpenRouter defaults (no API key).

## 4. Data Model
All persistence keys are prefixed with `orw-` and stored via browser storage helpers.

### 4.1 Chat Thread Structure
- `id`: unique string identifier.
- `title`: user-visible title.
- `updatedAt`: Unix timestamp (ms) of the most recent message or mutation.
- `messages`: ordered list of Chat Messages.
- `lastPresetId`: identifier of the most recently applied preset for this chat (nullable).

### 4.2 Message Structure
- `id`: unique string identifier.
- `role`: either `user` or `assistant`.
- `content`: full textual content.
- `createdAt`: Unix timestamp (ms) when message was created or last updated.
- `status` *(optional)*: one of `pending`, `complete`, `error`, `cancelled`.

### 4.3 Preset Structure
- `id`: unique string identifier.
- `name`: label shown in the UI.
- `model`: OpenRouter model identifier string.
- `instructions`: optional system prompt sent ahead of chat history.
- `apiKey`: per-preset OpenRouter API key, stored locally in clear text.
- `apiEndpoint`: HTTP endpoint URL. Defaults to `https://openrouter.ai/api/v1/chat/completions` when blank.
- `requestParameters`: array of `{ name: string; value: JSON-compatible value }` forwarded as extra request fields.

### 4.4 Derived/Persisted Keys
- `orw-chats` (localStorage): array of chat threads.
- `orw-presets` (localStorage): array of presets.
- `orw-active-chat` (sessionStorage): chat ID selected in the current browser session.
- `orw-active-preset` (localStorage): preset ID considered active across sessions.
Clearing storage removes these keys and restores defaults.

## 5. Session Initialization
1. Load chats and active chat ID from storage. If data is missing or invalid, regenerate defaults.
2. Load presets and active preset ID similarly. If the active preset no longer exists, fall back to the first available preset.
3. Fetch OpenRouter model catalogue. Until successful, a built-in fallback list (OpenRouter Turbo, Meta Llama 3 70B Instruct, Claude 3 Opus) is used. The app never blocks on network failures.
4. Decode the URL hash. If it matches `#/chat/{id}` and the chat exists, select it as the active chat.

## 6. Chat Management Features
### 6.1 Listing and Searching
- All chats are displayed chronologically (newest first). The active chat is highlighted.
- A search box filters chats in real time. The match is case-insensitive and checks for the search term at word boundaries within titles. When no results match, indicate that no chats match the search.

### 6.2 Selection and Navigation
- Clicking a chat selects it, loads its messages, and updates the URL hash to `#/chat/{id}`.
- Direct navigation to a hash URL selects the referenced chat if present.

### 6.3 Creation
- “Start new chat” button inserts a fresh chat at the top with title “Untitled chat,” no messages, and no preset association.
- Creating a chat automatically selects it and updates the hash.
- Sending a message while no chat is selected implicitly creates a new chat before delivery.

### 6.4 Renaming
- A rename action opens an inline text field. Submitting a non-empty trimmed value updates the title and timestamp.
- Pressing Escape cancels edits. Empty titles are rejected.
- After the first user message in a chat, if the title remains “Untitled chat,” the system auto-suggests a title by trimming the first message to 42 characters (with ellipsis when truncated).

### 6.5 Deletion
- Chat deletion prompts for confirmation. Upon acceptance, remove the chat and select the next available chat (if any). Update the hash to reflect the new active chat or clear it when none remain.

### 6.6 Branching
- From any message, the user can “Clone chat from this message.” The app duplicates the source chat up to and including the chosen message, generates new message IDs, and titles the clone `<original title> (branch)` (adding ` (branch)` only once). The clone becomes the active chat and is inserted at the top of the list.

### 6.7 Reset
- “Clear browser state” removes all registered storage keys, repopulates defaults (Welcome chat plus default presets), clears active selections, and resets the URL hash to `#/`.

## 7. Message Lifecycle
### 7.1 Composition
- The composer accepts multi-line text. Pressing Enter submits unless Shift is held or the event is part of IME composition. The Send button is disabled while the input is empty, no chat is active, or the app is waiting on a pending assistant reply.

### 7.2 Submission Flow
1. Trim whitespace. If empty, ignore.
2. Ensure a chat is active (creating one if necessary).
3. Append the user message immediately with `role=user` and status `complete`.
4. If the chat title is still the default, set it based on the first message content (see §6.4).
5. Append an assistant placeholder message with `status=pending` and track it as the request currently in flight.
6. Resolve the active preset. Validation must ensure:
   - A preset is selected.
   - The preset contains a non-empty API key.
   - When the preset’s API endpoint field is blank, swap in the default.
   Failure produces an error handled in §7.4.
7. Build OpenRouter messages consisting of optional system instructions, prior chat history, and the new user message.
8. Merge preset request parameters into the payload (`extras` map). Parameters with empty names are ignored.
9. Issue a POST request to the preset endpoint with headers:
   - `Content-Type: application/json`
   - `Accept: application/json`
   - `Authorization: Bearer <API key>` when present.
   - `HTTP-Referer`: current origin or `http://localhost` when unavailable.
   - `X-Title`: `OpenRouter Web UI`.
10. When a response arrives, normalize its message content (flatten string arrays, extract text segments). Update the pending message with the received content, mark status `complete`, and stamp `createdAt` to current time.

### 7.3 Pending Requests
- Only one assistant message can be pending at a time. While pending, the composer is disabled.
- A visible skeleton loader indicates progress. An “Abort” button cancels if the pending message corresponds to the current request. Cancelling aborts the HTTP request and marks the message `cancelled` with the text “Request cancelled.”

### 7.4 Error Handling
- Network or validation failures update the pending assistant message with an error text. Consequences:
  - Validation failures (e.g., missing preset or API key) use the thrown message.
  - HTTP failures attempt to surface the API’s `error.message`; otherwise they report `OpenRouter request failed: <status code>`.
  - Parsing failures show “OpenRouter response did not include textual content.”
- Error messages set status `error`. They remain in the thread for reference and can be edited or deleted like any other assistant message.

### 7.5 Editing and Deletion
- Messages can be edited in place. Selecting “Edit” replaces the content with a textarea. Saving trims the value and updates the message content and timestamp. Cancelling reverts without change.
- Messages can be deleted after confirmation. Deleting recalculates the chat’s `updatedAt` timestamp based on the remaining last message; if none remain, it uses the deletion time.

### 7.6 Markdown vs. Plain Text View
- Assistant messages default to a Markdown renderer supporting headings, lists, code blocks, inline code, links, blockquotes, and horizontal rules (with GitHub Flavored Markdown extensions). Users may toggle each message between Markdown rendering and raw text display.

### 7.7 Regenerating Responses
- The most recent assistant message can be regenerated. Requirements:
  - No other request is active.
  - The target message exists, belongs to the active chat, and has `role=assistant`.
  - Its preceding user message is located by scanning backward for the latest `role=user` entry. If none exists, regeneration is aborted.
- Before sending, the assistant message is reset to an empty `pending` shell. History includes all prior messages up to—but not including—the last user message; the last user message is re-sent as the user prompt. The same preset validation and request flow as §7.2 is used, with results replacing the message content.

## 8. Preset Management
### 8.1 Active Preset Selection
- A dropdown in the toolbar lists all presets. Selecting one makes it active and associates it with the active chat (updating that chat’s `lastPresetId`). When a chat becomes active, if it remembers a preset that still exists, automatically select that preset.

### 8.2 Preset Manager Dialog
- Triggered by a gear icon. Opens a modal with two panes:
  - **Left pane**: list of existing presets with buttons to clone or delete each. Selecting a preset fills the right pane with its editable form.
  - **Right pane**: either an edit form for the selected preset or a creation form if creating a new preset.

### 8.3 Creating Presets
- “Create preset” switches the manager to creation mode. The form fields include name, model (chosen from the model catalogue), API endpoint, API key, optional instructions, and custom request parameters.
- Custom parameters are managed as reusable rows with name and JSON value fields. Values must parse as JSON; otherwise an inline error is displayed and submission is blocked.
- On submit, validation ensures non-empty name and model, valid JSON parameters, and normalized endpoint (default if blank). The new preset is prepended to the list, becomes active, and the manager returns to view mode.

### 8.4 Editing Presets
- In view mode, fields are pre-populated. Changes are saved in place without altering the preset’s ID. Request parameter edits completely replace the stored parameter array with the edited list.
- The API key field uses a password-style input. A helper note reminds users that keys are stored locally and should be cleared on shared devices.
- An API key summary chips show masked value (e.g., `****1234`) next to the preset title when editing.

### 8.5 Cloning Presets
- Available from both the list and edit view. Cloning copies all fields, deep-cloning parameter values, appends “ (copy)” to the name, and creates a new preset entry that becomes active immediately.

### 8.6 Deleting Presets
- Deletes require confirmation. After deletion, if the active preset was removed, activate the next available preset (or `null` if none remain). If the manager is open, either switch to another preset or, when no presets remain, automatically enter creation mode.

## 9. Model Catalogue Behaviour
- On mount, the app requests `GET https://openrouter.ai/api/v1/models` with default headers (no API key). Failures are captured as a descriptive error string but do not block using fallback options.
- Options are transformed into `{ value: id, label: name or id }` pairs for selection controls.
- Within the preset manager, model lists support live search filtering based on label or value. If a preset references a model not present in the fetched list, the manager ensures it is still available in the dropdown.

## 10. Association Between Chats and Presets
- Every time a chat successfully sends or regenerates a message, the preset used is stored as that chat’s `lastPresetId`.
- When activating a chat, if the remembered preset still exists, set it active automatically. This ensures each chat keeps using the preset it last succeeded with, while allowing manual overrides.

## 11. URL Handling
- The app uses hash-based routing. Valid hashes:
  - `#/` – no chat selected.
  - `#/chat/{chatId}` – identifies a specific chat.
- Navigating via the address bar or browser history triggers selection logic. Invalid IDs are ignored without error.
- On chat creation, deletion, or selection, the hash is kept in sync (using history replacement when possible).

## 12. Browser Storage Discipline
- All storage interactions go through helper stores that validate shape before accepting persisted data. Invalid data is discarded and replaced with defaults.
- `clearBrowserState()` removes only keys registered through the storage helpers and is invoked when the user requests a full reset.
- Active chat ID lives in session storage so new tabs start on the Welcome chat while the original tab retains its selection.

## 13. Confirmation Prompts and Safety Nets
- Destructive actions (delete message, delete chat, delete preset) must prompt the user for confirmation before proceeding. Cancelling the prompt aborts the action.
- The UI should keep functioning without network access, aside from model list refreshes and chat completions.

## 14. Accessibility and Interaction Notes
- Buttons and inputs require descriptive labels for assistive technologies (e.g., “Start new chat,” “Send message”).
- Keyboard interactions:
  - Enter submits messages; Shift+Enter inserts a newline.
  - Escape cancels chat renaming or message editing.
  - Dialogs should trap focus while open and restore focus on close.
- Visual status indicators (pill labels, skeleton loaders, color-coded borders) distinguish pending, error, and cancelled states.

## 15. Error Messaging Expectations
- Missing presets or API keys produce actionable error messages in-line inside the chat thread.
- Aborted requests explicitly state “Request cancelled.”
- OpenRouter failures show the reason returned by the API when available, otherwise include the HTTP status code.
- Messages with status `error` or `cancelled` remain editable and deletable.

## 16. Security Considerations
- API keys are stored in browser localStorage only. Users must be warned (in the preset manager) to avoid storing secrets on shared devices and to use the reset action to wipe keys.
- No server-side storage or proxying is performed.

## 17. Non-Functional Requirements
- The application must function as a static client (no backend dependencies beyond the OpenRouter API).
- All user data should persist between sessions using browser storage and reload gracefully when data structures evolve.
- The UI targets dark mode by default but spec compliance focuses on logical behavior, not visual styling.

## 18. Reimplementation Checklist
To reproduce the product on another platform:
1. Provide UI regions for chats, presets, and conversation flow mirroring the behaviors above.
2. Implement local persistence for chats, presets, and active selections using equivalent storage mechanisms.
3. Implement the message lifecycle, including pending placeholders, cancellation, error handling, markdown rendering, editing, and branching.
4. Provide preset creation/editing workflows with validation of JSON parameters and secure local storage of API keys.
5. Integrate with OpenRouter using the request format described, including headers, instruction injection, history replay, extras merging, and response normalization.
6. Support hash-based or equivalent routeable navigation to individual chats.
7. Offer reset functionality that fully clears stored data and reinstates seed content.
8. Ensure destructive actions confirm with the user before proceeding and that cancellations leave state untouched.

This specification encapsulates the user-facing contract of FlexiChat so an external developer can rebuild the experience with consistent functionality on any technology stack.
