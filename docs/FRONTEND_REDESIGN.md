# Frontend Redesign

This redesign establishes a dark-first, data-dense interface system for Pulsi's staff and athlete surfaces.

## Goals

- Optimize for rapid scan behavior on large coaching-room displays.
- Keep the information hierarchy dense without becoming noisy.
- Make readiness states readable in under a second.
- Give staff and athlete surfaces distinct tones while preserving a single design system.
- Keep the UI built on Base UI primitives and Tailwind CSS v4 tokens so future work stays consistent.

## Core Layout

### Root shell

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/app-shell.tsx`
- Purpose: fixed dashboard shell with collapsible sidebar, technical top bar, quick actions, breadcrumbs, and command palette entry.
- Rationale: coaching workflows need stable orientation, a predictable navigation rail, and a top frame that can host fast actions without pushing content around.

### Sidebar navigation

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/app-shell.tsx`
- Purpose: tenant-scoped navigation for Dashboard, Squad Readiness, Players, Session Planner, Reports, Garmin, and Settings.
- Rationale: icon-plus-label navigation preserves information density while still allowing a collapsed icon-only mode for tighter screens.

### Top bar and breadcrumb

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/app-shell.tsx`
- Purpose: active page framing, role badge, alert shortcut, and quick-search entry.
- Rationale: the top bar behaves like an operations header, not marketing chrome; it reinforces context and keeps the most important controls in one place.

### Page header pattern

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/page-header.tsx`
- Purpose: shared header component for page eyebrow, title, description, and action slots.
- Rationale: gives each staff page a consistent high-signal framing pattern while letting actions vary by workflow.

## Shared Data Components

### Athlete readiness card

- Files:
  - `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/features/dashboard/readiness-card.tsx`
  - `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/status-badge.tsx`
  - `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/load-bar.tsx`
  - `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/sparkline.tsx`
- Purpose: dense readiness tile for the main board with readiness state, core overnight signals, and trend preview.
- Rationale: the card is designed for glanceability first; labels are secondary to state, score, and motion in the trend line.

### Squad overview grid

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/features/dashboard/dashboard-page.tsx`
- Purpose: the main pre-session review board showing all visible athletes at once.
- Rationale: a grid-first treatment lets coaches compare athletes horizontally without burying context in table rows alone.

### Metric stat block

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/metric-stat.tsx`
- Purpose: large metric with supporting delta/helper line.
- Rationale: heavy numerics and lighter labels reinforce the “numbers first, explanation second” principle used across the app.

### Trend sparkline

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/sparkline.tsx`
- Purpose: compact historical signal preview inside cards and summary panels.
- Rationale: trend direction matters more than precise chart tooling in the top-level dashboard, so the sparkline stays intentionally minimal.

### Load bar

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/load-bar.tsx`
- Purpose: zone-colored load/progress visualization.
- Rationale: a horizontal bar communicates proportion faster than text when staff need to judge training exposure at a glance.

### Data table

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/data-table.tsx`
- Purpose: shared table scaffolding for reports, squads, players, and settings.
- Rationale: tables keep the technical feel of the product while staying visually integrated with the rest of the panel system.

### Timeline/session history list

- Files:
  - `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/routes/session-planner.tsx`
  - `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/routes/athlete-home.tsx`
- Purpose: chronological view of recent sessions, readiness shifts, and individual athlete history.
- Rationale: sessions are easier to parse as a time-ordered stack than as a secondary table.

## Inputs and Controls

### Date range picker

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/date-range-tabs.tsx`
- Base UI primitive: `Tabs`
- Purpose: fast-range switching for Today, Last 7d, Last 28d, and Custom.
- Rationale: for coaching workflows, presets are more important than a heavy calendar UI.

### Athlete selector / filter select

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/select.tsx`
- Base UI primitive: `Select`
- Purpose: compact filter control for squads and future athlete filters.
- Rationale: the new select styling keeps the control dark, low-latency, and visually aligned with the rest of the system.

### Metric toggle group

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/features/dashboard/dashboard-page.tsx`
- Purpose: switch dashboard emphasis between readiness, sleep, HRV, and load.
- Rationale: this behaves more like a data scope switch than a traditional segmented control, so the copy and styling stay terse.

### Search input

- Files:
  - `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/features/dashboard/dashboard-page.tsx`
  - `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/command-palette.tsx`
- Purpose: instant filtering and route-jump entry.
- Rationale: the search surfaces emphasize speed and directness over decorative affordances.

## Feedback and Status

### Status badge

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/status-badge.tsx`
- Purpose: uniform rendering for readiness states, sync state, and neutral metadata.
- Rationale: status colors are intentionally strict and reusable so the same badge language works across cards, lists, and headers.

### Alert banner

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/alert-banner.tsx`
- Purpose: compact surfacing of missing data, injury-risk proxies, or recovery warnings.
- Rationale: banners are framed as operational signals, not generic site notifications.

### Empty state

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/empty-state.tsx`
- Purpose: low-noise fallback for empty data views.
- Rationale: empty states keep the same serious visual language and avoid playful or consumer-style illustrations.

### Loading skeleton

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/loading-skeleton.tsx`
- Purpose: shape-matched placeholders for pending data panels.
- Rationale: the skeletons mirror final panel geometry so loading states do not cause layout drift.

### Tooltip

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/tooltip.tsx`
- Base UI primitive: `Tooltip`
- Purpose: compact metric explanation and chart hint surface.
- Rationale: the tooltip is deliberately terse and dark, with no decorative chrome.

## Modals and Overlays

### Athlete detail drawer

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/dialogs.tsx`
- Base UI primitive: `Dialog`
- Purpose: slide-in athlete detail sheet from the dashboard board.
- Rationale: a side sheet preserves the context of the readiness board while allowing a deeper dive.

### Confirmation dialog

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/dialogs.tsx`
- Base UI primitive: `Dialog`
- Purpose: confirm destructive or stateful actions like Garmin disconnect.
- Rationale: a compact confirmation layer keeps operational actions explicit without leaving the page.

### Command palette

- File: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/components/ui/command-palette.tsx`
- Base UI primitive: `Dialog`
- Purpose: route-jump overlay triggered from the shell.
- Rationale: coaches and directors should be able to navigate the system without hunting through sidebar structure every time.

## Page Definitions

### Dashboard / Home

- Route: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/routes/dashboard.tsx`
- Composition:
  - hero header
  - alert banners
  - top-level squad summary metric blocks
  - top movers panel
  - fast filters
  - squad readiness grid
  - attention queue table
  - session summary panel
  - athlete detail side sheet
- Rationale: this is the coaching-room surface, so it favors broad visibility and scan speed over narrative depth.

### Athlete Profile

- Route: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/routes/athlete-home.tsx`
- Composition:
  - personal header
  - Garmin connection panel
  - readiness and wellness stat blocks
  - readiness history sparkline
  - recent snapshot list
  - sync freshness indicators
- Rationale: the athlete view uses the same system but softens the copy to a self-service, progress-oriented tone.

### Squad Readiness

- Route: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/routes/squads.tsx`
- Composition:
  - squad list table
  - create squad panel
  - role-aware empty states
- Rationale: squad management is an operational workflow and benefits from a table-plus-side-panel layout rather than card sprawl.

### Session Planner

- Route: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/routes/session-planner.tsx`
- Composition:
  - availability summary stat blocks
  - flagged athlete list
  - target-load framing panel
  - session history stack
- Rationale: the page bridges readiness and training decisions, so it mixes summary numbers with chronological operational context.

### Reports / Analytics

- Route: `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/routes/reports.tsx`
- Composition:
  - export-oriented summary header
  - trend stat blocks
  - squad comparison table
  - overview panels for analysis windows
- Rationale: reports need to remain dense and technical while still feeling like part of the same dashboard system.

## Design System Token Reference

Add or keep this block in `/Users/ea/Desktop/projects/pulsi-app/packages/client/src/app/styles.css`:

```css
@theme {
  --font-sans: "Inter", "Geist", "DM Sans", ui-sans-serif, system-ui, sans-serif;

  --color-obsidian-950: #06080d;
  --color-obsidian-900: #0a0f16;
  --color-obsidian-850: #101722;
  --color-obsidian-800: #131c28;
  --color-obsidian-760: #182231;
  --color-obsidian-700: #1d2939;
  --color-obsidian-600: #304055;
  --color-obsidian-500: #5b708a;
  --color-obsidian-400: #91a3b8;
  --color-obsidian-300: #c7d1dc;
  --color-obsidian-200: #e1e8ef;

  --color-accent-500: #38bdf8;
  --color-accent-400: #67d2ff;
  --color-accent-300: #9ae4ff;
  --color-accent-950: #0d2a3a;

  --color-ready-500: #22c55e;
  --color-caution-500: #f59e0b;
  --color-risk-500: #ef4444;
  --color-muted-500: #64748b;

  --color-surface-base: rgba(13, 18, 28, 0.94);
  --color-surface-raised: rgba(17, 24, 37, 0.96);
  --color-surface-muted: rgba(11, 15, 24, 0.72);
  --color-surface-glass: rgba(18, 27, 41, 0.74);
  --color-border-subtle: rgba(146, 163, 184, 0.14);
  --color-border-strong: rgba(146, 163, 184, 0.24);

  --radius-panel: 0.875rem;
  --radius-soft: 0.625rem;
  --radius-tight: 0.45rem;

  --shadow-panel: 0 18px 60px rgba(0, 0, 0, 0.32);
  --shadow-glow: 0 0 0 1px rgba(56, 189, 248, 0.22), 0 0 24px rgba(56, 189, 248, 0.16);
}
```

## Migration Notes

- Root layout shell: replaced the previous pale admin layout with a dark, collapsible operations shell.
- Sidebar navigation: replaced static card-like navigation with a role-aware rail and command palette entry.
- Top bar: replaced the old page header strip with a persistent technical control bar.
- Dashboard: replaced the previous sparse board with a multi-panel readiness cockpit.
- Athlete profile: replaced the basic athlete portal with a trend-led personal performance surface.
- Squad pages: replaced plain CRUD screens with dense operational tables and panelized forms.
- Players page: aligned roster management to the same dark panel/table language as squads.
- Garmin page: replaced the previous generic settings treatment with an integration ops surface.
- Settings page: moved organization admin into a dedicated panel-based workspace that matches the dashboard system.
- Auth screens: replaced the bright entry flows with a branded dark auth shell that still reads as Pulsi.
- Shared status components: standardized readiness/sync states into reusable badge, banner, and stat-block primitives.
- Overlay system: replaced ad hoc modal treatments with Base UI dialog-backed side sheets, confirms, and command search.

## Consistency Rules

1. Dark mode is the primary product surface; new components should default to obsidian backgrounds and subtle borders.
2. Use accent blue sparingly for active state, key focus, and live/high-priority interactions only.
3. Status colors are reserved: green for ready, amber for caution, red for risk, gray for no data or inactive.
4. Numbers should be visually heavier than labels, and tabular numerics should remain enabled everywhere.
5. Prefer panels with borders over floating cards with large shadows.
6. Border radius stays tight; do not introduce oversized rounded corners.
7. Dense layouts are acceptable if grouping and spacing remain disciplined.
8. Use `PageHeader` for all route-level framing instead of inventing page-specific hero patterns.
9. Reuse `MetricStat`, `StatusBadge`, `DataTable`, and `AlertBanner` before creating new one-off status components.
10. Use Base UI primitives for overlays and advanced controls instead of custom keyboard/focus logic.
11. Keep button copy short and operational: connect, export, review, assign, disconnect.
12. Empty states should be calm and technical, never playful.
13. Search and filters should feel instant; avoid unnecessary overlay controls for small option sets.
14. Athlete-facing copy should stay informative and supportive, not coaching-directive.
15. Any future light mode should override CSS variables, not duplicate component implementations.
