import React, { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { Plus, X, CaretUp, CaretDown } from '@phosphor-icons/react'
import type { MindNode } from '../lib/mindmap'
import type { AppTheme } from '../lib/themes'
import { playShush } from '../lib/sounds'
import { SUCCESS, WARNING, LINK } from '../lib/tokens'


interface Props {
  node: MindNode
  isRoot: boolean
  isSelected: boolean
  /** Graph distance from nearest selected node. null = nothing selected. */
  distance: number | null
  editingId: string | null
  editingField: 'title' | 'description' | null
  screenX: number
  screenY: number
  scale: number
  depth: number
  isNew: boolean
  hasChildren: boolean
  nodeDepth: number
  isCollapsed: boolean
  isDying?: boolean
  isReparentTarget?: boolean
  isReparentSource?: boolean
  isLinkTarget?: boolean
  theme: AppTheme
  searchOverride?: boolean
  zFocus?: number
  onPointerDown: (e: React.PointerEvent, id: string) => void
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
  onTitleCommit: (id: string, value: string) => void
  onDescCommit: (id: string, value: string) => void
  onStartEdit: (id: string, field: 'title' | 'description') => void
  onMeasure: (id: string, w: number, h: number) => void
  onToggleCollapse: (id: string) => void
  onRemoveImage?: (id: string) => void
  /** Pointer-down on the "+" handle — starts a drag-to-place-child gesture */
  onChildDragStart?: (e: React.PointerEvent, parentId: string) => void
}

export const MindNodeCard = React.memo(function MindNodeCard({
  node, isRoot, isSelected, distance,
  editingId, editingField,
  screenX, screenY, scale, depth, isNew,
  hasChildren, nodeDepth, isCollapsed, isDying, isReparentTarget, isReparentSource, isLinkTarget, theme, searchOverride, zFocus,
  onPointerDown, onAddChild: _onAddChild, onDelete,
  onTitleCommit, onDescCommit, onStartEdit, onMeasure,
  onToggleCollapse, onRemoveImage, onChildDragStart,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const descRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const titleSaved = useRef(node.title)
  const descSaved = useRef(node.description ?? '')

  const isEditingTitle = editingId === node.id && editingField === 'title'
  const isEditingDesc  = editingId === node.id && editingField === 'description'

  useLayoutEffect(() => {
    if (cardRef.current) {
      onMeasure(node.id, cardRef.current.offsetWidth, cardRef.current.offsetHeight)
    }
  })

  useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      titleRef.current.focus()
      const sel = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(titleRef.current)
      sel?.removeAllRanges(); sel?.addRange(range)
    }
  }, [isEditingTitle])

  useEffect(() => {
    if (isEditingDesc && descRef.current) {
      descRef.current.focus()
      const sel = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(descRef.current)
      sel?.removeAllRanges(); sel?.addRange(range)
    }
  }, [isEditingDesc])


  // Graduated distance-based dimming
  // distance null → no selection → full opacity
  // distance 0 → selected           → full opacity
  // distance 1 → parent/child/sibling → full opacity (highlighted group)
  // distance 2+ → progressively faded, blurred, desaturated
  const DIST_LEVELS = [
    { opacity: 1.00, sat: 1.00, blur: 0.0 },  // 0 – selected
    { opacity: 1.00, sat: 1.00, blur: 0.0 },  // 1 – parent / children / siblings
    { opacity: 0.38, sat: 0.55, blur: 0.0 },  // 2 – background, noticeably faded
    { opacity: 0.18, sat: 0.25, blur: 0.0 },  // 3 – very dim ghost
    { opacity: 0.10, sat: 0.15, blur: 0.0 },  // 4+ – barely visible
  ]

  const d = distance === null ? -1 : Math.min(distance, 4)
  const distStyle = d < 0 ? { opacity: 1, sat: 1, blur: 0 } : DIST_LEVELS[d]

  // 3-D depth falloff — softer than before so far nodes stay legible
  const depthFalloff = depth > 0.6 ? 0.55 + (1 - depth) * 1.1 : 1
  let opacity  = distStyle.opacity * depthFalloff
  let sat      = distStyle.sat
  let blurVal  = distStyle.blur

  // Depth of field: blur nodes whose z differs from focused z-plane
  if (zFocus !== undefined && !isSelected) {
    const zDist = Math.abs((node.z ?? 0) - zFocus)
    if (zDist > 80) {
      const dofBlur = Math.min((zDist - 80) / 320 * 2.5, 2.5)
      blurVal = Math.max(blurVal, dofBlur)
    }
  }

  // Only nodes further than distance 1 get the dimmed visual treatment
  const isDimmed = distance !== null && distance > 1 && !isSelected

  const defaultBorder = isRoot ? theme.rootColor : theme.childColor
  // colorIndex takes priority (theme-adaptive); fall back to legacy hex, then default
  let borderColor = node.colorIndex !== undefined
    ? theme.palette[node.colorIndex]
    : (node.color ?? defaultBorder)
  // Selected: keep the node's own color (or default border) — don't override with blue
  if (isDimmed) borderColor = theme.nodeBorderDimmed
  if (searchOverride) borderColor = WARNING
  if (isReparentTarget) borderColor = SUCCESS
  if (isLinkTarget) borderColor = LINK

  // Convert a 6-digit hex to rgba for semi-transparent borders
  function hexAlpha(hex: string, a: number): string {
    const h = hex.replace('#', '')
    if (h.length !== 6) return hex
    return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`
  }

  const borderWidth = isSelected ? 2 : 1
  const borderOpacity = isSelected ? 1 : hovered ? 0.8 : isDimmed ? 0.35 : 0.55
  const resolvedBorder = `${borderWidth}px solid ${hexAlpha(borderColor, borderOpacity)}`

  const cardBg = theme.nodeBg
  const titleColor = isDimmed ? theme.nodeTextDimmed : theme.nodeTextPrimary
  const descColor  = isDimmed ? theme.nodeSecondaryDimmed : theme.nodeTextSecondary

  // ── Depth-based sizing ────────────────────────────────────────────────────
  // Font size reflects tree depth: parent is always visually bigger than children.
  // Siblings share the same depth → same base size.
  // The selected node gets a small +2 boost so it stands out from its siblings.
  const TITLE_BASE = [15.5, 14, 13, 12.5, 12]  // px per tree depth 0-4
  const DESC_BASE  = [11.5, 11, 10.5, 10,  9.5]
  const WIDTH_BASE = [275,  255, 238,  222, 210]

  const di = Math.min(nodeDepth, 4)
  const selectedBoost = isSelected ? 2 : 0
  const isEditing = isEditingTitle || isEditingDesc
  // Zoom-adaptive font: slightly smaller title when very zoomed out
  const scaledTitleFontSize = (!isEditing && scale < 0.38)
    ? (TITLE_BASE[di] + selectedBoost) * 0.88
    : TITLE_BASE[di] + selectedBoost
  const titleFontSize = scaledTitleFontSize
  const descFontSize  = DESC_BASE[di]
  const cardMaxWidth  = WIDTH_BASE[di]
  // Zoom-adaptive: hide description when too small
  const showDesc = isEditing || scale >= 0.55

  const titleEscapedRef = useRef(false)

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault(); e.stopPropagation(); titleRef.current?.blur()
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      titleEscapedRef.current = true
      if (titleRef.current) titleRef.current.textContent = titleSaved.current
      titleRef.current?.blur()
    } else { e.stopPropagation() }
  }, [])

  const handleTitleBlur = useCallback(() => {
    titleEscapedRef.current = false
    // textContent strips any HTML tags that may have been injected
    const val = (titleRef.current?.textContent ?? '').trim()
    if (!val) {
      // Never-titled node blurred without input → discard it
      if (!titleSaved.current) { onDelete(node.id); return }
      // Had a title before → restore it rather than wiping it
      if (titleRef.current) titleRef.current.textContent = titleSaved.current
      onTitleCommit(node.id, titleSaved.current)
      return
    }
    // Reset innerHTML to plain text so no stray markup lingers in the DOM
    if (titleRef.current) titleRef.current.textContent = val
    titleSaved.current = val
    onTitleCommit(node.id, val)
  }, [node.id, onDelete, onTitleCommit])

  const handleDescKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault(); e.stopPropagation(); descRef.current?.blur()
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      if (descRef.current) descRef.current.textContent = descSaved.current
      descRef.current?.blur()
    } else { e.stopPropagation() }
  }, [])

  const handleDescBlur = useCallback(() => {
    const val = (descRef.current?.textContent ?? '').trim()
    if (descRef.current) descRef.current.textContent = val
    descSaved.current = val
    onDescCommit(node.id, val)
  }, [node.id, onDescCommit])

  const showCollapseBtn = hasChildren && (isCollapsed || (hovered && isSelected))

  return (
    /* Outer: screen position only */
    <div
      style={{
        position: 'absolute', left: 0, top: 0,
        transform: `translate(${screenX}px, ${screenY}px) translate(-50%, -50%) scale(${scale}) translateZ(${hovered && !isDying ? 20 : 0}px)`,
        transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: isSelected ? 40 : hovered ? 35
          : distance === null ? 10          // default view — flat
          : distance <= 1    ? 20           // selected group — above dimmed
          : distance === 2   ? 6
          : distance === 3   ? 4
          : 2,                              // distance 4+ — furthest back
        willChange: 'transform',
      }}
    >
      {/* Inner: card appearance + entrance animation */}
      <div
        ref={cardRef}
        onPointerDown={e => onPointerDown(e, node.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation() }}
        className={isDying ? 'node-exit' : isNew ? 'node-enter' : undefined}
        style={{
          minWidth: 140, maxWidth: cardMaxWidth,
          padding: `10px 14px`,
          background: cardBg,
          borderRadius: 8,
          border: resolvedBorder,
          outline: isReparentTarget ? `2px dashed ${hexAlpha(borderColor, 0.7)}` : isReparentSource ? `2px dashed ${WARNING}` : isLinkTarget ? `2px solid ${LINK}55` : 'none',
          outlineOffset: isReparentTarget || isReparentSource ? 3 : 0,
          opacity,
          filter: `saturate(${sat}) blur(${blurVal}px)`,
          cursor: 'default',
          userSelect: 'none',
          transition: 'border-color 0.18s, box-shadow 0.18s, opacity 0.25s, filter 0.25s',
          boxShadow: isLinkTarget
            ? `0 0 0 2px rgba(139,92,246,0.5)`
            : isSelected
              ? `0 0 0 2.5px ${hexAlpha(borderColor, 0.22)}, 0 2px 10px ${hexAlpha(borderColor, 0.16)}`
              : hovered
                ? '0 12px 40px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.12)'
                : '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)',
          paddingBottom: showCollapseBtn ? 22 : 10,
        }}
      >

        {/* Add child hover button (right-center edge) */}
        {hovered && (distance === null || distance <= 1) && (
          <button
            onPointerDown={e => {
              e.stopPropagation()
              onChildDragStart?.(e, node.id)
            }}
            title="Add child (drag to place)"
            style={{
              position: 'absolute', right: -8, top: '50%',
              transform: 'translateY(-50%)',
              width: 16, height: 16, borderRadius: '50%',
              background: SUCCESS, border: '1.5px solid #fff',
              cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 30, boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
            }}
          >
            <Plus size={9} color="white" weight="bold" />
          </button>
        )}

        {/* Title row: emoji + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {node.emoji && (
            <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>
              {node.emoji}
            </span>
          )}
          <div style={{ position: 'relative', flex: 1 }}>
            <div
              ref={titleRef}
              className="heading"
              data-editing={isEditingTitle ? 'title' : undefined}
              contentEditable={isEditingTitle ? 'plaintext-only' : false}
              suppressContentEditableWarning
              onDoubleClick={e => e.stopPropagation()}
              onKeyDown={isEditingTitle ? handleTitleKeyDown : undefined}
              onBlur={isEditingTitle ? handleTitleBlur : undefined}
              style={{
                color: titleColor, outline: 'none',
                cursor: isEditingTitle ? 'text' : 'default',
                transition: 'color 0.2s',
                wordBreak: 'break-word',
                paddingRight: hovered && !isRoot ? 20 : 0,
                fontSize: titleFontSize,
                minHeight: '1.2em',
                // Clamp to 2 lines when not editing
                ...(isEditingTitle ? {
                  whiteSpace: 'pre-wrap',
                } : {
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                  overflow: 'hidden',
                }),
              }}
            >
              {node.title}
            </div>
            {!node.title && !isEditingTitle && (
              <span style={{
                position: 'absolute', inset: 0,
                color: theme.nodeTextDimmed, opacity: 1,
                fontStyle: 'italic', pointerEvents: 'none',
                fontSize: titleFontSize,
              }}>
                Untitled
              </span>
            )}
          </div>
        </div>

        {/* Image attachment */}
        {node.image && (
          <div style={{ position: 'relative', marginTop: 6 }}>
            <img
              src={node.image}
              alt=""
              draggable={false}
              style={{
                width: '100%', borderRadius: 7, display: 'block',
                border: `1px solid ${theme.border}`,
                userSelect: 'none',
              }}
            />
            {hovered && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onRemoveImage?.(node.id) }}
                title="Remove image"
                style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'rgba(15,23,42,0.65)', border: 'none',
                  cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={9} color="white" weight="bold" />
              </button>
            )}
          </div>
        )}

        {/* Description */}
        {showDesc && (node.description || isSelected) && (
          <div style={{ position: 'relative', marginTop: 2 }}>
            <div
              ref={descRef}
              className="caption"
              contentEditable={isEditingDesc ? 'plaintext-only' : false}
              suppressContentEditableWarning
              onDoubleClick={e => e.stopPropagation()}
              onClick={e => { if (isSelected && !isEditingDesc) { e.stopPropagation(); onStartEdit(node.id, 'description') } }}
              onKeyDown={isEditingDesc ? handleDescKeyDown : undefined}
              onBlur={isEditingDesc ? handleDescBlur : undefined}
              style={{
                color: node.description ? descColor : theme.nodeSecondaryDimmed,
                outline: 'none',
                cursor: isEditingDesc ? 'text' : 'default',
                transition: 'color 0.2s',
                wordBreak: 'break-word',
                fontStyle: node.description ? 'normal' : 'italic',
                fontSize: descFontSize,
                // Clamp to 3 lines when not editing
                ...(isEditingDesc ? {
                  whiteSpace: 'pre-wrap',
                } : {
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical' as const,
                  overflow: 'hidden',
                }),
              }}
            >
              {node.description || '+ add note'}
            </div>
            {/* Soft fade at the bottom when description is long and not editing */}
            {!isEditingDesc && node.description && node.description.length > 80 && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 14,
                background: `linear-gradient(to bottom, transparent, ${cardBg})`,
                pointerEvents: 'none',
              }} />
            )}
          </div>
        )}

        {/* URL chip */}
        {node.url && !isEditingTitle && !isEditingDesc && (
          <div
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); window.open(node.url, '_blank') }}
            title={node.url}
            style={{
              marginTop: 5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 10,
              color: theme.textMuted,
              cursor: 'pointer',
              background: theme.groupBg,
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              padding: '1.5px 6px',
              maxWidth: '100%',
              overflow: 'hidden',
            }}
          >
            <span style={{ fontSize: 10 }}>🔗</span>
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 160,
            }}>
              {node.url.replace(/^https?:\/\//, '')}
            </span>
          </div>
        )}

        {/* Collapse button — sits below the card, centred */}
        {showCollapseBtn && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); if (!isCollapsed) playShush(); onToggleCollapse(node.id) }}
            title={isCollapsed ? 'Expand subtree' : 'Collapse subtree'}
            style={{
              position: 'absolute', top: '100%', left: '50%',
              transform: 'translateX(-50%)',
              marginTop: 3,
              width: 18, height: 14, borderRadius: 4,
              background: theme.groupBg,
              border: `1px solid ${theme.border}`,
              cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 30,
            }}
          >
            {isCollapsed
              ? <CaretUp size={9} color={theme.textMuted} weight="bold" />
              : <CaretDown size={9} color={theme.textMuted} weight="bold" />}
          </button>
        )}

        {/* Depth fog — canvas-coloured veil that thickens as node recedes in z */}
        {(() => {
          const fullFog = depth > 0.35 ? Math.min((depth - 0.35) / 0.65 * 0.52, 0.52) : 0
          const fogOpacity = isSelected
            ? 0                              // selected: fully clear
            : hovered
              ? Math.min(fullFog, 0.14)      // hovering: always at most 14% — clearly visible but still hazy
              : fullFog                      // resting: full depth fog
          return fogOpacity > 0 ? (
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: 8,
              background: theme.canvasBg,
              opacity: fogOpacity,
              pointerEvents: 'none',
              transition: hovered
                ? 'opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1)'  // slow drift out of fog
                : 'opacity 0.25s ease-in',                         // quick return into fog
            }} />
          ) : null
        })()}

      </div>
    </div>
  )
})
