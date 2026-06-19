import { test as base, createBdd } from 'playwright-bdd';

// Template seed for the browser acceptance levels (@e2e live UI, @component
// stubbed UI). Extend `base` with your own protocol driver(s) as fixtures — one
// per level — then bind Gherkin steps in steps/ using the exported Given/When/
// Then. A scenario's single level tag ($tags) should select which driver/mode
// runs (live backend for @e2e, stubbed for @component). See AGENTS.md for the
// @e2e / @component routing.
export const test = base;

export const { Given, When, Then } = createBdd(test);
