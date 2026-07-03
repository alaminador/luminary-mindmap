import React, { useEffect } from 'react'
import { X } from '@phosphor-icons/react'
import type { AppTheme } from '../lib/themes'
import { ACCENT, DANGER, RADIUS_LG, OVERLAY_EASING } from '../lib/tokens'

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
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        animation: `fadeScrim 150ms ease forwards`,
      }}
      onPointerDown={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        style={{
          background: t.panelBg,
          border: `1px solid ${t.border}`,
          borderRadius: RADIUS_LG,
          width: 380,
          maxWidth: '90vw',
          padding: '20px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          animation: `overlayIn 150ms ${OVERLAY_EASING} forwards`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: t.textPrimary }}>{title}</div>
          <button
            onClick={onCancel}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 6,
              color: t.textMuted, borderRadius: 6, display: 'flex',
            }}
          >
            <X size={14} weight="bold" />
          </button>
        </div>
        <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 20, lineHeight: 1.5 }}>
          {message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              height: 32, padding: '0 14px', borderRadius: 8,
              border: `1px solid ${t.border}`,
              background: 'transparent', cursor: 'pointer',
              color: t.textPrimary, fontSize: 12, fontWeight: 600,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: 32, padding: '0 14px', borderRadius: 8,
              border: 'none',
              background: btnColor, cursor: 'pointer',
              color: '#fff', fontSize: 12, fontWeight: 600,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
