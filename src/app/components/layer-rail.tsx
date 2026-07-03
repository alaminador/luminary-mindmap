import React, { useState, useRef, useCallback } from 'react'
import { Plus, X, CaretUp, CaretDown } from '@phosphor-icons/react'
import type { Layer } from '../lib/mindmap'
import type { AppTheme } from '../lib/themes'
import { RADIUS_BASE, RADIUS_CARD, SHADOW_FLOATING, BLUR_STRONG, LABEL_SMALL, LABEL_MEDIUM, SPACE_2, SPACE_3, SPACE_5, SPACE_6, SPACE_8 } from '../lib/tokens'

interface Props {
  theme: AppTheme
  layers: Layer[]
  activeLayerId: string | null
  onSelect: (layerId: string) => void
  onAdd: () => void
  onRename: (layerId: string, name: string) => void
  onDelete: (layerId: string) => void
  onReorder: (layers: Layer[]) => void
  onAssignNode: (layerId: string) => void
}

export const LayerRail: React.FC<Props> = ({
  theme: t, layers, activeLayerId, onSelect, onAdd, onRename, onDelete, onReorder, onAssignNode,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const startRename = useCallback((layer: Layer) => {
    setEditingId(layer.id)
    setDraft(layer.name)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [])

  const commitRename = useCallback(() => {
    if (editingId && draft.trim()) onRename(editingId, draft.trim())
    setEditingId(null)
  }, [editingId, draft, onRename])

  const moveLayer = useCallback((id: string, dir: -1 | 1) => {
    const idx = layers.findIndex(l => l.id === id)
    const next = idx + dir
    if (next < 0 || next >= layers.length) return
    const reordered = [...layers]
    ;[reordered[idx], reordered[next]] = [reordered[next], reordered[idx]]
    // Re-space z values evenly
    const spacing = 120
    reordered.forEach((l, i) => { l.z = (i - (reordered.length - 1) / 2) * spacing })
    onReorder(reordered)
  }, [layers, onReorder])

  // Front (highest z) at top, Back at bottom
  const ordered = [...layers].sort((a, b) => b.z - a.z)

  return (
    <div
      onPointerDown={e => e.stopPropagation()}
      style={{
        position: 'absolute', top: 60, right: SPACE_8, zIndex: 100,
        display: 'flex', flexDirection: 'column', gap: SPACE_3,
        background: `${t.toolbarBg}`,
        backdropFilter: BLUR_STRONG,
        WebkitBackdropFilter: BLUR_STRONG,
        border: `1px solid ${t.border}`,
        borderRadius: RADIUS_CARD,
        padding: `${SPACE_6}px ${SPACE_5}px`,
        boxShadow: SHADOW_FLOATING,
        minWidth: 140,
        maxWidth: 180,
        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: SPACE_3,
      }}>
        <span style={{
          fontSize: LABEL_SMALL.size, fontWeight: LABEL_SMALL.weight,
          letterSpacing: LABEL_SMALL.letterSpacing,
          color: t.textMuted, textTransform: 'uppercase',
        }}>
          Layers
        </span>
        <button
          onClick={onAdd}
          aria-label="Add layer"
          style={{
            width: 22, height: 22, borderRadius: RADIUS_BASE,
            border: `1px solid ${t.border}`, background: 'transparent',
            cursor: 'pointer', color: t.textMuted,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            fontSize: 14, lineHeight: 1,
          }}
        >
          <Plus size={12} weight="bold" />
        </button>
      </div>

      {ordered.map((layer, idx) => (
        <div
          key={layer.id}
          draggable={!editingId}
          onDragStart={() => setDragId(layer.id)}
          onDragOver={e => { e.preventDefault() }}
          onDrop={() => {
            if (!dragId || dragId === layer.id) return
            const dragIdx = layers.findIndex(l => l.id === dragId)
            const dropIdx = layers.findIndex(l => l.id === layer.id)
            const reordered = [...layers]
            const [moved] = reordered.splice(dragIdx, 1)
            reordered.splice(dropIdx, 0, moved)
            const spacing = 120
            reordered.forEach((l, i) => { l.z = (i - (reordered.length - 1) / 2) * spacing })
            onReorder(reordered)
            setDragId(null)
          }}
          onClick={() => onSelect(layer.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: SPACE_2,
            padding: `${SPACE_3}px ${SPACE_5}px`,
            borderRadius: RADIUS_BASE,
            background: activeLayerId === layer.id ? `${t.rootColor}18` : 'transparent',
            border: activeLayerId === layer.id ? `1px solid ${t.rootColor}40` : '1px solid transparent',
            cursor: dragId ? 'grabbing' : 'pointer',
            transition: 'background 0.1s',
            userSelect: 'none',
          }}
          onDoubleClick={() => startRename(layer)}
        >
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: layer.color ?? t.palette[idx % t.palette.length],
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingId === layer.id ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') setEditingId(null)
                  e.stopPropagation()
                }}
                onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', background: t.panelBg,
                  border: `1px solid ${t.rootColor}`, borderRadius: RADIUS_BASE,
                  padding: `${SPACE_2}px ${SPACE_3}px`,
                  fontSize: LABEL_MEDIUM.size, color: t.textPrimary,
                  fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                  outline: 'none',
                }}
              />
            ) : (
              <span style={{
                fontSize: LABEL_MEDIUM.size, fontWeight: 500,
                color: activeLayerId === layer.id ? t.textPrimary : t.textMuted,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                display: 'block',
              }}>
                {layer.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 1, flexShrink: 0, opacity: 0.6 }}>
            <button
              onClick={e => { e.stopPropagation(); moveLayer(layer.id, -1) }}
              aria-label="Move forward"
              style={{
                width: 18, height: 18, borderRadius: 3, border: 'none',
                background: 'transparent', cursor: 'pointer', color: t.textMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
            >
              <CaretUp size={10} weight="bold" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); moveLayer(layer.id, 1) }}
              aria-label="Move back"
              style={{
                width: 18, height: 18, borderRadius: 3, border: 'none',
                background: 'transparent', cursor: 'pointer', color: t.textMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
            >
              <CaretDown size={10} weight="bold" />
            </button>
            {layers.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(layer.id) }}
                aria-label="Delete layer"
                style={{
                  width: 18, height: 18, borderRadius: 3, border: 'none',
                  background: 'transparent', cursor: 'pointer', color: t.textMuted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}
              >
                <X size={9} weight="bold" />
              </button>
            )}
          </div>
        </div>
      ))}

      <div style={{
        marginTop: SPACE_2, padding: `${SPACE_3}px ${SPACE_5}px`,
        borderTop: `1px solid ${t.border}`,
      }}>
        <button
          onClick={() => activeLayerId && onAssignNode(activeLayerId)}
          disabled={!activeLayerId}
          style={{
            width: '100%', padding: `${SPACE_2}px`,
            border: 'none', borderRadius: RADIUS_BASE,
            background: activeLayerId ? `${t.rootColor}18` : 'transparent',
            color: activeLayerId ? t.textPrimary : t.textMuted,
            fontSize: LABEL_SMALL.size, fontWeight: 600,
            fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
            cursor: activeLayerId ? 'pointer' : 'default',
            textAlign: 'left',
          }}
        >
          Assign selected →
        </button>
      </div>
    </div>
  )
}
