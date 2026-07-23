# TypeScript, naming, and implementation quality

## Type safety

- Keep all strict compiler flags passing, including exact optional properties, unchecked index access, unused code, and implicit returns.
- Do not use `any`, non-null assertions, broad casts, or `eslint-disable` as escape hatches.
- Narrow `unknown` at the boundary. Validate untrusted provider, storage, DOM, and file input before using it.
- Represent alternatives with discriminated unions and exhaust them deliberately.
- Omit absent optional fields instead of passing `undefined`; use a conditional object spread when required.
- Prefer `type` imports where ESLint requests them.
- Keep public callback and return types specific. Do not return an unstructured object whose fields depend on undocumented conditions.

A rule suppression is acceptable only for an unavoidable platform constraint. Scope it to one line and explain why the replacement is not viable.

## Functions and abstractions

- Give each module and function one primary responsibility.
- Prefer guard clauses over nested conditionals.
- Use an options object once arguments stop forming one obvious tuple. Never add a sixth positional parameter.
- Extract pure transformations before extracting generic framework abstractions.
- Remove dead branches, speculative flexibility, commented-out code, duplicate helpers, and forwarding wrappers with no semantic value.
- Do not catch errors merely to ignore them. Catch at a recovery or translation boundary and preserve actionable context.
- Keep expected failures structured; reserve thrown errors for violated invariants or genuinely exceptional failures.

## Naming

- React component and component-module names: `PascalCase`.
- Hooks: `useSomething`; non-component modules: `kebab-case.ts`.
- Exported types: `PascalCase`; functions and values: `camelCase`.
- Booleans: prefer `is`, `has`, `can`, or `should`.
- Local event handlers: `handleAction`; callback props: `onAction`.
- CSS classes: `kebab-case`.
- Test files: `*.test.ts` or `*.test.tsx`, next to the code they verify.

Avoid vague names such as `manager`, `handler`, `helper`, `data`, or `utils` when a domain term exists.

## Style and comments

Handwritten TypeScript uses two spaces, single quotes, trailing commas in multiline structures, and no semicolons. ESLint owns formatting.

Comments explain constraints, invariants, or non-obvious tradeoffs. Do not narrate the code, leave task notes, claim that code is “robust,” or add section banners. Keep provider and canvas documentation synchronized with reality.
