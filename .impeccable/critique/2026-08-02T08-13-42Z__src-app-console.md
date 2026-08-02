---
timestamp: 2026-08-02T08-13-42Z
slug: src-app-console
---
# Console UI Critique: AI Gateway

Method: dual-agent (A: console design review · B: detector scan)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | 6+ actions fire silently — no toast system |
| 2 | Match System / Real World | 3/4 | "Canned" status opaque, terminology split |
| 3 | User Control and Freedom | 2/4 | No undo, no cancel on forms |
| 4 | Consistency and Standards | 2/4 | Card radius, spacing, heading weight vary |
| 5 | Error Prevention | 3/4 | Form validation present |
| 6 | Recognition Rather Than Recall | 3/4 | Base URLs, breadcrumbs, key prefix visible |
| 7 | Flexibility and Efficiency | 3/4 | Search, bulk actions, keyboard Enter |
| 8 | Aesthetic and Minimalist Design | 3/4 | animate-ping, emojis, gradient |
| 9 | Error Recovery | 2/4 | No toast, no retry |
| 10 | Help and Documentation | 2/4 | No tooltips on technical concepts |
| **Total** | | **25/40** | **Good** |

## Priority Issues

- [P1] No skeleton states anywhere
- [P1] No toast/notification system
- [P1] API Key creation: expiration/allowedModels silently discarded
- [P1] Card radius inconsistency (rounded-2xl vs default)
- [P1] Missing ARIA labels on 9+ elements
- [P1] animate-ping decorative motion
- [P2] Emojis in greeting
- [P2] Balance gradient card
- [P2] Page header/spacing inconsistency
- [P2] Non-standard font sizes (22px, 13px, 10px)
- [P2] Dead buttons (3 instances)
- [P2] Empty states lack CTAs
- [P2] Terminology mismatch (Billing vs Personal Balance)
