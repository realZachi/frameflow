# Testing and verification

## Test expectations

- Every bug fix needs a regression test that fails without the fix.
- New deterministic behavior needs focused unit tests.
- Extract logic from React or DOM orchestration when that makes the behavior directly testable.
- Test observable outcomes and invariants, not implementation call order.
- Cover boundary values, invalid input, empty collections, and the failure path relevant to the change.
- Keep tests deterministic. Do not use real provider calls, API keys, wall-clock timing, or network access.

Vitest runs in jsdom. The current coverage threshold applies to the explicitly listed critical pure modules in `vitest.config.ts`. Add a new critical pure module to that list; do not exclude changed code or dilute thresholds to make CI pass.

## Required automated checks

Run:

```bash
bun run check
```

It validates stylesheet structure, typed ESLint rules, coverage thresholds, strict TypeScript, the production build, and dependency vulnerabilities. Fix the implementation when a gate fails. Do not lower a threshold or add a blanket exclusion without maintainer approval.

## Manual verification

Automated tests do not replace browser checks for rendered behavior.

- Editor state: create, edit, duplicate, reorder, lock, delete, undo, redo, reload.
- Persistence: confirm IndexedDB restoration and legacy migration when touched.
- UI: check focus, keyboard input, disabled states, narrow desktop layout, and visible regressions.
- Export: verify both PNG sizes and ensure editor/AI overlays are absent.
- Mockups: verify screenshot masking in flat and perspective devices.
- AI: test generate and edit modes, cancellation, invalid credentials, tool failure, and one-step undo.

Record the relevant manual checks in the pull request. UI changes require before/after images or a short recording.
