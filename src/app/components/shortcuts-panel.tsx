import React, { useState, useEffect } from 'react'
import { List, X } from '@phosphor-icons/react'
import type { AppTheme } from '../lib/themes'
import { OVERLAY_EASING } from '../lib/tokens'

const GROUPS = [
  {
    label: 'Nodes',
    items: [
      { key: 'Tab',        label: 'Add child node' },
      { key: 'Enter',      label: 'Add sibling node' },
      { key: '⇧ Enter',   label: 'Edit description' },
      { key: 'Space',      label: 'Edit title' },
      { key: 'E',          label: 'Set emoji' },
      { key: 'L',          label: 'Draw link to another node' },
      { key: 'Del',        label: 'Delete node' },
    ],
  },
  {
    label: 'Navigation',
    items: [
      { key: '← ↑ ↓ →',  label: 'Navigate nodes' },
      { key: 'Esc',        label: 'Deselect all' },
      { key: 'R',          label: 'Reset view' },
      { key: 'F',          label: 'Fit to screen' },
      { key: 'S',          label: 'Fit selection' },
      { key: 'O',          label: 'Space out (auto-arrange)' },
      { key: 'P',          label: 'Presentation mode' },
      { key: '⌘F',        label: 'Search' },
    ],
  },
  {
    label: 'History',
    items: [
      { key: '⌘Z',        label: 'Undo' },
      { key: '⌘⇧Z',      label: 'Redo' },
    ],
  },
  {
    label: 'Mouse',
    items: [
      { key: 'Dbl-click',   label: 'Add child node' },
      { key: 'Right-click', label: 'Color & emoji menu' },
      { key: '⇧ Click',    label: 'Multi-select' },
      { key: '⇧ Drag',     label: 'Rubber-band select' },
      { key: 'Drag to node', label: 'Re-parent node' },
      { key: 'Drag',        label: 'Pan / move node' },
      { key: '⌘ Scroll',   label: 'Zoom in / out' },
    ],
  },
]

const LS_KEY = 'mindmap-shortcuts-open'

interface Props {
  theme: AppTheme
  /** When true, the panel is suppressed (e.g. another overlay is open) */
  suppressed?: boolean
}

export const ShortcutsPanel: React.FC<Props> = ({ theme: t, suppressed }) => {
  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(LS_KEY) !== 'false' } catch { return true }
  })

  // Close when suppressed (e.g. Settings modal opens)
  useEffect(() => {
    if (suppressed && open) setOpen(false)
  }, [suppressed])

  // First session: panel starts open as a primer, but defaults to closed from
  // the next session onward (unless the user explicitly re-opens it).
  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY) === null) localStorage.setItem(LS_KEY, 'false')
    } catch { /* ignore */ }
  }, [])

  const toggle = () => setOpen(v => {
    const next = !v
    try { localStorage.setItem(LS_KEY, String(next)) } catch { /* ignore */ }
    return next
  })

  return (
    <div
      style={{
        position: 'absolute', bottom: 16, right: 16, zIndex: 600,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
        maxHeight: 'calc(100vh - 80px)',
      }}
    >
      {open && (
        <div
          style={{
            background: t.panelBg,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: '12px 14px 10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            minWidth: 218,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            animation: `overlayIn 150ms ${OVERLAY_EASING} forwards`,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{
              fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: t.textMuted,
            }}>
              Keyboard Shortcuts
            </span>
            <button
              tabIndex={-1}
              onClick={toggle}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                color: t.textMuted, borderRadius: 4, lineHeight: 1, fontSize: 14,
              }}
              title="Close shortcuts"
            >
              <X size={12} weight="bold" />
            </button>
          </div>

          {/* Groups */}
          {GROUPS.map((group, gi) => (
            <div key={group.label} style={{ marginTop: gi === 0 ? 0 : 8 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: t.textMuted,
                opacity: 0.55,
                marginBottom: 4,
              }}>
                {group.label}
              </div>
              {group.items.map(s => (
                <div
                  key={s.key}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 10, marginBottom: 3,
                  }}
                >
                  <kbd style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 10, fontWeight: 700,
                    background: t.groupBg,
                    border: `1px solid ${t.border}`,
                    borderRadius: 4,
                    padding: '1.5px 5px',
                    color: t.textPrimary,
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.01em',
                    flexShrink: 0,
                  }}>
                    {s.key}
                  </kbd>
                  <span style={{
                    fontSize: 11, color: t.textMuted,
                    textAlign: 'right', lineHeight: 1.3,
                  }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Toggle pill */}
      <button
        tabIndex={-1}
        onClick={toggle}
        title={open ? 'Hide shortcuts' : 'Show shortcuts'}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: t.panelBg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${t.border}`,
          borderRadius: 8, padding: '5px 10px',
          cursor: 'pointer', color: t.textMuted,
          fontSize: 11, fontWeight: 600,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
          transition: 'background 0.12s',
        }}
      >
        <List size={12} color={t.textMuted} weight="bold" />
        {open ? 'Hide' : 'Shortcuts'}
      </button>
    </div>
  )
}
