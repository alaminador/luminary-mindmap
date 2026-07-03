import React, {
  useRef, useState, useEffect, useCallback, useReducer, useMemo,
} from 'react'
import { CaretLeft, CaretRight, X, Check, ArrowUp } from '@phosphor-icons/react'
import type { MindNode, NodeLink } from '../lib/mindmap'
import { blankCanvas, addChild, addChildAt, addSibling, collectDescendants, computeDistanceMap, getVisibleNodeIds, nextId, autoLayout, exportMarkdown, parseOutlineToNodes } from '../lib/mindmap'
import { playCreate, playDelete } from '../lib/sounds'
import type { Camera } from '../lib/projection'
import { project } from '../lib/projection'
import { getTheme, LIGHT_THEMES, DARK_THEMES } from '../lib/themes'
import { useBreakpoints } from '../lib/use-responsive'
import { SUCCESS, WARNING, PANEL_WIDTH, TOOLBAR_HEIGHT } from '../lib/tokens'
import { EdgesOverlay } from './edges-overlay'
import { MindNodeCard } from './mind-node'
import { NodeToolbar } from './node-toolbar'
import { Breadcrumb } from './breadcrumb'
import { Toolbar } from './toolbar'
import { ShortcutsPanel } from './shortcuts-panel'
import { SearchBar } from './search-bar'
import { ThemePicker } from './theme-picker'
import { Minimap } from './minimap'
import { PagesPanel } from './pages-panel'
import type { Page } from './pages-panel'

const DEFAULT_CAMERA: Camera = {
  panX: 0, panY: 0, panZ: 0,
  zoom: 1, rotX: 0, rotY: 0, perspective: 1200,
}

const PAGES_KEY         = 'mindmap-pages'
const ACTIVE_PAGE_KEY   = 'mindmap-active-page'
const THEME_KEY         = 'mindmap-theme'
const PAPER_TYPE_KEY    = 'mindmap-paper-type'
const PAPER_OPACITY_KEY = 'mindmap-paper-opacity'

type PaperType    = 'blank' | 'lined' | 'dotted' | 'mini-squared' | 'squared'
type PaperOpacity = 'subtle' | 'clear' | 'bold'

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function getPaperBg(dotColor: string, type: PaperType, opacity: PaperOpacity) {
  const alphaMap: Record<PaperOpacity, number> = { subtle: 0.22, clear: 0.55, bold: 1 }
  const a = alphaMap[opacity]
  const c = dotColor.startsWith('#') ? hexToRgba(dotColor, a) : dotColor
  switch (type) {
    case 'blank':
      return { backgroundImage: 'none', backgroundSize: 'auto' }
    case 'lined':
      return { backgroundImage: `linear-gradient(${c} 1px, transparent 1px)`, backgroundSize: '100% 28px' }
    case 'dotted':
      return { backgroundImage: `radial-gradient(circle, ${c} 1px, transparent 1px)`, backgroundSize: '28px 28px' }
    case 'mini-squared':
      return {
        backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`,
        backgroundSize: '16px 16px',
      }
    case 'squared':
      return {
        backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
      }
  }
}

function makePageId(): string {
  return `page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function loadPages(): { pages: Page[]; activeId: string } {
  try {
    const raw = localStorage.getItem(PAGES_KEY)
    if (raw) {
      const pages = JSON.parse(raw) as (Page & { nodes?: MindNode[]; links?: NodeLink[] })[]
      if (Array.isArray(pages) && pages.length > 0) {
        // Strip ghost nodes — empty-titled non-root nodes that were never given a name
        pages.forEach(p => {
          if (Array.isArray(p.nodes))
            p.nodes = (p.nodes as MindNode[]).filter((n: MindNode) => n.id === 'root' || n.title.trim() !== '')
        })
        const activeId = localStorage.getItem(ACTIVE_PAGE_KEY) ?? pages[0].id
        return { pages, activeId: pages.find(p => p.id === activeId) ? activeId : pages[0].id }
      }
    }
  } catch (_) {}

  // Migrate from old single-page storage
  let nodes: MindNode[] = blankCanvas
  let links: NodeLink[] = []
  try {
    const rawNodes = localStorage.getItem('mindmap-nodes')
    if (rawNodes) nodes = JSON.parse(rawNodes) as MindNode[]
  } catch (_) {}
  try {
    const rawLinks = localStorage.getItem('mindmap-links')
    if (rawLinks) links = JSON.parse(rawLinks) as NodeLink[]
  } catch (_) {}

  const firstPage: Page & { nodes: MindNode[]; links: NodeLink[] } = {
    id: makePageId(), name: 'Page 1', nodes, links,
  }
  return { pages: [firstPage], activeId: firstPage.id }
}

function getPageData(pages: PageData[], id: string): { nodes: MindNode[]; links: NodeLink[] } {
  const p = pages.find(p => p.id === id)
  return { nodes: p?.nodes ?? blankCanvas, links: p?.links ?? [] }
}

type PageData = Page & { nodes: MindNode[]; links: NodeLink[] }

type EditingField = 'title' | 'description' | null

interface State {
  nodes: MindNode[]
  selectedIds: string[]
  editingId: string | null
  editingField: EditingField
  links: NodeLink[]
}

type Action =
  | { type: 'SET_NODES'; nodes: MindNode[] }
  | { type: 'SET_LINKS'; links: NodeLink[] }
  | { type: 'SELECT'; ids: string[] }
  | { type: 'START_EDIT'; id: string; field: EditingField }
  | { type: 'STOP_EDIT' }
  | { type: 'ADD_CHILD'; parentId: string; id: string }
  | { type: 'ADD_CHILD_AT'; parentId: string; id: string; x: number; y: number }
  | { type: 'ADD_SIBLING'; siblingId: string; id: string }
  | { type: 'DELETE'; id: string }
  | { type: 'UPDATE_TITLE'; id: string; value: string }
  | { type: 'UPDATE_DESC'; id: string; value: string }
  | { type: 'UPDATE_COLOR'; id: string; colorIndex: number | undefined }
  | { type: 'UPDATE_EMOJI'; id: string; emoji: string | undefined }
  | { type: 'UPDATE_IMAGE'; id: string; image: string | undefined }
  | { type: 'UPDATE_URL'; id: string; url: string | undefined }
  | { type: 'TOGGLE_COLLAPSE'; id: string }
  | { type: 'MOVE_NODES'; deltas: { id: string; dx: number; dy: number; dz: number }[] }
  | { type: 'ADD_LINK'; link: NodeLink }
  | { type: 'DELETE_LINK'; id: string }
  | { type: 'UPDATE_LINK_LABEL'; id: string; label: string | undefined }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_NODES': return { ...state, nodes: action.nodes }
    case 'SET_LINKS': return { ...state, links: action.links }
    case 'SELECT': return { ...state, selectedIds: action.ids, editingId: null, editingField: null }
    case 'START_EDIT': return { ...state, editingId: action.id, selectedIds: [action.id], editingField: action.field }
    case 'STOP_EDIT': return { ...state, editingId: null, editingField: null }
    case 'ADD_CHILD': {
      const nodes = addChild(state.nodes, action.parentId, action.id)
      return { ...state, nodes, selectedIds: [action.id], editingId: action.id, editingField: 'title' }
    }
    case 'ADD_CHILD_AT': {
      const nodes = addChildAt(state.nodes, action.parentId, action.id, action.x, action.y)
      return { ...state, nodes, selectedIds: [action.id], editingId: action.id, editingField: 'title' }
    }
    case 'ADD_SIBLING': {
      const nodes = addSibling(state.nodes, action.siblingId, action.id)
      return { ...state, nodes, selectedIds: [action.id], editingId: action.id, editingField: 'title' }
    }
    case 'DELETE': {
      const desc = collectDescendants(state.nodes, action.id)
      const nodes = state.nodes.filter(n => !desc.includes(n.id))
      const selectedIds = state.selectedIds.filter(id => !desc.includes(id))
      return { ...state, nodes, selectedIds, editingId: null, editingField: null }
    }
    case 'UPDATE_TITLE': {
      const nodes = state.nodes.map(n => n.id === action.id ? { ...n, title: action.value } : n)
      return { ...state, nodes, editingId: null, editingField: null }
    }
    case 'UPDATE_DESC': {
      const nodes = state.nodes.map(n =>
        n.id === action.id ? { ...n, description: action.value || undefined } : n
      )
      return { ...state, nodes, editingId: null, editingField: null }
    }
    case 'UPDATE_COLOR': {
      const nodes = state.nodes.map(n =>
        n.id === action.id ? { ...n, colorIndex: action.colorIndex, color: undefined } : n
      )
      return { ...state, nodes }
    }
    case 'UPDATE_EMOJI': {
      const nodes = state.nodes.map(n =>
        n.id === action.id ? { ...n, emoji: action.emoji } : n
      )
      return { ...state, nodes }
    }
    case 'UPDATE_IMAGE': {
      const nodes = state.nodes.map(n =>
        n.id === action.id ? { ...n, image: action.image } : n
      )
      return { ...state, nodes }
    }
    case 'UPDATE_URL': {
      const nodes = state.nodes.map(n =>
        n.id === action.id ? { ...n, url: action.url } : n
      )
      return { ...state, nodes }
    }
    case 'TOGGLE_COLLAPSE': {
      const nodes = state.nodes.map(n =>
        n.id === action.id ? { ...n, collapsed: !n.collapsed } : n
      )
      return { ...state, nodes }
    }
    case 'MOVE_NODES': {
      const map = new Map(action.deltas.map(d => [d.id, d]))
      const nodes = state.nodes.map(n => {
        const d = map.get(n.id)
        if (!d) return n
        return { ...n, x: n.x + d.dx, y: n.y + d.dy, z: n.z + d.dz }
      })
      return { ...state, nodes }
    }
    case 'ADD_LINK': {
      // Avoid duplicate links
      const exists = state.links.some(l => l.fromId === action.link.fromId && l.toId === action.link.toId)
      if (exists) return state
      return { ...state, links: [...state.links, action.link] }
    }
    case 'DELETE_LINK': {
      return { ...state, links: state.links.filter(l => l.id !== action.id) }
    }
    case 'UPDATE_LINK_LABEL': {
      return {
        ...state,
        links: state.links.map(l => l.id === action.id ? { ...l, label: action.label } : l),
      }
    }
    default: return state
  }
}

export const Scene3D: React.FC = () => {
  const [pagesState, setPagesState] = useState<{ pages: PageData[]; activeId: string }>(() => {
    const { pages, activeId } = loadPages()
    return { pages: pages as PageData[], activeId }
  })

  const { nodes: initialNodes, links: initialLinks } = getPageData(pagesState.pages, pagesState.activeId)

  const [state, dispatch] = useReducer(reducer, {
    nodes: initialNodes,
    selectedIds: [],
    editingId: null,
    editingField: null,
    links: initialLinks,
  })

  const pagesStateRef = useRef(pagesState)
  pagesStateRef.current = pagesState

  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA)
  const [panelOpen, setPanelOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('mindmap-panel-open') !== 'false' } catch { return true }
  })
  const bp = useBreakpoints()
  // On mobile the panel is an overlay drawer — the canvas never shifts
  const panelW = panelOpen && bp.md ? PANEL_WIDTH : 0
  const panelWRef = useRef(panelW)
  panelWRef.current = panelW
  const [viewport, setViewport] = useState({ width: window.innerWidth - panelW, height: window.innerHeight })
  const [nodeRects, setNodeRects] = useState<Map<string, { width: number; height: number }>>(new Map())
  const [newNodeIds, setNewNodeIds] = useState<Set<string>>(new Set())

  // Theme
  const [themeId, setThemeId] = useState<string>(() => {
    try { return localStorage.getItem(THEME_KEY) ?? 'vancouver' } catch { return 'vancouver' }
  })
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [paperType, setPaperType] = useState<PaperType>(() => {
    try { return (localStorage.getItem(PAPER_TYPE_KEY) as PaperType) ?? 'dotted' } catch { return 'dotted' }
  })
  const [paperOpacity, setPaperOpacity] = useState<PaperOpacity>(() => {
    try { return (localStorage.getItem(PAPER_OPACITY_KEY) as PaperOpacity) ?? 'subtle' } catch { return 'subtle' }
  })

  const activeTheme = getTheme(themeId)
  const isDark = activeTheme.mode === 'dark'

  // Search
  const [searchActive, setSearchActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Dissolve-delete: nodes currently playing exit animation
  const [dyingNodeIds, setDyingNodeIds] = useState<Set<string>>(new Set())
  // Drag-to-reparent: which node the dragged node is hovering over
  const [reparentTargetId, setReparentTargetId] = useState<string | null>(null)
  const reparentTargetRef = useRef<string | null>(null)
  const [reparentSourceId, setReparentSourceId] = useState<string | null>(null)
  // Undo toast after delete
  const [undoToast, setUndoToast] = useState(false)
  const undoToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Rubber-band selection box (screen coords)
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

  // Node linking mode
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null)
  const linkingFromIdRef = useRef<string | null>(null)

  // Presentation mode
  const [presentMode, setPresentMode] = useState(false)
  const [presentOrder, setPresentOrder] = useState<string[]>([])
  const [presentIndex, setPresentIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef(camera)
  cameraRef.current = camera
  const stateRef = useRef(state)
  stateRef.current = state
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport
  const presentModeRef = useRef(presentMode)
  presentModeRef.current = presentMode
  const presentOrderRef = useRef(presentOrder)
  presentOrderRef.current = presentOrder
  const presentIndexRef = useRef(presentIndex)
  presentIndexRef.current = presentIndex
  const searchActiveRef = useRef(searchActive)
  searchActiveRef.current = searchActive

  // Undo / redo stacks (node snapshots only), kept per page so switching
  // pages doesn't wipe history
  const historyRef = useRef<MindNode[][]>([])
  const futureRef  = useRef<MindNode[][]>([])
  const pageHistoriesRef = useRef<Map<string, { history: MindNode[][]; future: MindNode[][] }>>(new Map())

  const stashPageHistory = useCallback((pageId: string) => {
    pageHistoriesRef.current.set(pageId, {
      history: historyRef.current,
      future: futureRef.current,
    })
  }, [])

  const restorePageHistory = useCallback((pageId: string) => {
    const saved = pageHistoriesRef.current.get(pageId)
    historyRef.current = saved?.history ?? []
    futureRef.current = saved?.future ?? []
  }, [])

  const pushHistory = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-49), [...stateRef.current.nodes]]
    futureRef.current = []
  }, [])

  const undo = useCallback(() => {
    if (!historyRef.current.length) return
    futureRef.current = [[...stateRef.current.nodes], ...futureRef.current.slice(0, 49)]
    const prev = historyRef.current[historyRef.current.length - 1]
    historyRef.current = historyRef.current.slice(0, -1)
    dispatch({ type: 'SET_NODES', nodes: prev })
  }, [])

  const redo = useCallback(() => {
    if (!futureRef.current.length) return
    historyRef.current = [...historyRef.current.slice(-49), [...stateRef.current.nodes]]
    const next = futureRef.current[0]
    futureRef.current = futureRef.current.slice(1)
    dispatch({ type: 'SET_NODES', nodes: next })
  }, [])

  const undoRef = useRef(undo); undoRef.current = undo
  const redoRef = useRef(redo); redoRef.current = redo

  const trackNewNode = useCallback((id: string) => {
    playCreate()
    setNewNodeIds(prev => new Set([...prev, id]))
    setTimeout(() => setNewNodeIds(prev => { const s = new Set(prev); s.delete(id); return s }), 500)
  }, [])

  // Manual double-click detection (setPointerCapture prevents native dblclick on child elements)
  const lastNodeClickRef = useRef<{ id: string; time: number } | null>(null)

  const dragState = useRef<{
    type: 'pan' | 'node' | 'rubberband' | 'newchild'
    startX: number; startY: number
    startPanX?: number; startPanY?: number
    nodeId?: string
    nodeSnapshots?: { id: string; x: number; y: number; z: number }[]
    moved?: boolean
  } | null>(null)

  // Ghost dot shown while dragging a new child off a node's "+" handle
  const [newChildGhost, setNewChildGhost] = useState<{ x: number; y: number } | null>(null)

  const touchStateRef = useRef<{
    x1: number; y1: number
    x2?: number; y2?: number
    dist?: number
    panX: number; panY: number
  } | null>(null)

  const focusAnimRef = useRef<{ rafId: number; targetPanX: number; targetPanY: number; targetPanZ: number } | null>(null)
  // Set in handlePointerUp (guaranteed via pointer-capture) to suppress the trailing canvas click
  const suppressCanvasClickRef = useRef(false)

  // Smooth zoom
  const targetZoomRef  = useRef(DEFAULT_CAMERA.zoom)
  const zoomRafRef     = useRef<number | null>(null)
  const zoomCursorRef  = useRef({ x: 0, y: 0 })

  // Idle drift — slow parallax breathing after 10s of inactivity
  const lastActivityRef = useRef(performance.now())

  // Theme cross-fade — overlay the old canvas bg while colors swap
  const [themeFadeFrom, setThemeFadeFrom] = useState<string | null>(null)
  const prevThemeIdRef = useRef(themeId)
  useEffect(() => {
    if (prevThemeIdRef.current === themeId) return
    const prevTheme = getTheme(prevThemeIdRef.current)
    prevThemeIdRef.current = themeId
    setThemeFadeFrom(prevTheme.canvasBg)
    const t = setTimeout(() => setThemeFadeFrom(null), 450)
    return () => clearTimeout(t)
  }, [themeId])

  // Autosave indicator
  const [savedTick, setSavedTick] = useState(false)
  const savedTickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstSaveRef = useRef(true)

  // Auto-save current page nodes/links into the pages array, then persist
  useEffect(() => {
    setPagesState(prev => {
      const pages = prev.pages.map(p =>
        p.id === prev.activeId ? { ...p, nodes: state.nodes, links: state.links } : p
      )
      try { localStorage.setItem(PAGES_KEY, JSON.stringify(pages)) } catch (_) {}
      return { ...prev, pages }
    })
    // Show "Saved" tick (skip the initial mount save)
    if (firstSaveRef.current) { firstSaveRef.current = false; return }
    setSavedTick(true)
    if (savedTickTimerRef.current) clearTimeout(savedTickTimerRef.current)
    savedTickTimerRef.current = setTimeout(() => setSavedTick(false), 1500)
  }, [state.nodes, state.links])

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, themeId) } catch (_) {}
  }, [themeId])

  useEffect(() => {
    try { localStorage.setItem(PAPER_TYPE_KEY, paperType) } catch (_) {}
  }, [paperType])

  useEffect(() => {
    try { localStorage.setItem(PAPER_OPACITY_KEY, paperOpacity) } catch (_) {}
  }, [paperOpacity])

  // Persist active page id
  useEffect(() => {
    try { localStorage.setItem(ACTIVE_PAGE_KEY, pagesState.activeId) } catch (_) {}
  }, [pagesState.activeId])

  // Persist page list changes (add/delete/rename/duplicate) immediately —
  // the nodes/links autosave effect only fires on node edits
  useEffect(() => {
    try { localStorage.setItem(PAGES_KEY, JSON.stringify(pagesState.pages)) } catch (_) {}
  }, [pagesState.pages])

  // Resize observer (also re-runs when the pages panel is toggled)
  useEffect(() => {
    try { localStorage.setItem('mindmap-panel-open', String(panelOpen)) } catch (_) {}
    const update = () => setViewport({ width: window.innerWidth - panelWRef.current, height: window.innerHeight })
    update()
    const obs = new ResizeObserver(update)
    obs.observe(document.body)
    return () => obs.disconnect()
  }, [panelOpen])

  // Parallax tilt
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    lastActivityRef.current = performance.now()
    if (dragState.current) return
    const nx = (e.clientX / viewport.width - 0.5) * 2
    const ny = (e.clientY / viewport.height - 0.5) * 2
    setCamera(c => ({ ...c, rotY: nx * 0.18, rotX: -ny * 0.12 }))
  }, [viewport])

  // Idle drift — gentle breathing parallax when the user is idle 10s+
  useEffect(() => {
    let rafId: number
    const tick = () => {
      const idle = performance.now() - lastActivityRef.current
      if (idle > 10000 && !dragState.current && !focusAnimRef.current && !presentModeRef.current) {
        const t = performance.now() / 1000
        const driftY = Math.sin(t * 0.32) * 0.045
        const driftX = Math.cos(t * 0.21) * 0.030
        setCamera(c => ({ ...c, rotY: driftY, rotX: driftX }))
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Focus animation — time-based easeOutCubic for a cinematic camera feel
  const animateFocus = useCallback((targetPanX: number, targetPanY: number, targetPanZ: number) => {
    if (focusAnimRef.current) cancelAnimationFrame(focusAnimRef.current.rafId)
    const DURATION = 620
    const startTime = performance.now()
    const startPanX = cameraRef.current.panX
    const startPanY = cameraRef.current.panY
    const startPanZ = cameraRef.current.panZ
    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    const animate = (now: number) => {
      if (dragState.current?.type === 'node') { focusAnimRef.current = null; return }
      const t = Math.min(1, (now - startTime) / DURATION)
      const e = easeInOutCubic(t)
      setCamera(c => ({
        ...c,
        panX: startPanX + (targetPanX - startPanX) * e,
        panY: startPanY + (targetPanY - startPanY) * e,
        panZ: startPanZ + (targetPanZ - startPanZ) * e,
      }))
      if (t < 1 && focusAnimRef.current) {
        focusAnimRef.current.rafId = requestAnimationFrame(animate)
      } else {
        focusAnimRef.current = null
      }
    }
    focusAnimRef.current = { rafId: requestAnimationFrame(animate), targetPanX, targetPanY, targetPanZ }
  }, [])

  const animateFocusRef = useRef(animateFocus)
  animateFocusRef.current = animateFocus

  // Fit to screen
  const fitToScreen = useCallback(() => {
    const nodes = stateRef.current.nodes
    if (nodes.length === 0) return
    const vp = viewportRef.current
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const n of nodes) {
      const r = nodeRects.get(n.id) ?? { width: 160, height: 56 }
      minX = Math.min(minX, n.x - r.width / 2)
      maxX = Math.max(maxX, n.x + r.width / 2)
      minY = Math.min(minY, n.y - r.height / 2)
      maxY = Math.max(maxY, n.y + r.height / 2)
    }
    const pad = 120
    const worldW = maxX - minX + pad * 2
    const worldH = maxY - minY + pad * 2
    const newZoom = Math.max(0.2, Math.min(4, Math.min(vp.width / worldW, vp.height / worldH)))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    targetZoomRef.current = newZoom
    setCamera(c => ({ ...c, zoom: newZoom, panX: -cx * newZoom, panY: -cy * newZoom, panZ: 0, rotX: 0, rotY: 0 }))
  }, [nodeRects])

  const fitToScreenRef = useRef(fitToScreen)
  fitToScreenRef.current = fitToScreen

  // Fit to selection — zooms/pans to frame the selected node + its immediate group (dist 0-1)
  const fitToSelection = useCallback(() => {
    const { nodes, selectedIds } = stateRef.current
    const vp = viewportRef.current

    // Determine which nodes to frame: selected group (dist 0-1), or all if nothing selected
    let targets: typeof nodes
    if (selectedIds.length === 0) {
      targets = nodes
    } else {
      const dmap = computeDistanceMap(nodes, selectedIds)
      targets = nodes.filter(n => (dmap.get(n.id) ?? 99) <= 1)
      if (targets.length === 0) targets = nodes
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const n of targets) {
      const r = nodeRects.get(n.id) ?? { width: 160, height: 56 }
      minX = Math.min(minX, n.x - r.width / 2)
      maxX = Math.max(maxX, n.x + r.width / 2)
      minY = Math.min(minY, n.y - r.height / 2)
      maxY = Math.max(maxY, n.y + r.height / 2)
    }

    const pad = 100
    const worldW = maxX - minX + pad * 2
    const worldH = maxY - minY + pad * 2
    const newZoom = Math.max(0.3, Math.min(2.5, Math.min(vp.width / worldW, vp.height / worldH)))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    targetZoomRef.current = newZoom
    if (focusAnimRef.current) { cancelAnimationFrame(focusAnimRef.current.rafId); focusAnimRef.current = null }
    setCamera(c => ({ ...c, zoom: newZoom, panX: -cx * newZoom, panY: -cy * newZoom, rotX: 0, rotY: 0 }))
  }, [nodeRects])

  const fitToSelectionRef = useRef(fitToSelection)
  fitToSelectionRef.current = fitToSelection

  // Presentation mode
  const enterPresentation = useCallback(() => {
    const nodes = stateRef.current.nodes
    // BFS from root
    const order: string[] = []
    const queue = ['root']
    while (queue.length) {
      const id = queue.shift()!
      if (nodes.find(n => n.id === id)) {
        order.push(id)
        nodes.filter(n => n.parentId === id).forEach(n => queue.push(n.id))
      }
    }
    setPresentOrder(order)
    setPresentIndex(0)
    setPresentMode(true)
    const firstNode = nodes.find(n => n.id === order[0])
    if (firstNode) {
      dispatch({ type: 'SELECT', ids: [firstNode.id] })
      animateFocusRef.current(-firstNode.x * cameraRef.current.zoom, -firstNode.y * cameraRef.current.zoom, -firstNode.z + 80)
    }
  }, [])

  const exitPresentation = useCallback(() => {
    setPresentMode(false)
  }, [])

  const presentNav = useCallback((dir: 1 | -1) => {
    const order = presentOrderRef.current
    const idx = presentIndexRef.current
    const next = Math.max(0, Math.min(order.length - 1, idx + dir))
    if (next === idx) return
    setPresentIndex(next)
    const nodeId = order[next]
    const node = stateRef.current.nodes.find(n => n.id === nodeId)
    if (node) {
      dispatch({ type: 'SELECT', ids: [node.id] })
      animateFocusRef.current(-node.x * cameraRef.current.zoom, -node.y * cameraRef.current.zoom, -node.z + 80)
    }
  }, [])

  // PNG export
  const exportPng = useCallback(async () => {
    await document.fonts.ready
    const vp = viewportRef.current
    const dpr = 2
    const canvas = document.createElement('canvas')
    canvas.width = vp.width * dpr
    canvas.height = vp.height * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    const cam = cameraRef.current
    const dark = false // always export light

    // Background
    ctx.fillStyle = '#f7f8fa'
    ctx.fillRect(0, 0, vp.width, vp.height)

    // Dot grid
    ctx.fillStyle = '#dde1e9'
    const gridSize = 28
    for (let gx = gridSize; gx < vp.width; gx += gridSize) {
      for (let gy = gridSize; gy < vp.height; gy += gridSize) {
        ctx.beginPath()
        ctx.arc(gx, gy, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const nodes = stateRef.current.nodes
    const rects = new Map(nodeRects)

    // Draw edges
    ctx.save()
    for (const node of nodes) {
      if (!node.parentId) continue
      const parent = nodes.find(n => n.id === node.parentId)
      if (!parent) continue
      const pp = project(parent, cam, vp)
      const cp = project(node, cam, vp)
      if (!pp.visible || !cp.visible) continue
      const dist = Math.hypot(cp.x - pp.x, cp.y - pp.y)
      const hl = dist * 0.42
      ctx.beginPath()
      ctx.moveTo(pp.x, pp.y)
      ctx.bezierCurveTo(pp.x + hl, pp.y, cp.x - hl, cp.y, cp.x, cp.y)
      ctx.strokeStyle = 'rgba(184,192,204,0.65)'
      ctx.lineWidth = 1.75
      ctx.lineCap = 'round'
      ctx.stroke()
    }
    ctx.restore()

    // Draw nodes
    for (const node of nodes) {
      const p = project(node, cam, vp)
      if (!p.visible) continue
      const r = rects.get(node.id) ?? { width: 160, height: 56 }
      const w = r.width * p.scale
      const h = r.height * p.scale
      const x = p.x - w / 2
      const y = p.y - h / 2
      const radius = 12 * p.scale
      const isRoot = node.id === 'root'
      const borderColor = node.color ?? (isRoot ? WARNING : SUCCESS)

      // Card background
      ctx.save()
      ctx.beginPath()
      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, radius)
      } else {
        ctx.moveTo(x + radius, y)
        ctx.lineTo(x + w - radius, y)
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
        ctx.lineTo(x + w, y + h - radius)
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
        ctx.lineTo(x + radius, y + h)
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
        ctx.lineTo(x, y + radius)
        ctx.quadraticCurveTo(x, y, x + radius, y)
      }
      ctx.fillStyle = dark ? '#161b22' : '#ffffff'
      ctx.fill()
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 1.5 * p.scale
      ctx.stroke()
      ctx.restore()

      const pad = 12 * p.scale
      const titleFontSize = Math.max(7, 12 * p.scale)
      const descFontSize = Math.max(6, 10 * p.scale)

      // Emoji
      let textStartX = x + pad
      if (node.emoji) {
        ctx.font = `${titleFontSize + 2}px sans-serif`
        ctx.fillText(node.emoji, textStartX, y + pad + titleFontSize * 0.85)
        textStartX += titleFontSize + 4
      }

      // Title
      ctx.fillStyle = dark ? '#e6edf3' : '#1e293b'
      ctx.font = `600 ${titleFontSize}px 'Plus Jakarta Sans', sans-serif`
      ctx.fillText(node.title, textStartX, y + pad + titleFontSize * 0.85, w - pad * 2)

      // Description
      if (node.description) {
        ctx.fillStyle = dark ? '#8b949e' : '#64748b'
        ctx.font = `400 ${descFontSize}px 'Plus Jakarta Sans', sans-serif`
        // Word wrap
        const words = node.description.split(' ')
        let line = ''
        let lineY = y + pad + titleFontSize + 4 + descFontSize
        const maxW = w - pad * 2
        for (const word of words) {
          const test = line ? line + ' ' + word : word
          if (ctx.measureText(test).width > maxW && line) {
            ctx.fillText(line, x + pad, lineY, maxW)
            line = word
            lineY += descFontSize * 1.4
            if (lineY > y + h - 4) break
          } else {
            line = test
          }
        }
        if (line && lineY <= y + h - 4) ctx.fillText(line, x + pad, lineY, maxW)
      }
    }

    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'mindmap.png'; a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [nodeRects])

  const exportPngRef = useRef(exportPng)
  exportPngRef.current = exportPng

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    lastActivityRef.current = performance.now()
    if (e.target !== e.currentTarget) return
    if (e.button !== 0) return
    if (focusAnimRef.current) { cancelAnimationFrame(focusAnimRef.current.rafId); focusAnimRef.current = null }
    if (e.shiftKey) {
      // Shift+drag → rubber-band selection
      dragState.current = { type: 'rubberband', startX: e.clientX, startY: e.clientY, moved: false }
      setSelectionBox({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY })
    } else {
      dragState.current = {
        type: 'pan', startX: e.clientX, startY: e.clientY,
        startPanX: cameraRef.current.panX, startPanY: cameraRef.current.panY,
        moved: false,
      }
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  // Double-click canvas → no-op (node creation only happens via Tab/Enter or node button)
  const handleCanvasDblClick = useCallback((_e: React.MouseEvent) => {
    // Intentionally left empty — double-clicking empty canvas no longer creates nodes.
  }, [])

  const handleNodePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    lastActivityRef.current = performance.now()
    if (e.button !== 0) return
    e.stopPropagation()

    // Linking mode: clicking a node creates a link
    if (linkingFromIdRef.current) {
      const fromId = linkingFromIdRef.current
      if (fromId !== id) {
        const nodes = stateRef.current.nodes
        const links = stateRef.current.links

        // Check parent-child connection already exists
        const fromNode = nodes.find(n => n.id === fromId)
        const toNode   = nodes.find(n => n.id === id)
        const alreadyParentChild =
          fromNode?.parentId === id ||
          toNode?.parentId === fromId

        // Check cross-link already exists (either direction)
        const alreadyLinked = links.some(
          l => (l.fromId === fromId && l.toId === id) ||
               (l.fromId === id    && l.toId === fromId)
        )

        if (!alreadyParentChild && !alreadyLinked) {
          dispatch({ type: 'ADD_LINK', link: { id: nextId(), fromId, toId: id } })
        }
      }
      setLinkingFromId(null)
      linkingFromIdRef.current = null
      return
    }

    // Detect double-click manually (setPointerCapture prevents native dblclick from reaching child divs)
    const now = Date.now()
    const last = lastNodeClickRef.current
    if (last && last.id === id && now - last.time < 350) {
      lastNodeClickRef.current = null
      // Double-click on selected node → edit title; on unselected → add child
      if (stateRef.current.selectedIds.includes(id)) {
        dispatch({ type: 'START_EDIT', id, field: 'title' })
      } else {
        handleAddChildRef.current(id)
      }
      return
    }
    lastNodeClickRef.current = { id, time: now }

    if (focusAnimRef.current) { cancelAnimationFrame(focusAnimRef.current.rafId); focusAnimRef.current = null }
    const multi = e.shiftKey || e.metaKey || e.ctrlKey
    const cur = stateRef.current
    const newSel = multi
      ? cur.selectedIds.includes(id) ? cur.selectedIds.filter(s => s !== id) : [...cur.selectedIds, id]
      : [id]
    dispatch({ type: 'SELECT', ids: newSel })
    if (!multi) {
      const node = cur.nodes.find(n => n.id === id)
      if (node) animateFocus(-node.x * cameraRef.current.zoom, -node.y * cameraRef.current.zoom, -node.z + 80)
    }
    // Drag all selected nodes (and their descendants) together
    const dragIds = newSel.length > 0 ? newSel : [id]
    const nodesToDrag = new Set<string>()
    dragIds.forEach(selId => collectDescendants(cur.nodes, selId).forEach(d => nodesToDrag.add(d)))
    const snapshots = cur.nodes.filter(n => nodesToDrag.has(n.id)).map(n => ({ id: n.id, x: n.x, y: n.y, z: n.z }))
    dragState.current = { type: 'node', startX: e.clientX, startY: e.clientY, nodeId: id, nodeSnapshots: snapshots, moved: false }
    try { containerRef.current!.setPointerCapture(e.pointerId) } catch (_) {}
  }, [animateFocus])

  // Drag a new child off a node's "+" handle
  const handleChildDragStart = useCallback((e: React.PointerEvent, parentId: string) => {
    if (e.button !== 0) return
    dragState.current = { type: 'newchild', startX: e.clientX, startY: e.clientY, nodeId: parentId, moved: false }
    try { containerRef.current!.setPointerCapture(e.pointerId) } catch (_) {}
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const ds = dragState.current
    if (!ds) return
    const moved = Math.hypot(e.clientX - ds.startX, e.clientY - ds.startY) > 3
    if (moved) ds.moved = true
    if (ds.type === 'newchild') {
      setNewChildGhost({ x: e.clientX - panelWRef.current, y: e.clientY })
      return
    }
    if (ds.type === 'pan') {
      setCamera(c => ({ ...c, panX: ds.startPanX! + (e.clientX - ds.startX), panY: ds.startPanY! + (e.clientY - ds.startY) }))
    } else if (ds.type === 'rubberband') {
      setSelectionBox({ x1: ds.startX, y1: ds.startY, x2: e.clientX, y2: e.clientY })
    } else if (ds.type === 'node' && ds.nodeSnapshots) {
      const fov = cameraRef.current.perspective
      const d = fov + cameraRef.current.panZ
      const worldScale = d / fov / cameraRef.current.zoom
      const dx = (e.clientX - ds.startX) * worldScale
      const dy = (e.clientY - ds.startY) * worldScale
      dispatch({
        type: 'SET_NODES',
        nodes: stateRef.current.nodes.map(n => {
          const snap = ds.nodeSnapshots!.find(s => s.id === n.id)
          return snap ? { ...n, x: snap.x + dx, y: snap.y + dy } : n
        }),
      })
      // Drag-to-reparent: find closest non-dragged node within 72px
      if (ds.moved) {
        const draggingIds = new Set(ds.nodeSnapshots.map(s => s.id))
        let closestId: string | null = null
        let closestDist = 72
        const cam = cameraRef.current
        const vp = viewportRef.current
        for (const n of stateRef.current.nodes) {
          if (draggingIds.has(n.id)) continue
          const p = project(n, cam, vp)
          if (!p.visible) continue
          const dist = Math.hypot((e.clientX - panelWRef.current) - p.x, e.clientY - p.y)
          if (dist < closestDist) { closestDist = dist; closestId = n.id }
        }
        if (closestId !== reparentTargetRef.current) {
          reparentTargetRef.current = closestId
          setReparentTargetId(closestId)
          setReparentSourceId(closestId !== null ? (ds.nodeId ?? null) : null)
        }
      }
    }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const ds = dragState.current
    // Any node interaction (click or drag) produces a trailing click on the container
    // via pointer-capture — suppress it so we don't clear the selection we just set.
    if (ds?.type === 'node') suppressCanvasClickRef.current = true

    if (ds?.type === 'newchild') {
      suppressCanvasClickRef.current = true
      setNewChildGhost(null)
      dragState.current = null
      const parentId = ds.nodeId
      if (!parentId) return
      const id = nextId()
      pushHistory()
      trackNewNodeRef.current(id)
      if (ds.moved) {
        // Convert drop point (screen) → world coords, inverting the projection
        // (parallax tilt is negligible during a drag, so rotation is ignored)
        const cam = cameraRef.current
        const vp = viewportRef.current
        const scale = cam.perspective / (cam.perspective + cam.panZ)
        const sx = e.clientX - panelWRef.current - vp.width / 2
        const sy = e.clientY - vp.height / 2
        const wx = (sx / scale - cam.panX) / cam.zoom
        const wy = (sy / scale - cam.panY) / cam.zoom
        dispatch({ type: 'ADD_CHILD_AT', parentId, id, x: wx, y: wy })
      } else {
        // Plain click on the "+" — default orbit placement
        dispatch({ type: 'ADD_CHILD', parentId, id })
      }
      return
    }

    if (ds?.type === 'rubberband') {
      // Finalise rubber-band: select all nodes inside the box
      setSelectionBox(null)
      if (ds.moved) {
        const box = {
          x1: Math.min(ds.startX, e.clientX), x2: Math.max(ds.startX, e.clientX),
          y1: Math.min(ds.startY, e.clientY), y2: Math.max(ds.startY, e.clientY),
        }
        const visIds = getVisibleNodeIds(stateRef.current.nodes)
        const selected: string[] = []
        const cam = cameraRef.current
        const vp  = viewportRef.current
        for (const node of stateRef.current.nodes) {
          if (!visIds.has(node.id)) continue
          const p = project(node, cam, vp)
          if (!p.visible) continue
          if (p.x >= box.x1 && p.x <= box.x2 && p.y >= box.y1 && p.y <= box.y2) {
            selected.push(node.id)
          }
        }
        if (selected.length > 0) dispatch({ type: 'SELECT', ids: selected })
      }
    } else if (ds?.type === 'node') {
      const target = reparentTargetRef.current
      reparentTargetRef.current = null
      setReparentTargetId(null)
      setReparentSourceId(null)

      if (ds.moved && target && ds.nodeId) {
        // Drag-to-reparent: reparent every selected dragged root (or just the
        // grabbed node when it wasn't part of a multi-selection), skipping any
        // whose subtree contains the target (cycle prevention).
        const sel = stateRef.current.selectedIds
        const draggedIds = new Set(ds.nodeSnapshots?.map(s => s.id) ?? [ds.nodeId])
        const rootsToReparent = (sel.includes(ds.nodeId) ? sel : [ds.nodeId])
          .filter(id => id !== 'root' && id !== target && draggedIds.has(id))
          .filter(id => !collectDescendants(stateRef.current.nodes, id).includes(target))
        if (rootsToReparent.length > 0) {
          // Push history for the position before the drag
          if (ds.nodeSnapshots) {
            const preDrag = stateRef.current.nodes.map(n => {
              const snap = ds.nodeSnapshots!.find(s => s.id === n.id)
              return snap ? { ...n, x: snap.x, y: snap.y } : n
            })
            historyRef.current = [...historyRef.current.slice(-49), preDrag]
            futureRef.current = []
          }
          const reparentSet = new Set(rootsToReparent)
          dispatch({
            type: 'SET_NODES',
            nodes: stateRef.current.nodes.map(n =>
              reparentSet.has(n.id) ? { ...n, parentId: target } : n
            ),
          })
        } else if (ds.moved && ds.nodeSnapshots) {
          // No reparent but did move — save to history
          const preDrag = stateRef.current.nodes.map(n => {
            const snap = ds.nodeSnapshots!.find(s => s.id === n.id)
            return snap ? { ...n, x: snap.x, y: snap.y } : n
          })
          historyRef.current = [...historyRef.current.slice(-49), preDrag]
          futureRef.current = []
        }
      } else if (ds.moved && ds.nodeSnapshots) {
        // Normal move — push history
        const preDrag = stateRef.current.nodes.map(n => {
          const snap = ds.nodeSnapshots!.find(s => s.id === n.id)
          return snap ? { ...n, x: snap.x, y: snap.y } : n
        })
        historyRef.current = [...historyRef.current.slice(-49), preDrag]
        futureRef.current = []
      }
    }
    dragState.current = null
  }, [pushHistory])

  // Smooth wheel zoom with zoom-to-cursor
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.metaKey && !e.ctrlKey) return
    lastActivityRef.current = performance.now()
    e.preventDefault()

    let dy = e.deltaY
    if (e.deltaMode === 1) dy *= 16
    if (e.deltaMode === 2) dy *= 400

    const factor = Math.exp(-dy * 0.0018)
    targetZoomRef.current = Math.max(0.2, Math.min(4, targetZoomRef.current * factor))

    zoomCursorRef.current = {
      x: e.clientX - viewportRef.current.width  / 2,
      y: e.clientY - viewportRef.current.height / 2,
    }

    if (focusAnimRef.current) { cancelAnimationFrame(focusAnimRef.current.rafId); focusAnimRef.current = null }

    if (zoomRafRef.current !== null) return

    const tick = () => {
      setCamera(c => {
        const diff = targetZoomRef.current - c.zoom
        if (Math.abs(diff) < 0.0006) {
          zoomRafRef.current = null
          return { ...c, zoom: targetZoomRef.current }
        }
        const newZoom = c.zoom + diff * 0.16
        const ratio   = newZoom / c.zoom
        const cx = zoomCursorRef.current.x
        const cy = zoomCursorRef.current.y
        zoomRafRef.current = requestAnimationFrame(tick)
        return {
          ...c,
          zoom: newZoom,
          panX: cx - (cx - c.panX) * ratio,
          panY: cy - (cy - c.panY) * ratio,
        }
      })
    }
    zoomRafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    const el = containerRef.current!
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Paste-to-import
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const active = document.activeElement
      const inInput = active instanceof HTMLInputElement
        || active instanceof HTMLTextAreaElement
        || (active instanceof HTMLElement && active.isContentEditable)
      if (inInput) return

      // Image paste → attach to the selected node (downscaled to keep storage small)
      const imageItem = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))
      const selId = stateRef.current.selectedIds[0]
      if (imageItem && selId) {
        const file = imageItem.getAsFile()
        if (file) {
          const img = new window.Image()
          img.onload = () => {
            const MAX = 320
            const ratio = Math.min(1, MAX / Math.max(img.width, img.height))
            const canvas = document.createElement('canvas')
            canvas.width = Math.round(img.width * ratio)
            canvas.height = Math.round(img.height * ratio)
            canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
            URL.revokeObjectURL(img.src)
            pushHistory()
            dispatch({ type: 'UPDATE_IMAGE', id: selId, image: canvas.toDataURL('image/jpeg', 0.8) })
          }
          img.src = URL.createObjectURL(file)
          return
        }
      }

      const text = e.clipboardData?.getData('text') ?? ''
      if (!text) return

      // Try JSON first
      try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed) && parsed.every(n => n.id && n.title !== undefined)) {
          pushHistory()
          dispatch({ type: 'SET_NODES', nodes: parsed })
          dispatch({ type: 'SELECT', ids: [] })
          setTimeout(() => fitToScreenRef.current(), 100)
          return
        }
      } catch (_) {}

      // Try outline text
      if (text.includes('\n')) {
        const nodes = parseOutlineToNodes(text)
        if (nodes) {
          pushHistory()
          dispatch({ type: 'SET_NODES', nodes })
          dispatch({ type: 'SELECT', ids: [] })
          setTimeout(() => fitToScreenRef.current(), 100)
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [pushHistory])

  // Touch / pinch-zoom
  useEffect(() => {
    const el = containerRef.current!

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0]
        touchStateRef.current = {
          x1: t.clientX, y1: t.clientY,
          panX: cameraRef.current.panX, panY: cameraRef.current.panY,
        }
      } else if (e.touches.length === 2) {
        const t0 = e.touches[0], t1 = e.touches[1]
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        touchStateRef.current = {
          x1: t0.clientX, y1: t0.clientY,
          x2: t1.clientX, y2: t1.clientY,
          dist,
          panX: cameraRef.current.panX, panY: cameraRef.current.panY,
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const ts = touchStateRef.current
      if (!ts) return

      if (e.touches.length === 1 && !ts.x2) {
        const t = e.touches[0]
        const dx = t.clientX - ts.x1
        const dy = t.clientY - ts.y1
        setCamera(c => ({ ...c, panX: ts.panX + dx, panY: ts.panY + dy }))
      } else if (e.touches.length === 2 && ts.x2 !== undefined && ts.y2 !== undefined && ts.dist) {
        const t0 = e.touches[0], t1 = e.touches[1]
        const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        const scale = newDist / ts.dist
        const midX = (t0.clientX + t1.clientX) / 2 - viewportRef.current.width / 2
        const midY = (t0.clientY + t1.clientY) / 2 - viewportRef.current.height / 2
        // Pan from 2-finger drag
        const initMidX = (ts.x1 + ts.x2) / 2 - viewportRef.current.width / 2
        const initMidY = (ts.y1 + ts.y2) / 2 - viewportRef.current.height / 2
        const panDX = midX - initMidX
        const panDY = midY - initMidY
        setCamera(c => {
          const newZoom = Math.max(0.2, Math.min(4, c.zoom * scale))
          const ratio = newZoom / c.zoom
          return {
            ...c,
            zoom: newZoom,
            panX: midX - (midX - (ts.panX + panDX)) * ratio,
            panY: midY - (midY - (ts.panY + panDY)) * ratio,
          }
        })
        touchStateRef.current = { ...ts, dist: newDist, x1: t0.clientX, y1: t0.clientY, x2: t1.clientX, y2: t1.clientY }
      }
    }

    const onTouchEnd = () => {
      touchStateRef.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // Keyboard shortcuts (stable effect, reads refs)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      lastActivityRef.current = performance.now()
      const s = stateRef.current

      // Never steal keystrokes from native text inputs (search bar, browser fields, etc.)
      const active = document.activeElement
      const inInput = active instanceof HTMLInputElement
        || active instanceof HTMLTextAreaElement
        || (active instanceof HTMLElement && active.isContentEditable)

      // ⌘F search toggle (always allowed)
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setSearchActive(v => !v)
        return
      }

      // Undo / redo (before editingId guard)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (!s.editingId) { e.preventDefault(); undoRef.current() }
        return
      }
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'Z')) {
        if (!s.editingId) { e.preventDefault(); redoRef.current() }
        return
      }

      // Don't steal keys from any focused text field (search bar, etc.)
      if (inInput) return

      if (s.editingId) return

      // Presentation mode navigation
      if (presentModeRef.current) {
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); presentNavRef.current(1); return }
        if (e.key === 'ArrowLeft') { e.preventDefault(); presentNavRef.current(-1); return }
        if (e.key === 'Escape') { exitPresentationRef.current(); return }
        return
      }

      const sel = s.selectedIds[0]

      // Arrow key navigation
      if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        if (!sel) return
        const children = s.nodes.filter(n => n.parentId === sel)
        if (children.length === 0) return
        const child = children[0]
        dispatch({ type: 'SELECT', ids: [child.id] })
        animateFocusRef.current(-child.x * cameraRef.current.zoom, -child.y * cameraRef.current.zoom, -child.z + 80)
        setTimeout(() => fitToSelectionRef.current(), 50)
        return
      }
      if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        if (!sel) return
        const node = s.nodes.find(n => n.id === sel)
        if (!node?.parentId) return
        const parent = s.nodes.find(n => n.id === node.parentId)
        if (!parent) return
        dispatch({ type: 'SELECT', ids: [parent.id] })
        animateFocusRef.current(-parent.x * cameraRef.current.zoom, -parent.y * cameraRef.current.zoom, -parent.z + 80)
        setTimeout(() => fitToSelectionRef.current(), 50)
        return
      }
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        if (!sel) return
        const node = s.nodes.find(n => n.id === sel)
        if (!node) return
        const siblings = s.nodes.filter(n => n.parentId === node.parentId)
        const idx = siblings.findIndex(n => n.id === sel)
        const nextIdx = e.key === 'ArrowUp' ? idx - 1 : idx + 1
        if (nextIdx < 0 || nextIdx >= siblings.length) return
        const sibling = siblings[nextIdx]
        dispatch({ type: 'SELECT', ids: [sibling.id] })
        animateFocusRef.current(-sibling.x * cameraRef.current.zoom, -sibling.y * cameraRef.current.zoom, -sibling.z + 80)
        setTimeout(() => fitToSelectionRef.current(), 50)
        return
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        if (!sel) return
        const id = nextId()
        pushHistory(); trackNewNodeRef.current(id)
        dispatch({ type: 'ADD_CHILD', parentId: sel, id })
        const tabParent = s.nodes.find(n => n.id === sel)
        if (tabParent?.colorIndex !== undefined) dispatch({ type: 'UPDATE_COLOR', id, colorIndex: tabParent.colorIndex })
        setTimeout(() => {
          const node = stateRef.current.nodes.find(n => n.id === id)
          if (node) animateFocusRef.current(-node.x * cameraRef.current.zoom, -node.y * cameraRef.current.zoom, -node.z + 80)
        }, 16)
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        if (!sel) return
        dispatch({ type: 'START_EDIT', id: sel, field: 'description' })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (!sel) return
        const id = nextId()
        pushHistory(); trackNewNodeRef.current(id)
        dispatch({ type: 'ADD_SIBLING', siblingId: sel, id })
        const enterSibling = s.nodes.find(n => n.id === sel)
        if (enterSibling?.colorIndex !== undefined) dispatch({ type: 'UPDATE_COLOR', id, colorIndex: enterSibling.colorIndex })
        setTimeout(() => {
          const node = stateRef.current.nodes.find(n => n.id === id)
          if (node) animateFocusRef.current(-node.x * cameraRef.current.zoom, -node.y * cameraRef.current.zoom, -node.z + 80)
        }, 16)
      } else if (e.key === ' ') {
        e.preventDefault()
        if (!sel) return
        dispatch({ type: 'START_EDIT', id: sel, field: 'title' })
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        if (!s.selectedIds.length) return
        // Delete all selected nodes (skip root)
        const toDelete = s.selectedIds.filter(id => id !== 'root')
        if (!toDelete.length) return
        pushHistory()
        toDelete.forEach(id => animateDeleteRef.current(id))
        showUndoToastRef.current?.()
      } else if (e.key === 'l' || e.key === 'L') {
        if (!sel) return
        e.preventDefault()
        const nextLinking = linkingFromIdRef.current === sel ? null : sel
        setLinkingFromId(nextLinking)
        linkingFromIdRef.current = nextLinking
      } else if (e.key === 'Escape') {
        if (linkingFromIdRef.current) {
          setLinkingFromId(null)
          linkingFromIdRef.current = null
          return
        }
        if (searchActiveRef.current) { setSearchActive(false); setSearchQuery(''); return }
        dispatch({ type: 'SELECT', ids: [] })
      } else if (e.key === 'r' || e.key === 'R') {
        targetZoomRef.current = DEFAULT_CAMERA.zoom
        setCamera(DEFAULT_CAMERA)
      } else if (e.key === 'f' || e.key === 'F') {
        fitToScreenRef.current()
      } else if (e.key === 's' || e.key === 'S') {
        fitToSelectionRef.current()
      } else if (e.key === 'o' || e.key === 'O') {
        handleSpaceOutRef.current()
      } else if (e.key === 'p' || e.key === 'P') {
        enterPresentationRef.current()
      } else if (e.key === 'e' || e.key === 'E') {
        // Emoji picking now handled via node toolbar
      } else if (
        e.key.length === 1 &&
        !e.metaKey && !e.ctrlKey && !e.altKey &&
        sel && !stateRef.current.editingId &&
        !searchActiveRef.current
      ) {
        // Quick-type: any printable character starts title editing on selected node
        e.preventDefault()
        dispatch({ type: 'START_EDIT', id: sel, field: 'title' })
        // Let the character through after edit mode is active (on next tick)
        setTimeout(() => {
          const el = document.querySelector<HTMLElement>('[data-editing="title"]')
          if (el) {
            el.textContent = e.key
            // Move cursor to end
            const range = document.createRange()
            const s = window.getSelection()
            range.selectNodeContents(el)
            range.collapse(false)
            s?.removeAllRanges(); s?.addRange(range)
          }
        }, 16)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pushHistory])

  // Stable refs for functions used inside stable keyboard handler
  const trackNewNodeRef = useRef(trackNewNode)
  trackNewNodeRef.current = trackNewNode
  const enterPresentationRef = useRef(enterPresentation)
  enterPresentationRef.current = enterPresentation
  const exitPresentationRef = useRef(exitPresentation)
  exitPresentationRef.current = exitPresentation
  const presentNavRef = useRef(presentNav)
  presentNavRef.current = presentNav


  // ── Pages handlers ────────────────────────────────────────────────────────────

  const handlePageSelect = useCallback((id: string) => {
    if (id === pagesStateRef.current.activeId) return
    // Save current page state into pages array first (sync)
    const currentId = pagesStateRef.current.activeId
    const updatedPages = pagesStateRef.current.pages.map(p =>
      p.id === currentId ? { ...p, nodes: stateRef.current.nodes, links: stateRef.current.links } : p
    )
    const target = updatedPages.find(p => p.id === id)
    if (!target) return

    setPagesState({ pages: updatedPages, activeId: id })
    dispatch({ type: 'SET_NODES', nodes: target.nodes ?? blankCanvas })
    dispatch({ type: 'SET_LINKS', links: target.links ?? [] })
    dispatch({ type: 'SELECT', ids: [] })
    stashPageHistory(currentId)
    restorePageHistory(id)
    targetZoomRef.current = DEFAULT_CAMERA.zoom
    setCamera(DEFAULT_CAMERA)
    setDyingNodeIds(new Set())
    setReparentTargetId(null)
    reparentTargetRef.current = null
  }, [stashPageHistory, restorePageHistory])

  const handlePageAdd = useCallback(() => {
    const newPage: PageData = {
      id: makePageId(),
      name: `Page ${pagesStateRef.current.pages.length + 1}`,
      nodes: [{ id: 'root', parentId: null, title: 'Main Topic', x: 0, y: 0, z: 0 }],
      links: [],
    }
    // Save current page first
    const currentId = pagesStateRef.current.activeId
    const updatedPages = [
      ...pagesStateRef.current.pages.map(p =>
        p.id === currentId ? { ...p, nodes: stateRef.current.nodes, links: stateRef.current.links } : p
      ),
      newPage,
    ]
    setPagesState({ pages: updatedPages, activeId: newPage.id })
    dispatch({ type: 'SET_NODES', nodes: newPage.nodes })
    dispatch({ type: 'SET_LINKS', links: [] })
    dispatch({ type: 'SELECT', ids: [] })
    stashPageHistory(currentId)
    historyRef.current = []
    futureRef.current = []
    targetZoomRef.current = DEFAULT_CAMERA.zoom
    setCamera(DEFAULT_CAMERA)
    setDyingNodeIds(new Set())
  }, [stashPageHistory])

  const handlePageRename = useCallback((id: string, name: string) => {
    setPagesState(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === id ? { ...p, name } : p),
    }))
  }, [])

  const handlePageDelete = useCallback((id: string) => {
    const { pages, activeId } = pagesStateRef.current
    if (pages.length <= 1) return
    const idx = pages.findIndex(p => p.id === id)
    const remaining = pages.filter(p => p.id !== id)
    let nextActiveId = activeId
    if (activeId === id) {
      // Switch to adjacent page
      nextActiveId = remaining[Math.max(0, idx - 1)].id
      const target = remaining.find(p => p.id === nextActiveId)!
      dispatch({ type: 'SET_NODES', nodes: target.nodes ?? blankCanvas })
      dispatch({ type: 'SELECT', ids: [] })
      restorePageHistory(nextActiveId)
      targetZoomRef.current = DEFAULT_CAMERA.zoom
      setCamera(DEFAULT_CAMERA)
    }
    pageHistoriesRef.current.delete(id)
    setPagesState({ pages: remaining, activeId: nextActiveId })
  }, [restorePageHistory])

  const handlePageDuplicate = useCallback((id: string) => {
    const { pages, activeId } = pagesStateRef.current
    // Save current page first
    const updatedPages = pages.map(p =>
      p.id === activeId ? { ...p, nodes: stateRef.current.nodes, links: stateRef.current.links } : p
    )
    const source = updatedPages.find(p => p.id === id)
    if (!source) return
    const newPage: PageData = {
      ...source,
      id: makePageId(),
      name: `${source.name} copy`,
      nodes: source.nodes.map((n: MindNode) => ({ ...n })),
      links: source.links.map((l: NodeLink) => ({ ...l })),
    }
    const insertIdx = updatedPages.findIndex(p => p.id === id) + 1
    const withNew = [...updatedPages.slice(0, insertIdx), newPage, ...updatedPages.slice(insertIdx)]
    setPagesState({ pages: withNew, activeId: newPage.id })
    dispatch({ type: 'SET_NODES', nodes: newPage.nodes })
    dispatch({ type: 'SET_LINKS', links: newPage.links })
    dispatch({ type: 'SELECT', ids: [] })
    stashPageHistory(activeId)
    historyRef.current = []
    futureRef.current = []
    targetZoomRef.current = DEFAULT_CAMERA.zoom
    setCamera(DEFAULT_CAMERA)
  }, [stashPageHistory])

  const handlePageReorder = useCallback((newIds: string[]) => {
    setPagesState(prev => ({
      ...prev,
      pages: newIds.map(id => prev.pages.find(p => p.id === id)!).filter(Boolean),
    }))
  }, [])

  const handleExportBackup = useCallback(() => {
    // Snapshot current page first so the backup includes unsaved edits
    const { pages, activeId } = pagesStateRef.current
    const fullPages = pages.map(p =>
      p.id === activeId ? { ...p, nodes: stateRef.current.nodes, links: stateRef.current.links } : p
    )
    const backup = { app: 'mindcanvas', version: 1, pages: fullPages, activeId }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'mindcanvas-backup.json'; a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleImportBackup = useCallback((pages: PageData[], activeId: string) => {
    const valid = pages.filter(p => p.id && Array.isArray(p.nodes))
    if (valid.length === 0) return
    const nextActive = valid.find(p => p.id === activeId)?.id ?? valid[0].id
    const target = valid.find(p => p.id === nextActive)!
    pageHistoriesRef.current.clear()
    historyRef.current = []
    futureRef.current = []
    setPagesState({ pages: valid, activeId: nextActive })
    dispatch({ type: 'SET_NODES', nodes: target.nodes ?? blankCanvas })
    dispatch({ type: 'SET_LINKS', links: target.links ?? [] })
    dispatch({ type: 'SELECT', ids: [] })
    targetZoomRef.current = DEFAULT_CAMERA.zoom
    setCamera(DEFAULT_CAMERA)
  }, [])

  const handleExportMarkdown = useCallback(() => {
    const md = exportMarkdown(stateRef.current.nodes)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'mindmap.md'; a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleImport = useCallback((nodes: MindNode[]) => {
    pushHistory()
    dispatch({ type: 'SET_NODES', nodes })
    dispatch({ type: 'SELECT', ids: [] })
    setCamera(DEFAULT_CAMERA)
  }, [pushHistory])

  const handleDeleteLink = useCallback((id: string) => {
    dispatch({ type: 'DELETE_LINK', id })
  }, [])

  const handleEditLinkLabel = useCallback((id: string) => {
    const link = stateRef.current.links.find(l => l.id === id)
    const next = window.prompt('Link label (leave empty to remove):', link?.label ?? '')
    if (next === null) return
    dispatch({ type: 'UPDATE_LINK_LABEL', id, label: next.trim() || undefined })
  }, [])

  const handleMinimapNavigate = useCallback((panX: number, panY: number) => {
    animateFocusRef.current(panX, panY, cameraRef.current.panZ)
  }, [])

  const handleMinimapSelectNode = useCallback((id: string) => {
    dispatch({ type: 'SELECT', ids: [id] })
    const node = stateRef.current.nodes.find(n => n.id === id)
    if (node) animateFocusRef.current(-node.x * cameraRef.current.zoom, -node.y * cameraRef.current.zoom, -node.z + 80)
  }, [])

  const spaceOutAnimRef = useRef<number | null>(null)

  const handleSpaceOut = useCallback(() => {
    if (spaceOutAnimRef.current) cancelAnimationFrame(spaceOutAnimRef.current)
    pushHistory()
    const fromNodes = stateRef.current.nodes
    const toNodes = autoLayout(fromNodes)
    const from = new Map(fromNodes.map(n => [n.id, { x: n.x, y: n.y, z: n.z }]))
    const DURATION = 350
    const start = performance.now()
    const easeInOut = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION)
      const e = easeInOut(t)
      dispatch({
        type: 'SET_NODES',
        nodes: toNodes.map(n => {
          const f = from.get(n.id)
          if (!f) return n
          return {
            ...n,
            x: f.x + (n.x - f.x) * e,
            y: f.y + (n.y - f.y) * e,
            z: f.z + (n.z - f.z) * e,
          }
        }),
      })
      if (t < 1) {
        spaceOutAnimRef.current = requestAnimationFrame(tick)
      } else {
        spaceOutAnimRef.current = null
        // Fit to screen once the layout settles
        fitToScreenRef.current()
      }
    }
    spaceOutAnimRef.current = requestAnimationFrame(tick)
  }, [pushHistory])
  const handleSpaceOutRef = useRef(handleSpaceOut)
  handleSpaceOutRef.current = handleSpaceOut
  const showUndoToastRef = useRef<(() => void) | null>(null)

  const handleClear = useCallback(() => {
    if (!window.confirm('Clear all nodes and start fresh?')) return
    pushHistory()
    // Reset all transient UI state
    setDyingNodeIds(new Set())
    setReparentTargetId(null)
    reparentTargetRef.current = null
    setSelectionBox(null)
    dragState.current = null
    targetZoomRef.current = DEFAULT_CAMERA.zoom
    dispatch({ type: 'SET_NODES', nodes: [{ id: 'root', parentId: null, title: 'Main Topic', x: 0, y: 0, z: 0 }] })
    dispatch({ type: 'SELECT', ids: [] })
    setCamera(DEFAULT_CAMERA)
  }, [pushHistory])

  const handleBreadcrumbNavigate = useCallback((id: string) => {
    dispatch({ type: 'SELECT', ids: [id] })
    const node = stateRef.current.nodes.find(n => n.id === id)
    if (node) {
      animateFocusRef.current(-node.x * cameraRef.current.zoom, -node.y * cameraRef.current.zoom, -node.z + 80)
    }
  }, [])

  const handleMeasure = useCallback((id: string, w: number, h: number) => {
    setNodeRects(prev => {
      const existing = prev.get(id)
      if (existing?.width === w && existing?.height === h) return prev
      const next = new Map(prev); next.set(id, { width: w, height: h }); return next
    })
  }, [])

  const handleColorChange = useCallback((id: string, colorIndex: number | undefined) => {
    pushHistory()
    // If the node being coloured is part of a multi-selection, apply to all selected nodes
    const sel = stateRef.current.selectedIds
    const targets = sel.length > 1 && sel.includes(id) ? sel : [id]
    targets.forEach(tid => dispatch({ type: 'UPDATE_COLOR', id: tid, colorIndex }))
  }, [pushHistory])

  const handleRemoveImage = useCallback((id: string) => {
    pushHistory()
    dispatch({ type: 'UPDATE_IMAGE', id, image: undefined })
  }, [pushHistory])

  const handleEmojiChange = useCallback((id: string, emoji: string | undefined) => {
    pushHistory()
    dispatch({ type: 'UPDATE_EMOJI', id, emoji })
  }, [pushHistory])

  const handleUrlChange = useCallback((id: string, url: string | undefined) => {
    pushHistory()
    dispatch({ type: 'UPDATE_URL', id, url })
  }, [pushHistory])

  const handleToggleCollapse = useCallback((id: string) => {
    const node = stateRef.current.nodes.find(n => n.id === id)
    if (!node) return
    if (node.collapsed) {
      // Expanding: show children first, then animate them in
      dispatch({ type: 'TOGGLE_COLLAPSE', id })
      // Give visibleNodeIds one tick to update, then animate newly visible descendants
      setTimeout(() => {
        const desc = collectDescendants(stateRef.current.nodes, id).slice(1)
        desc.forEach(dId => trackNewNodeRef.current(dId))
      }, 16)
    } else {
      // Collapsing: animate descendants out, then actually collapse
      const desc = collectDescendants(stateRef.current.nodes, id).slice(1) // exclude self
      setDyingNodeIds(prev => new Set([...prev, ...desc]))
      setTimeout(() => {
        dispatch({ type: 'TOGGLE_COLLAPSE', id })
        setDyingNodeIds(prev => { const s = new Set(prev); desc.forEach(d => s.delete(d)); return s })
      }, 280)
    }
  }, [])

  // Stable callbacks for MindNodeCard (prevent memo busting on every render)

  // Core animated delete — caller must push history before calling if desired
  const animateDelete = useCallback((id: string) => {
    const desc = collectDescendants(stateRef.current.nodes, id)
    playDelete()
    setDyingNodeIds(prev => new Set([...prev, ...desc]))
    setTimeout(() => {
      dispatch({ type: 'DELETE', id })
      setDyingNodeIds(prev => { const s = new Set(prev); desc.forEach(d => s.delete(d)); return s })
    }, 300)
  }, [])
  const animateDeleteRef = useRef(animateDelete)
  animateDeleteRef.current = animateDelete

  const showUndoToast = useCallback(() => {
    if (undoToastTimerRef.current) clearTimeout(undoToastTimerRef.current)
    setUndoToast(true)
    undoToastTimerRef.current = setTimeout(() => setUndoToast(false), 3000)
  }, [])
  showUndoToastRef.current = showUndoToast

  const handleDelete = useCallback((id: string) => {
    pushHistory()
    animateDeleteRef.current(id)
    showUndoToast()
  }, [pushHistory, showUndoToast])
  const handleTitleCommit = useCallback((id: string, value: string) => {
    pushHistory(); dispatch({ type: 'UPDATE_TITLE', id, value })
  }, [pushHistory])
  const handleDescCommit = useCallback((id: string, value: string) => {
    pushHistory(); dispatch({ type: 'UPDATE_DESC', id, value })
  }, [pushHistory])
  const handleAddChild = useCallback((parentId: string) => {
    const id = nextId()
    pushHistory()
    trackNewNodeRef.current(id)
    dispatch({ type: 'ADD_CHILD', parentId, id })
    const parent = stateRef.current.nodes.find(n => n.id === parentId)
    if (parent?.colorIndex !== undefined) dispatch({ type: 'UPDATE_COLOR', id, colorIndex: parent.colorIndex })
    setTimeout(() => {
      const node = stateRef.current.nodes.find(n => n.id === id)
      if (node) animateFocusRef.current(-node.x * cameraRef.current.zoom, -node.y * cameraRef.current.zoom, -node.z + 80)
    }, 16)
  }, [pushHistory])
  const handleAddChildRef = useRef(handleAddChild)
  handleAddChildRef.current = handleAddChild

  const handleAddSibling = useCallback((siblingId: string) => {
    const id = nextId()
    pushHistory()
    trackNewNodeRef.current(id)
    dispatch({ type: 'ADD_SIBLING', siblingId, id })
    const sibling = stateRef.current.nodes.find(n => n.id === siblingId)
    if (sibling?.colorIndex !== undefined) dispatch({ type: 'UPDATE_COLOR', id, colorIndex: sibling.colorIndex })
    setTimeout(() => {
      const node = stateRef.current.nodes.find(n => n.id === id)
      if (node) animateFocusRef.current(-node.x * cameraRef.current.zoom, -node.y * cameraRef.current.zoom, -node.z + 80)
    }, 16)
  }, [pushHistory])

  const handleStartEdit = useCallback((id: string, field: 'title' | 'description') => {
    dispatch({ type: 'START_EDIT', id, field })
  }, [])

  // Tree depth for every node (0 = root) — used for font-size scaling
  const depthMap = useMemo(() => {
    const map = new Map<string, number>()
    const walk = (id: string, d: number) => {
      map.set(id, d)
      state.nodes.filter(n => n.parentId === id).forEach(n => walk(n.id, d + 1))
    }
    walk('root', 0)
    return map
  }, [state.nodes])

  // Compute visible nodes (respects collapsed) — memoized
  const visibleNodeIds = useMemo(() => getVisibleNodeIds(state.nodes), [state.nodes])

  // Determine effective selected IDs (presentation mode overrides) — memoized
  const effectiveSelectedIds = useMemo(
    () => presentMode && presentOrder.length > 0 ? [presentOrder[presentIndex]] : state.selectedIds,
    [presentMode, presentOrder, presentIndex, state.selectedIds],
  )

  // Distance map: BFS from selected nodes through the tree — memoized
  // When nothing is selected fall back to root so the default view always shows
  // root + its direct children at full opacity and grandchildren+ faded.
  const distanceMap = useMemo(
    () => computeDistanceMap(
      state.nodes,
      effectiveSelectedIds.length > 0 ? effectiveSelectedIds : ['root'],
    ),
    [state.nodes, effectiveSelectedIds],
  )

  // Spotlight position for presentation mode — tracks focused node in real-time
  const spotlightPos = useMemo(() => {
    if (!presentMode) return null
    const selId = effectiveSelectedIds[0]
    if (!selId) return null
    const node = state.nodes.find(n => n.id === selId)
    if (!node) return null
    const p = project(node, camera, viewport)
    if (!p.visible) return null
    const rect = nodeRects.get(selId) ?? { width: 160, height: 56 }
    const rw = (rect.width + 100) * p.scale
    const rh = (rect.height + 100) * p.scale
    return { x: p.x, y: p.y, rw, rh }
  }, [presentMode, effectiveSelectedIds, state.nodes, camera, viewport, nodeRects])

  // NodeToolbar position — project selected node to screen
  const nodeToolbarPos = useMemo(() => {
    const selId = effectiveSelectedIds[0]
    if (!selId) return null
    const node = state.nodes.find(n => n.id === selId)
    if (!node) return null
    const p = project(node, camera, viewport)
    if (!p.visible) return null
    const rect = nodeRects.get(selId) ?? { width: 160, height: 56 }
    return {
      x: p.x,
      y: p.y - (rect.height / 2) * p.scale - 10,
    }
  }, [effectiveSelectedIds, state.nodes, camera, viewport, nodeRects])

  // Search matching — memoized
  const searchMatchIds = useMemo(() => {
    const ids = new Set<string>()
    if (searchActive && searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      state.nodes.forEach(n => {
        if (n.title.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q)) {
          ids.add(n.id)
        }
      })
    }
    return ids
  }, [searchActive, searchQuery, state.nodes])

  // Cross-page search results (other pages excluding active)
  const crossPageResults = useMemo(() => {
    if (!searchActive || !searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    const results: { pageId: string; pageName: string; nodeId: string; nodeTitle: string }[] = []
    for (const p of pagesState.pages) {
      if (p.id === pagesState.activeId) continue
      const pageNodes = (p as PageData).nodes ?? []
      for (const n of pageNodes) {
        if (n.title.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q)) {
          results.push({ pageId: p.id, pageName: p.name, nodeId: n.id, nodeTitle: n.title })
        }
      }
    }
    return results
  }, [searchActive, searchQuery, pagesState])

  const handleCrossPageSelect = useCallback((pageId: string, nodeId: string) => {
    handlePageSelect(pageId)
    setTimeout(() => {
      const node = stateRef.current.nodes.find(n => n.id === nodeId)
      if (node) {
        dispatch({ type: 'SELECT', ids: [node.id] })
        animateFocusRef.current(-node.x * cameraRef.current.zoom, -node.y * cameraRef.current.zoom, -node.z + 80)
      }
    }, 16)
  }, [handlePageSelect])

  // Fly camera to first search match when query changes
  useEffect(() => {
    if (!searchActive || !searchQuery.trim()) return
    const firstId = Array.from(searchMatchIds)[0]
    if (!firstId) return
    const node = state.nodes.find(n => n.id === firstId)
    if (!node) return
    animateFocusRef.current(
      -node.x * cameraRef.current.zoom,
      -node.y * cameraRef.current.zoom,
      -node.z + 80
    )
  }, [searchMatchIds, searchActive, searchQuery, state.nodes])

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', position: 'relative', backgroundColor: activeTheme.canvasBg }}>
    <PagesPanel
      pages={pagesState.pages}
      activeId={pagesState.activeId}
      theme={activeTheme}
      open={panelOpen}
      mobile={!bp.md}
      onToggleOpen={() => setPanelOpen(v => !v)}
      onSelect={handlePageSelect}
      onAdd={handlePageAdd}
      onRename={handlePageRename}
      onDelete={handlePageDelete}
      onDuplicate={handlePageDuplicate}
      onReorder={handlePageReorder}
    />
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => handlePointerUp(e)}
      onDoubleClick={handleCanvasDblClick}
      onClick={() => {
        if (suppressCanvasClickRef.current) { suppressCanvasClickRef.current = false }
      }}
      style={{
        position: 'absolute',
        left: panelW,
        top: 0,
        width: `calc(100vw - ${panelW}px)`,
        height: '100vh',
        paddingTop: TOOLBAR_HEIGHT,
        overflow: 'hidden', backgroundColor: activeTheme.canvasBg,
        ...getPaperBg(activeTheme.dotColor, paperType, paperOpacity),
        cursor: 'default', touchAction: 'none', boxSizing: 'border-box',
      }}
    >
      {/* Soft radial glow anchoring the root node */}
      {(() => {
        const root = state.nodes.find(n => n.id === 'root')
        if (!root) return null
        const p = project(root, camera, viewport)
        if (!p.visible) return null
        const size = 560 * p.scale * camera.zoom
        return (
          <div style={{
            position: 'absolute',
            left: p.x, top: p.y,
            width: size, height: size,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${activeTheme.rootColor}14 0%, transparent 65%)`,
            pointerEvents: 'none',
            zIndex: 0,
          }} />
        )
      })()}

      <EdgesOverlay
        nodes={state.nodes}
        distanceMap={distanceMap}
        camera={camera}
        viewport={viewport}
        nodeRects={nodeRects}
        visibleNodeIds={visibleNodeIds}
        theme={activeTheme}
        links={state.links}
        newEdgeIds={newNodeIds}
        onDeleteLink={handleDeleteLink}
        onEditLinkLabel={handleEditLinkLabel}
      />

      {state.nodes.filter(n => visibleNodeIds.has(n.id) || dyingNodeIds.has(n.id)).map(node => {
        const p = project(node, camera, viewport)
        if (!p.visible) return null
        const isSelected = effectiveSelectedIds.includes(node.id)
        const isRoot = node.id === 'root'
        const hasChildren = state.nodes.some(n => n.parentId === node.id)
        const nodeDepth = depthMap.get(node.id) ?? 0
        const isCollapsed = node.collapsed === true

        // Compute distance for this node (null = nothing selected)
        let distance: number | null = distanceMap.size > 0
          ? (distanceMap.get(node.id) ?? 999)
          : null

        // Search overrides: matches → distance 0, others → distance 4
        if (searchActive && searchQuery.trim()) {
          distance = searchMatchIds.has(node.id) ? 0 : 4
        }

        const searchOverride = searchActive && searchQuery.trim()
          ? (searchMatchIds.has(node.id) ? true : undefined)
          : undefined

        return (
          <MindNodeCard
            key={node.id}
            node={node}
            isRoot={isRoot}
            isSelected={isSelected}
            distance={distance}
            editingId={state.editingId}
            editingField={state.editingField}
            screenX={p.x}
            screenY={p.y}
            scale={p.scale}
            depth={p.depth}
            isNew={newNodeIds.has(node.id)}
            hasChildren={hasChildren}
            nodeDepth={nodeDepth}
            isCollapsed={isCollapsed}
            isDying={dyingNodeIds.has(node.id)}
            isReparentTarget={reparentTargetId === node.id}
            isReparentSource={reparentSourceId === node.id}
            isLinkTarget={linkingFromId !== null && linkingFromId !== node.id}
            theme={activeTheme}
            searchOverride={searchOverride}
            zFocus={effectiveSelectedIds.length > 0 ? state.nodes.find(n => n.id === effectiveSelectedIds[0])?.z : undefined}
            onPointerDown={handleNodePointerDown}
            onAddChild={handleAddChild}
            onDelete={handleDelete}
            onTitleCommit={handleTitleCommit}
            onDescCommit={handleDescCommit}
            onStartEdit={handleStartEdit}
            onMeasure={handleMeasure}
            onToggleCollapse={handleToggleCollapse}
            onRemoveImage={handleRemoveImage}
            onChildDragStart={handleChildDragStart}
          />
        )
      })}

      {/* First-run hint — shown while the map is just the root node */}
      {state.nodes.length === 1 && !state.editingId && (() => {
        const root = state.nodes[0]
        const p = project(root, camera, viewport)
        if (!p.visible) return null
        return (
          <div style={{
            position: 'absolute',
            left: p.x, top: p.y + 60,
            transform: 'translateX(-50%)',
            zIndex: 15,
            pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            animation: 'fadeInUp 0.4s ease',
          }}>
            <ArrowUp size={18} color={activeTheme.textMuted} style={{ opacity: 0.4 }} />
            <div style={{
              fontSize: 12.5, color: activeTheme.textMuted,
              display: 'flex', alignItems: 'center', gap: 6,
              whiteSpace: 'nowrap',
            }}>
              Select the node and press
              <kbd style={{
                fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                background: activeTheme.groupBg,
                border: `1px solid ${activeTheme.border}`,
                borderRadius: 4, padding: '1.5px 6px',
                color: activeTheme.textPrimary,
              }}>Tab</kbd>
              to add your first idea
            </div>
          </div>
        )
      })()}

      {/* Theme cross-fade — old canvas color fades out over 400ms */}
      {themeFadeFrom && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: themeFadeFrom,
          pointerEvents: 'none',
          zIndex: 3,
          animation: 'themeFade 400ms ease-out forwards',
        }} />
      )}

      {/* Vignette — softer, Notion-style */}
      <div style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        background: `radial-gradient(ellipse at 50% 50%, transparent 50%, ${activeTheme.canvasBg}33 80%, ${activeTheme.canvasBg}88 100%)`,
      }} />

      {/* New-child ghost dot (drag off a node's "+" handle) */}
      {newChildGhost && (
        <div style={{
          position: 'absolute',
          left: newChildGhost.x, top: newChildGhost.y,
          transform: 'translate(-50%, -50%)',
          width: 18, height: 18, borderRadius: '50%',
          background: `${SUCCESS}55`,
          border: `2px dashed ${SUCCESS}`,
          pointerEvents: 'none',
          zIndex: 200,
        }} />
      )}

      {/* Rubber-band selection rectangle */}
      {selectionBox && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(selectionBox.x1, selectionBox.x2),
            top: Math.min(selectionBox.y1, selectionBox.y2),
            width: Math.abs(selectionBox.x2 - selectionBox.x1),
            height: Math.abs(selectionBox.y2 - selectionBox.y1),
            border: '1.5px dashed rgba(0,123,255,0.7)',
            background: 'rgba(0,123,255,0.06)',
            borderRadius: 4,
            pointerEvents: 'none',
            zIndex: 200,
          }}
        />
      )}

      {/* Presentation spotlight — dark vignette with transparent hole over focused node */}
      {presentMode && spotlightPos && (
        <div
          style={{
            position: 'absolute', inset: 0,
            zIndex: 8, pointerEvents: 'none',
            backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.55)',
            WebkitMaskImage: `radial-gradient(ellipse ${spotlightPos.rw}px ${spotlightPos.rh}px at ${spotlightPos.x}px ${spotlightPos.y}px, transparent 35%, black 80%)`,
            maskImage: `radial-gradient(ellipse ${spotlightPos.rw}px ${spotlightPos.rh}px at ${spotlightPos.x}px ${spotlightPos.y}px, transparent 35%, black 80%)`,
          }}
        />
      )}

      {/* Floating node toolbar */}
      {nodeToolbarPos && !state.editingId && effectiveSelectedIds.length === 1 && !presentMode && (
        <NodeToolbar
          x={nodeToolbarPos.x}
          y={nodeToolbarPos.y}
          isRoot={effectiveSelectedIds[0] === 'root'}
          linkingMode={linkingFromId === effectiveSelectedIds[0]}
          currentColorIndex={state.nodes.find(n => n.id === effectiveSelectedIds[0])?.colorIndex}
          currentEmoji={state.nodes.find(n => n.id === effectiveSelectedIds[0])?.emoji}
          currentUrl={state.nodes.find(n => n.id === effectiveSelectedIds[0])?.url}
          theme={activeTheme}
          onAddChild={() => handleAddChild(effectiveSelectedIds[0])}
          onAddSibling={() => handleAddSibling(effectiveSelectedIds[0])}
          onEditTitle={() => dispatch({ type: 'START_EDIT', id: effectiveSelectedIds[0], field: 'title' })}
          onDrawLink={() => {
            const sel = effectiveSelectedIds[0]
            const next = linkingFromId === sel ? null : sel
            setLinkingFromId(next)
            linkingFromIdRef.current = next
          }}
          onDelete={() => handleDelete(effectiveSelectedIds[0])}
          onColorChange={(idx) => handleColorChange(effectiveSelectedIds[0], idx)}
          onEmojiChange={(emoji) => handleEmojiChange(effectiveSelectedIds[0], emoji)}
          onUrlChange={(url) => handleUrlChange(effectiveSelectedIds[0], url)}
        />
      )}

      {/* Breadcrumb trail */}
      {effectiveSelectedIds.length === 1 && !presentMode && (
        <Breadcrumb
          nodes={state.nodes}
          selectedId={effectiveSelectedIds[0]}
          theme={activeTheme}
          onNavigate={handleBreadcrumbNavigate}
        />
      )}

      {bp.sm && <Minimap
        nodes={state.nodes}
        camera={camera}
        viewport={viewport}
        theme={activeTheme}
        onNavigate={handleMinimapNavigate}
        onSelectNode={handleMinimapSelectNode}
      />}
      <ShortcutsPanel theme={activeTheme} suppressed={showThemePicker} />

      {/* Search bar */}
      {searchActive && (
        <SearchBar
          query={searchQuery}
          onChange={setSearchQuery}
          onClose={() => { setSearchActive(false); setSearchQuery('') }}
          theme={activeTheme}
          crossPageResults={crossPageResults}
          onCrossPageSelect={handleCrossPageSelect}
        />
      )}

      {/* Presentation mode overlay */}
      {presentMode && (
        <div
          style={{
            position: 'absolute', bottom: 20, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 300,
            display: 'flex', alignItems: 'center', gap: 12,
            background: activeTheme.toolbarBg,
            backdropFilter: 'blur(12px)',
            border: `1px solid ${activeTheme.border}`,
            borderRadius: 16, padding: '8px 16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
          }}
        >
          <button
            onClick={() => presentNav(-1)}
            disabled={presentIndex === 0}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: 'transparent', cursor: presentIndex === 0 ? 'default' : 'pointer',
              color: activeTheme.textMuted,
              opacity: presentIndex === 0 ? 0.3 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <CaretLeft size={12} weight="bold" />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: activeTheme.textPrimary, minWidth: 50, textAlign: 'center' }}>
            {presentIndex + 1} / {presentOrder.length}
          </span>
          <button
            onClick={() => presentNav(1)}
            disabled={presentIndex === presentOrder.length - 1}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: 'transparent', cursor: presentIndex === presentOrder.length - 1 ? 'default' : 'pointer',
              color: activeTheme.textMuted,
              opacity: presentIndex === presentOrder.length - 1 ? 0.3 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <CaretRight size={12} weight="bold" />
          </button>
          <div style={{ width: 1, height: 16, background: activeTheme.border }} />
          <span style={{ fontSize: 11, color: activeTheme.textMuted, fontWeight: 500 }}>ESC to exit</span>
          <button
            onClick={exitPresentation}
            style={{
              width: 20, height: 20, borderRadius: 4, border: 'none',
              background: 'transparent', cursor: 'pointer',
              color: activeTheme.textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}
          >
            <X size={10} weight="bold" />
          </button>
        </div>
      )}

      {/* Autosave indicator */}
      {savedTick && (
        <div style={{
          position: 'absolute', top: 62, right: 16, zIndex: 250,
          display: 'flex', alignItems: 'center', gap: 5,
          background: activeTheme.toolbarBg,
          border: `1px solid ${activeTheme.border}`,
          borderRadius: 8, padding: '4px 9px',
          fontSize: 11, fontWeight: 600,
          color: activeTheme.textMuted,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          pointerEvents: 'none',
        }}>
          <Check size={11} color={SUCCESS} weight="bold" />
          Saved
        </div>
      )}

      {/* Undo toast */}
      {undoToast && (
        <div
          style={{
            position: 'absolute', bottom: 20, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 400,
            background: activeTheme.toolbarBg,
            backdropFilter: 'blur(12px)',
            border: `1px solid ${activeTheme.border}`,
            borderRadius: 8, padding: '8px 14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 12, color: activeTheme.textPrimary,
            display: 'flex', alignItems: 'center', gap: 10,
            whiteSpace: 'nowrap',
            animation: 'fadeInUp 0.18s ease',
          }}
        >
          <span style={{ opacity: 0.6 }}>Deleted</span>
          <span style={{ width: 1, height: 12, background: activeTheme.border }} />
          <kbd style={{
            fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
            background: activeTheme.groupBg,
            border: `1px solid ${activeTheme.border}`,
            borderRadius: 4, padding: '1px 5px',
            color: activeTheme.textPrimary,
          }}>⌘Z</kbd>
          <span style={{ color: activeTheme.textMuted }}>to undo</span>
        </div>
      )}

      {/* Theme picker modal */}
      {showThemePicker && (
        <ThemePicker
          currentThemeId={themeId}
          onSelect={id => { setThemeId(id); setShowThemePicker(false) }}
          onClose={() => setShowThemePicker(false)}
          theme={activeTheme}
          paperType={paperType}
          paperOpacity={paperOpacity}
          onPaperType={setPaperType}
          onPaperOpacity={setPaperOpacity}
        />
      )}
    </div>

    {/* Full-width toolbar — spans over both the pages panel and the canvas */}
    <Toolbar
      zoom={camera.zoom}
      theme={activeTheme}
      bp={bp}
      onReset={() => { targetZoomRef.current = DEFAULT_CAMERA.zoom; setCamera(DEFAULT_CAMERA) }}
      onFitScreen={fitToScreen}
      onZoomIn={() => setCamera(c => { const z = Math.min(4, c.zoom * 1.2); targetZoomRef.current = z; return { ...c, zoom: z } })}
      onZoomOut={() => setCamera(c => { const z = Math.max(0.2, c.zoom / 1.2); targetZoomRef.current = z; return { ...c, zoom: z } })}
      onClear={handleClear}
      onImport={handleImport}
      onImportBackup={handleImportBackup}
      onExportPng={() => exportPngRef.current()}
      onExportMarkdown={handleExportMarkdown}
      onExportBackup={handleExportBackup}
      onToggleDark={() => {
        if (isDark) setThemeId(LIGHT_THEMES[0].id)
        else setThemeId(DARK_THEMES[0].id)
      }}
      onTogglePresent={enterPresentation}
      onOpenThemes={() => setShowThemePicker(true)}
      onSpaceOut={handleSpaceOut}
    />
    </div>
  )
}
