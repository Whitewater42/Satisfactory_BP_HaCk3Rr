# Satisfactory Blueprint Hacker — Web (public repo)

STOP: if a Claude Code session is starting with this folder
(`Satisfactory_Editor_web`) as its working directory, that's very likely a
mistake. All actual development — the tooling, the parser engine, the
scripts, the notes, everything — lives in the sibling private repo at
`C:\Users\general\.claude\!Projects\Satisfactory_Editor`. That's where
terminal sessions and Claude Code sessions should be started by default.

This folder exists only as the deploy target for the public-facing web app
(paired with the private repo above, which stays private). It should stay
essentially empty of active development — no scripts, no working notes, no
day-to-day iteration — until there's actual built web app code ready to push
here from the main project.

Only work directly in this folder if the user has explicitly said they want
to work in `Satisfactory_Editor_web` specifically, understanding that's what
they're choosing. Don't assume it or default to it. If unsure, ask.

## How the two repos relate

This project deliberately lives in two separate repos, not one:

- **`Satisfactory_Editor`** (private) — `https://github.com/Whitewater42/Satisfactory_BP_HaCk3R`. All real development: the parser tooling, blueprint-editing scripts, reference data, and the working notes file (`CHATBCK/notes.md`). Because it's private and full of day-to-day working notes, it's expected to accumulate incidental personal info over time (the user's real local file paths, personal save-folder names, etc.) — that's tolerated there and not an emergency.
- **`Satisfactory_Editor_web`** (this folder, public) — `https://github.com/Whitewater42/Satisfactory_BP_HaCk3Rr`. Deploy target for the public-facing web app (GitHub Pages requires a public repo on the free tier). Started from a deliberately clean slate specifically so it would have zero personal information baked into its history.

Both repos use the same local (per-repo, not global) git identity: `user.name = Whitewater42`, `user.email = 124960191+Whitewater42@users.noreply.github.com` (GitHub's noreply address, chosen after a real personal email was found baked into old commits during a PII audit of the private repo).

## Personal information rule for this repo specifically

**This repo must never contain personal information** — real names, local absolute file paths (`C:\Users\...`), personal email addresses, save-folder/world names, or anything else that identifies the user or their machine. Unlike the private repo, there's no "clean it up later" tolerance here, since this one is public from day one.

If you ever find anything like that in this repo's working tree, staged changes, or commit history while working here — **stop and warn the user explicitly before proceeding**, the same way a full PII audit was done on the private repo before this one was created. Don't silently fix and continue; the user needs to know it happened and where.
