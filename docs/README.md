# SpecWarden docs

How the spec-driven development (SDD) architecture is implemented. Start here if you
want to understand *how* the framework enforces a spec, not just *that* it does.

For the elevator pitch and quickstart, see the top-level [README](../README.md).

## Contents

| Doc                                | What it covers                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| [architecture.md](architecture.md) | The core model: SSOT artifacts, runner-guarded lanes, tag routing, the CI pipeline, and the "dormant until present" guards. |
| [workflow.md](workflow.md)         | The single-agent workflow end to end — which skill runs when, and what artifact each produces. |
| [example-app.md](example-app.md)   | The bundled sticky-notes reference feature as a worked example, plus where its name is hardcoded into the scaffolding. |
| [adr/](adr/)                       | Architecture decision records (e.g. the container-runtime choice).              |

## The one idea

A document only counts when an **always-run executable consumes it and the build
fails on red.** SpecWarden has exactly two kinds of always-run executable:

- a **Gherkin runner** that turns `specs/*.feature` into passing/failing tests, and
- an **architecture runner** that turns the rules in `skills/arch-check` into passing/failing tests.

Everything else in this repo exists to wire those two guards into every build so the
spec and the standards cannot silently drift from the code. Read
[architecture.md](architecture.md) for how.
