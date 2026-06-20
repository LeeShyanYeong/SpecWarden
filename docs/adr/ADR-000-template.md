# ADR-NNN: <short decision title — e.g. "Use Podman as the container runtime">

**Status:** Proposed | Accepted | Superseded by ADR-XXX  
**Date:** YYYY-MM-DD

> Copy this file to `ADR-<next-number>-<kebab-title>.md`, fill every section, then add a row to
> [README.md](README.md). Number sequentially; never renumber or delete an accepted ADR —
> supersede it with a new one and set this file's Status to `Superseded by ADR-XXX`.

## Context

The forces at play — the technical, business, or operational situation that makes a decision
necessary. State the options considered (a small comparison table helps) and the constraints
that rule some out. Capture the *why now*, not just the *what*.

## Decision

The decision, stated plainly: "We will <do X>." Be specific enough that someone can act on it
without re-deriving the trade-offs. Note any fallbacks or scope limits.

## Consequences

What becomes easier and what becomes harder as a result — both the benefits and the costs /
follow-ups. List any knock-on work this decision creates.

## Enforcement

Where this decision is guarded so it cannot silently rot. Pick the tightest one that applies:

- **Standard** — an `ARCH-n` rule in `skills/arch-check` with a matching `[Fact]` in
  `tests/architecture/`. Use this for decisions about how production code must be shaped:
  promote the decision into a standard and cross-link the two (ADR ⇄ ARCH-n).
- **Script / config** — the pipeline stage or script that makes it true (e.g.
  `scripts/stage-deploy.sh`, `scripts/bootstrap.sh`). Use this for infrastructure / tooling
  decisions.
- **Spec** — referenced in the relevant `specs/<feature>.feature` header. Use this for a
  decision that only constrains one feature's behaviour; it then rides along to `atdd-task`.
- **Advisory** — nothing enforces this yet; it relies on review and discipline. Say why, and
  treat it as a candidate to promote into one of the above.
