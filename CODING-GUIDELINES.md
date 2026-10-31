# Coding guidelines

## 1. Think before coding

1. State your assumptions before you write code. If a request can be read two ways, say which reading you chose.
2. Ask when something is unclear. A short question costs less than a wrong change.
3. Read the code you are about to change, and the code that calls it, before editing.

## 2. Simplicity first

1. Build what was asked and nothing more. No speculative features, options or abstractions "for later".
2. Prefer the plainest code that works. Three clear lines beat one clever one.
3. Do not add a dependency when a few lines of our own code will do.

## 3. Surgical changes

1. Touch only what the task needs. No drive by reformatting, renaming or refactoring.
2. Match the style of the surrounding code: naming, comment density and idiom.
3. If you spot an unrelated problem, note it in ROADMAP.md instead of fixing it in the same change.

## 4. Goal driven execution

1. Turn each task into checks you can verify, such as a failing test that should pass or a request that should return a given result.
2. Fixing a bug starts with a test that fails because of the bug.
3. Run the checks and report the real result. If something was skipped or failed, say so.
