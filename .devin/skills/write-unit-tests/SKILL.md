---
name: write-unit-tests
description: Write Jest unit tests for src/services and pure logic, aiming for >80% coverage, then report coverage gains
allowed-tools:
  - read
  - grep
  - glob
  - edit
  - write
  - exec
triggers:
  - user
  - model
---

You are writing **Jest unit tests** for this repository. Your goal is to push line/statement
coverage of the targeted source files **as close to (and ideally above) 80% as possible**, then
report the coverage gains.

## Hard rules

- **NEVER run any `git` command** (no `git status`, `git diff`, `git add`, `git commit`, etc.).
  Do not stage, commit, or touch version control in any way.
- Do **not** modify `package.json`, `jest.config.cjs`, or `tsconfig*.json`. Work within the
  existing setup. (If a change there seems truly required, stop and ask the user first.)
- Scope: **`src/services/**` and other pure-logic `.ts` modules only.** Do not attempt to test
  React components/pages — the jest environment is `node` with no `jsdom`/`@testing-library`,
  so component tests are out of scope unless the user explicitly asks (and adds those deps).

## Project test setup (already verified)

- Runner: **Jest + ts-jest**, `testEnvironment: 'node'` (see `jest.config.cjs`).
- Tests MUST live in the **`tests/`** directory and be named **`*.test.ts`** (this is required by
  the `testMatch` glob `**/tests/**/*.test.ts`).
- `tests/e2e.test.ts` is a **Puppeteer e2e suite that needs a running dev server** — always
  EXCLUDE it from unit/coverage runs (the command below does this).
- `src/services/api.ts` uses `import.meta.env`, which the commonjs ts-jest transform cannot
  compile. **Do not import or unit-test `api.ts` directly**, and exclude it from coverage scope.
  Services are thin wrappers around `api`, so mock `api` instead (see pattern below).

## Coverage command

Use the local jest binary. Scope `--collectCoverageFrom` to the file(s) you are targeting so the
80% number is meaningful (don't dilute it with untested UI):

```bash
./node_modules/.bin/jest --coverage \
  --collectCoverageFrom='src/services/**/*.ts' \
  --collectCoverageFrom='!src/services/api.ts' \
  --collectCoverageFrom='!src/services/index.ts' \
  --testPathIgnorePatterns '/node_modules/' '/tests/e2e'
```

`!`-prefixed `--collectCoverageFrom` patterns negate (exclude) files: `api.ts` is excluded
because it can't be transformed (see above), and `index.ts` is excluded because it's just
re-exports. Add/remove negation patterns to match the files you're actually targeting.

If dependencies are not installed yet, run `npm install` first (NOT via `npx`, which would pull a
different jest version). Verify `./node_modules/.bin/jest` exists before running.

## Workflow

1. **Discover** untested source: list the modules under `src/services/` (and any other pure-logic
   `.ts` files) and check which already have tests in `tests/`.
2. **Baseline:** run the coverage command above once and record the starting coverage numbers
   (% Stmts / % Branch / % Funcs / % Lines) for the files you'll target.
3. **Write tests** in `tests/<name>.test.ts`. For each service, assert that every method calls the
   right `api` method with the correct endpoint URL and params/payload. Cover every exported
   function and both sides of any branches (e.g. optional params present vs. absent).
4. **Mock `api` with a factory** (a factory prevents jest from loading the real `api.ts` and
   hitting the `import.meta` error):

   ```ts
   import { someService } from '../src/services/someService';
   import { api } from '../src/services/api';

   jest.mock('../src/services/api', () => ({
     api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
   }));
   const mockedApi = api as jest.Mocked<typeof api>;

   beforeEach(() => jest.clearAllMocks());

   it('calls the right endpoint', () => {
     someService.getById(7);
     expect(mockedApi.get).toHaveBeenCalledWith('/v1/some/7');
     // for methods that pass params/body, assert the second arg too, e.g.:
     // expect(mockedApi.get).toHaveBeenCalledWith('/v1/some/schedule', { date: '2026-01-01' });
   });
   ```

5. **Iterate:** re-run the coverage command, read the "Uncovered Line #s" column, and add tests
   until the targeted files reach **>80%** (or as high as realistically possible). All tests must
   pass.
6. **Report coverage gains.** End with a concise before → after summary table for the targeted
   files, e.g.:

   | File | % Stmts (before → after) | % Branch | % Funcs | % Lines |
   |------|--------------------------|----------|---------|---------|
   | encounterService.ts | 0 → 100 | 100 → 100 | 0 → 100 | 0 → 100 |

   Call out which files hit the 80% target and any that fell short (with the reason).

## Troubleshooting

- **`import.meta` / TS1343 error** when a suite runs: you imported (or auto-mocked) a module that
  transitively loads `api.ts`. Mock `api` with the **factory form** above so the real file is never
  loaded. Never call `jest.mock('../src/services/api')` without a factory.
- **`Preset ts-jest not found` / `command not found`**: dependencies aren't installed. Run
  `npm install` and use `./node_modules/.bin/jest` (not `npx jest`).
- **A suite needs the dev server / times out**: it's probably the e2e suite — confirm it's excluded
  via `--testPathIgnorePatterns '/tests/e2e'`.

## Notes / extending scope

- To widen coverage beyond services, broaden `--collectCoverageFrom` accordingly — but remember
  component/page testing first requires `jsdom` + `@testing-library/react` (not currently
  installed), which is out of scope unless the user asks.
- Remember: **no git commands at any point.**
