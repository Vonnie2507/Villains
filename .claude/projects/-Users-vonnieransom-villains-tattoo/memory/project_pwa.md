---
name: project_pwa
description: PWA setup added — manifest, service worker, mobile sidebar, safe-area support
type: project
---

PWA setup was added on 2026-03-22. Includes:
- `public/manifest.json` — standalone display, portrait, dark theme
- `public/sw.js` — network-first caching strategy, skips Supabase API calls
- `public/icons/` — 192px and 512px icons (dark bg, white V)
- Layout meta tags: apple-mobile-web-app-capable, theme-color, viewport-fit=cover
- Mobile sidebar: slide-out drawer with backdrop (was broken before — hamburger did nothing)
- Safe area padding for notched phones
- 44px min touch targets on mobile sidebar links

**Why:** Artists use phones exclusively. PWA gives native-like experience without App Store overhead.
**How to apply:** Any new pages or navigation must work well on mobile. Test at 375px width minimum.

## Schedule & Envelope System (built 2026-03-22)
Artist schedule replaces TimeTree. Flow:
1. Artists plan week ahead — tap each day, set status, add clients (draft mode)
2. Sunday they hit "Submit My Week" — locks it in, notifies admin
3. If they forget, a warning banner shows on unsubmitted weeks
4. Each client has envelope tracking: artist ticks "submitted", reception ticks "received" or "not received"

Status labels match what artists knew from TimeTree:
- Tattooing, Free in Studio, Touch Up, Walk In, Not In, Cancelled, Other

DB note: `schedule_days.status` needs to accept `in_free` and `cancelled` values.
`sessions` table may need `envelope_status` text column (pending/submitted/received/not_received) — currently falls back to boolean `envelope_submitted`.
