# AI Job Search Agent
**Role: AI Product Manager / AI Ops** · Built on Claude (Cowork)

🎥 *[Demo video here]*

## Overview

An autonomous job-matching agent that searches LinkedIn, Naukri, Indeed, and Glassdoor every morning, scores each posting against my profile, and writes a deduplicated, ranked shortlist to a running tracker — with zero manual searching. Designed, scoped, and shipped end-to-end in a single working session using an AI agent as the build partner.

## The Problem

Manual job searching doesn't scale: the same searches get repeated daily across four sites, good matches get buried in noise, and there's no record of what's already been seen or applied to. I wanted a system that runs unattended, respects each site's terms of use, and hands me a clean, scored list every morning instead of a wall of tabs.

## What I Built

A three-layer system:

1. **Sourcing layer** — searches LinkedIn's public listings, Naukri, Indeed, and Glassdoor daily via web search, filtered to individual postings (not category pages), with an explicit rule to never attempt login-based or authenticated scraping.
2. **Scoring & storage layer** — each posting is scored 1–5 against my profile (role fit, seniority band, location) with a one-line rationale, then written to a Google Drive tracker organized as weekly folders containing one dated sheet per day.
3. **Delivery & scheduling layer** — a scheduled agent run fires daily, dedupes against the last two weeks of results before searching, and drops a same-morning email digest of the day's top matches into Gmail.

Also packaged as a reusable, on-demand skill — the same logic can be invoked manually anytime, independent of the schedule.

## Key Product Decisions

- **Skill + scheduled agent, not a one-off prompt.** A prompt retyped daily drifts and has no memory. Packaging the logic as a reusable skill, triggered by a schedule, gave consistent output and persistent dedup across runs.
- **Search over scrape.** LinkedIn's terms prohibit automated scraping. I scoped sourcing to rely on publicly indexed search results rather than authenticated crawling — a deliberate compliance trade-off over raw coverage.
- **Worked around a real tool constraint.** The Drive connector available couldn't edit files in place. Rather than fight it, I redesigned the storage model around it — daily snapshot files in weekly folders — turning a limitation into a clean, auditable structure.
- **Honest about automation limits.** The Gmail integration can only draft, not send. Rather than overstate the automation, the system surfaces this clearly so the review step stays human.

## Skills Demonstrated

**Product & AI Ops**
Requirements scoping via structured clarifying questions · agentic workflow design · human-in-the-loop review gates · trade-off decisions under real tool/API constraints · compliance-aware system design

**Technical Build**
Prompt & skill engineering · scheduled task / cron-based automation · API integration (Google Drive, Gmail) via MCP connectors · data modeling for a scoring rubric · deduplication logic · structured data output (CSV/Sheets)

**Tools**
Claude (Cowork) · Google Drive & Gmail · Web search (compliance-scoped sourcing) · Scheduled/automated task orchestration

## Outcome

A fully automated daily job shortlist — sourced, scored, deduplicated, and delivered — replacing a repetitive manual search across four sites with a five-minute morning review.
