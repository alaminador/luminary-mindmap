import React, { useState, useRef, useEffect } from 'react'
import { Sidebar, CaretLeft, Graph, DotsThreeVertical, PencilSimple, Copy, Trash } from '@phosphor-icons/react'
import type { AppTheme as Theme } from '../lib/themes'
import { ACCENT, DANGER, BLUR_STRONG, PANEL_WIDTH, TOOLBAR_HEIGHT } from '../lib/tokens'

export interface Page {
  id: string
  name: string
  /** Present at runtime (PageData) — used for the node-count badge */
  nodes?: unknown[]
}

interface Props {
  pages: Page[]
  activeId: string
  theme: Theme
  open: boolean
  /** When true, the panel renders as an off-canvas drawer (mobile) */
  mobile?: boolean
  onToggleOpen: () => void
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onReorder: (newIds: string[]) => void
}

function PageItem({
  page, isActive, theme, onSelect, onRename, onDelete, onDuplicate,
}: {
  page: Page
  isActive: boolean
  theme: Theme
  onSelect: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(page.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(page.name)
      setTimeout(() => { inputRef.current?.select() }, 0)
    }
  }, [editing, page.name])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const commit = () => {
    const trimmed = draft.trim()
    onRename(trimmed || page.name)
    setEditing(false)
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 8,
        cursor: 'pointer',
        background: isActive
          ? `${ACCENT}22`
          : 'transparent',
        border: isActive
          ? `1.5px solid ${ACCENT}55`
          : '1.5px solid transparent',
        transition: 'background 0.12s, border-color 0.12s',
        userSelect: 'none',
      }}
      onClick={() => { if (!editing) onSelect() }}
      onDoubleClick={() => setEditing(true)}
    >
      {/* Page icon */}
      <div style={{
        width: 28,
        height: 36,
        borderRadius: 4,
        background: isActive ? `${ACCENT}33` : theme.canvasBg,
        border: `1px solid ${isActive ? ACCENT + '66' : theme.border}`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        color: isActive ? ACCENT : theme.textMuted,
        fontWeight: 600,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}>
        <Graph size={14} color={isActive ? theme.palette[0] : theme.textMuted} weight={isActive ? 'fill' : 'regular'} />
      </div>

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') { setEditing(false); setDraft(page.name) }
              e.stopPropagation()
            }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              background: theme.toolbarBg,
              border: `1.5px solid ${theme.palette[0]}`,
              borderRadius: 4,
              padding: '1px 4px',
              fontSize: 12,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              color: theme.textPrimary,
              outline: 'none',
            }}
          />
        ) : (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6, minWidth: 0,
          }}>
            <span style={{
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? theme.textPrimary : theme.textMuted,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {page.name}
            </span>
            {page.nodes !== undefined && (
              <span style={{
                fontSize: 9.5, fontWeight: 700,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                color: isActive ? ACCENT : theme.textMuted,
                background: isActive ? `${ACCENT}18` : theme.canvasBg,
                border: `1px solid ${isActive ? ACCENT + '40' : theme.border}`,
                borderRadius: 8, padding: '0.5px 5px',
                flexShrink: 0, lineHeight: 1.5,
              }}>
                {page.nodes.length}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Context menu button */}
      {!editing && (
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
          style={{
            width: 20, height: 20, borderRadius: 4, border: 'none',
            background: 'transparent', cursor: 'pointer',
            color: theme.textMuted,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, flexShrink: 0,
            opacity: menuOpen ? 1 : 0,
          }}
          className="page-menu-btn"
        >
          <DotsThreeVertical size={13} weight="bold" />
        </button>
      )}

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 9999,
            background: theme.toolbarBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            padding: 4,
            minWidth: 140,
          }}
          onClick={e => e.stopPropagation()}
        >
          {[
            { label: 'Rename', icon: <PencilSimple size={12} />, action: () => { setMenuOpen(false); setEditing(true) } },
            { label: 'Duplicate', icon: <Copy size={12} />, action: () => { setMenuOpen(false); onDuplicate() } },
            { label: 'Delete', icon: <Trash size={12} />, action: () => { setMenuOpen(false); onDelete() }, danger: true },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '6px 8px',
                background: 'transparent', border: 'none', borderRadius: 5,
                cursor: 'pointer',
                fontSize: 12, fontFamily: 'Plus Jakarta Sans, sans-serif',
                color: item.danger ? DANGER : theme.textPrimary,
                textAlign: 'left',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export const PagesPanel: React.FC<Props> = ({
  pages, activeId, theme, open, mobile, onToggleOpen, onSelect, onAdd, onRename, onDelete, onDuplicate, onReorder,
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  if (!open) {
    return (
      <button
        onClick={onToggleOpen}
        title="Show pages"
        style={{
          position: 'absolute', left: 10, top: 62, zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 6,
          background: theme.toolbarBg,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${theme.border}`,
          borderRadius: 8, padding: '6px 10px',
          cursor: 'pointer', color: theme.textMuted,
          fontSize: 11, fontWeight: 600,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
        }}
      >
        <Sidebar size={12} weight="bold" />
        Pages
      </button>
    )
  }

  return (
    <>
      {/* Mobile drawer scrim */}
      {mobile && (
        <div
          onClick={onToggleOpen}
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'rgba(0,0,0,0.4)',
            animation: 'fadeScrim 150ms ease forwards',
          }}
        />
      )}
      <div
      style={{
        position: 'absolute',
        left: 0,
        top: TOOLBAR_HEIGHT,
        width: PANEL_WIDTH,
        height: `calc(100vh - ${TOOLBAR_HEIGHT}px)`,
        background: theme.panelBg,
        borderRight: `1px solid ${theme.border}`,
        backdropFilter: BLUR_STRONG,
        WebkitBackdropFilter: BLUR_STRONG,
        zIndex: mobile ? 101 : 100,
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'all',
        ...(mobile ? { animation: 'slideDrawer 200ms cubic-bezier(0.22,1,0.36,1) forwards' } : {}),
      }}
      // Prevent canvas interactions from bleeding through
      onPointerDown={e => e.stopPropagation()}
      onMouseMove={e => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        padding: '12px 12px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${theme.border}`,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: theme.textMuted,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          Pages
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={onToggleOpen}
          title="Hide pages panel"
          style={{
            width: 22, height: 22, borderRadius: 5, border: 'none',
            background: 'transparent',
            color: theme.textMuted,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}
        >
          <CaretLeft size={11} weight="bold" />
        </button>
        <button
          onClick={onAdd}
          title="Add page"
          style={{
            width: 22, height: 22, borderRadius: 5, border: 'none',
            background: theme.groupBg,
            color: theme.textMuted,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, lineHeight: 1, padding: 0,
            fontWeight: 300,
          }}
        >
          +
        </button>
        </div>
      </div>

      {/* Page list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        <style>{`.page-item:hover .page-menu-btn { opacity: 1 !important; }`}</style>
        {pages.map((page, idx) => (
          <div
            key={page.id}
            className="page-item"
            draggable
            onDragStart={() => setDraggedId(page.id)}
            onDragOver={e => { e.preventDefault(); setOverIndex(idx) }}
            onDragEnd={() => { setDraggedId(null); setOverIndex(null) }}
            onDrop={e => {
              e.preventDefault()
              if (!draggedId || draggedId === page.id) { setDraggedId(null); setOverIndex(null); return }
              const fromIdx = pages.findIndex(p => p.id === draggedId)
              const newOrder = [...pages]
              const [moved] = newOrder.splice(fromIdx, 1)
              newOrder.splice(idx, 0, moved)
              onReorder(newOrder.map(p => p.id))
              setDraggedId(null)
              setOverIndex(null)
            }}
            style={{
              borderTop: overIndex === idx && draggedId !== page.id ? `2px solid ${theme.palette[0]}` : '2px solid transparent',
              opacity: draggedId === page.id ? 0.4 : 1,
              transition: 'opacity 0.12s',
            }}
          >
            <PageItem
              page={page}
              isActive={page.id === activeId}
              theme={theme}
              onSelect={() => onSelect(page.id)}
              onRename={name => onRename(page.id, name)}
              onDelete={() => onDelete(page.id)}
              onDuplicate={() => onDuplicate(page.id)}
            />
          </div>
        ))}
      </div>

      {/* Footer: page count */}
      <div style={{
        padding: '8px 12px',
        borderTop: `1px solid ${theme.border}`,
        fontSize: 11,
        color: theme.textMuted,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        flexShrink: 0,
      }}>
        {pages.length} {pages.length === 1 ? 'page' : 'pages'}
      </div>
    </div>
    </>
  )
}
