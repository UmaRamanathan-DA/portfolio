---
name: elevator-pitch
description: Generate a one-page, non-technical elevator-pitch HTML page for a portfolio project (BA/PM style — problem, user, fix, outcome). Use when the user asks to create, build, or update an "elevator pitch", "one-pager", or "executive summary" page for a project in this portfolio.
---

# Elevator Pitch Generator

Produces a short, single-page HTML summary of a portfolio project for non-technical
readers (recruiters, hiring managers, clients) — the opposite of the full, detailed
case study pages in `project_pages/`. Built once for the "Assessments" field-redesign
project; reuse this process and template for every other project going forward so the
whole set of pitches reads as one consistent series.

## When to use this

The user says something like "make an elevator pitch for X", "one-pager for the
KsaraDecor project", "summarize this case study for non-technical people", or asks to
update an existing pitch page.

## Process

1. **Identify the source material.** Find the project's full case study in
   `project_pages/*.html` and any supporting images in `images/<ProjectName>/`. If the
   project has multiple phases (like Assessments' Phase 1/2/3), ask the user whether
   the pitch should cover only the real/delivered phase or the full multi-phase story
   — don't assume. Read the case study page(s) fully before writing anything; don't
   guess at metrics or claims.

2. **Extract five things** from the source material:
   - **The problem**, in plain language (no jargon like "SUS score" or "offline-first
     architecture" without translation).
   - **Who** — the actual user/persona affected.
   - **What** — the job they were trying to do.
   - **The fix** — 3–5 concrete changes, each translated into a plain-language
     benefit (e.g. "offline-first architecture" → "works with zero signal").
   - **The outcome** — the 2–3 headline metrics that matter most, kept in both a
     punchy form (e.g. "2.6×") and the raw numbers (e.g. "21% → 55%").

3. **Confirm scope and format with the user** if anything is ambiguous — which phase(s)
   to cover, whether they want a local HTML file, a published Artifact preview, or
   both. Don't guess on judgment calls; do proceed on mechanical ones.

4. **Write the copy** using the WHO / WHAT / WHY discipline: open with the problem and
   user, not a technology list, and land the opening on the outcome, not just the fix.
   See "Content structure" below for the exact section order.

5. **Build the HTML** using the template and design tokens below. Keep it visually
   consistent with prior pitches in this series — same fonts, same token names, same
   section rhythm — so the set reads as one collection. Only the accent-tinted content
   (headline, stats, images) should change project to project.

6. **Save the file** to `project_pages/<project-slug>-elevator-pitch.html`, using
   relative image paths (`../images/<ProjectName>/...`) exactly like the site's other
   `project_pages/*.html` files — do not embed images as base64 in this file, since it
   lives in the repo alongside images it can reference directly. (Base64 embedding is
   only needed if separately publishing as a self-contained Artifact preview — do that
   as a second, optional step, not the saved repo file.)

7. **Open the file in a browser** (`open project_pages/<file>.html`) to sanity-check
   before reporting done.

## Content structure (section order)

1. Eyebrow label — `Product Case · <domain>` (mono, small, accent color).
2. Headline (`h1`) — the problem statement, in the user's own words if they've given
   one, otherwise plain language. This is also usually literally "the project title."
3. Subhead — 2–3 sentences: what was broken, for whom, and *closing on the outcome*
   (a real number), not just the fix.
4. **Who / What / Why triad** — three columns replacing any temptation to open with a
   Role/Tools/Platform meta row. Who = the user. What = their job-to-be-done. Why =
   the headline outcome metric.
5. "Two workarounds, both broken" (or equivalent) — 2 short cards naming the specific
   pain/friction the user lived with before the fix. Skip if the source material
   doesn't clearly support two distinct workarounds — don't invent them.
6. "What we changed" — 3–5 bullets, each a plain-language benefit, not a feature name.
7. Optional exhibit — 1–2 real screenshots from `images/<ProjectName>/`, captioned.
8. "What it moved" — a 3-tile stat strip: big punchy number, plain-language label,
   raw numbers underneath in mono.
9. One-line tagline (serif italic) — the single sentence you'd say if someone stopped
   you in a hallway. Must be factually accurate to the case study — check it against
   the source material, don't just write something that sounds good.
10. Footer — skill tags (linked to the full case study page in the same folder) +
    name/role credit.

## Design tokens (reuse across every pitch in this series)

Typography: **Newsreader** (display serif, headline/tagline) + **IBM Plex Sans** (body)
+ **IBM Plex Mono** (labels, stat numbers, tabular data). Load from Google Fonts.

```css
:root{
  --ink:#16222c;
  --ink-soft:#4a5964;
  --paper:#eef1ee;
  --surface:#ffffff;
  --line:rgba(22,34,44,0.14);
  --line-strong:rgba(22,34,44,0.28);
  --accent:#b25e18;
  --accent-ink:#7a3f0f;
  --accent-soft:#f2e0c9;
  --resolved:#336752;
  --resolved-soft:#dbe8e1;
  --font-display:"Newsreader", ui-serif, Georgia, serif;
  --font-body:"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono:"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --ink:#eef1ee; --ink-soft:#aab6bc; --paper:#111a20; --surface:#17222a;
    --line:rgba(238,241,238,0.14); --line-strong:rgba(238,241,238,0.26);
    --accent:#dd9a4d; --accent-ink:#f0b878; --accent-soft:rgba(221,154,77,0.16);
    --resolved:#68ab8f; --resolved-soft:rgba(104,171,143,0.14);
  }
}
:root[data-theme="dark"]{
  --ink:#eef1ee; --ink-soft:#aab6bc; --paper:#111a20; --surface:#17222a;
  --line:rgba(238,241,238,0.14); --line-strong:rgba(238,241,238,0.26);
  --accent:#dd9a4d; --accent-ink:#f0b878; --accent-soft:rgba(221,154,77,0.16);
  --resolved:#68ab8f; --resolved-soft:rgba(104,171,143,0.14);
}
```

`--accent` is warm amber (friction/attention), `--resolved` is muted teal-green
(fixed/positive). Keep these roles consistent across pitches: amber marks the
before-state, teal-green marks the after-state and outcome numbers.

Layout: single column, `max-width:760px`, centered, generous vertical rhythm via
`section{ margin-top:44px; padding-top:36px; border-top:1px solid var(--line); }`.
Stat strip is a 3-column grid with 1px gap on a `--line` background (creates hairline
dividers). Friction cards use a left accent border (`border-left:3px solid
--accent`); changed-items use a left resolved border (`border-left:2px solid
--resolved`).

The full reference implementation (structure to copy and adapt) is
`project_pages/digital-bank-strategy-elevator-pitch.html` in this repo — read it for
the exact markup and CSS before building a new one, rather than reconstructing from
scratch.

### Palette variants by project provenance

Two token sets exist, chosen by what the source case study's own metadata says about
the project, not by guessing:

- **Default (delivered / client / self-directed work)** — the amber + teal-green set
  above. Use this unless the case study explicitly says otherwise.
- **Academic** — used when the case study's own metadata says it's a university/academic
  engagement (e.g. "Context: Academic Project", a business-school name, an anonymized
  client). Swap in a scholarly indigo ink with brass-gold and wine accents instead —
  visually distinct from client work at a glance:

```css
:root{
  --ink:#1b2140;
  --ink-soft:#4f5573;
  --paper:#eef0f5;
  --surface:#ffffff;
  --line:rgba(27,33,64,0.14);
  --line-strong:rgba(27,33,64,0.28);
  --accent:#96742a;
  --accent-ink:#6b5220;
  --accent-soft:#ede2c4;
  --resolved:#7a3140;
  --resolved-soft:#f0dde1;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --ink:#eef0f5; --ink-soft:#b3b8d1; --paper:#14172a; --surface:#1c2038;
    --line:rgba(238,240,245,0.14); --line-strong:rgba(238,240,245,0.26);
    --accent:#d4af52; --accent-ink:#e8c878; --accent-soft:rgba(212,175,82,0.16);
    --resolved:#c17a89; --resolved-soft:rgba(193,122,137,0.14);
  }
}
:root[data-theme="dark"]{
  --ink:#eef0f5; --ink-soft:#b3b8d1; --paper:#14172a; --surface:#1c2038;
  --line:rgba(238,240,245,0.14); --line-strong:rgba(238,240,245,0.26);
  --accent:#d4af52; --accent-ink:#e8c878; --accent-soft:rgba(212,175,82,0.16);
  --resolved:#c17a89; --resolved-soft:rgba(193,122,137,0.14);
}
```

First reference implementation: `project_pages/digital-bank-strategy-elevator-pitch.html`
(Synpulse Consulting / University of Strathclyde academic engagement). Every other
token, font, and layout rule stays identical to the default set — only the six color
values change. If a new project provenance category comes up (e.g. open-source,
hackathon), ask the user whether it warrants its own variant rather than assuming.

## Things learned from the first one (Assessments project)

- Headlines that are long, literal problem statements (not punchy taglines) work fine
  here and match this portfolio's existing case-study headline style — check the
  source case study's own `<h1>` first; it's often already the right headline.
- Don't invent a tagline claim that isn't true — the user caught and corrected "wasn't
  a new feature" when the fix in fact *did* introduce new features. Always verify the
  tagline against the source material's actual scope.
- Large screenshots must be resized/compressed before embedding as base64 (use `sips
  -Z <width> -s format jpeg -s formatOptions 65`) — only do this for a separate
  Artifact-publish step. The saved repo file should use plain relative paths.
- Ask before assuming what a vague instruction like "link X" should point to — default
  to linking skill tags to the project's own full case-study page in the same folder
  unless told otherwise.
