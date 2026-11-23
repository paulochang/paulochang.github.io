# How to publish

Write here, in the vault. Never edit `blog-src/posts/` in the repo directly: the next sync overwrites it.

## Write a post

1. Create a note. It lands in `posts/`.
2. Insert the Post template.
3. If the title might change, set `slug:` now. Renaming a published note changes its URL unless `slug:` is set.
4. Write. Paste images; they land in `attachments/`.
5. When it is ready, remove the `draft: true` line.

## Publish (on the Mac)

1. Open the note in Obsidian first, so iCloud has delivered the latest version.
2. Run `npm run notes`.
3. Check with `git status` (and `npm run serve`).
4. Commit and push. A push to `master` deploys.

## Renames and deletes

The sync never deletes anything in the repo. It lists what is "in the repo only".

- Renamed a note: the old file stays in the repo. `git rm` it.
- Deleted a note: `git rm` it in the repo too.
- To unpublish but keep the note: set `draft: true`.

## From the phone, without the Mac

Copy the note in Obsidian. In the GitHub app create `blog-src/posts/` plus the same filename as the note, paste, commit to `master`. Same filename means the next sync finds identical content. No images and no preview this way.

## Post does not appear?

The build probably failed: a missing `date`, or a duplicate slug.
