import { useState, useEffect } from 'react'
import { BREAKPOINT_SM, BREAKPOINT_MD, BREAKPOINT_LG } from './tokens'

export interface Breakpoints {
  /** ≥ 640px — minimap visible */
  sm: boolean
  /** ≥ 768px — pages panel inline (vs drawer) */
  md: boolean
  /** ≥ 900px — toolbar fully expanded */
  lg: boolean
}

/**
 * Returns boolean flags for the three design breakpoints.
 * Reads window.innerWidth on mount and updates on resize.
 */
export function useBreakpoints(): Breakpoints {
  const [bp, setBp] = useState<Breakpoints>(() => read())

  useEffect(() => {
    const onResize = () => setBp(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return bp
}

function read(): Breakpoints {
  const w = window.innerWidth
  return {
    sm: w >= BREAKPOINT_SM,
    md: w >= BREAKPOINT_MD,
    lg: w >= BREAKPOINT_LG,
  }
}
