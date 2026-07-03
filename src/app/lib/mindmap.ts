let _counter = 0

export function nextId(): string {
  _counter++
  return `n${Date.now().toString(36)}${_counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export interface MindNode {
  id: string
  parentId: string | null
  title: string
  description?: string
  /** Legacy hex color — kept for old data. Use colorIndex when possible. */
  color?: string
  /** Index into theme.palette (0-7). Overrides `color`. Theme-adaptive. */
  colorIndex?: number
  emoji?: string
  /** Data-URL image attachment shown on the card */
  image?: string
  /** External URL link attached to the card */
  url?: string
  collapsed?: boolean
  x: number
  y: number
  z: number
}

/** Returns a human-readable depth band label for a given z value */
export function depthBand(z: number): string {
  if (z > 150) return 'Front'
  if (z > 40) return 'Mid-forward'
  if (z > -40) return 'Mid'
  if (z > -150) return 'Mid-back'
  return 'Back'
}

export const seedNodes: MindNode[] = [
  { id: 'root', parentId: null, title: 'Web Design', description: 'Core disciplines', x: 0, y: 0, z: 0 },
  { id: 'n1', parentId: 'root', title: 'UX Research', description: 'Interviews, tests.', x: -580, y: -260, z: 80 },
  { id: 'n2', parentId: 'root', title: 'Design Systems', description: 'Tokens, components.', x: 420, y: -300, z: 60 },
  { id: 'n3', parentId: 'root', title: 'Animation', description: 'Micro-interactions.', x: -480, y: 260, z: -60 },
  { id: 'n4', parentId: 'root', title: 'Responsive', description: 'Mobile-first.', x: 520, y: 220, z: 40 },
  { id: 'n5', parentId: 'root', title: 'Components', description: 'Reusable UI blocks.', x: -220, y: -400, z: -80 },
  { id: 'n6', parentId: 'root', title: 'Typography', description: 'Legibility, rhythm, pairing.', x: 300, y: 400, z: -100 },
  { id: 'n7', parentId: 'root', title: 'Layout', description: 'Grid & spacing.', x: -640, y: 60, z: 20 },
  { id: 'n8', parentId: 'root', title: 'SEO', description: 'Semantic HTML & perf.', x: 620, y: -80, z: -40 },
]

export const blankCanvas: MindNode[] = [
  { id: 'root', parentId: null, title: 'Main Topic', x: 0, y: 0, z: 0 },
]

// ── Placement helpers ────────────────────────────────────────────────────────

const TWO_PI = Math.PI * 2

/** Angle from `from` to `to` (−π … π) */
function nodeAngle(from: MindNode, to: MindNode): number {
  return Math.atan2(to.y - from.y, to.x - from.x)
}

/** 2-D distance between two nodes */
function nodeDist2D(a: MindNode, b: MindNode): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/**
 * Returns the angle that sits in the largest angular gap between `existing`
 * nodes as seen from `parent`, so new nodes spread evenly around the orbit.
 */
function largestGapAngle(existing: MindNode[], parent: MindNode): number {
  if (existing.length === 0) return 0                                   // first child → right
  if (existing.length === 1) return nodeAngle(parent, existing[0]) + Math.PI  // opposite

  const angles = existing.map(n => nodeAngle(parent, n)).sort((a, b) => a - b)
  let maxGap = 0
  let mid = angles[0] + Math.PI
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i]
    const b = i + 1 < angles.length ? angles[i + 1] : angles[0] + TWO_PI
    const gap = b - a
    if (gap > maxGap) { maxGap = gap; mid = a + gap / 2 }
  }
  return mid
}

/**
 * Average orbit radius of `children` around `parent`.
 * Falls back to `defaultR` when there are no children yet.
 */
function orbitRadius(children: MindNode[], parent: MindNode, defaultR: number): number {
  if (children.length === 0) return defaultR
  return children.reduce((s, c) => s + nodeDist2D(parent, c), 0) / children.length
}

// ── Public placement functions ────────────────────────────────────────────────

export function addChildAt(nodes: MindNode[], parentId: string, id: string, x: number, y: number): MindNode[] {
  const parent = nodes.find(n => n.id === parentId)
  if (!parent) return nodes
  const ang  = Math.atan2(y - parent.y, x - parent.x)
  const zOff = Math.sin(ang * 2) * 100
  return [...nodes, { id, parentId, title: '', colorIndex: parent.colorIndex, x, y, z: parent.z + zOff }]
}

export function addChild(nodes: MindNode[], parentId: string, id: string): MindNode[] {
  const parent = nodes.find(n => n.id === parentId)
  if (!parent) return nodes

  const children = nodes.filter(n => n.parentId === parentId)
  const r   = orbitRadius(children, parent, 300)
  const ang = largestGapAngle(children, parent)
  // Slight Z variation so children don't all sit on the same plane
  const zOff = Math.sin(ang * 2) * 100

  return [
    ...nodes,
    {
      id, parentId,
      title: '',
      colorIndex: parent.colorIndex,
      x: parent.x + Math.cos(ang) * r,
      y: parent.y + Math.sin(ang) * r,
      z: parent.z + zOff,
    },
  ]
}

export function addSibling(nodes: MindNode[], siblingId: string, id: string): MindNode[] {
  const sibling = nodes.find(n => n.id === siblingId)
  if (!sibling || !sibling.parentId) return nodes

  const parent = nodes.find(n => n.id === sibling.parentId)
  if (!parent) return nodes

  const siblings = nodes.filter(n => n.parentId === sibling.parentId)
  const r   = orbitRadius(siblings, parent, 300)
  const ang = largestGapAngle(siblings, parent)
  const zOff = Math.sin(ang * 2) * 100

  return [
    ...nodes,
    {
      id,
      parentId: sibling.parentId,
      title: '',
      x: parent.x + Math.cos(ang) * r,
      y: parent.y + Math.sin(ang) * r,
      z: parent.z + zOff,
    },
  ]
}

/**
 * Re-arranges all nodes into a clean radial layout.
 * Root stays at (0,0). Its children are evenly spaced in a full circle.
 * Grandchildren+ fan out in a narrowing cone pointing away from their parent.
 *
 * Depth-aware: each root branch gets its own z-band (−120, 0, +120, …)
 * so spatial depth mirrors semantic structure.
 */
export function autoLayout(nodes: MindNode[]): MindNode[] {
  const result = nodes.map(n => ({ ...n }))

  const RADII = [310, 240, 185, 145, 115]   // orbit radius per depth level
  const BRANCH_Z_STEP = 120                  // z-band spacing per root branch

  function layout(
    parentId: string,
    parentX: number,
    parentY: number,
    parentZ: number,
    depth: number,
    coneCenter: number,   // outward direction (radians)
    coneHalf: number,     // half the spread angle (radians)
  ) {
    const children = result.filter(n => n.parentId === parentId)
    const n = children.length
    if (n === 0) return

    const r = RADII[Math.min(depth, RADII.length - 1)]

    children.forEach((child, i) => {
      const ang = n === 1
        ? coneCenter
        : coneCenter - coneHalf + (i / (n - 1)) * coneHalf * 2
      child.x = parentX + Math.cos(ang) * r
      child.y = parentY + Math.sin(ang) * r
      // Depth: branch z-band for root children, parent+small variation for deeper
      if (depth === 0) {
        child.z = parentZ + (i - (n - 1) / 2) * BRANCH_Z_STEP
      } else {
        child.z = parentZ + Math.sin(ang * 2 + i * 0.7) * 40
      }
      // Narrowing cone for this node's own children
      const nextHalf = Math.min(Math.PI * 0.70, Math.max(Math.PI * 0.25, n * 0.40))
      layout(child.id, child.x, child.y, child.z, depth + 1, ang, nextHalf)
    })
  }

  const root = result.find(n => n.id === 'root')
  if (root) {
    root.x = 0; root.y = 0; root.z = 0
    const rootChildren = result.filter(n => n.parentId === 'root')
    const rc = rootChildren.length
    rootChildren.forEach((child, i) => {
      const ang = rc === 1 ? 0 : (i / rc) * Math.PI * 2
      child.x = Math.cos(ang) * RADII[0]
      child.y = Math.sin(ang) * RADII[0]
      // Assign z-band: spread root children across −N*STEP to +N*STEP
      child.z = (i - (rc - 1) / 2) * BRANCH_Z_STEP
      const half = Math.min(Math.PI * 0.70, Math.max(Math.PI * 0.25, rc * 0.38))
      layout(child.id, child.x, child.y, child.z, 1, ang, half)
    })
  }

  return result
}

export function collectDescendants(nodes: MindNode[], rootId: string): string[] {
  const result: string[] = []
  const queue = [rootId]
  while (queue.length) {
    const id = queue.shift()!
    result.push(id)
    nodes.filter(n => n.parentId === id).forEach(n => queue.push(n.id))
  }
  return result
}

export function getVisibleNodeIds(nodes: MindNode[]): Set<string> {
  const collapsedSet = new Set(nodes.filter(n => n.collapsed).map(n => n.id))
  if (collapsedSet.size === 0) return new Set(nodes.map(n => n.id))
  const hidden = new Set<string>()
  // BFS: for each collapsed node, mark all descendants as hidden
  for (const colId of collapsedSet) {
    const queue = nodes.filter(n => n.parentId === colId).map(n => n.id)
    while (queue.length) {
      const id = queue.shift()!
      hidden.add(id)
      nodes.filter(n => n.parentId === id).forEach(n => queue.push(n.id))
    }
  }
  return new Set(nodes.filter(n => !hidden.has(n.id)).map(n => n.id))
}

export function computeFocusSet(nodes: MindNode[], selectedIds: string[]): Set<string> {
  if (selectedIds.length === 0) return new Set(nodes.map(n => n.id))
  const set = new Set<string>()
  for (const selId of selectedIds) {
    set.add(selId)
    const node = nodes.find(n => n.id === selId)
    if (!node) continue
    if (node.parentId) {
      set.add(node.parentId)
      nodes.filter(n => n.parentId === node.parentId).forEach(n => set.add(n.id))
      nodes.filter(n => n.parentId === selId).forEach(n => set.add(n.id))
    } else {
      nodes.filter(n => n.parentId === selId).forEach(n => set.add(n.id))
    }
  }
  return set
}

/**
 * BFS from every selected node simultaneously through bidirectional parent-child
 * edges. Returns a map of nodeId → minimum graph distance from any selected node.
 * If selectedIds is empty the map is empty (caller treats that as "no selection").
 */
// ── Node linking ─────────────────────────────────────────────────────────────

export interface NodeLink {
  id: string
  fromId: string
  toId: string
  label?: string
}

// ── Markdown export ───────────────────────────────────────────────────────────

export function exportMarkdown(nodes: MindNode[]): string {
  const lines: string[] = []

  function walk(id: string, level: number) {
    const node = nodes.find(n => n.id === id)
    if (!node) return
    const children = nodes.filter(n => n.parentId === id)

    if (level === 0) {
      // Root: plain title at the top, no hyphen
      const emoji = node.emoji ? `${node.emoji} ` : ''
      lines.push(`${emoji}${node.title}`)
      if (node.description) lines.push(node.description)
      if (children.length) lines.push('')   // blank line before children
    } else {
      const indent = '  '.repeat(level - 1)
      const emoji = node.emoji ? `${node.emoji} ` : ''
      lines.push(`${indent}- ${emoji}${node.title}`)
      if (node.description) lines.push(`${indent}  ${node.description}`)
    }

    children.forEach(child => walk(child.id, level + 1))
  }

  walk('root', 0)
  return lines.join('\n')
}

// ── Paste-to-import ───────────────────────────────────────────────────────────

export function parseOutlineToNodes(text: string): MindNode[] | null {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return null

  // Strip markdown decorators
  function clean(s: string): string {
    return s
      .replace(/^#+\s*/, '')
      .replace(/^\s*[-*]\s*/, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .trim()
  }

  // Detect indent level of each line
  function indentLevel(s: string): number {
    const match = s.match(/^(\s*)/)
    const raw = match ? match[1].length : 0
    return Math.floor(raw / 2)
  }

  const result: MindNode[] = []
  const rootTitle = clean(lines[0])
  result.push({ id: 'root', parentId: null, title: rootTitle || 'Main Topic', x: 0, y: 0, z: 0 })

  // Stack: [{ id, level }]
  const stack: { id: string; level: number }[] = [{ id: 'root', level: 0 }]

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) continue
    const level = indentLevel(line) + 1
    const title = clean(trimmed)
    if (!title) continue

    // Find parent: closest ancestor with lower level
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }
    const parentId = stack[stack.length - 1].id
    const id = nextId()
    result.push({ id, parentId, title, x: 0, y: 0, z: 0 })
    stack.push({ id, level })
  }

  if (result.length < 2) return null
  return autoLayout(result)
}

export function computeDistanceMap(nodes: MindNode[], selectedIds: string[]): Map<string, number> {
  const dist = new Map<string, number>()
  if (selectedIds.length === 0) return dist

  // Build bidirectional adjacency list
  const adj = new Map<string, string[]>()
  for (const n of nodes) {
    if (!adj.has(n.id)) adj.set(n.id, [])
    if (n.parentId) {
      adj.get(n.id)!.push(n.parentId)
      if (!adj.has(n.parentId)) adj.set(n.parentId, [])
      adj.get(n.parentId)!.push(n.id)
    }
  }

  const queue: string[] = []
  for (const id of selectedIds) {
    if (nodes.find(n => n.id === id)) { dist.set(id, 0); queue.push(id) }
  }

  let i = 0
  while (i < queue.length) {
    const cur = queue[i++]
    const d = dist.get(cur)!
    for (const nb of (adj.get(cur) ?? [])) {
      if (!dist.has(nb)) { dist.set(nb, d + 1); queue.push(nb) }
    }
  }

  // Siblings are BFS distance 2 (selected → parent → sibling) but should feel
  // like distance 1 — same visual group as parent and children.
  for (const id of selectedIds) {
    const node = nodes.find(n => n.id === id)
    if (!node || !node.parentId) continue
    for (const sibling of nodes) {
      if (sibling.parentId === node.parentId && sibling.id !== id) {
        if ((dist.get(sibling.id) ?? 99) > 1) dist.set(sibling.id, 1)
      }
    }
  }

  return dist
}
