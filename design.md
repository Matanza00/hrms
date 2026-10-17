# LDS HRMS design system

This file is the source of truth for how the app looks. It is taken from the
Figma file **LDS-HRMS** (`figma.com/design/BAZXTsUc9mhJ2iVIzyxEI0`, page
*Screens*). When code and this file disagree, fix the code. When Figma
changes, update this file first.

The look is quiet and neutral: a light grey canvas, one white rounded panel,
hairline borders, Geist for text and Geist Mono for figures. Colour is used
only for meaning (status, chart series) and to tag sections with an icon
tile.

Tokens live in `src/styles.css`. Use the Tailwind names in the tables below.
Never hard-code hex, `oklch()` or Tailwind palette colours (`text-green-600`,
`bg-red-50`) in components.

---

## 1. Layout

```
┌──────────── canvas #f7f7f7 ───────────────────────────────────────┐
│ Sidebar 256px      ┌─ Panel: white, 1px border, radius 16 ──────┐ │
│ (transparent,      │ Top bar 56px, divider below                │ │
│  10px/12px pad)    ├────────────────────────────────────────────┤ │
│                    │ main, 24px padding                         │ │
│                    │  page header → content (16–20px gaps)      │ │
│                    └────────────────────────────────────────────┘ │
└──── 8px gap around the panel ─────────────────────────────────────┘
```

| Region | Spec | Code |
|---|---|---|
| Canvas | `neutral/canvas` #f7f7f7 | `bg-canvas` / `bg-sidebar` |
| Panel | white, 1px `border`, radius 16, 8px from the window edges | `SidebarInset` (`variant="inset"`) in `AppShell` |
| Top bar | 56px, `border-b border-divider`, 12px left / 16px right | `AppShell` header |
| Main | 24px padding (16px on phones) | `AppShell` `<main>` |
| Sidebar | 256px, collapses to icons | `AppSidebar` |

### Top bar, left to right
1. **Sidebar toggle**: 32px outline icon button (`panel-left`).
2. **Breadcrumbs**: `Workspace › Section › Sub-page`. Ancestors 14px `text-muted-foreground`, current page 14px medium `text-foreground`, 14px `chevron-right` between them.
3. **Search**: 300px × 32px, `bg-subtle`, 1px border, radius 8, 14px search icon, 13px placeholder *Search pages, employees, codes…*, and a `⌘K` kbd chip (20px tall, radius 5, Geist Mono 11 medium). ⌘K / Ctrl+K focuses it.
4. Outline icon buttons (32px): theme (`moon`/`sun`), notifications (`bell`), feedback (`message-square-plus`).
5. A 1×20px `bg-border` divider.
6. **User**: 28px round avatar (`bg-foreground`, white initial), name 13px medium, role 11px muted.
7. **Sign out**: outline button with `log-out` icon.

### Sidebar
- **Workspace card**: white, 1px border, radius 10, Shadow/XS, padding 8/10. 32px logo (`public/brand/lds-logo.png`, radius 8), `LDS` 14 semibold, `HRMS & Accounts` 12 muted, `chevrons-up-down` 16px.
- **Group label**: Geist Mono 12 regular, `text-muted-foreground`, 10px side padding, 6px below. Groups are *Workspace* and *Account*, 24px apart.
- **Nav item**: 34px tall, radius 8, 10px padding, 10px gap, 16px lucide icon, 14px regular `text-text-secondary`.
- **Active nav item**: white fill, 1px border, Shadow/XS, 14px **medium** `text-foreground`.

---

## 2. Colour

### Neutrals
| Figma variable | Value | Tailwind | Use |
|---|---|---|---|
| `neutral/canvas` | #f7f7f7 | `bg-canvas` | App background, login background |
| `neutral/surface`, `color/card` | #ffffff | `bg-card`, `bg-background` | Panel, cards, inputs, outline buttons |
| `neutral/subtle-bg` | #fafafa | `bg-subtle` | Table header row, top-bar search, neutral badge |
| `neutral/hover` | #f5f5f5 | `bg-muted` | Hover fill, tab track, neutral icon tile, avatar fill |
| `neutral/divider` | #f0f0f0 | `border-divider` | Lines *inside* a card (header rule, list rows, metric dividers) |
| `neutral/border`, `color/input` | #ebebeb | `border`, `border-input` | Outer edge of cards, inputs, buttons |

### Text
| Figma variable | Value | Tailwind |
|---|---|---|
| `text/primary` | #171717 | `text-foreground` |
| `text/secondary` | #525252 | `text-text-secondary` |
| `text/muted` | #737373 | `text-muted-foreground` |

### Accents
Each accent has a **solid** (icon tiles, chart series, progress fills,
legend swatches) and a **soft** set for badges: tint fill, line border,
darker ink text.

| Accent | Solid | Tint | Line | Ink | Meaning |
|---|---|---|---|---|---|
| blue / `info` | #3b82f6 | #eff6ff | #dbeafe | #1d4ed8 | Default section colour, on leave, informational |
| green / `success` | #16a34a | #f0fdf4 | #dcfce7 | #15803d | Present, approved, paid, active, revenue |
| amber / `warning` | #d97706 | #fffbeb | #fef3c7 | #b45309 | Late, pending, probation, half day, needs review |
| red / `danger` (`destructive`) | #dc2626 | #fef2f2 | #fee2e2 | #b91c1c | Absent, rejected, terminated, expenses, destructive |
| violet | #7c3aed | #f5f3ff | #ede9fe | #6d28d9 | Profit / distribution, secondary series |

Tailwind: `bg-info`, `bg-info-tint`, `border-info-line`, `text-info-ink`,
and the same for `success`, `warning`, `danger` and `violet`. In JS, use
`toneSolid` / `toneSoft` / `toneInk` from `src/lib/tones.ts`.

Chart series follow `--chart-1…5` = blue, green, amber, red, violet.

### Primary
Primary actions are **black**: `bg-primary` (#171717) with
`text-primary-foreground` (#fafafa). There is no brand blue button.

### Dark mode
`.dark` on `<html>` swaps every token (see `styles.css`). Because
components only use tokens, nothing else needs a `dark:` variant.

---

## 3. Typography

Fonts: **Geist** (UI) and **Geist Mono** (figures, codes, labels), loaded
from Google Fonts in `src/routes/__root.tsx`. `font-sans` / `font-mono`.

| Figma style | Size / line | Weight | Tailwind | Used for |
|---|---|---|---|---|
| Sans/xl 20 · Page title | 20/28, −0.4 | 600 | `text-xl font-semibold leading-7 tracking-[-0.4px]` | Page title, login title |
| Sans/sm 14 SemiBold · −0.2 | 14/20, −0.2 | 600 | `text-sm font-semibold tracking-[-0.2px]` | Card title, workspace name |
| Sans/sm 14 Medium | 14/20 | 500 | `text-sm font-medium` | Active nav, person name, current breadcrumb |
| Sans/sm 14 Regular | 14/20 | 400 | `text-sm` | Nav item, table cell, input value |
| Sans/sm 13 Medium | 13/18 | 500 | `text-[13px] font-medium leading-[18px]` | Buttons, table head, metric label, field label |
| Sans/sm 13 Regular | 13/18 | 400 | `text-[13px] leading-[18px]` | Page description, search placeholder, empty-state copy |
| Sans/xs 12 Medium | 12/16 | 500 | `text-xs font-medium` | Badges, small buttons |
| Sans/xs 12 Regular | 12/16 | 400 | `text-xs` | Card subtitle, secondary line, footnotes |
| Sans/2xs 11 Regular | 11/16 | 400 | `text-[11px]` | User role, avatar initials |
| Mono/26 Medium · −0.8 | 26/32, −0.8 | 500 | `font-mono text-[26px] font-medium leading-8 tracking-[-0.8px]` | Metric values, big money figures |
| Mono/sm 14 Regular | 14/20 | 400 | `font-mono text-sm` | Employee codes in tables (muted) |
| Mono/sm 13 Medium | 13/18 | 500 | `font-mono text-[13px] font-medium` | Amounts in lists (`Rs 300,000`) |
| Mono/xs 12 Regular | 12/16 | 400 | `font-mono text-xs` | Sidebar group label, percentages, axis ticks |
| Mono/2xs 11 Medium | 11/16 | 500 | `font-mono text-[11px] font-medium` | `⌘K` chip, counters |

Rule: **every number a person reads as a quantity** (money, hours, counts,
percentages, codes, dates in metric strips) is Geist Mono. The
`tabular-nums` utility also switches to Geist Mono.

---

## 4. Shape, spacing and elevation

| Token | Value | Tailwind | Used for |
|---|---|---|---|
| radius-sm | 6px | `rounded-sm` | Badge, small icon tile (24px) |
| radius-md | 8px | `rounded-md` | Buttons, inputs, selects, nav items, 32px tiles |
| radius-lg | 10px | `rounded-lg` | Workspace card, page icon tile (36px), empty-state box |
| radius-xl / 2xl | 12px | `rounded-xl`, `rounded-2xl` | Cards, tables, metric strips, dialogs |
| radius-3xl | 16px | `rounded-3xl` | The main panel |

- **Elevation**: one shadow, *Shadow/XS* `0 1px 2px rgb(0 0 0 / .04)` →
  `shadow-xs`. It sits on controls (buttons, inputs, active nav, workspace
  card). Cards are flat. Only popovers and dialogs get `shadow-lg`.
- **Spacing**: 4px grid. Common steps: 6 (icon↔label), 8 (button groups),
  10 (nav gap), 12 (title row gap), 16 (between cards), 20 (card padding),
  24 (page padding).

---

## 5. Components

### Page header (`PageHeader`)
36px **icon tile** (radius 10, solid blue, white 18px icon) + title
(20 semibold) + description (13 muted). Actions sit right, vertically
centred: period `Select` (150px), outline buttons, then one black primary
button. Pass `icon={…}` on every admin page. Tone defaults to `info` (blue).
Figma uses blue for every page header.

### Buttons (`Button`)
All 32px (`h-8`), radius 8, 12px horizontal padding, 6px icon gap,
13px medium, 14px icon.

| Variant | Look |
|---|---|
| `default` (Primary) | Black fill, white text, Shadow/XS |
| `outline` | White fill, 1px border, Shadow/XS, hover `bg-muted` |
| `ghost` | No fill, hover `bg-muted` |
| `destructive` | Red fill, white text |
| `size="icon"` | 32×32, 16px icon |
| `size="sm"` | 28px, 12px text |

Order in a row: secondary/outline first, primary last.

### Inputs (`Input`, `Select`, `Textarea`)
36px, white, 1px `border-input`, radius 8, 12px padding, 14px text, muted
placeholder, Shadow/XS. Focus: `border-ring` + 2px `ring/20`. Field label
13 medium, 6px above the control. Fields stack 16px apart. Two-column forms
use a 12px column gap.

### Card (`ChartCard`, `Card`)
White, 1px border, radius 12, no shadow.
**Card header**: 14px vertical / 20px horizontal padding, `border-b
border-divider`, 24px icon tile (radius 6, solid accent, 14px icon) +
title (14 semibold −0.2) over subtitle (12 muted). Header actions sit right.
**Body**: 20px padding (charts: 20 top, 16 bottom).
Use the `icon` + `tone` props on `ChartCard` to set the tile. Pick a tone
that matches what the card shows: blue for attendance and general,
green for revenue and growth, amber for time and clock, red for expenses,
violet for distribution and profit.

### Metric strip (`StatCard` inside `.metric-strip`)
Metrics are not separate cards. They are cells of **one** bordered card
with hairline `divider` lines between them. Put `metric-strip` on the grid
that holds the `StatCard`s (and drop `gap-*`). Each cell has 16/20/18
padding, a 14px icon + 13 medium muted label, then a 26px Geist Mono value.
The icon takes the accent ink colour (`tone`).

### Table (`DataTable`, `Table`)
White card, radius 12, Shadow/XS.
**Header row**: `bg-subtle`, `border-b`, 40px, 16px padding, 13 medium
muted, sentence case (no uppercase, no letter-spacing).
**Rows**: 16px horizontal / 14px vertical padding, `border-b`, hover
`bg-subtle`.
Cell kinds:
- *Code*: Geist Mono 14, muted.
- *Person*: 36px round avatar (`bg-muted`, 11px initials) + name (14
  medium) over role (12 muted), 12px gap.
- *Contact*: 12px `phone` / `mail` icons, 12px text, phone in foreground,
  email muted, 4px apart.
- *Badge*: a `StatusBadge`.
- *Action*: 32px ghost icon button (`ellipsis`), or a small outline
  button with an icon (`Edit`).

**Table footer**: *Showing X of Y …* (12 muted) on the left, outline
`Previous` / `Next` on the right (50% opacity when disabled).
**Toolbar** above a table: search input (≈448px, 40px tall) and filter
selects or an outline `Filters` button, 8px apart.

### Badge (`StatusBadge`, `Badge`)
22px tall, radius 6, 8px padding, 1px tinted border, tint fill,
12 medium ink text, 6px dot in the ink colour.
Status → tone:

| Tone | Statuses |
|---|---|
| success | active, present, approved, paid, received, permanent |
| warning | pending, late, half day, probation, processing, invoiced |
| info | on leave, leave |
| danger | absent, rejected, terminated |
| neutral | anything else (intern, inactive, recorded…) |

Matching ignores case, spaces and dashes.

### Tabs (`Tabs`)
A segmented control: `bg-muted` track, radius 8, 3px padding. Triggers
are 13 medium muted. The active one is white with Shadow/XS. Section
sub-pages (Attendance, Accounts, Settings, Profile) use it as their
secondary nav, directly under the page header.

### Lists inside cards
Rows of 12px/20px padding, `border-b border-divider` (none on the last
row), primary line 14 medium, secondary line 12 muted, badge right.

### Progress (distribution bars)
6px track, `bg-divider`, fully rounded. The fill is a solid accent.
Label row: name (13 medium) left, amount (Geist Mono 13 medium) right,
percentage (Geist Mono 12 muted) below.

### Empty state (`EmptyState`)
Dashed 1px border, radius 10, centred column with a 10px gap: 32px
neutral icon tile (radius 8, `bg-muted`, 16px muted icon), 13px muted
message, optional small outline button.

### Callout (needs-review banner)
Amber soft: `bg-warning-tint`, `border-warning-line`, radius 10, 12/16
padding, 16px `triangle-alert` icon in `text-warning-ink`, title 12 medium
ink, detail 12 ink. An outline button sits right.

### Info note
14px `info` icon + 12px muted text, 6px gap. Used under metric strips and
in empty chart states.

### Charts (Recharts)
- Grid: horizontal dashed lines only, `var(--divider)`.
- Axis ticks: Geist Mono 11, `var(--muted-foreground)`, no axis lines.
- Series: `var(--chart-N)` / accent solids. Lines 2px with hollow dots,
  areas with a 10–15% fill of the line colour.
- Legend below the chart: 8px square swatch (radius 2) + 12 muted label,
  16px apart.

### Dialogs
White, radius 12, 24px padding. Title 16 semibold, description 13 muted.
Footer buttons right-aligned: outline cancel, then the primary (or
destructive) action. Overlay is black at 80%.

### Login
Centred on the canvas. 48px logo (radius 12), *Sign in to LDS HRMS*
(20 semibold) and *Use your employee code or admin username.* (13 muted),
20px below the logo. Then a 380px card: white, border, radius 12,
24px padding, 16px gaps. Fields *Login ID* and *Password* (with an `eye`
toggle), a 12px secondary helper line right-aligned, and a full-width
36px black *Sign in* button.

---

## 6. Icons

[lucide-react](https://lucide.dev). The Figma layers are named
`icon/<lucide-name>`. Sizes: 16px in nav and icon buttons, 14px in
buttons, metric labels and breadcrumbs, 18px in page tiles, 12px in
contact rows. Stroke colour follows text colour (`currentColor`).

| Section | Icon |
|---|---|
| Dashboard | `layout-dashboard` |
| Employees | `users` |
| Attendance | `clock` |
| Leaves | `calendar-days` |
| Payroll | `wallet` |
| Accounts | `receipt` |
| Holidays | `party-popper` |
| Reports | `chart-column` (`BarChart3`) |
| Settings | `settings` |
| Profile | `user` |

---

## 7. Do and don't

- **Do** use tokens (`bg-card`, `text-muted-foreground`, `bg-success-tint`…).
- **Do** keep one black primary button per view.
- **Do** put figures in Geist Mono.
- **Don't** use gradients, coloured card backgrounds, `uppercase tracking-wider` table heads, or shadows on cards.
- **Don't** use `rounded-full` pills for status. Badges are radius 6.
- **Don't** add `dark:` overrides for colours. Fix the token instead.
