/**
 * Design tokens — the single source of truth for visual values.
 *
 * Every color, radius, shadow, spacing, and breakpoint used by chrome
 * (toolbars, panels, buttons, overlays) should come from here so that
 * the shell can be themed consistently and updated without hunting
 * through 13 components.
 */

// ── Brand accent ────────────────────────────────────────────────────────────
// The logo orange. Used for chrome-level primary actions: Space Out, active
// page, add-page button — giving the shell a consistent brand voice.
export const ACCENT = '#fc5716'

// ── Semantic colors ─────────────────────────────────────────────────────────
// Status colors used across all components for consistent meaning.
export const SUCCESS = '#22c55e'
export const WARNING = '#f59e0b'
export const DANGER = '#ef4444'
export const LINK = '#8b5cf6'

// ── Focus ring ──────────────────────────────────────────────────────────────
// Visible focus indicator for keyboard navigation. Uses the accent color
// at reduced opacity with a slight offset for contrast against any bg.
export const FOCUS_RING_COLOR = ACCENT
export const FOCUS_RING_ALPHA = 0.6
export const FOCUS_RING_WIDTH = 2
export const FOCUS_RING_OFFSET = 2

// ── Radii ───────────────────────────────────────────────────────────────────
// Naming follows Tailwind's convention. These are the de-facto values
// already used inline — just named here for consistency.
export const RADIUS_SM = 6
export const RADIUS_MD = 8
export const RADIUS_LG = 12
export const RADIUS_PILL = 16

// ── Spacing scale ───────────────────────────────────────────────────────────
// 4px-based scale. Use for padding, margin, gap — not for font sizes.
export const SPACE_1 = 4
export const SPACE_2 = 8
export const SPACE_3 = 12
export const SPACE_4 = 16
export const SPACE_5 = 20
export const SPACE_6 = 24

// ── Shadows ─────────────────────────────────────────────────────────────────
// Consistent elevation levels.
export const SHADOW_SM = '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)'
export const SHADOW_MD = '0 4px 16px rgba(0,0,0,0.15)'
export const SHADOW_LG = '0 8px 32px rgba(0,0,0,0.12)'

// ── Breakpoints ─────────────────────────────────────────────────────────────
// Mobile-first. Match with window.matchMedia or CSS media queries.
export const BREAKPOINT_SM = 640
export const BREAKPOINT_MD = 768
export const BREAKPOINT_LG = 900

// ── Overlay ─────────────────────────────────────────────────────────────────
// Duration for enter/exit animations on modals and panels.
export const OVERLAY_DURATION = 150
export const OVERLAY_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

// ── Tooltip ────────────────────────────────────────────────────────────────
// Delay before showing on hover; 0ms when moving between adjacent buttons.
export const TOOLTIP_SHOW_DELAY = 300
