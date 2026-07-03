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
  // Accent palette
  palette: string[]
  // Default border colors
  rootColor: string
  childColor: string
}

export const THEMES: AppTheme[] = [
  // ── Gundam Wing — light ───────────────────────────────────────────────────
  {
    id: 'gundam-wing',
    name: 'Dhaka',
    mode: 'light',
    canvasBg: '#f8f9fc',
    dotColor: '#dde2ee',
    toolbarBg: 'rgba(248,249,252,0.94)',
    panelBg: 'rgba(255,255,255,0.94)',
    border: '#dde2ee',
    groupBg: '#f0f2f8',
    textPrimary: '#1a1f36',
    textMuted: '#6370a0',
    nodeBg: '#ffffff',
    nodeTextPrimary: '#1a1f36',
    nodeTextSecondary: '#6370a0',
    nodeTextDimmed: '#9ca3c0',
    nodeSecondaryDimmed: '#c8ccde',
    nodeBorderDimmed: '#dde2ee',
    edgeColor: '#b8c0d8',
    // Same 8 hues as Knight, saturated & punchy for light canvas
    palette: ['#e53935','#fb8c00','#f9c613','#43a047','#1e88e5','#7b1fa2','#e91e63','#00acc1'],
    rootColor: '#1e88e5',
    childColor: '#7b1fa2',
  },

  // ── Totoro — light ────────────────────────────────────────────────────────
  {
    id: 'totoro',
    name: 'Rajshahi',
    mode: 'light',
    canvasBg: '#f0ebe0',
    dotColor: '#d8d0c0',
    toolbarBg: 'rgba(240,235,224,0.94)',
    panelBg: 'rgba(250,247,240,0.94)',
    border: '#d5cbb8',
    groupBg: '#e8e0d0',
    textPrimary: '#2c2418',
    textMuted: '#6a5c44',
    nodeBg: '#faf7f0',
    nodeTextPrimary: '#2c2418',
    nodeTextSecondary: '#6a5c44',
    nodeTextDimmed: '#a09070',
    nodeSecondaryDimmed: '#c8b89a',
    nodeBorderDimmed: '#d5cbb8',
    edgeColor: '#c0b090',
    // Same 8 hues, desaturated & earthy for the muted Totoro feel
    palette: ['#b07060','#b08840','#a09840','#5a8a5a','#6080a0','#806898','#b07880','#508888'],
    rootColor: '#5a8a5a',
    childColor: '#6080a0',
  },

  // ── Knight — dark ─────────────────────────────────────────────────────────
  {
    id: 'knight',
    name: 'Chittagong',
    mode: 'dark',
    canvasBg: '#08080e',
    dotColor: '#14141e',
    toolbarBg: 'rgba(8,8,14,0.96)',
    panelBg: 'rgba(12,12,20,0.96)',
    border: '#2f2f4e',
    groupBg: '#10101c',
    textPrimary: '#e0e0f0',
    textMuted: '#8080b0',
    nodeBg: '#0e0e18',
    nodeTextPrimary: '#e0e0f0',
    nodeTextSecondary: '#8080b0',
    nodeTextDimmed: '#38385a',
    nodeSecondaryDimmed: '#38385a',
    nodeBorderDimmed: '#24243a',
    edgeColor: 'rgba(74,74,122,0.9)',
    // Base hues — bright & vivid on dark canvas
    palette: ['#ef5350','#ffa726','#ffee58','#66bb6a','#42a5f5','#7e57c2','#ec407a','#26c6da'],
    rootColor: '#42a5f5',
    childColor: '#7e57c2',
  },

  // ── Vendetta — dark ───────────────────────────────────────────────────────
  {
    id: 'vendetta',
    name: 'Sylhet',
    mode: 'dark',
    canvasBg: '#08080f',
    dotColor: '#181825',
    toolbarBg: 'rgba(8,8,15,0.96)',
    panelBg: 'rgba(12,12,22,0.96)',
    border: '#3a2c44',
    groupBg: '#12101a',
    textPrimary: '#f0e8e8',
    textMuted: '#9080a0',
    nodeBg: '#100d18',
    nodeTextPrimary: '#f0e8e8',
    nodeTextSecondary: '#9080a0',
    nodeTextDimmed: '#484050',
    nodeSecondaryDimmed: '#484050',
    nodeBorderDimmed: '#2a2030',
    edgeColor: 'rgba(96,78,110,0.9)',
    // Same 8 hues, darkened & moody for the Vendetta dark canvas
    palette: ['#c04848','#c07820','#a89030','#507850','#3870b0','#6848a8','#b04068','#208888'],
    rootColor: '#c04848',
    childColor: '#3870b0',
  },
]

export const LIGHT_THEMES = THEMES.filter(t => t.mode === 'light')
export const DARK_THEMES  = THEMES.filter(t => t.mode === 'dark')

export function getTheme(id: string): AppTheme {
  return THEMES.find(t => t.id === id) ?? THEMES[0]
}
