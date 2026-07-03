import React, { useEffect } from 'react'
import { X } from '@phosphor-icons/react'
import type { AppTheme } from '../lib/themes'
import { ACCENT, DANGER, RADIUS_XL, RADIUS_CARD, RADIUS_BASE, OVERLAY_EASING, SHADOW_FLOATING, BLUR_STRONG, LABEL_MEDIUM, SPACE_5, SPACE_6, SPACE_7, SPACE_12, SPACE_13 } from '../lib/tokens'

interface Props {
  theme: AppTheme
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog: React.FC<Props> = ({
  theme: t, title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const btnColor = danger ? DANGER : ACCENT

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.50)',
        backdropFilter: BLUR_STRONG,
        animation: `fadeScrim 150ms ease forwards`,
      }}
      onPointerDown={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        style={{
          background: t.panelBg,
          border: `1px solid ${t.border}`,
          borderRadius: RADIUS_XL,
          width: 380,
          maxWidth: '90vw',
          padding: `${SPACE_12}px ${SPACE_13}px`,
          boxShadow: SHADOW_FLOATING,
          fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
          animation: `overlayIn 150ms ${OVERLAY_EASING} forwards`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE_6 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: t.textPrimary }}>{title}</div>
          <button
            onClick={onCancel}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: SPACE_5,
              color: t.textMuted, borderRadius: RADIUS_BASE, display: 'flex',
            }}
          >
            <X size={14} weight="bold" />
          </button>
        </div>
        <div style={{ fontSize: LABEL_MEDIUM.size, color: t.textMuted, marginBottom: SPACE_13, lineHeight: 1.5 }}>
          {message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: SPACE_6 }}>
          <button
            onClick={onCancel}
            style={{
              height: 32, padding: `0 ${SPACE_7}px`, borderRadius: RADIUS_CARD,
              border: `1px solid ${t.border}`,
              background: 'transparent', cursor: 'pointer',
              color: t.textPrimary, fontSize: LABEL_MEDIUM.size, fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: 32, padding: `0 ${SPACE_7}px`, borderRadius: RADIUS_CARD,
              border: 'none',
              background: btnColor, cursor: 'pointer',
              color: '#fff', fontSize: LABEL_MEDIUM.size, fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
