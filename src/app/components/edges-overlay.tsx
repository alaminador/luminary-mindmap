import React, { useState } from 'react'
import type { MindNode, NodeLink } from '../lib/mindmap'
import type { Camera } from '../lib/projection'
import { project } from '../lib/projection'
import type { AppTheme } from '../lib/themes'
import { LINK } from '../lib/tokens'

interface NodeRect {
  id: string
  screenX: number
  screenY: number
  width: number
  height: number
  worldZ: number
}

function closestSidePoint(
  ax: number, ay: number, bx: number, by: number,
  w: number, h: number
): { px: number; py: number; nx: number; ny: number } {
  const hw = w / 2
  const hh = h / 2
  const dx = bx - ax
  const dy = by - ay

  const sides = [
    { px: ax, py: ay - hh, nx: 0, ny: -1, dot: -dy },
    { px: ax, py: ay + hh, nx: 0, ny: 1, dot: dy },
    { px: ax - hw, py: ay, nx: -1, ny: 0, dot: -dx },
    { px: ax + hw, py: ay, nx: 1, ny: 0, dot: dx },
  ]
  return sides.reduce((best, s) => (s.dot > best.dot ? s : best), sides[0])
}

interface Props {
  nodes: MindNode[]
  distanceMap: Map<string, number>  // nodeId → graph distance from selection
  camera: Camera
  viewport: { width: number; height: number }
  nodeRects: Map<string, { width: number; height: number }>
  visibleNodeIds: Set<string>
  theme: AppTheme
  links?: NodeLink[]
  newEdgeIds?: Set<string>
  onDeleteLink?: (id: string) => void
  onEditLinkLabel?: (id: string) => void
}

// Edge opacity mirrors the node distance levels
const EDGE_OPACITY_BY_DIST = [0.80, 0.80, 0.45, 0.28, 0.16]

export const EdgesOverlay = React.memo(function EdgesOverlay({ nodes, distanceMap, camera, viewport, nodeRects, visibleNodeIds, theme, links = [], newEdgeIds, onDeleteLink, onEditLinkLabel }: Props) {
  // Which cross-link is hovered — controls when the delete button is visible
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null)
  const hasSelection = distanceMap.size > 0
  const edgeColor = theme.edgeColor

  const rects: NodeRect[] = nodes.map(n => {
    const p = project(n, camera, viewport)
    const w = (nodeRects.get(n.id)?.width ?? 160) * p.scale
    const h = (nodeRects.get(n.id)?.height ?? 56) * p.scale
    return { id: n.id, screenX: p.x, screenY: p.y, width: w, height: h, worldZ: n.z ?? 0 }
  })

  const edges: React.ReactNode[] = []
  for (const node of nodes) {
    if (!node.parentId) continue
    // Skip edges where child is not visible (collapsed)
    if (!visibleNodeIds.has(node.id)) continue

    const from = rects.find(r => r.id === node.parentId)
    const to = rects.find(r => r.id === node.id)
    if (!from || !to) continue

    // Edge opacity = based on the worse (larger) distance of its two endpoints
    let opacity: number
    if (!hasSelection) {
      opacity = 0.6
    } else {
      const dChild  = Math.min(distanceMap.get(node.id) ?? 99, 4)
      const dParent = Math.min(distanceMap.get(node.parentId) ?? 99, 4)
      const maxDist = Math.max(dChild, dParent)
      opacity = EDGE_OPACITY_BY_DIST[maxDist] ?? 0.04
    }

    const fSide = closestSidePoint(from.screenX, from.screenY, to.screenX, to.screenY, from.width, from.height)
    const tSide = closestSidePoint(to.screenX, to.screenY, from.screenX, from.screenY, to.width, to.height)

    const dist = Math.hypot(to.screenX - from.screenX, to.screenY - from.screenY)
    const handleLen = dist * 0.42

    const zDiff = to.worldZ - from.worldZ
    const arcAmount = Math.min(Math.abs(zDiff) * 0.18, 55)
    const arcSign = zDiff > 0 ? 1 : -1
    const edgeLen = Math.hypot(to.screenX - from.screenX, to.screenY - from.screenY)
    const perpX = edgeLen > 1 ? -(to.screenY - from.screenY) / edgeLen * arcAmount * arcSign : 0
    const perpY = edgeLen > 1 ?  (to.screenX - from.screenX) / edgeLen * arcAmount * arcSign : 0

    const c1x = fSide.px + fSide.nx * handleLen + perpX
    const c1y = fSide.py + fSide.ny * handleLen + perpY
    const c2x = tSide.px + tSide.nx * handleLen + perpX
    const c2y = tSide.py + tSide.ny * handleLen + perpY
    const d = `M${fSide.px},${fSide.py} C${c1x},${c1y} ${c2x},${c2y} ${tSide.px},${tSide.py}`

    const gradId = `eg-${node.parentId}-${node.id}`.replace(/[^a-zA-Z0-9-]/g, '_')
    const isNew = newEdgeIds?.has(node.id) ?? false
    const drawAnim = isNew ? { animation: 'edgeGrow 0.5s cubic-bezier(0.22,1,0.36,1) forwards' } : undefined
    edges.push(
      <g key={`${node.parentId}-${node.id}`} style={{ transition: 'opacity 0.25s' }} opacity={opacity}>
        <defs>
          <linearGradient id={gradId} x1={fSide.px} y1={fSide.py} x2={tSide.px} y2={tSide.py} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor={edgeColor} stopOpacity="1" />
            <stop offset="100%" stopColor={edgeColor} stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke={`url(#${gradId})`} strokeWidth={2.2} strokeLinecap="round"
          pathLength={isNew ? 1 : undefined}
          strokeDasharray={isNew ? '1' : undefined}
          style={drawAnim}
        />
        <path d={d} fill="none" stroke={edgeColor} strokeWidth={0.7} strokeLinecap="round" strokeOpacity={0.3}
          pathLength={isNew ? 1 : undefined}
          strokeDasharray={isNew ? '1' : undefined}
          style={drawAnim}
        />
      </g>
    )
  }

  // Draw cross-node links
  const LINK_COLOR = LINK
  const linkElements: React.ReactNode[] = links.map(link => {
    const fromNode = nodes.find(n => n.id === link.fromId)
    const toNode   = nodes.find(n => n.id === link.toId)
    if (!fromNode || !toNode) return null

    const fp = project(fromNode, camera, viewport)
    const tp = project(toNode, camera, viewport)
    if (!fp.visible && !tp.visible) return null

    const fromRect = rects.find(r => r.id === link.fromId)
    const toRect   = rects.find(r => r.id === link.toId)
    if (!fromRect || !toRect) return null

    const fSide = closestSidePoint(fromRect.screenX, fromRect.screenY, toRect.screenX, toRect.screenY, fromRect.width, fromRect.height)
    const tSide = closestSidePoint(toRect.screenX, toRect.screenY, fromRect.screenX, fromRect.screenY, toRect.width, toRect.height)

    const dist = Math.hypot(tSide.px - fSide.px, tSide.py - fSide.py)
    const handleLen = dist * 0.42

    const c1x = fSide.px + fSide.nx * handleLen
    const c1y = fSide.py + fSide.ny * handleLen
    const c2x = tSide.px + tSide.nx * handleLen
    const c2y = tSide.py + tSide.ny * handleLen
    const d = `M${fSide.px},${fSide.py} C${c1x},${c1y} ${c2x},${c2y} ${tSide.px},${tSide.py}`

    const midX = 0.125*fSide.px + 0.375*c1x + 0.375*c2x + 0.125*tSide.px
    const midY = 0.125*fSide.py + 0.375*c1y + 0.375*c2y + 0.125*tSide.py

    const gradId = `lg-${link.id}`
    const hovered = hoveredLinkId === link.id

    // Label pill geometry (centred on the curve midpoint, floating just above)
    const labelW = link.label ? link.label.length * 6.2 + 14 : 0
    const labelX = midX - labelW / 2
    const labelY = midY - 9
    // Delete button: beside the label pill when there is one, on the midpoint otherwise
    const delX = link.label ? labelX + labelW + 12 : midX
    const delY = link.label ? labelY + 8 : midY

    return (
      <g
        key={link.id}
        style={{ transition: 'opacity 0.25s' }}
        opacity={hovered ? 0.95 : 0.75}
        onMouseEnter={() => setHoveredLinkId(link.id)}
        onMouseLeave={() => setHoveredLinkId(prev => (prev === link.id ? null : prev))}
      >
        <defs>
          <linearGradient id={gradId} x1={fSide.px} y1={fSide.py} x2={tSide.px} y2={tSide.py} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor={LINK_COLOR} stopOpacity="1" />
            <stop offset="100%" stopColor={LINK_COLOR} stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke={`url(#${gradId})`} strokeWidth={hovered ? 2.6 : 2.2} strokeLinecap="round" />
        <path
          d={d} fill="none" stroke="transparent" strokeWidth={16}
          pointerEvents="stroke" style={{ cursor: 'pointer' }}
          onDoubleClick={e => { e.stopPropagation(); onEditLinkLabel?.(link.id) }}
        />
        <path d={d} fill="none" stroke={LINK_COLOR} strokeWidth={0.7} strokeLinecap="round" strokeOpacity={0.3} />
        {link.label && (
          <g
            style={{ cursor: 'pointer' }}
            pointerEvents="all"
            onDoubleClick={e => { e.stopPropagation(); onEditLinkLabel?.(link.id) }}
          >
            <rect
              x={labelX} y={labelY}
              width={labelW} height={17}
              rx={8.5}
              fill={theme.nodeBg}
              stroke={LINK_COLOR}
              strokeOpacity={0.4}
            />
            <text
              x={midX} y={labelY + 12}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fontFamily="Plus Jakarta Sans, sans-serif"
              fill={LINK_COLOR}
            >
              {link.label}
            </text>
          </g>
        )}
        {/* Delete button — only while hovering the link */}
        {onDeleteLink && hovered && (
          <g
            style={{ cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); onDeleteLink(link.id) }}
            pointerEvents="all"
          >
            <circle cx={delX} cy={delY} r={8} fill={theme.nodeBg} stroke={LINK_COLOR} strokeOpacity={0.5} />
            <line x1={delX - 3} y1={delY - 3} x2={delX + 3} y2={delY + 3} stroke={LINK_COLOR} strokeWidth="1.5" strokeLinecap="round"/>
            <line x1={delX + 3} y1={delY - 3} x2={delX - 3} y2={delY + 3} stroke={LINK_COLOR} strokeWidth="1.5" strokeLinecap="round"/>
          </g>
        )}
      </g>
    )
  })

  return (
    <svg
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }}
    >
      <defs>
        <style>{`@keyframes edgeGrow { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }`}</style>
      </defs>
      {edges}
      <g style={{ pointerEvents: 'all' }}>{linkElements}</g>
    </svg>
  )
})
