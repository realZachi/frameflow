# Architecture and module boundaries

## Dependency direction

Keep dependencies flowing toward stable foundations:

```text
types / utilities / persistence / data / mockups
             ↑
        ai and editor domains
             ↑
       components and app orchestration
             ↑
             App.tsx
```

- `src/App.tsx` is composition only. Put workflows in `src/app/`, editor behavior in `src/editor/`, and model behavior in `src/ai/`.
- `src/app/` may compose all application domains and UI.
- `src/editor/` must not import from `src/app/`, `src/ai/`, or `src/components/`.
- `src/ai/` must not import from `src/app/`, `src/editor/`, or `src/components/`.
- `src/components/` renders UI and may call injected callbacks; do not move persistence or project orchestration into a component.
- Shared foundations must not import from higher layers. Move a genuinely shared abstraction down instead of creating a cycle.
- Avoid barrel files. Import from the module that owns the symbol so dependencies stay visible.

ESLint enforces the AI and editor restrictions and rejects import cycles.

## Module ownership

- `src/app/`: project lifecycle, app header/dialog composition, export, and cross-domain workflows.
- `src/editor/`: history, keyboard behavior, immutable editor operations, and pure editor calculations.
- `src/ai/`: provider runner, prompt, controller, tool groups, measurement, preview, and AI workflow.
- `src/components/`: canvas and editor presentation.
- `src/components/ui/`: shadcn-generated primitives; see the UI rules.
- `src/styles/`: ordered base and theme layers. `src/styles.css` is imports only.

Place feature-specific helpers next to their feature. Add to a generic `utils` module only when the function is domain-independent and has multiple real callers.

## Enforced complexity ceilings

These are ceilings, not design targets:

- Cyclomatic complexity: 25.
- Nesting depth: 4.
- Positional parameters: 5.

There is no hard line-count limit on modules, functions, or stylesheets. Size is a judgment call, not a gate: split code when a name, test, or review becomes difficult, not to satisfy a counter. Never evade the complexity ceilings with generated wrappers, disabled rules, compressed formatting, or unrelated helper dumping.

## State and side effects

- Projects may contain zero slides. Keep the empty-state creation paths, optional
  active slide, persistence, and undo/redo behavior working together.
- Keep slide and element updates immutable.
- Use one history checkpoint per meaningful user action.
- Keep browser APIs, persistence, provider calls, and image export at explicit boundaries.
- Extract deterministic calculations into pure functions and test them without React.
- Do not introduce a global store, service locator, or context merely to avoid passing a small, cohesive interface.

Review [the runtime architecture](../ARCHITECTURE.md) before changing persistence, coordinates, export, mockups, or AI behavior.
