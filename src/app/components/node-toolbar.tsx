import React, { useState, useRef } from 'react'
import { Plus, Equals, PencilSimple, LinkSimple, Globe, X } from '@phosphor-icons/react'
import type { AppTheme } from '../lib/themes'

// 8 curated emojis for mind-mapping
const EMOJIS = ['💡', '🎯', '🔥', '✅', '⚠️', '🚀', '💬', '🔗']


interface Props {
  x: number
  y: number
  isRoot: boolean
  linkingMode: boolean
  currentColorIndex?: number
  currentEmoji?: string
  currentUrl?: string
  theme: AppTheme
  onAddChild: () => void
  onAddSibling: () => void
  onEditTitle: () => void
  onDrawLink: () => void
  onDelete: () => void
  onColorChange: (colorIndex: number | undefined) => void
  onEmojiChange: (emoji: string | undefined) => void
  onUrlChange: (url: string | undefined) => void
}

export const NodeToolbar = React.memo(function NodeToolbar({
  x, y, isRoot, linkingMode, currentColorIndex, currentEmoji, currentUrl, theme: t,
  onAddChild, onAddSibling, onEditTitle, onDrawLink, onDelete,
  onColorChange, onEmojiChange, onUrlChange,
}: Props) {
  // Resolve current color from theme palette using the stored index
  const currentColor = currentColorIndex !== undefined ? t.palette[currentColorIndex] : undefined
  const [panel, setPanel] = useState<'none' | 'color' | 'emoji' | 'url'>('none')
  const [urlDraft, setUrlDraft] = useState(currentUrl ?? '')
  const urlInputRef = useRef<HTMLInputElement>(null)
  const isDark = t.mode === 'dark'

  const togglePanel = (p: 'color' | 'emoji' | 'url') => {
    if (p === 'url') setUrlDraft(currentUrl ?? '')
    setPanel(prev => (prev === p ? 'none' : p))
  }

  return (
    <div
      onPointerDown={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)',
        zIndex: 150,
        display: 'flex',
        // Pill sits closest to the node; colour/emoji panels stack upward
        flexDirection: 'column-reverse',
        alignItems: 'center',
        gap: 6,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Plus Jakarta Sans", sans-serif',
        pointerEvents: 'auto',
      }}
    >
      {/* ── main pill ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        background: t.toolbarBg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: '4px 8px',
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.45)'
          : '0 4px 20px rgba(0,0,0,0.10)',
      }}>
        <NBtn onClick={onAddChild} title="Add child (Tab)" color={t.textPrimary} t={t}>
          <Plus size={14} weight="bold" />
        </NBtn>

        {!isRoot && (
          <NBtn onClick={onAddSibling} title="Add sibling (Enter)" color={t.textPrimary} t={t}>
            <Equals size={14} weight="bold" />
          </NBtn>
        )}

        <NBtn onClick={onEditTitle} title="Edit title (Space)" color={t.textPrimary} t={t}>
          <PencilSimple size={14} weight="regular" />
        </NBtn>

        {/* Colour swatch button */}
        <button
          tabIndex={-1}
          title="Change color"
          onClick={() => togglePanel('color')}
          style={{
            width: 32, height: 32, borderRadius: 10,
            border: panel === 'color'
              ? `1.5px solid ${t.rootColor}`
              : '1.5px solid transparent',
            background: panel === 'color' ? `${t.rootColor}18` : 'transparent',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${t.rootColor}18`; e.currentTarget.style.borderColor = `${t.rootColor}60` }}
          onMouseLeave={e => { e.currentTarget.style.background = panel === 'color' ? `${t.rootColor}18` : 'transparent'; e.currentTarget.style.borderColor = panel === 'color' ? t.rootColor : 'transparent' }}
        >
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: currentColor ?? (isRoot ? t.rootColor : t.childColor),
            border: `1.5px solid ${t.border}`,
            flexShrink: 0,
          }} />
        </button>

        {/* Emoji button */}
        <button
          tabIndex={-1}
          title="Set emoji"
          onClick={() => togglePanel('emoji')}
          style={{
            width: 32, height: 32, borderRadius: 10,
            border: panel === 'emoji'
              ? `1.5px solid ${t.palette[6] ?? t.rootColor}`
              : '1.5px solid transparent',
            background: panel === 'emoji' ? t.groupBg : 'transparent',
            cursor: 'pointer',
            fontSize: 15, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${t.palette[6] ?? t.rootColor}18`; e.currentTarget.style.borderColor = `${t.palette[6] ?? t.rootColor}60` }}
          onMouseLeave={e => { e.currentTarget.style.background = panel === 'emoji' ? t.groupBg : 'transparent'; e.currentTarget.style.borderColor = panel === 'emoji' ? (t.palette[6] ?? t.rootColor) : 'transparent' }}
        >
          {currentEmoji ?? '😀'}
        </button>

        {/* URL button */}
        <NBtn onClick={() => togglePanel('url')} title="Set URL" color={t.textPrimary} t={t} active={panel === 'url' || !!currentUrl}>
          <Globe size={14} weight={currentUrl ? 'fill' : 'regular'} />
        </NBtn>

        <NBtn onClick={onDrawLink} title="Draw link (L)" color={t.textPrimary} t={t} active={linkingMode}>
          <LinkSimple size={14} weight="regular" />
        </NBtn>

        {!isRoot && (
          <NBtn onClick={onDelete} title="Delete (Del)" color={t.textPrimary} t={t}>
            <X size={14} weight="bold" />
          </NBtn>
        )}
      </div>

      {/* ── color panel ── */}
      {panel === 'color' && (
        <div style={{
          background: t.panelBg,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          padding: '14px 14px 10px',
          boxShadow: isDark
            ? '0 8px 40px rgba(0,0,0,0.5)'
            : '0 8px 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          minWidth: 186,
        }}>
          {/* Label */}
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
            color: t.textMuted,
            textTransform: 'uppercase',
            alignSelf: 'flex-start',
          }}>
            Colour
          </span>

          {/* Swatches */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            width: '100%',
          }}>
            {t.palette.map((c, i) => (
              <button
                key={i}
                tabIndex={-1}
                onClick={() => { onColorChange(i); setPanel('none') }}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: c,
                  border: currentColorIndex === i
                    ? `2.5px solid ${isDark ? '#fff' : '#000'}`
                    : '2.5px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                  boxShadow: currentColorIndex === i ? `0 0 0 3px ${c}55` : '0 1px 4px rgba(0,0,0,0.25)',
                  transition: 'transform 0.12s, box-shadow 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.22)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              />
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: '100%', height: 1, background: t.border }} />

          {/* Reset */}
          <button
            tabIndex={-1}
            onClick={() => { onColorChange(undefined); setPanel('none') }}
            style={{
              background: 'transparent',
              border: 'none',
              color: t.palette[0],
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              padding: '2px 0',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}
          >
            Reset Colour
          </button>
        </div>
      )}

      {/* ── url panel ── */}
      {panel === 'url' && (
        <div style={{
          background: t.panelBg,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          padding: '14px 14px 10px',
          boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 8,
          minWidth: 260,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
            color: t.textMuted,
            textTransform: 'uppercase',
          }}>
            URL
          </span>
          <div style={{ display: 'flex', gap: 6, width: '100%' }}>
            <input
              ref={urlInputRef}
              value={urlDraft}
              onChange={e => setUrlDraft(e.target.value)}
              placeholder="https://..."
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = urlDraft.trim() || undefined
                  onUrlChange(val)
                  setPanel('none')
                }
                if (e.key === 'Escape') setPanel('none')
                e.stopPropagation()
              }}
              style={{
                flex: 1,
                width: 220,
                background: t.toolbarBg,
                border: `1.5px solid ${t.border}`,
                borderRadius: 8,
                padding: '5px 8px',
                fontSize: 12,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                color: t.textPrimary,
                outline: 'none',
              }}
            />
            {urlDraft.trim() && (
              <button
                tabIndex={-1}
                onClick={() => {
                  const val = urlDraft.trim() || undefined
                  onUrlChange(val)
                  setPanel('none')
                }}
                style={{
                  background: t.palette[0],
                  border: 'none',
                  borderRadius: 8,
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                Open
              </button>
            )}
          </div>
          {currentUrl && (
            <>
              <div style={{ width: '100%', height: 1, background: t.border }} />
              <button
                tabIndex={-1}
                onClick={() => { onUrlChange(undefined); setPanel('none') }}
                style={{
                  background: 'transparent', border: 'none',
                  color: t.palette[0], fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', padding: '2px 0',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}
              >
                Remove
              </button>
            </>
          )}
        </div>
      )}

      {/* ── emoji panel — 8 picks ── */}
      {panel === 'emoji' && (
        <div style={{
          background: t.panelBg,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          padding: '14px 14px 10px',
          boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
            color: t.textMuted,
            textTransform: 'uppercase', alignSelf: 'flex-start',
          }}>
            Emoji
          </span>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
          }}>
            {EMOJIS.map(em => (
              <button
                key={em}
                tabIndex={-1}
                onClick={() => { onEmojiChange(em); setPanel('none') }}
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: currentEmoji === em ? t.groupBg : 'transparent',
                  border: currentEmoji === em
                    ? `1.5px solid ${t.rootColor}`
                    : `1.5px solid transparent`,
                  cursor: 'pointer',
                  fontSize: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.12s, background 0.12s',
                  padding: 0,
                  boxShadow: 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {em}
              </button>
            ))}
          </div>

          <div style={{ width: '100%', height: 1, background: t.border }} />

          {currentEmoji ? (
            <button
              tabIndex={-1}
              onClick={() => { onEmojiChange(undefined); setPanel('none') }}
              style={{
                background: 'transparent', border: 'none',
                color: t.palette[0], fontSize: 13, fontWeight: 500,
                cursor: 'pointer', padding: '2px 0',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}
            >
              Remove Emoji
            </button>
          ) : (
            <span style={{ fontSize: 11, color: t.textMuted, opacity: 0.6, padding: '2px 0' }}>
              Tap to add
            </span>
          )}
        </div>
      )}
    </div>
  )
})

const NBtn: React.FC<{
  onClick: () => void
  title?: string
  color: string
  t: AppTheme
  active?: boolean
  children: React.ReactNode
}> = ({ onClick, title, color, active, children }) => (
  <button
    tabIndex={-1}
    onClick={e => { e.stopPropagation(); onClick() }}
    title={title}
    style={{
      width: 32, height: 32, borderRadius: 10,
      border: active ? `1.5px solid ${color}` : '1.5px solid transparent',
      background: active ? `${color}20` : 'transparent',
      cursor: 'pointer',
      color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.12s, border-color 0.12s',
      padding: 0,
    }}
    onMouseEnter={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.borderColor = `${color}60` }}
    onMouseLeave={e => { e.currentTarget.style.background = active ? `${color}20` : 'transparent'; e.currentTarget.style.borderColor = active ? color : 'transparent' }}
  >
    {children}
  </button>
)
