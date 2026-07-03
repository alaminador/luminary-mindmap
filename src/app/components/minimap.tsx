import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import type { MindNode } from '../lib/mindmap'
import type { Camera } from '../lib/projection'
import type { AppTheme } from '../lib/themes'
import { RADIUS_CARD, SHADOW_MD, BLUR_SOFT } from '../lib/tokens'

const MM_W = 196
const MM_H = 128
const PAD  = 14

interface Props {
  nodes: MindNode[]
  camera: Camera
  viewport: { width: number; height: number }
  theme: AppTheme
  onNavigate: (panX: number, panY: number) => void
  onSelectNode?: (id: string) => void
}

export const Minimap: React.FC<Props> = ({ nodes, camera, viewport, theme, onNavigate, onSelectNode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ── World-space bounding box (with generous padding so nodes aren't at the edge)
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: -600, maxX: 600, minY: -400, maxY: 400 }
    const xs = nodes.map(n => n.x)
    const ys = nodes.map(n => n.y)
    const pad = 200
    return {
      minX: Math.min(...xs) - pad,
      maxX: Math.max(...xs) + pad,
      minY: Math.min(...ys) - pad,
      maxY: Math.max(...ys) + pad,
    }
  }, [nodes])

  // ── Uniform scale that fits the world into the inner minimap area
  const { mmScale, ox, oy } = useMemo(() => {
    const worldW = bounds.maxX - bounds.minX
    const worldH = bounds.maxY - bounds.minY
    const innerW = MM_W - PAD * 2
    const innerH = MM_H - PAD * 2
    const s = Math.min(innerW / worldW, innerH / worldH)
    // Centre the scaled world inside the minimap
    return {
      mmScale: s,
      ox: PAD + (innerW - worldW * s) / 2,
      oy: PAD + (innerH - worldH * s) / 2,
    }
  }, [bounds])

  const toMM = useCallback((wx: number, wy: number) => ({
    x: ox + (wx - bounds.minX) * mmScale,
    y: oy + (wy - bounds.minY) * mmScale,
  }), [ox, oy, bounds, mmScale])

  // ── Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    canvas.width  = Math.round(MM_W * dpr)
    canvas.height = Math.round(MM_H * dpr)
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, MM_W, MM_H)

    // ── Edges
    ctx.save()
    ctx.strokeStyle = theme.edgeColor
    ctx.lineWidth = 0.8
    ctx.globalAlpha = 0.45
    for (const node of nodes) {
      if (!node.parentId) continue
      const parent = nodes.find(n => n.id === node.parentId)
      if (!parent) continue
      const f = toMM(parent.x, parent.y)
      const t = toMM(node.x, node.y)
      ctx.beginPath()
      ctx.moveTo(f.x, f.y)
      ctx.lineTo(t.x, t.y)
      ctx.stroke()
    }
    ctx.restore()

    // ── Nodes
    for (const node of nodes) {
      const pos  = toMM(node.x, node.y)
      const r    = node.parentId === null ? 4.5 : 3
      const fill = node.colorIndex !== undefined
        ? theme.palette[node.colorIndex]
        : (node.color ?? (node.parentId === null ? theme.rootColor : theme.childColor))
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.globalAlpha = 0.85
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // ── Viewport rectangle
    const vpL = (-viewport.width  / 2 - camera.panX) / camera.zoom
    const vpR = ( viewport.width  / 2 - camera.panX) / camera.zoom
    const vpT = (-viewport.height / 2 - camera.panY) / camera.zoom
    const vpB = ( viewport.height / 2 - camera.panY) / camera.zoom

    const tl = toMM(vpL, vpT)
    const br = toMM(vpR, vpB)
    const rw = br.x - tl.x
    const rh = br.y - tl.y

    ctx.fillStyle   = 'rgba(0,123,255,0.07)'
    ctx.fillRect(tl.x, tl.y, rw, rh)
    ctx.strokeStyle = '#007BFF'
    ctx.lineWidth   = 1.5
    ctx.globalAlpha = 0.7
    ctx.strokeRect(tl.x, tl.y, rw, rh)
    ctx.globalAlpha = 1
  }, [nodes, camera, viewport, theme, toMM])

  // ── Navigation (click + drag)
  const navigate = useCallback((clientX: number, clientY: number, rect: DOMRect) => {
    const mx = clientX - rect.left
    const my = clientY - rect.top
    const worldX = bounds.minX + (mx - ox) / mmScale
    const worldY = bounds.minY + (my - oy) / mmScale
    onNavigate(-worldX * camera.zoom, -worldY * camera.zoom)
  }, [bounds, ox, oy, mmScale, camera.zoom, onNavigate])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    // Hit-test: if click lands within 8px of a node dot, select it instead of panning
    if (onSelectNode) {
      const HIT = 8
      let closest: { id: string; dist: number } | null = null
      for (const node of nodes) {
        const pos = toMM(node.x, node.y)
        const dist = Math.hypot(mx - pos.x, my - pos.y)
        if (dist < HIT && (!closest || dist < closest.dist)) {
          closest = { id: node.id, dist }
        }
      }
      if (closest) { onSelectNode(closest.id); return }
    }

    navigate(e.clientX, e.clientY, rect)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [navigate, nodes, toMM, onSelectNode])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!(e.buttons & 1)) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    navigate(e.clientX, e.clientY, rect)
  }, [navigate])

  return (
    <div
      style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 600,
        background: `${theme.toolbarBg}`,
        backdropFilter: BLUR_SOFT,
        WebkitBackdropFilter: BLUR_SOFT,
        border: `1px solid ${theme.border}40`,
        borderRadius: RADIUS_CARD,
        overflow: 'hidden',
        boxShadow: SHADOW_MD,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: MM_W, height: MM_H,
          display: 'block', cursor: 'crosshair',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
    </div>
  )
}
