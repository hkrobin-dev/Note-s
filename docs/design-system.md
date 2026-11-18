# Design System — "Calm Focus"

The UI was redesigned with an **original** visual language informed by current
productivity-dashboard trends observed on Dribbble and design publications in
2026. No Dribbble shot, component, or artwork was copied — only general patterns
were used as inspiration.

## What inspired the redesign

| Trend observed | How it shows up here |
|---|---|
| Flat, data-first surfaces replace heavy glassmorphism | Cards are solid, layered surfaces with hairline borders; blur is reserved for overlays and the mobile bar |
| One accent color; semantic color only for state | Indigo/violet accent plus green/amber/red strictly for status |
| Persistent ~256px grouped sidebar | Navigation is grouped into Overview, Plan, Capture, Money, Organize, Develop |
| Bento / 12-column grid with KPI strip | Dashboard uses a 4-card KPI row and a 12-column bento grid |
| Clear loading, empty, and error states | Skeleton loading and consistent empty-state panels |
| Generous type scale and tabular numerals | Tight-tracking headings, monospaced labels, tabular metrics |

## Tokens

All color and type tokens live in `frontend/src/app/globals.css` under `@theme`
and `[data-theme="dark"]`. Never hardcode a hex value in a component — use a
semantic token so light/dark stay in sync.

Key tokens: `canvas`, `surface`, `surface-2`, `surface-3`, `line`, `line-strong`,
`ink`, `ink-2`, `ink-3`, `accent`, `accent-soft`, `accent-ink`, `positive`,
`warning`, `error`.

## Component classes

| Class | Purpose |
|---|---|
| `.panel` | Base card (solid surface + hairline border) |
| `.hero` | Dashboard greeting with a subtle radial wash |
| `.panel-head` / `.panel-body` | Consistent card header and body spacing |
| `.kpi`, `.kpi-value`, `.kpi-rule` | Metric cards |
| `.nav-group-label`, `.nav-item` | Sidebar navigation |
| `.list-row` | Dense list item used across dashboard panels |
| `.chip`, `.chip--accent`, `.chip--positive` | Status labels |
| `.progress-track` / `.progress-fill` | Goal progress bars |
| `.ring` | CSS conic-gradient habit completion ring (`--pct`) |
| `.timeline` | Vertical event timeline |
| `.empty-state`, `.skeleton` | Empty and loading states |
| `.search-trigger` | Command-palette search affordance |

Legacy class names (`.glass`, `.glass-elevated`, `.btn-primary`, `.input-glass`,
`StatTile`, `GlassPanel`) are kept as aliases so the other 20+ pages inherit the
new look without a risky mass rewrite. A small compatibility layer in
`globals.css` maps the old `bg-white/5` and `border-white/10` utilities onto the
new tokens. New work should prefer the semantic classes above.

## Interaction notes

- Press `⌘K` / `Ctrl+K`, click **Quick search** in the sidebar, or use the
  search button on the dashboard to open the global command palette.
- The sidebar collapses to a drawer on small screens, with a bottom tab bar.
- Theme is applied before hydration to avoid a flash (`app/layout.tsx`).
- Toast alerts stack in the bottom-right (`components/toast/toaster.tsx`). Use
  `useToast().toast({ title, description, variant })` or the shortcuts
  `toast.success()`, `toast.error()`, `toast.info()`, `toast.warning()`.
  Variants are `default`, `success`, `destructive`, `info`, `warning`; toasts
  auto-dismiss after 4s and can be closed manually.
