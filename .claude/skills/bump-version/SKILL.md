---
name: bump-version
description: Bump the website's version (major, minor or patch). Updates the footer version and date on every page and adds a new "Current" release card to the Previous Versions page summarising the changes on the current branch.
argument-hint: major|minor|patch
disable-model-invocation: true
---

# Bump the website version

Bump type: `$ARGUMENTS`

If the bump type is not exactly one of `major`, `minor` or `patch`, stop and ask the user which one they want. Do not guess.

## How the site is laid out

- `src/` is the source. Shared snippets live in `src/components/` and are pulled into pages in `src/scaffold/` with `{{{ footer.html }}}`-style includes.
- `build/` is generated from `src/` by [scaffss](https://github.com/twarsop/scaffss), run as `scaffss.py -i src -o build`. It wipes `build/`, copies everything from `src/scaffold/` into it, and replaces each line holding a `{{{ component.html }}}` placeholder with that file from `src/components/`.
- **Only edit files under `src/`. Never touch `build/`, and don't run the build.** The user builds the site themselves.
- Includes must sit on a line of their own and are not expanded recursively, so don't add `{{{ … }}}` inside a component or alongside other markup on the same line.
- The versioning rules are in `src/scaffold/versioning.html`. Major means existing structure changed (a rewrite), minor means new content was added, and patch means existing content was modified.

## 1. Work out the versions and the date

1. Read the current version and date from `src/components/footer.html`. The line looks like this:
   `<span>Last Updated: 2026/11/02 (v3.0.1) &middot; <a href="versioning.html">Versioning</a></span>`
2. Check that the top `<li>` in `src/scaffold/previous-versions.html` (the one with `class="release release-current"`) has the same version. If it doesn't, stop and tell the user.
3. Work out the new version:
   - `major`: `X+1.0.0`
   - `minor`: `X.Y+1.0`
   - `patch`: `X.Y.Z+1`
4. Today's date, written two ways:
   - Display form `YYYY/MM/DD`, used in the footer and the card text.
   - ISO form `YYYY-MM-DD`, used in the card's `datetime` attribute.

## 2. Find out what changed

Summarise the changes made on the current branch relative to `master`:

```bash
git fetch origin master --depth=200
git log --format='%h %s%n%b' origin/master..HEAD
git diff --stat origin/master...HEAD -- src
git diff origin/master...HEAD -- src
git status --short
git diff -- src
```

- Read the diff under `src/`, not just the commit messages. Commit messages are often short or vague. `build/` is generated from `src/`, so skip it.
- Also include uncommitted changes in the working tree.
- Ignore any earlier version-bump edits (footer version text, release cards).
- If there are no real changes, stop and tell the user. Don't create an empty release.
- If the changes clearly don't fit the bump type the user chose (for example, a new blog post under `patch`), tell them at the end, but still use the type they asked for.

## 3. Update the footer everywhere

Replace `Last Updated: <old date> (v<old version>)` with `Last Updated: <new date> (v<new version>)` in both footer components:

- `src/components/footer.html`
- `src/components/footer_blog.html`

Every page pulls in one of these, so nothing else needs changing. Change only that text. Leave the rest of the line alone, including the `versioning.html` vs `../versioning.html` link. Then check that nothing was missed:

```bash
grep -rn "Last Updated:" src | grep -v "(v<new version>)"
```

The only line that should print is the old "Add Last Updated Date" card heading in `src/scaffold/previous-versions.html`. That's a heading, not a footer, so leave it alone.

## 4. Add the new release card

Edit `src/scaffold/previous-versions.html`:

1. On the current top release, remove the "Current" marker:
   - change `class="release release-current"` to `class="release"`
   - delete the line `<span class="badge badge-white">Current</span>`
2. Insert the new card above it, using this exact format (20-space indent for the `<li>`, with a blank line between cards):

```html
                    <li id="vX-Y-Z" class="release release-current">
                        <div class="card card-COLOUR">
                            <span class="lead"><time datetime="YYYY-MM-DD">YYYY/MM/DD</time>
                                <span>vX.Y.Z</span>
                                <span class="badge badge-white">Current</span>
                                <span class="badge badge-COLOUR">TYPE</span>
                            </span>
                            <h3>TITLE</h3>
                            <p>DESCRIPTION</p>
                        </div>
                    </li>
```

   - The `id` is the version with dots replaced by dashes, e.g. `v3-0-2`.
   - COLOUR / TYPE: major → `pink` / `Major`, minor → `purple` / `Minor`, patch → `amber` / `Patch`.
   - The activity grid (`release-activity.js`) reads the version span, the `h3`, the `datetime` and the non-white badge, so keep that structure exactly.
3. For a **major** bump, the new card starts a new version group. Above the existing `<h2 class="label">Version N</h2>`, add a new group with the new card as its only item:

```html
                <h2 class="label">Version N+1</h2>

                <ol class="split">

                    ...new card...

                </ol>

```

   The previous top card stays in its old group, minus its "Current" marker.

### Writing the title and description

Match the style of the existing cards:

- **Title**: short, in Title Case, starting with a verb. For example "Fix Home Page Image", "Update Code Stats", "Add Creating and Deploying a C# AWS Lambda Blog Post".
- **Description**: a sentence or two in plain past tense, saying what changed and, where useful, why. For example "Updated the code stats on the About Me page." Describe it as a visitor to the site would see it, rather than file by file.
- If several separate things changed, write one short intro `<p>` followed by a `<ul>` with one `<li>` per change, like the v3.0.0 "Rebrand" card.
- Put file names, code and CSS in `<span class="inline-code">…</span>`. Escape `&`, `<` and `>` as HTML entities.
- Use British spelling, as the rest of the site does (colour, centre).

## 5. Check and finish

- Run `git diff --stat`. It should list exactly three files: `src/components/footer.html`, `src/components/footer_blog.html` and `src/scaffold/previous-versions.html`. Nothing under `build/` should change.
- Confirm that exactly one `release-current` and one `Current` badge remain in `src/scaffold/previous-versions.html`.
- Commit with the message `Bump version to vX.Y.Z`. Don't push unless the user asks.
- Tell the user the old and new versions, plus the card title and description you wrote, so they can tweak the wording.
