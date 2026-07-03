import React, { useEffect } from 'react'
import { X, Check } from '@phosphor-icons/react'
import type { AppTheme } from '../lib/themes'
import { LIGHT_THEMES, DARK_THEMES } from '../lib/themes'
import { ACCENT, OVERLAY_EASING, RADIUS_CARD, RADIUS_BASE, RADIUS_XL, SHADOW_FLOATING, BLUR_STRONG, LABEL_MEDIUM, SPACE_3, SPACE_6, SPACE_7, SPACE_8, SPACE_12, SPACE_13 } from '../lib/tokens'

type PaperType    = 'blank' | 'lined' | 'dotted' | 'mini-squared' | 'squared'
type PaperOpacity = 'subtle' | 'clear' | 'bold'

interface Props {
  currentThemeId: string
  onSelect: (id: string) => void
  onClose: () => void
  theme: AppTheme
  paperType: PaperType
  paperOpacity: PaperOpacity
  onPaperType: (t: PaperType) => void
  onPaperOpacity: (o: PaperOpacity) => void
}

const PAPER_TYPES: { id: PaperType; label: string }[] = [
  { id: 'blank',       label: 'Blank' },
  { id: 'lined',       label: 'Lined' },
  { id: 'dotted',      label: 'Dotted' },
  { id: 'mini-squared', label: 'Mini Squared' },
  { id: 'squared',     label: 'Squared' },
]

const PAPER_OPACITIES: { id: PaperOpacity; label: string }[] = [
  { id: 'subtle', label: 'Subtle' },
  { id: 'clear',  label: 'Clear' },
  { id: 'bold',   label: 'Bold' },
]

export const ThemePicker: React.FC<Props> = ({
  currentThemeId, onSelect, onClose, theme,
  paperType, paperOpacity, onPaperType, onPaperOpacity,
}) => {
  const t = theme

  // Escape closes the modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.50)',
        backdropFilter: BLUR_STRONG,
      }}
      onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: t.panelBg,
          border: `1px solid ${t.border}`,
          borderRadius: RADIUS_XL,
          width: 700,
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: `${SPACE_12}px ${SPACE_13}px ${SPACE_13}px`,
          boxShadow: SHADOW_FLOATING,
          fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
          animation: `overlayIn 150ms ${OVERLAY_EASING} forwards`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: t.textPrimary }}>Settings</div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>Theme, paper type and opacity</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 6,
              color: t.textMuted, borderRadius: 6, display: 'flex',
            }}
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* ── Paper Type ── */}
        <SettingRow label="Paper Type:" theme={t}>
          <SegmentGroup>
            {PAPER_TYPES.map(p => (
              <SegBtn
                key={p.id}
                active={paperType === p.id}
                label={p.label}
                theme={t}
                onClick={() => onPaperType(p.id)}
              />
            ))}
          </SegmentGroup>
        </SettingRow>

        {/* ── Paper Opacity ── */}
        <SettingRow label="Paper Type Opacity:" theme={t}>
          <SegmentGroup>
            {PAPER_OPACITIES.map(o => (
              <SegBtn
                key={o.id}
                active={paperOpacity === o.id}
                label={o.label}
                theme={t}
                onClick={() => onPaperOpacity(o.id)}
              />
            ))}
          </SegmentGroup>
        </SettingRow>

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${t.border}`, margin: '20px 0 16px' }} />

        {/* ── Themes label ── */}
        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>
          Theme
        </div>

        {/* Theme grid: light left, dark right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {Array.from({ length: Math.max(LIGHT_THEMES.length, DARK_THEMES.length) }).map((_, i) => (
            <React.Fragment key={i}>
              {LIGHT_THEMES[i] ? (
                <ThemeCard t={LIGHT_THEMES[i]} isActive={LIGHT_THEMES[i].id === currentThemeId} onSelect={onSelect} />
              ) : <div />}
              {DARK_THEMES[i] ? (
                <ThemeCard t={DARK_THEMES[i]} isActive={DARK_THEMES[i].id === currentThemeId} onSelect={onSelect} />
              ) : <div />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── sub-components ───────────────────────────── */

const SettingRow: React.FC<{ label: string; theme: AppTheme; children: React.ReactNode }> = ({ label, theme: t, children }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: `${SPACE_7}px ${SPACE_7}px`,
    background: t.groupBg,
    border: `1px solid ${t.border}`,
    borderRadius: RADIUS_CARD,
    marginBottom: SPACE_6,
  }}>
    <span style={{ fontSize: LABEL_MEDIUM.size, fontWeight: 600, color: t.textPrimary, fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>{label}</span>
    {children}
  </div>
)

const SegmentGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
    {children}
  </div>
)

const SegBtn: React.FC<{ active: boolean; label: string; theme: AppTheme; onClick: () => void }> = ({ active, label, theme: t, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: `${SPACE_3}px ${SPACE_8}px`,
      borderRadius: RADIUS_BASE,
      border: `1px solid ${active ? t.textMuted : 'transparent'}`,
      background: active ? (t.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)') : 'transparent',
      color: active ? t.textPrimary : t.textMuted,
      fontSize: LABEL_MEDIUM.size,
      fontWeight: active ? 600 : 500,
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
      transition: 'all 0.12s',
      whiteSpace: 'nowrap',
    }}
    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = t.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
  >
    {label}
  </button>
)

const ThemeCard: React.FC<{ t: AppTheme; isActive: boolean; onSelect: (id: string) => void }> = ({ t, isActive, onSelect }) => {
  const dark = t.mode === 'dark'
  return (
    <div
      onClick={() => onSelect(t.id)}
      style={{
        background: t.canvasBg,
        border: `${isActive ? 2.5 : 1.5}px solid ${isActive ? ACCENT : (dark ? '#2a2a3a' : '#e2e8f0')}`,
        borderRadius: RADIUS_CARD,
        padding: `${SPACE_8}px ${SPACE_7}px`,
        cursor: 'pointer',
        transition: 'transform 0.1s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: dark ? '#e8e8f8' : '#1a2332', fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
          {t.name}
        </span>
        <span style={{ fontSize: 13 }}>{dark ? '🌙' : '☀️'}</span>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {t.palette.map((color, i) => (
          <div
            key={i}
            style={{
              width: 22, height: 22, borderRadius: '50%', background: color, flexShrink: 0,
              border: `1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            }}
          />
        ))}
      </div>
      {isActive && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 18, height: 18, borderRadius: '50%', background: ACCENT,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={11} weight="bold" color="white" />
        </div>
      )}
    </div>
  )
}
