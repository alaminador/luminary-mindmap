import React from 'react'
import type { MindNode } from '../lib/mindmap'
import type { AppTheme } from '../lib/themes'

interface Props {
  nodes: MindNode[]
  selectedId: string
  theme: AppTheme
  onNavigate: (id: string) => void
}

export const Breadcrumb = React.memo(function Breadcrumb({ nodes, selectedId, theme: t, onNavigate }: Props) {
  // Build path from root to selectedId
  const path: MindNode[] = []
  let cur: MindNode | undefined = nodes.find(n => n.id === selectedId)
  while (cur) {
    path.unshift(cur)
    const parentId = cur.parentId
    cur = parentId ? nodes.find(n => n.id === parentId) : undefined
  }

  if (path.length <= 1) return null

  return (
    <div
      onPointerDown={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: t.toolbarBg,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${t.border}`,
        borderRadius: 20,
        padding: '5px 12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 12,
        fontWeight: 500,
        maxWidth: '60vw',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      {path.map((node, i) => (
        <React.Fragment key={node.id}>
          {i > 0 && (
            <span style={{ color: t.textMuted, fontSize: 10, flexShrink: 0 }}>›</span>
          )}
          <button
            onClick={() => onNavigate(node.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: i === path.length - 1 ? t.textPrimary : t.textMuted,
              fontWeight: i === path.length - 1 ? 600 : 400,
              fontSize: 12,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              padding: '0 2px',
              borderRadius: 4,
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flexShrink: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {node.title}
          </button>
        </React.Fragment>
      ))}
    </div>
  )
})
