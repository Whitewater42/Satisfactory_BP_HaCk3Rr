# Satisfactory Blueprint Hacker — Web (public repo)

This is the public-facing static web app — a self-contained browser port of
the private repo's blueprint-editing engine (see `README.md` for what it does
and how to run/extend it). It's built alongside a sibling private repo,
`Satisfactory_Editor` (same parent folder as this one, not itself public),
which holds the original Node.js tooling, the day-to-day working notes, and
the full research history behind every technique this app uses. That private
repo isn't assumed to be available to everyone working in this folder — this
one (code + README) is meant to stand on its own.

Default session start for the broader project is still the private repo
unless the user is specifically working on this web app. If unsure which repo
a task belongs in, ask.

## How the two repos relate

This project deliberately lives in two separate repos, not one:

- **`Satisfactory_Editor`** (private) — `https://github.com/Whitewater42/Satisfactory_BP_HaCk3R`. Origin of the tooling: the original Node.js scripts, reference/research data, and the working notes file (`CHATBCK/notes.md`). Because it's private and full of day-to-day working notes, it's expected to accumulate incidental personal info over time (the user's real local file paths, personal save-folder names, etc.) — that's tolerated there and not an emergency.
- **`Satisfactory_Editor_web`** (this folder, public) — `https://github.com/Whitewater42/Satisfactory_BP_HaCk3Rr`. Deploy target for the public-facing web app (GitHub Pages requires a public repo on the free tier). Started from a deliberately clean slate specifically so it would have zero personal information baked into its history.

Both repos use the same local (per-repo, not global) git identity: `user.name = Whitewater42`, `user.email = 124960191+Whitewater42@users.noreply.github.com` (GitHub's noreply address, chosen after a real personal email was found baked into old commits during a PII audit of the private repo).

## Personal information rule for this repo specifically

**This repo must never contain personal information** — real names, local absolute file paths (`C:\Users\...`), personal email addresses, save-folder/world names, or anything else that identifies the user or their machine. Unlike the private repo, there's no "clean it up later" tolerance here, since this one is public from day one.

If you ever find anything like that in this repo's working tree, staged changes, or commit history while working here — **stop and warn the user explicitly before proceeding**, the same way a full PII audit was done on the private repo before this one was created. Don't silently fix and continue; the user needs to know it happened and where.
