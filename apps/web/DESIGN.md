# Gatepass Dashboard Design System

**Brand:** Measured precision — trustworthiness, not hype.

## Design Principles

1. **Precision over polish** — Every pixel serves a purpose. No decorative elements that don't convey information.
2. **Severity is immediate** — Color communicates risk level before any text is read.
3. **Tier distinction is binary** — Verified findings (emerald/green) and research findings (blue) must be visually distinct at a glance.
4. **Dark mode is first-class** — Not an afterthought. Security teams work in dark environments.
5. **Accessible by default** — WCAG AA contrast ratios, focus-visible states, semantic HTML.

## Color Palette

### Gatepass Slate (Primary Neutral)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `gatepass-50` | `#f8fafc` | — | Page background |
| `gatepass-100` | `#f1f5f9` | — | Card backgrounds, secondary surfaces |
| `gatepass-200` | `#e2e8f0` | `#334155` | Borders, dividers |
| `gatepass-300` | `#cbd5e1` | `#475569` | Subtle borders, disabled text |
| `gatepass-400` | `#94a3b8` | `#64748b` | Placeholder text, icons |
| `gatepass-500` | `#64748b` | `#94a3b8` | Secondary text, muted labels |
| `gatepass-600` | `#475569` | `#cbd5e1` | Body text (light mode) |
| `gatepass-700` | `#334155` | `#e2e8f0` | Headings, strong text |
| `gatepass-800` | `#1e293b` | `#f1f5f9` | Dark mode cards |
| `gatepass-900` | `#0f172a` | `#f8fafc` | Primary text, headings |
| `gatepass-950` | `#020617` | — | Dark mode page background |

### Blue Accent (Interactive)

| Token | Value | Usage |
|-------|-------|-------|
| `accent-50` | `#eff6ff` | Hover backgrounds |
| `accent-100` | `#dbeafe` | Selected states |
| `accent-500` | `#3b82f6` | Links, interactive elements |
| `accent-600` | `#2563eb` | Primary buttons, focus rings |
| `accent-700` | `#1d4ed8` | Button hover |

### Severity Colors

| Level | Color | Light BG | Dark BG | Usage |
|-------|-------|----------|---------|-------|
| Critical | `#dc2626` | `#fef2f2` | `#991b1b` | CVSS 9-10, active exploits |
| High | `#ea580c` | `#fff7ed` | `#9a3412` | CVSS 7-8.9 |
| Medium | `#d97706` | `#fffbeb` | `#92400e` | CVSS 4-6.9 |
| Low | `#64748b` | `#f8fafc` | `#334155` | CVSS 0-3.9, informational |

### Tier Colors

| Tier | Color | Light BG | Icon | Usage |
|------|-------|----------|------|-------|
| Verified | `#059669` | `#d1fae5` | Green checkmark | Deterministic findings with reproductions |
| Research | `#3b82f6` | `#dbeafe` | Blue beaker | Semantic analysis, confidence-scored |

### Posture Colors

| Posture | Color | Light BG | Usage |
|---------|-------|----------|-------|
| Passing | `#059669` | `#d1fae5` | All checks pass |
| Warning | `#d97706` | `#fef3c7` | Some issues found |
| Failing | `#dc2626` | `#fee2e2` | Critical issues present |
| Unknown | `#64748b` | `#f1f5f9` | No data / not scanned |

## Typography

### Font Stack

```css
--font-sans: "Inter", "Geist", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
  "Liberation Mono", monospace;
```

### Type Scale

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 0.75rem (12px) | 1rem | Captions, badges, timestamps |
| `text-sm` | 0.875rem (14px) | 1.25rem | Secondary text, table cells |
| `text-base` | 1rem (16px) | 1.5rem | Body text, default |
| `text-lg` | 1.125rem (18px) | 1.75rem | Section headings |
| `text-xl` | 1.25rem (20px) | 1.75rem | Page titles |
| `text-2xl` | 1.5rem (24px) | 2rem | Hero headings |
| `text-3xl` | 1.875rem (30px) | 2.25rem | Dashboard metrics |

## Spacing

4px grid system using Tailwind defaults:

| Token | Value | Usage |
|-------|-------|-------|
| `p-1` / `m-1` | 4px | Tight spacing, icon gaps |
| `p-2` / `m-2` | 8px | Compact padding |
| `p-3` / `m-3` | 12px | Default input padding |
| `p-4` / `m-4` | 16px | Card padding, section gaps |
| `p-5` / `m-5` | 20px | Medium spacing |
| `p-6` / `m-6` | 24px | Large card padding |
| `p-8` / `m-8` | 32px | Section spacing |
| `p-10` / `m-10` | 40px | Page margins |
| `p-12` / `m-12` | 48px | Large section spacing |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Badges, tags, small elements |
| `rounded` | 6px | Buttons, inputs, form controls |
| `rounded-lg` | 8px | Cards, panels, modals |
| `rounded-xl` | 12px | Large modals, overlays |

## Shadows

| Token | Usage |
|-------|-------|
| `shadow-xs` | Subtle depth for flat elements |
| `shadow-sm` | Cards, elevated surfaces |
| `shadow-md` | Dropdowns, popovers |
| `shadow-lg` | Modals, dialogs |

## Dark Mode

Class-based toggle via `.dark` class on `<html>`:

```tsx
<html className={darkMode ? 'dark' : ''}>
```

All color tokens have dark mode variants defined in `globals.css`. Components use `dark:` Tailwind prefix.

## Icon Set

**Lucide React** — `lucide-react` package. SVG icons only, never emojis.

Common icons:
- `Shield` — security/posture
- `ShieldCheck` — verified findings
- `ShieldAlert` — unverified/risky findings
- `CheckCircle2` — passing status
- `XCircle` — failing status
- `AlertTriangle` — warning status
- `Search` — scan actions
- `Filter` — filtering
- `ChevronDown` — dropdowns
- `ArrowUpDown` — sortable columns
- `Loader2` — loading states
- `Plus` — add actions
- `Trash2` — delete actions
- `ExternalLink` — external links

## Component Primitives

All primitives live in `src/components/ui/`. Pure Tailwind + React, no external libraries.

| Component | File | Purpose |
|-----------|------|---------|
| Button | `Button.tsx` | Primary/secondary/ghost/danger actions |
| Badge | `Badge.tsx` | Tier, severity, posture, plan labels |
| Card | `Card.tsx` | Content containers with optional header/footer |
| Table | `Table.tsx` | Accessible data table with sorting |
| Input | `Input.tsx` | Form text input with label/error |
| Select | `Select.tsx` | Form select with label/error |
| Skeleton | `Skeleton.tsx` | Loading placeholder |
| EmptyState | `EmptyState.tsx` | No-data states with icon + action |
| Toast | `Toast.tsx` | Notification system with auto-dismiss |

## Layout Patterns

### Dashboard Grid

```
┌─────────────────────────────────────┐
│  Top Nav (h-16)                     │
├─────────────────────────────────────┤
│  Page Header (px-6 py-4)           │
├─────────────────────────────────────┤
│  Metrics Row (grid-cols-4 gap-4)   │
├─────────────────────────────────────┤
│  Content Area (grid-cols-3 gap-6)  │
│  ┌─────────┬─────────┬───────────┐ │
│  │ Finding │ Finding │ Posture   │ │
│  │ List    │ Detail  │ Panel     │ │
│  │ (col-2) │ (col-2) │ (col-1)   │ │
│  └─────────┴─────────┴───────────┘ │
└─────────────────────────────────────┘
```

### Finding Card Layout

```
┌─────────────────────────────────────┐
│ [Badge: verified] [Badge: critical]│
│ Finding Title                       │
│ Description text...                 │
│ ─────────────────────────────────── │
│ File: path/to/file.ts:42           │
│ Rule: sql-injection                │
│ Confidence: 98% (if research)      │
└─────────────────────────────────────┘
```

## Anti-Patterns

- **Never use emojis as icons** — Always use Lucide SVG icons
- **Never hardcode colors** — Use Tailwind tokens (`bg-accent-600`, not `bg-[#2563eb]`)
- **Never skip dark mode** — Every component must have dark variants
- **Never use shadow-xl+** — Security tools stay subtle, not flashy
- **Never animate layout properties** — Use transform/opacity only
- **Never use generic fonts** — Inter for UI, JetBrains Mono for code
