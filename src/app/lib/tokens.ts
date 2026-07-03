/**
 * Design tokens — Notion-flavored system for Luminary.
 *
 * Adapts the Notion Marketing 2024 design language (deep navy hero + warm
 * off-white body, single-family weight hierarchy, soft rounded geometry,
 * 4px grid spacing) to the mind-map canvas app.
 *
 * Reference: notion-DESIGN.md
 */

// ── Notion Color Palette ───────────────────────────────────────────────────
// Warm neutrals
export const SURFACE_BASE = '#f6f5f4'     // primary page background
export const SURFACE_WHITE = '#ffffff'    // cards, panels, modals
export const HERO_DARK_NAVY = '#02093a'   // dark canvas base

// Notion text ladder
export const TEXT_PRIMARY = '#000000'
export const TEXT_MEDIUM = '#615d59'
export const TEXT_MUTED = '#a39e98'

// Brand + accent
export const BRAND_BLUE = '#2537b1'       // CTAs, key links, hero accent
export const ACCENT_BLUE = '#097fe8'      // inline links, secondary accent
export const ACCENT_RED = '#f64932'       // warnings, error states, danger
export const ACCENT = '#2537b1'           // chrome-level primary alias

// Semantic aliases (backwards-compatible names)
export const SUCCESS = '#22c55e'          // confirm, add, save
export const WARNING = '#f59e0b'          // search match, cautions
export const DANGER = ACCENT_RED          // delete, clear, destructive
export const LINK = ACCENT_BLUE           // cross-node links, linking mode

// Border — black at 8% opacity
export const BORDER_SUBTLE = 'rgba(0,0,0,0.08)'

// ── Focus ring ──────────────────────────────────────────────────────────────
// Notion uses solid 3px outlines with slight offset
export const FOCUS_RING_COLOR = BRAND_BLUE
export const FOCUS_RING_ALPHA = 0.6
export const FOCUS_RING_WIDTH = 3
export const FOCUS_RING_OFFSET = 2

// ── Typography ──────────────────────────────────────────────────────────────
// Single-family weight hierarchy (Plus Jakarta Sans stands in for NotionInter)
export const FONT_FAMILY = "'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

// Type scale — Notion roles mapped to app usage
export const DISPLAY = { size: 64, weight: 700, lineHeight: 64, letterSpacing: '-1.875px' }
export const HEADING_XL = { size: 48, weight: 400, lineHeight: 72 }
export const HEADING_L = { size: 40, weight: 400, lineHeight: 60 }
export const HEADING_M = { size: 22, weight: 700, lineHeight: 28, letterSpacing: '-0.25px' }
export const HEADING_S = { size: 20, weight: 600, lineHeight: 28, letterSpacing: '-0.125px' }
export const BODY_REGULAR = { size: 16, weight: 400, lineHeight: 24 }
export const BODY_LARGE = { size: 20, weight: 400, lineHeight: 30 }
export const LABEL_MEDIUM = { size: 14, weight: 500, lineHeight: 20 }
export const LABEL_SMALL = { size: 12, weight: 500, lineHeight: 16, letterSpacing: '0.125px' }
export const NAV_LINK = { size: 16, weight: 500, lineHeight: 24 }

// ── Radii ───────────────────────────────────────────────────────────────────
// Notion's radius scale — soft rounded geometry throughout
export const RADIUS_NONE = 0
export const RADIUS_XS = 2
export const RADIUS_SM = 4
export const RADIUS_MD = 5
export const RADIUS_BASE = 6
export const RADIUS_CARD = 8        // control corners, node cards
export const RADIUS_LG = 12          // larger controls
export const RADIUS_XL = 16          // panels, modals
export const RADIUS_2XL = 20         // large surfaces
export const RADIUS_PILL = 99999     // badge/tag pills

// ── Spacing (4px grid) ──────────────────────────────────────────────────────
// Notion spacing-1 → spacing-16
export const SPACE_1 = 2
export const SPACE_2 = 3
export const SPACE_3 = 4
export const SPACE_4 = 5
export const SPACE_5 = 6
export const SPACE_6 = 8
export const SPACE_7 = 10
export const SPACE_8 = 12
export const SPACE_9 = 14
export const SPACE_10 = 15
export const SPACE_11 = 16
export const SPACE_12 = 20
export const SPACE_13 = 24
export const SPACE_14 = 28
export const SPACE_15 = 32
export const SPACE_16 = 40

// ── Shadows ─────────────────────────────────────────────────────────────────
// Notion uses flat design — minimal elevation. Soft blur for floating UI.
export const SHADOW_NONE = 'none'
export const SHADOW_SM = '0 1px 2px rgba(0,0,0,0.04)'
export const SHADOW_MD = '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
export const SHADOW_LG = '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)'
export const SHADOW_FLOATING = '0 12px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)'

// ── Breakpoints ─────────────────────────────────────────────────────────────
export const BREAKPOINT_SM = 640
export const BREAKPOINT_MD = 768
export const BREAKPOINT_LG = 900

// ── Layout ──────────────────────────────────────────────────────────────────
export const PANEL_WIDTH = 260   // pages sidebar — canvas shifts by this amount
export const TOOLBAR_HEIGHT = 52

// ── Overlay ─────────────────────────────────────────────────────────────────
export const OVERLAY_DURATION = 150
export const OVERLAY_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

// ── Tooltip ────────────────────────────────────────────────────────────────
export const TOOLTIP_SHOW_DELAY = 300

// ── Blur ────────────────────────────────────────────────────────────────────
// Notion uses backdrop-filter blur on floating panels
export const BLUR_STRONG = 'blur(12px)'
export const BLUR_SOFT = 'blur(8px)'

// ── Depth ──────────────────────────────────────────────────────────────────
export const DEPTH_STEP = 40
