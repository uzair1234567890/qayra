# Merge week-11-qa to main with history cleanup

**Date:** 2026-05-18
**Status:** Approved
**Type:** One-off ops procedure
**Risk:** Force-pushes to `origin/week-11-qa`; fast-forwards `origin/main`.

## Goal

Ship the 32 commits on `week-11-qa` to `origin/main` without baking ~7 MB of Playwright trace artifacts into permanent history.

## Background

- `week-11-qa` is 32 commits ahead of `origin/main` (`origin/main` has no commits to integrate — clean fast-forward path).
- One commit, `d038f12 "hi"`, was created by `git commit -am hi` and bundles legitimate changes (ClientRouter layout fixes, `.gitignore` tweak, design assets, the full-fulfilment-flow e2e spec, `public-write.rls.test.ts` cleanup) with junk (11 `test-results/` files totaling ~7 MB of Playwright trace.zip + error-context.md).
- The user wants a direct push to `main` (no PR) and accepts that local pre-push tests are skipped (Task 9 verification is sufficient).

## Procedure

### Step 1 — Surgical rewrite of d038f12

Use a non-interactive rebase to pause at d038f12, drop the test-results paths from the commit, then amend and continue.

```bash
git rev-parse d038f12  # capture for rollback log
GIT_SEQUENCE_EDITOR="sed -i 's/^pick d038f12/edit d038f12/'" \
  GIT_EDITOR=true \
  git rebase -i origin/main
# Paused at d038f12. Drop test-results from the commit:
git rm --cached -r test-results/
git commit --amend --no-edit
git rebase --continue
```

Note: `git rm --cached` removes the path from the commit's tree but leaves the files on disk. They'll re-accumulate during local test runs; the `.gitignore` step (Step 2) keeps them out of future commits.

### Step 2 — Add .gitignore entries

Defensive measure so `git commit -am` can't grab Playwright artifacts again.

```bash
# Append to .gitignore:
#   test-results/
#   playwright-report/
git add .gitignore
git commit -m "chore(gitignore): exclude Playwright test-results and playwright-report"
```

### Step 3 — Force-push the rewritten week-11-qa

```bash
git push --dry-run --force-with-lease origin week-11-qa  # verify
git push --force-with-lease origin week-11-qa
```

`--force-with-lease` aborts the push if `origin/week-11-qa` advanced behind our back. Since the original `d038f12` is minutes old and no automation pulls this branch, this is safe.

### Step 4 — Fast-forward origin/main

```bash
git rev-parse origin/main  # capture for rollback log
git push origin week-11-qa:main
# Then sync local main:
git checkout main
git pull --ff-only
```

The push is non-force because it's a strict fast-forward (origin/main is an ancestor of week-11-qa).

## Verification gates

- After Step 1: rewritten commit no longer mentions `test-results/`. Total commit count on the rewritten week-11-qa relative to origin/main is **32** (same as before).
- After Step 2: `.gitignore` contains both new entries.
- Before Step 3: `git push --dry-run --force-with-lease` succeeds.
- Before Step 4: `git diff origin/main..week-11-qa --stat | tail -3` shows the expected file count (no `test-results/` paths).

## Rollback

Captured SHAs (filled in at execution time):
- Original `d038f12` SHA: `d038f12...`
- Pre-push `origin/main` SHA: `<TBD at execution>`

If push to main looks wrong: `git push origin <pre-push-main-sha>:main --force-with-lease`. If the week-11-qa force-push needs to be reverted: `git push origin <pre-rewrite-week-11-qa-sha>:week-11-qa --force-with-lease` (note: collaborators who already pulled the rewritten branch will need to `git reset --hard origin/week-11-qa`).

## Out of scope

- Test re-run before push (skipped per user direction).
- Opening a PR (skipped per user direction).
- Splitting the legit `d038f12` content into themed commits (rejected — surgical edit is enough).
- Activating CI secrets — `docs/superpowers/secrets-checklist.md` covers that flow separately. CI is expected to fail on first push until secrets are added; this is documented and not a regression.

## Post-merge state

- `main` HEAD = rewritten week-11-qa HEAD = `<TBD at execution>` (32 commits worth of week-11-qa work + 1 .gitignore commit = 33 commits beyond pre-merge origin/main).
- `origin/week-11-qa` matches local `week-11-qa` (cleaned-up history).
- CI workflows fire on the new `main` HEAD. Expected: `e2e.yml` and `lighthouse.yml` fail until secrets are added per the secrets checklist.
