import React, { useRef, useState, useEffect } from 'react'
import {
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  ArrowCounterClockwise,
  CornersOut,
  Palette,
  Sun,
  Moon,
  UploadSimple,
  DownloadSimple,
  FileText,
  Image,
  CirclesFour,
  Trash,
  DotsThree,
  Globe,
} from '@phosphor-icons/react'
import type { MindNode, NodeLink } from '../lib/mindmap'
import { parseOutlineToNodes } from '../lib/mindmap'
import type { AppTheme } from '../lib/themes'
import { DANGER, FOCUS_RING_COLOR, FOCUS_RING_ALPHA, FOCUS_RING_WIDTH, FOCUS_RING_OFFSET, TOOLTIP_SHOW_DELAY, RADIUS_CARD, RADIUS_MD, SHADOW_SM, SHADOW_LG, BLUR_STRONG, SPACE_1, SPACE_3, SPACE_4, SPACE_5, SPACE_6, SPACE_11, LABEL_MEDIUM } from '../lib/tokens'
import { ConfirmDialog } from './confirm-dialog'

interface BackupPage {
  id: string
  name: string
  nodes: MindNode[]
  links: NodeLink[]
}

interface Props {
  zoom: number
  theme: AppTheme
  /** Breakpoint flags from useBreakpoints() */
  bp: { sm: boolean; md: boolean; lg: boolean }
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onFitScreen: () => void
  onClear: () => void
  onImport: (nodes: MindNode[]) => void
  onImportBackup: (pages: BackupPage[], activeId: string) => void
  onExportPng: () => void
  onExportMarkdown: () => void
  onExportBackup: () => void
  onToggleDark: () => void
  onOpenThemes: () => void
  onSpaceOut: () => void
  onToggleOrbit: () => void
  orbitMode: boolean
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
// Theme-aware tooltip with a 300ms show delay to prevent flicker during
// casual mouse travel across adjacent buttons.
const Tip: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    if (timerRef.current) return // already scheduled
    timerRef.current = setTimeout(() => {
      setVisible(true)
      timerRef.current = null
    }, TOOLTIP_SHOW_DELAY)
  }

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
  }

  // Tooltip bg: dark in light mode, light in dark mode — always high-contrast
  const isDark = document.documentElement.dataset.theme === 'dark'
  const bg = isDark ? '#1e293b' : '#0f172a'
  const fg = '#e2e8f0'

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: bg,
          color: fg,
          fontSize: 11,
          fontWeight: 500,
          lineHeight: 1.3,
          padding: '5px 9px',
          borderRadius: 7,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          letterSpacing: '0.01em',
        }}>
          {label}
          {/* Arrow — points up toward the button */}
          <div style={{
            position: 'absolute',
            bottom: '100%', left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderBottom: `5px solid ${bg}`,
          }} />
        </div>
      )}
    </div>
  )
}

// ── Icon button ───────────────────────────────────────────────────────────────
const TBtn: React.FC<{
  onClick: () => void
  label: string
  children: React.ReactNode
  theme: AppTheme
  active?: boolean
}> = ({ onClick, label, children, theme: t, active }) => (
  <Tip label={label}>
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        width: 30, height: 30, borderRadius: 8, border: 'none',
        background: active ? `${t.groupBg}` : 'transparent',
        cursor: 'pointer',
        color: active ? t.textPrimary : t.textMuted,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.12s, color 0.12s',
        flexShrink: 0,
        outline: 'none',
      }}
      onFocus={e => {
        e.currentTarget.style.boxShadow = `${FOCUS_RING_COLOR}${Math.round(FOCUS_RING_ALPHA * 255).toString(16).padStart(2, '0')} ${FOCUS_RING_WIDTH}px solid`
        e.currentTarget.style.outline = `${FOCUS_RING_WIDTH}px solid ${FOCUS_RING_COLOR}${Math.round(FOCUS_RING_ALPHA * 255).toString(16).padStart(2, '0')}`
        e.currentTarget.style.outlineOffset = `${FOCUS_RING_OFFSET}px`
      }}
      onBlur={e => {
        e.currentTarget.style.outline = 'none'
        e.currentTarget.style.boxShadow = 'none'
      }}
      onMouseEnter={e => (e.currentTarget.style.background = t.groupBg)}
      onMouseLeave={e => {
        e.currentTarget.style.background = active ? t.groupBg : 'transparent'
        e.currentTarget.style.outline = 'none'
      }}
    >
      {children}
    </button>
  </Tip>
)

// ── Divider ───────────────────────────────────────────────────────────────────
const Div: React.FC<{ theme: AppTheme }> = ({ theme: t }) => (
  <div style={{ width: 1, height: 18, background: t.border, flexShrink: 0, margin: '0 2px' }} />
)

// ── Main toolbar ──────────────────────────────────────────────────────────────
export const Toolbar: React.FC<Props> = ({
  zoom, theme, bp,
  onZoomIn, onZoomOut, onReset, onFitScreen,
  onClear, onImport, onImportBackup, onExportPng, onExportMarkdown, onExportBackup,
  onToggleDark, onOpenThemes, onSpaceOut, onToggleOrbit, orbitMode,
}) => {
  const fileRef = useRef<HTMLInputElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    confirmLabel?: string
    danger?: boolean
    onConfirm: () => void
  } | null>(null)
  const isDark = theme.mode === 'dark'
  const t = theme

  // Close the overflow menu on outside click
  useEffect(() => {
    if (!moreOpen) return
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [moreOpen])

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      // 1. Try JSON (full backup or legacy single-page format)
      try {
        const parsed = JSON.parse(text)
        if (parsed && parsed.app === 'mindcanvas' && Array.isArray(parsed.pages)) {
          setConfirmDialog({
            title: 'Restore backup?',
            message: 'This replaces all current pages with the backup contents.',
            confirmLabel: 'Restore',
            onConfirm: () => {
              onImportBackup(parsed.pages, parsed.activeId ?? '')
              setConfirmDialog(null)
            },
          })
          return
        }
        if (Array.isArray(parsed) && parsed.every(n => n.id && n.title !== undefined)) {
          onImport(parsed); return
        }
      } catch (_) {}
      // 2. Try outline text (- hyphen indented list / plain text)
      const nodes = parseOutlineToNodes(text)
      if (nodes && nodes.length >= 2) { onImport(nodes); return }
      setConfirmDialog({
        title: 'Could not read file',
        message: 'Paste a hyphen-indented outline or a JSON backup file.',
        confirmLabel: 'OK',
        onConfirm: () => setConfirmDialog(null),
      })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const iconProps = { size: 16, weight: 'regular' } as const
  const wide = bp.lg    // ≥ 900px: show full toolbar
  const compact = !bp.md // < 768px: icon-only logo, slim groups, rest in overflow

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200,
      height: 52,
      background: t.toolbarBg,
      backdropFilter: BLUR_STRONG,
      WebkitBackdropFilter: BLUR_STRONG,
      borderBottom: `1px solid ${t.border}`,
      display: 'flex', alignItems: 'center',
      padding: `0 ${SPACE_11}px`,
      boxShadow: SHADOW_SM,
      fontFamily: "'Plus Jakarta Sans', Inter, -apple-system, sans-serif",
      gap: SPACE_6,
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: compact ? 0 : 136, flexShrink: 0 }}>
        <svg width="29" height="22" viewBox="0 0 123.9 95.31" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
          <defs>
            <linearGradient id="lum-grad-1" x1="28.41" y1="-9.68" x2="100.81" y2="69.42" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fc5716"/>
              <stop offset="1" stopColor="#ffffff"/>
            </linearGradient>
            <linearGradient id="lum-grad-2" x1="34.1" y1="51.18" x2="94.22" y2="116.86" xlinkHref="#lum-grad-1"/>
          </defs>
          <rect x="54.17" y="47.24" width="15.56" height="23.48" fill="#1a1a1a"/>
          <rect width="123.9" height="53.93" rx="7.81" ry="7.81" fill="url(#lum-grad-1)"/>
          <rect y="67.91" width="123.9" height="27.4" rx="8.14" ry="8.14" fill="url(#lum-grad-2)"/>
        </svg>
        {!compact && (
          <span style={{ fontWeight: 700, fontSize: 14, color: t.textPrimary, letterSpacing: '-0.01em' }}>
            Luminary
          </span>
        )}
      </div>

      {/* Center — zoom group. Absolutely centered on wide screens; in normal
          flex flow on compact screens where centering would cause overlap */}
      <div style={{
        ...(compact
          ? { display: 'flex', alignItems: 'center', marginLeft: SPACE_6 }
          : { position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center' }),
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 1,
          background: t.groupBg, border: `1px solid ${t.border}`, borderRadius: RADIUS_CARD, padding: `${SPACE_1}px ${SPACE_4}px`,
        }}>
          <TBtn onClick={onZoomOut} label="Zoom out  (⌘ −)" theme={t}>
            <MagnifyingGlassMinus {...iconProps} />
          </TBtn>

          <span style={{ fontSize: LABEL_MEDIUM.size, color: t.textMuted, minWidth: 40, textAlign: 'center', fontWeight: LABEL_MEDIUM.weight, userSelect: 'none' }}>
            {Math.round(zoom * 100)}%
          </span>

          <TBtn onClick={onZoomIn} label="Zoom in  (⌘ +)" theme={t}>
            <MagnifyingGlassPlus {...iconProps} />
          </TBtn>

          {!compact && (
            <>
              <Div theme={t} />

              <TBtn onClick={onReset} label="Reset view  (R)" theme={t}>
                <ArrowCounterClockwise {...iconProps} />
              </TBtn>

              <TBtn onClick={onFitScreen} label="Fit to screen  (F)" theme={t}>
                <CornersOut {...iconProps} />
              </TBtn>
            </>
          )}
        </div>
      </div>

      {/* Right — actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, marginLeft: 'auto' }}>

        {/* View group — always visible */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 1,
          background: t.groupBg, border: `1px solid ${t.border}`, borderRadius: RADIUS_CARD, padding: `${SPACE_1}px ${SPACE_4}px`,
        }}>
          <TBtn onClick={onOpenThemes} label="Themes & background" theme={t}>
            <Palette {...iconProps} />
          </TBtn>
          <TBtn onClick={onToggleDark} label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} theme={t}>
            {isDark ? <Sun {...iconProps} /> : <Moon {...iconProps} />}
          </TBtn>
          {!compact && (
            <>
              <TBtn onClick={onToggleOrbit} label={orbitMode ? 'Orbit mode on  (I)' : 'Orbit mode  (I — reveals depth)'} theme={t} active={orbitMode}>
                <Globe {...iconProps} />
              </TBtn>
              {/* Space Out — icon-only in the view group */}
              <TBtn onClick={onSpaceOut} label="Auto-arrange into circles  (O)" theme={t}>
                <CirclesFour size={16} weight="regular" />
              </TBtn>
            </>
          )}
        </div>

        {/* File group — only on wide screens; otherwise collapsed into overflow */}
        {wide && (
          <>
            <Div theme={t} />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 1,
              background: t.groupBg, border: `1px solid ${t.border}`, borderRadius: RADIUS_CARD, padding: `${SPACE_1}px ${SPACE_4}px`,
            }}>
              <TBtn onClick={() => fileRef.current?.click()} label="Import outline or JSON" theme={t}>
                <UploadSimple {...iconProps} />
              </TBtn>
              <TBtn onClick={onExportMarkdown} label="Export as text outline  (.md)" theme={t}>
                <FileText {...iconProps} />
              </TBtn>
              <TBtn onClick={onExportPng} label="Export as PNG image" theme={t}>
                <Image {...iconProps} />
              </TBtn>
              <TBtn onClick={onExportBackup} label="Download backup (all pages)" theme={t}>
                <DownloadSimple {...iconProps} />
              </TBtn>
            </div>
          </>
        )}

        <Div theme={t} />

        {/* Overflow menu — destructive + collapsed-on-narrow actions */}
        <div ref={moreRef} style={{ position: 'relative' }}>
          <TBtn onClick={() => setMoreOpen(v => !v)} label="More actions" theme={t} active={moreOpen}>
            <DotsThree size={18} weight="bold" />
          </TBtn>
          {moreOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              zIndex: 9999,
              background: t.toolbarBg,
              backdropFilter: BLUR_STRONG,
              WebkitBackdropFilter: BLUR_STRONG,
              border: `1px solid ${t.border}`,
              borderRadius: RADIUS_CARD,
              boxShadow: SHADOW_LG,
              padding: SPACE_3, minWidth: 160,
            }}>
              {/* View actions collapsed into overflow on phone screens */}
              {compact && (
                <>
                  <OBtn onClick={() => { setMoreOpen(false); onReset() }} theme={t}>
                    <ArrowCounterClockwise size={13} /> Reset view
                  </OBtn>
                  <OBtn onClick={() => { setMoreOpen(false); onFitScreen() }} theme={t}>
                    <CornersOut size={13} /> Fit to screen
                  </OBtn>
                  <OBtn onClick={() => { setMoreOpen(false); onSpaceOut() }} theme={t}>
                    <CirclesFour size={13} /> Space out
                  </OBtn>
                  <div style={{ height: 1, background: t.border, margin: '4px 0' }} />
                </>
              )}
              {/* File actions collapsed into overflow on narrow screens */}
              {!wide && (
                <>
                  <OBtn onClick={() => { setMoreOpen(false); fileRef.current?.click() }} theme={t}>
                    <UploadSimple size={13} /> Import outline or JSON
                  </OBtn>
                  <OBtn onClick={() => { setMoreOpen(false); onExportMarkdown() }} theme={t}>
                    <FileText size={13} /> Export as text outline
                  </OBtn>
                  <OBtn onClick={() => { setMoreOpen(false); onExportPng() }} theme={t}>
                    <Image size={13} /> Export as PNG
                  </OBtn>
                  <OBtn onClick={() => { setMoreOpen(false); onExportBackup() }} theme={t}>
                    <DownloadSimple size={13} /> Download backup
                  </OBtn>
                  <div style={{ height: 1, background: t.border, margin: '4px 0' }} />
                </>
              )}
              <OBtn onClick={() => { setMoreOpen(false); onClear() }} theme={t} danger>
                <Trash size={13} weight="regular" /> Clear canvas
              </OBtn>
            </div>
          )}
        </div>

      </div>

      <input ref={fileRef} type="file" accept=".txt,.md,.json" style={{ display: 'none' }} onChange={handleImportFile} />

      {/* Themed confirm dialog */}
      {confirmDialog && (
        <ConfirmDialog
          theme={t}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          danger={confirmDialog.danger}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}

// ── Overflow menu button ────────────────────────────────────────────────────
const OBtn: React.FC<{
  onClick: () => void
  children: React.ReactNode
  theme: AppTheme
  danger?: boolean
}> = ({ onClick, children, theme: t, danger }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: SPACE_6,
      width: '100%', padding: `${SPACE_5}px ${SPACE_6}px`,
      background: 'transparent', border: 'none', borderRadius: RADIUS_MD,
      cursor: 'pointer',
      fontSize: LABEL_MEDIUM.size, fontWeight: LABEL_MEDIUM.weight, fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
      color: danger ? DANGER : t.textPrimary,
      textAlign: 'left',
      outline: 'none',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = danger ? `${DANGER}15` : t.groupBg)}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
  >
    {children}
  </button>
)
