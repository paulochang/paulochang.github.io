---
title: "Building a Static Blog in 2026"
date: 2026-06-15T14:30:00Z
description: "How I set up an Eleventy blog that deploys from a native iOS app via the GitHub Contents API."
---

Static sites are having a quiet renaissance, and for good reason. No database to manage, no server to patch, no attack surface beyond the CDN edge. The tradeoff — you need a build step somewhere — is easily solved with a CI/CD platform like Cloudflare Pages.

## The stack

- **Eleventy 3.x** as the static site generator. It stays out of your way.
- **Cloudflare Pages** for hosting. The free tier is generous; the build pipeline is fast.
- **GitHub Contents API** as the publishing backend. A single authenticated `PUT` is all it takes to commit a Markdown file.
- **SwiftUI** for the iOS editor. No third-party dependencies; just `URLSession` and the Security framework for Keychain access.

## Why not a headless CMS?

Every headless CMS I looked at has some form of lock-in, a pricing tier that punishes you for success, or an API that will change in ways you didn't expect. A GitHub repository is a better data store: it versions everything, it's portable, and the API is stable.

## The publish flow

1. Write a post in the iOS app.
2. Tap Publish.
3. The app constructs the Markdown frontmatter, base64-encodes the content, and sends a `PUT` to the GitHub Contents API.
4. GitHub receives the commit; Cloudflare Pages detects the push and runs `npx @11ty/eleventy`.
5. Eleventy writes `public/blog/**`. Cloudflare serves `public/`.

End to end, the post is live in under two minutes.

## What I deliberately skipped

- No JavaScript on the blog. Zero. CSS handles light/dark mode via `prefers-color-scheme`.
- No external stylesheet requests. All CSS is inlined in a `<style>` block.
- No comments system, no analytics, no tracking pixels.

Sometimes the right amount of features is very few.
