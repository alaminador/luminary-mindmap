import React, { useRef, useEffect } from 'react'
import type { Camera } from '../lib/projection'

interface Props {
  camera: Camera
  viewport: { width: number; height: number }
  isDark: boolean
  dotColor: string
}

export const DepthGrid = React.memo(function DepthGrid({ camera, viewport, isDark, dotColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = viewport
    canvas.width = width
    canvas.height = height

    ctx.clearRect(0, 0, width, height)

    // Draw perspective grid lines
    const cx = width / 2 + camera.panX * 0.12
    const cy = height / 2 + camera.panY * 0.12
    const numLines = 14
    const spread = Math.max(width, height) * 1.4
    const alpha = isDark ? 0.07 : 0.09

    // Parse dot color to rgb
    const hex = dotColor.replace('#', '').replace('rgba(', '').replace(')', '')
    let r = 100, g = 100, b = 100
    if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16) || 100
      g = parseInt(hex.slice(2, 4), 16) || 100
      b = parseInt(hex.slice(4, 6), 16) || 100
    }

    // Horizontal lines converging to vanishing point
    for (let i = 0; i <= numLines; i++) {
      const t = i / numLines
      const yStart = cy - spread * 0.5 + t * spread
      const lineAlpha = alpha * (0.4 + 0.6 * Math.abs(t - 0.5) * 2)
      ctx.beginPath()
      ctx.moveTo(cx - spread, yStart)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx + spread, yStart)
      ctx.strokeStyle = `rgba(${r},${g},${b},${lineAlpha})`
      ctx.lineWidth = 0.5
      ctx.stroke()
    }

    // Vertical lines converging to vanishing point
    for (let i = 0; i <= numLines; i++) {
      const t = i / numLines
      const xStart = cx - spread * 0.5 + t * spread
      const lineAlpha = alpha * (0.4 + 0.6 * Math.abs(t - 0.5) * 2)
      ctx.beginPath()
      ctx.moveTo(xStart, cy - spread)
      ctx.lineTo(cx, cy)
      ctx.lineTo(xStart, cy + spread)
      ctx.strokeStyle = `rgba(${r},${g},${b},${lineAlpha})`
      ctx.lineWidth = 0.5
      ctx.stroke()
    }

  }, [camera.panX, camera.panY, camera.panZ, viewport.width, viewport.height, isDark, dotColor])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 1,
      }}
    />
  )
})
