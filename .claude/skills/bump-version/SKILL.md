---
name: bump-version
description: Bump the website's version (major, minor or patch). Updates the version and date in src/config.json (shown in every page's footer) and adds a new "Current" release card to the Previous Versions page summarising the changes on the current branch.
argument-hint: major|minor|patch
disable-model-invocation: true
---

# Bump the website version

Bump type: `$ARGUMENTS`

If the bump type is not exactly one of `major`, `minor` or `patch`, stop and ask the user which one they want. Do not guess.

## How the site is laid out

- `src/` is the source. Shared snippets live in `src/components/` and are pulled into pages in `src/scaffold/` with `{{{ footer.html }}}`-style includes.
- `build/` is generated from `src/` by [scaffss](https://github.com/twarsop/scaffss), run as `scaffss.py -i src -o build`. It wipes `build/`, copies everything from `src/scaffold/` into it, and replaces each line holding a `{{{ component.html }}}` placeholder with that file from `src/components/`.
- scaffss also replaces `{{ name }}` tokens with values from `src/config.json`. The site's current version and last-updated date live there, and both footer components show them with `{{ version }}` and `{{ updated }}`.
- **Only edit files under `src/`. Never touch `build/`, and don't run the build.** The user builds the site themselves.
- Includes must sit on a line of their own and are not expanded recursively, so don't add `{{{ … }}}` inside a component or alongside other markup on the same line.
- The versioning rules are in `src/scaffold/versioning.html`. Major means existing structure changed (a rewrite), minor means new content was added, and patch means existing content was modified.

## 1. Work out the versions and the date

1. Read the current version and date from `src/config.json`, which looks like this:
   ```json
   {
       "version": "3.0.1",
       "updated": "2026/11/02"
   }
   ```
   `version` has no leading `v`, and `updated` is in `YYYY/MM/DD` form.
2. Check that the top `<li>` in `src/scaffold/previous-versions.html` (the one with `class="release release-current"`) has the same version. If it doesn't, stop and tell the user.
3. Work out the new version:
   - `major`: `X+1.0.0`
   - `minor`: `X.Y+1.0`
   - `patch`: `X.Y.Z+1`
4. Today's date, written two ways:
   - Display form `YYYY/MM/DD`, used in `src/config.json` and the card text.
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
- Ignore any earlier version-bump edits (`src/config.json`, release cards).
- If there are no real changes, stop and tell the user. Don't create an empty release.
- If the changes clearly don't fit the bump type the user chose (for example, a new blog post under `patch`), tell them at the end, but still use the type they asked for.

## 3. Update the config

In `src/config.json`, set `version` to the new version (no leading `v`) and `updated` to today's date in `YYYY/MM/DD` form. Keep the file's existing layout and any other keys.

That's the only change needed for the footer: every page gets it from `src/components/footer.html` or `footer_blog.html`, which read those two values. Don't edit the footer components, and don't write a version or date into them.

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
- Never write literal double-brace text such as `{{ name }}` in a card. scaffss treats it as a variable and the build fails. If a change needs to mention one, write the braces as `&#123;&#123; name &#125;&#125;`.

## 5. Check and finish

- Run `git diff --stat`. It should list exactly two files: `src/config.json` and `src/scaffold/previous-versions.html`. Nothing under `build/` should change.
- Check that `src/config.json` is still valid JSON: `python3 -m json.tool src/config.json`.
- Confirm that exactly one `release-current` and one `Current` badge remain in `src/scaffold/previous-versions.html`.
- Commit with the message `Bump version to vX.Y.Z`. Don't push unless the user asks.
- Tell the user the old and new versions, plus the card title and description you wrote, so they can tweak the wording.
