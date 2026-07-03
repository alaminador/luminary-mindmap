export interface Camera {
  panX: number
  panY: number
  panZ: number
  zoom: number
  rotX: number
  rotY: number
  perspective: number
}

export interface Projected {
  x: number
  y: number
  scale: number
  visible: boolean
  depth: number // 0=front 1=far
}

export function project(
  point: { x: number; y: number; z: number },
  camera: Camera,
  viewport: { width: number; height: number }
): Projected {
  // Mirror CSS transform order:
  // translate(-50%,-50%) translate3d(panX,panY,panZ) scale(zoom) rotateX(rotX) rotateY(rotY)
  // then each node is at translate3d(x,y,z) counter-rotated by -rotY then -rotX

  // 1. Node local position in world space after counter-rotation (billboard):
  //    counter-rotation cancels the world rotation, so node sits at (node.x, node.y, node.z)
  //    in world coords. Apply world transform to get camera-space position.

  // World transform: scale -> rotateX -> rotateY -> translate(panX,panY,panZ) -> center
  // But CSS order is: translate(pan) scale rotX rotY applied to the world div.
  // Node world position (before camera tilt): p = (node.x * zoom, node.y * zoom, node.z * zoom)
  // After rotY:
  const cosY = Math.cos(camera.rotY)
  const sinY = Math.sin(camera.rotY)
  const cosX = Math.cos(camera.rotX)
  const sinX = Math.sin(camera.rotX)

  const sx = point.x * camera.zoom
  const sy = point.y * camera.zoom
  const sz = point.z * camera.zoom

  // rotateY
  const rx1 = sx * cosY - sz * sinY
  const ry1 = sy
  const rz1 = sx * sinY + sz * cosY

  // rotateX
  const rx2 = rx1
  const ry2 = ry1 * cosX - rz1 * sinX
  const rz2 = ry1 * sinX + rz1 * cosX

  // translate by pan (already in screen space)
  const tx = rx2 + camera.panX
  const ty = ry2 + camera.panY
  const tz = rz2 + camera.panZ

  const fov = camera.perspective
  const d = fov + tz
  if (d <= 0) return { x: 0, y: 0, scale: 0, visible: false, depth: 1 }

  const scale = fov / d
  const sx2 = tx * scale + viewport.width / 2
  const sy2 = ty * scale + viewport.height / 2

  // Depth: normalize based on panZ range for opacity calcs
  const depth = Math.max(0, Math.min(1, (-tz + 200) / 600))

  return { x: sx2, y: sy2, scale, visible: true, depth }
}
