/**
 * AppTheme — Notion-flavored themes for Luminary.
 *
 * All four themes use the Notion color palette (warm neutrals, brand-blue
 * CTAs, single-family text ladder) mapped across light and dark surfaces.
 */

export interface AppTheme {
  id: string
  name: string
  mode: 'light' | 'dark'
  // Canvas
  canvasBg: string
  dotColor: string
  // Toolbar / panels
  toolbarBg: string
  panelBg: string
  border: string
  groupBg: string
  textPrimary: string
  textMuted: string
  // Nodes
  nodeBg: string
  nodeTextPrimary: string
  nodeTextSecondary: string
  nodeTextDimmed: string
  nodeSecondaryDimmed: string
  nodeBorderDimmed: string
  // Edges
  edgeColor: string
  // Accent palette (8 hues for color picker)
  palette: string[]
  // Default border colors
  rootColor: string
  childColor: string
}

export const THEMES: AppTheme[] = [
  // ── Notion Light — warm paper ─────────────────────────────────────────────
  {
    id: 'notion-light',
    name: 'Paper',
    mode: 'light',
    canvasBg: '#f6f5f4',
    dotColor: '#e4e2df',
    toolbarBg: 'rgba(246,245,244,0.92)',
    panelBg: 'rgba(255,255,255,0.94)',
    border: 'rgba(0,0,0,0.08)',
    groupBg: 'rgba(0,0,0,0.03)',
    textPrimary: '#000000',
    textMuted: '#615d59',
    nodeBg: '#ffffff',
    nodeTextPrimary: '#000000',
    nodeTextSecondary: '#615d59',
    nodeTextDimmed: '#a39e98',
    nodeSecondaryDimmed: '#c8c5c0',
    nodeBorderDimmed: 'rgba(0,0,0,0.08)',
    edgeColor: '#bfbab2',
    palette: ['#2537b1','#097fe8','#0891b2','#059669','#ca8a04','#dc2626','#7c3aed','#db2777'],
    rootColor: '#2537b1',
    childColor: '#097fe8',
  },

  // ── Linen —  cooler light ────────────────────────────────────────────────
  {
    id: 'linen',
    name: 'Linen',
    mode: 'light',
    canvasBg: '#f8f8f7',
    dotColor: '#e0dfdd',
    toolbarBg: 'rgba(248,248,247,0.92)',
    panelBg: 'rgba(255,255,255,0.94)',
    border: 'rgba(0,0,0,0.07)',
    groupBg: 'rgba(0,0,0,0.02)',
    textPrimary: '#0a0a0a',
    textMuted: '#5c5955',
    nodeBg: '#ffffff',
    nodeTextPrimary: '#0a0a0a',
    nodeTextSecondary: '#5c5955',
    nodeTextDimmed: '#9e9a95',
    nodeSecondaryDimmed: '#c4c1bc',
    nodeBorderDimmed: 'rgba(0,0,0,0.07)',
    edgeColor: '#bfbdba',
    palette: ['#2537b1','#097fe8','#0891b2','#059669','#ca8a04','#dc2626','#7c3aed','#db2777'],
    rootColor: '#dc2626',
    childColor: '#059669',
  },

  // ── Notebook — dark navy ─────────────────────────────────────────────────
  {
    id: 'notebook',
    name: 'Notebook',
    mode: 'dark',
    canvasBg: '#13141a',
    dotColor: 'rgba(255,255,255,0.05)',
    toolbarBg: 'rgba(19,20,26,0.92)',
    panelBg: 'rgba(24,26,34,0.94)',
    border: 'rgba(255,255,255,0.10)',
    groupBg: 'rgba(255,255,255,0.04)',
    textPrimary: '#e8e6e3',
    textMuted: '#8b8882',
    nodeBg: '#1e2028',
    nodeTextPrimary: '#e8e6e3',
    nodeTextSecondary: '#8b8882',
    nodeTextDimmed: '#5a5855',
    nodeSecondaryDimmed: '#3d3b39',
    nodeBorderDimmed: 'rgba(255,255,255,0.08)',
    edgeColor: '#4a5060',
    palette: ['#7c8cf5','#4ea8ff','#34d399','#fbbf24','#f87171','#a78bfa','#fb7185','#22d3ee'],
    rootColor: '#7c8cf5',
    childColor: '#4ea8ff',
  },

  // ── Midnight — deep navy (hero tradition) ────────────────────────────────
  {
    id: 'midnight',
    name: 'Midnight',
    mode: 'dark',
    canvasBg: '#0d0e16',
    dotColor: 'rgba(255,255,255,0.04)',
    toolbarBg: 'rgba(13,14,22,0.92)',
    panelBg: 'rgba(18,20,30,0.94)',
    border: 'rgba(255,255,255,0.08)',
    groupBg: 'rgba(255,255,255,0.03)',
    textPrimary: '#dcdad6',
    textMuted: '#7d7a75',
    nodeBg: '#1a1c26',
    nodeTextPrimary: '#dcdad6',
    nodeTextSecondary: '#7d7a75',
    nodeTextDimmed: '#4d4b48',
    nodeSecondaryDimmed: '#33312f',
    nodeBorderDimmed: 'rgba(255,255,255,0.06)',
    edgeColor: '#3e4456',
    palette: ['#8aa0ff','#5ab5ff','#4fd8a6','#fcc94d','#f98080','#b69cff','#fb8596','#36d9e8'],
    rootColor: '#f98080',
    childColor: '#5ab5ff',
  },
]

export const LIGHT_THEMES = THEMES.filter(t => t.mode === 'light')
export const DARK_THEMES  = THEMES.filter(t => t.mode === 'dark')

export function getTheme(id: string): AppTheme {
  return THEMES.find(t => t.id === id) ?? THEMES[0]
}
