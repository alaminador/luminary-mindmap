import React, { useState, useCallback } from 'react'
import { X, Play, CaretUp, CaretDown, Eye, MapPin } from '@phosphor-icons/react'
import type { MindNode, Layer } from '../lib/mindmap'
import type { AppTheme } from '../lib/themes'
import { RADIUS_CARD, RADIUS_BASE, SHADOW_LG, BLUR_STRONG, LABEL_SMALL, LABEL_MEDIUM, SPACE_2, SPACE_3, SPACE_4, SPACE_5, SPACE_6, SPACE_7, SPACE_8 } from '../lib/tokens'

export interface PresentStop {
  id: string
  type: 'node' | 'layer' | 'overview'
  targetId?: string
  zoom: number
  dwell: number
}

interface Props {
  theme: AppTheme
  nodes: MindNode[]
  layers: Layer[]
  stops: PresentStop[]
  onStopsChange: (stops: PresentStop[]) => void
  onPlay: () => void
  onStop: () => void
}

let _stopCounter = 0
function makeStopId(): string {
  _stopCounter++
  return 'stop' + _stopCounter
}

export const PresentPanel: React.FC<Props> = ({
  theme: t, nodes, layers, stops, onStopsChange, onPlay, onStop,
}) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const addStop = useCallback((type: PresentStop['type'], targetId?: string) => {
    const zoom = type === 'overview' ? 0.6 : 1.2
    const newStop: PresentStop = {
      id: makeStopId(),
      type,
      targetId: type === 'overview' ? undefined : targetId,
      zoom,
      dwell: type === 'overview' ? 2 : 4,
    }
    onStopsChange([...stops, newStop])
  }, [stops, onStopsChange])

  const removeStop = useCallback((idx: number) => {
    onStopsChange(stops.filter((_, i) => i !== idx))
  }, [stops, onStopsChange])

  const updateStop = useCallback((idx: number, patch: Partial<PresentStop>) => {
    onStopsChange(stops.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }, [stops, onStopsChange])

  const moveStop = useCallback((idx: number, dir: -1 | 1) => {
    const next = idx + dir
    if (next < 0 || next >= stops.length) return
    const reordered = [...stops]
    ;[reordered[idx], reordered[next]] = [reordered[next], reordered[idx]]
    onStopsChange(reordered)
  }, [stops, onStopsChange])

  const getStopLabel = (stop: PresentStop): string => {
    if (stop.type === 'overview') return 'Overview'
    if (stop.type === 'node') {
      const node = nodes.find(n => n.id === stop.targetId)
      return node?.title || 'Unknown node'
    }
    if (stop.type === 'layer') {
      const layer = layers.find(l => l.id === stop.targetId)
      return layer?.name || 'Layer'
    }
    return 'Stop'
  }

  const S = (n: number) => n + 'px'

  return (
    <div
      onPointerDown={e => e.stopPropagation()}
      style={{
        position: 'absolute', bottom: S(SPACE_8), left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        display: 'flex', flexDirection: 'column', gap: S(SPACE_5),
        background: t.panelBg,
        backdropFilter: BLUR_STRONG,
        WebkitBackdropFilter: BLUR_STRONG,
        border: '1px solid ' + t.border,
        borderRadius: RADIUS_CARD,
        boxShadow: SHADOW_LG,
        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
        maxHeight: '60vh',
        width: 480,
        maxWidth: '90vw',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: S(SPACE_6) + ' ' + S(SPACE_7) + ' ' + S(SPACE_4),
        borderBottom: '1px solid ' + t.border,
      }}>
        <div>
          <span style={{ fontSize: LABEL_MEDIUM.size, fontWeight: 700, color: t.textPrimary }}>
            Presentation Path
          </span>
          <span style={{ fontSize: LABEL_SMALL.size, color: t.textMuted, marginLeft: S(SPACE_5) }}>
            {stops.length} stop{stops.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: S(SPACE_3) }}>
          <button onClick={() => setCollapsed(v => !v)} style={{
            padding: S(SPACE_3) + ' ' + S(SPACE_5),
            border: '1px solid ' + t.border, borderRadius: RADIUS_BASE,
            background: 'transparent', cursor: 'pointer',
            color: t.textMuted, fontSize: LABEL_SMALL.size, fontWeight: 600,
            fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
          }}>
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          {stops.length > 0 && (
            <button onClick={onPlay} style={{
              padding: S(SPACE_3) + ' ' + S(SPACE_6),
              border: 'none', borderRadius: RADIUS_BASE,
              background: t.rootColor, cursor: 'pointer',
              color: '#fff', fontSize: LABEL_SMALL.size, fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
              display: 'flex', alignItems: 'center', gap: S(SPACE_3),
            }}>
              <Play size={12} weight="fill" /> Play
            </button>
          )}
          <button onClick={onStop} aria-label="Close" style={{
            width: 24, height: 24, borderRadius: RADIUS_BASE,
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Stops list */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: S(SPACE_5) + ' ' + S(SPACE_7),
            display: 'flex', flexDirection: 'column', gap: S(SPACE_3),
          }}>
            {stops.length === 0 && (
              <div style={{ textAlign: 'center', padding: S(SPACE_7) + ' 0', color: t.textMuted, fontSize: LABEL_MEDIUM.size }}>
                Add stops to build your presentation path
              </div>
            )}
            {stops.map((stop, idx) => (
              <div
                key={stop.id}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx === null || dragIdx === idx) { setDragIdx(null); return }
                  const reordered = [...stops]
                  const [moved] = reordered.splice(dragIdx, 1)
                  reordered.splice(idx, 0, moved)
                  onStopsChange(reordered)
                  setDragIdx(null)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: S(SPACE_5),
                  padding: S(SPACE_5) + ' ' + S(SPACE_6),
                  border: '1px solid ' + t.border,
                  borderRadius: RADIUS_BASE,
                  background: 'transparent',
                  cursor: dragIdx === idx ? 'grabbing' : 'default',
                  opacity: dragIdx === idx ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: LABEL_SMALL.size, fontWeight: 700, color: t.textMuted, width: 20, textAlign: 'center' }}>
                  {idx + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: t.textPrimary, fontWeight: 500 }}>
                    {getStopLabel(stop)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: S(SPACE_3) }}>
                  <label style={{ fontSize: LABEL_SMALL.size, color: t.textMuted }}>Zoom</label>
                  <input
                    type="range" min="0.3" max="2.5" step="0.1"
                    value={stop.zoom}
                    onChange={e => updateStop(idx, { zoom: parseFloat(e.target.value) })}
                    style={{ width: 60 }}
                  />
                  <label style={{ fontSize: LABEL_SMALL.size, color: t.textMuted }}>Dwell</label>
                  <input
                    type="number" min="0" max="30" step="1"
                    value={stop.dwell}
                    onChange={e => updateStop(idx, { dwell: parseInt(e.target.value) || 0 })}
                    style={{
                      width: 40, padding: S(SPACE_2) + ' ' + S(SPACE_3),
                      border: '1px solid ' + t.border, borderRadius: RADIUS_BASE,
                      background: 'transparent', color: t.textPrimary,
                      fontSize: LABEL_SMALL.size, fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 1 }}>
                  <button onClick={() => moveStop(idx, -1)} aria-label="Move up" style={iconBtn(t)}><CaretUp size={10} weight="bold" /></button>
                  <button onClick={() => moveStop(idx, 1)} aria-label="Move down" style={iconBtn(t)}><CaretDown size={10} weight="bold" /></button>
                  <button onClick={() => removeStop(idx)} aria-label="Remove" style={iconBtn(t)}><X size={10} weight="bold" /></button>
                </div>
              </div>
            ))}
          </div>

          {/* Add stop controls */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: S(SPACE_5),
            padding: S(SPACE_4) + ' ' + S(SPACE_7) + ' ' + S(SPACE_6),
            borderTop: '1px solid ' + t.border,
          }}>
            <span style={{ fontSize: LABEL_SMALL.size, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Add
            </span>
            <button onClick={() => addStop('overview')} style={miniBtn(t, false)}>
              <Eye size={11} /> Overview
            </button>
            {nodes[0] && (
              <button onClick={() => addStop('node', nodes[0].id)} style={miniBtn(t, false)}>
                <MapPin size={11} /> {nodes[0].title}
              </button>
            )}
            {layers.map(layer => (
              <button key={layer.id} onClick={() => addStop('layer', layer.id)} style={miniBtn(t, false)}>
                {layer.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function iconBtn(t: AppTheme) {
  return {
    width: 20, height: 20, borderRadius: 3, border: 'none',
    background: 'transparent', cursor: 'pointer', color: t.textMuted,
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 0,
  }
}

function miniBtn(t: AppTheme, _active: boolean) {
  return {
    padding: S2(3) + ' ' + S2(5),
    border: '1px solid ' + t.border, borderRadius: RADIUS_BASE,
    background: 'transparent', cursor: 'pointer',
    color: t.textPrimary, fontSize: LABEL_SMALL.size, fontWeight: 500,
    fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
    display: 'flex' as const, alignItems: 'center' as const, gap: S2(2),
  }
}

function S2(n: number) { return n + 'px' }
