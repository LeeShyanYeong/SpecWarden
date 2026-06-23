# ADR-003: Use CSS custom properties as the design-token mechanism

**Status:** Accepted  
**Date:** 2026-06-22

## Context

Component stylesheets in the Angular frontend hardcode visual literals — colours and lengths
written directly in each component's `.css` — while the global stylesheet
(`src/frontend/src/styles.css`) is empty. There is no single place a colour, spacing, or type value
lives, so the same value is repeated across files and "the look" is not something the build can
reason about. This is a frontend-wide concern, independent of any one feature.

A design brief (the output of `design-task`) deliberately describes the look in **token roles** —
a surface colour, an accent, a focus ring, a spacing scale — rather than pinning hex/px. To turn
that intent into a guarded SSOT (the planned **ARCH-5** tokens standard, and a possible future
`@visual` lane), the codebase first needs a **token mechanism**: one source for the values, a naming
convention, a reference syntax, and — by consequence — a precise definition of what counts as a
raw-value violation for the guard to scan.

Four mechanisms were evaluated:

| | CSS custom properties | Sass variables | Angular Material theme | `tokens.json` + build |
|---|---|---|---|---|
| Source of truth | `:root` in `styles.css` | a `_tokens.scss` | a Material theme `.scss` | a JSON file |
| Reference syntax | `var(--color-accent)` | `$color-accent` | Material mixins/functions | generated CSS/TS vars |
| Build step needed | None | Sass compile | Sass + Material | A token-build tool |
| Runtime themeable (e.g. dark mode) | Yes | No (compile-time only) | Partially, via Material | Yes (emits CSS vars) |
| Ties us to a UI library | No | No | **Yes** (Material) | No |
| Extra tooling to maintain | None | Sass pipeline | Material | A generator + its config |

The frontend uses plain Angular with plain `.css` and an empty global stylesheet. CSS custom
properties need no build step, are referenceable from every component as-is, and are themeable at
runtime later — at the cost of no compile-time checking of token *names*. The other options add a
toolchain (Sass, a generator) or couple the design system to Material, neither of which this
reference-sized project needs today.

## Decision

We will use **CSS custom properties as the design-token mechanism** across the frontend:

- **Single source.** All token values are defined once, on `:root` in
  `src/frontend/src/styles.css`. That file is the *only* place raw hex/px literals may appear.
- **Reference syntax.** Component stylesheets reference tokens via `var(--<token>)` and never write
  a raw hex colour or `px` length themselves.
- **Naming convention.** `--<category>-<role>`, kebab-case — e.g. `--color-surface`,
  `--color-accent`, `--color-danger`, `--focus-ring`, `--space-md`, `--radius-md`,
  `--elevation-rest`. Categories cover colour (surfaces, ink, accent, semantic success/danger),
  spacing scale, type scale, radius, elevation, and motion.
- **Scope limit.** This pins the *mechanism* — where values live and how they are referenced — not
  any *palette*. Which exact colours/spacings exist is a per-feature implementation choice and may
  evolve without revisiting this ADR, because the guard keys on "raw literal vs. token reference",
  not on any specific value.

The exact lexical rule the guard enforces (which literal patterns count, and any pragmatic
exceptions such as `0` or hairline `1px`) is settled when **ARCH-5** is written, not here.

## Consequences

- **Easier:** one home for every visual value; a palette or theme change happens in one place; the
  look becomes runtime-themeable (dark mode is a later `:root` override, no rebuild); and **ARCH-5
  gains a precise predicate** — "raw hex/`px` outside `styles.css` is a violation."
- **Harder / follow-ups:** any component stylesheet that currently holds literals must be migrated
  onto tokens (this is the green half of the ARCH-5 red→green loop). CSS custom properties give
  **no compile-time check of token names** — a misspelled `var(--colr-accent)` silently resolves to
  nothing; ARCH-5 only bans raw literals and does not validate token names, so name-typo detection
  is a separate, later concern (a stylelint rule, if wanted).
- **Out of scope here:** accessibility (roles, focus order, contrast) is **not** part of this
  mechanism or ARCH-5 — it is runtime truth that rides in as `@component` scenarios (axe-core + role
  assertions) from `spec-task`.

## Enforcement

**Standard** — guarded by **ARCH-5** in `skills/arch-check`, with its `[Fact]`
(`Arch5_FrontendStylesheetsUseTokensNotRawLiterals`) in
`tests/architecture/DesignTokenStandards.cs`. It scans `src/frontend/src/**/*.css` (excluding the
`styles.css` token file) and fails the build on any raw hex colour or `px` length literal (hairline
`1px` borders excepted). This ADR is the *why*; ARCH-5 is the build-breaking guard.

The guard is **red today** — existing component stylesheets still hold raw literals — and turns
green once they are migrated onto tokens (the implementation step). Accessibility is deliberately
out of ARCH-5's scope: it is runtime truth carried by `@component` scenarios, not a static scan.
