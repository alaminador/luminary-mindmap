import React, { useEffect, useRef } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import type { AppTheme } from '../lib/themes'

interface CrossPageResult {
  pageId: string
  pageName: string
  nodeId: string
  nodeTitle: string
}

interface Props {
  query: string
  onChange: (q: string) => void
  onClose: () => void
  theme: AppTheme
  crossPageResults?: CrossPageResult[]
  onCrossPageSelect?: (pageId: string, nodeId: string) => void
}

export const SearchBar: React.FC<Props> = ({ query, onChange, onClose, theme, crossPageResults, onCrossPageSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const hasResults = crossPageResults && crossPageResults.length > 0

  return (
    <div
      style={{
        position: 'absolute',
        top: 64,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}
    >
      {/* Search input row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: theme.panelBg,
          border: `1px solid ${theme.border}`,
          borderRadius: hasResults ? '8px 8px 0 0' : 8,
          padding: '6px 10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        }}
      >
        <MagnifyingGlass size={14} color={theme.textMuted} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => onChange(e.target.value)}
          placeholder="Search nodes…"
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            fontWeight: 500,
            color: theme.nodeTextPrimary,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            width: 200,
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') { e.stopPropagation(); onClose() }
          }}
        />
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            color: theme.textMuted, display: 'flex', alignItems: 'center',
          }}
        >
          <X size={12} weight="bold" />
        </button>
      </div>

      {/* Cross-page results dropdown */}
      {hasResults && (
        <div style={{
          background: theme.panelBg,
          border: `1px solid ${theme.border}`,
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          maxHeight: 240,
          overflowY: 'auto',
        }}>
          <div style={{
            padding: '6px 10px 4px',
            fontSize: 10,
            fontWeight: 700,
            color: theme.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            borderBottom: `1px solid ${theme.border}`,
          }}>
            Other pages
          </div>
          {crossPageResults!.map((r, i) => (
            <div
              key={`${r.pageId}-${r.nodeId}-${i}`}
              onClick={() => onCrossPageSelect?.(r.pageId, r.nodeId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: 12,
                color: theme.nodeTextPrimary,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.groupBg)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: theme.textMuted,
                background: theme.canvasBg,
                border: `1px solid ${theme.border}`,
                borderRadius: 4,
                padding: '1px 5px',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}>
                {r.pageName}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.nodeTitle || 'Untitled'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
