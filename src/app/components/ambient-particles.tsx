import React, { useRef, useEffect } from 'react'
import type { Camera } from '../lib/projection'

interface Particle {
  x: number   // 0-1 fraction of viewport width
  y: number   // 0-1 fraction of viewport height
  vx: number  // velocity x (fraction per frame)
  vy: number  // velocity y (fraction per frame)
  size: number // px
  opacity: number
  depth: number // 0=near, 1=far
}

interface Props {
  camera: Camera
  viewport: { width: number; height: number }
  color: string  // hex color for particles
}

function initParticles(count: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const depth = i / count
    particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00010,
      size: 1 + (1 - depth) * 2,
      opacity: 0.04 + (1 - depth) * 0.08,
      depth,
    })
  }
  return particles
}

export const AmbientParticles = React.memo(function AmbientParticles({ camera, viewport, color }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>(initParticles(55))
  const cameraRef = useRef(camera)
  const rafRef = useRef<number>(0)

  // Update camera ref without restarting the loop
  useEffect(() => { cameraRef.current = camera }, [camera])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const hex = color.replace('#', '')
    const r = parseInt(hex.slice(0,2), 16) || 150
    const g = parseInt(hex.slice(2,4), 16) || 150
    const b = parseInt(hex.slice(4,6), 16) || 150

    let prevPanX = cameraRef.current.panX
    let prevPanY = cameraRef.current.panY

    const draw = () => {
      const w = viewport.width
      const h = viewport.height
      canvas.width = w
      canvas.height = h
      ctx.clearRect(0, 0, w, h)

      const cam = cameraRef.current
      const camDx = cam.panX - prevPanX
      const camDy = cam.panY - prevPanY
      prevPanX = cam.panX
      prevPanY = cam.panY

      for (const p of particlesRef.current) {
        p.x += p.vx
        p.y += p.vy
        p.x -= (camDx * 0.00008) * (1 - p.depth)
        p.y -= (camDy * 0.00008) * (1 - p.depth)
        if (p.x < 0) p.x += 1
        if (p.x > 1) p.x -= 1
        if (p.y < 0) p.y += 1
        if (p.y > 1) p.y -= 1

        const sx = p.x * w
        const sy = p.y * h
        ctx.beginPath()
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity})`
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [viewport.width, viewport.height, color])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: viewport.width, height: viewport.height,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
})
