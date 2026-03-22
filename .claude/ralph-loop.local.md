---
active: true
iteration: 1
session_id: 
max_iterations: 25
completion_promise: "BUILD COMPLETE"
started_at: "2026-03-22T03:19:25Z"
---

Rewrite all TypeScript types and frontend pages in /Users/vonnieransom/villains-tattoo to match the V2 Supabase schema with 23 tables. Read supabase-schema-v2-part1.sql and supabase-schema-v2-part2.sql for the schema. Read the plan at /Users/vonnieransom/.claude/plans/gentle-conjuring-babbage.md. NO money fields on sessions or schedule or weekly submissions. Money ONLY on products, purchase orders, transactions, till balances, staff purchases, shop sales. Artist clients are private. Admin side says Enquiries not Clients. Session model has client_reference, session_type, times, envelope_submitted boolean, envelope_photo. Weekly Schedule Submission replaces payment envelopes with count only. Build Day-Week-Month views for schedule. Build enquiries with source, priority, handoff workflow, SLA highlighting. Build finance module with transactions, till, receipts, staff purchases. Build tasks and roster system. Update sidebar navigation for both admin and artist roles. Use existing components from blocks and ui folders. Dark villain theme already set. Supabase connected via env.local. Output BUILD COMPLETE promise when all pages compile clean.
