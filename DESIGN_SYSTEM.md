# Luminary Design System

## Tokens

All visual values live in `src/app/lib/tokens.ts`. Import from there instead
of hardcoding colors, radii, or spacing in components.

```ts
import { ACCENT, SUCCESS, DANGER, RADIUS_MD, SPACE_3 } from '../lib/tokens'
```

### Brand
- **Accent** `#fc5716` — logo orange. Chrome-level primary actions.

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| SUCCESS | `#22c55e` | confirm, add, save |
| WARNING | `#f59e0b` | search match, cautions |
| DANGER | `#ef4444` | delete, clear, destructive |
| LINK | `#8b5cf6` | cross-node links, linking mode |

### Focus Ring
- `2px` solid accent at `60%` alpha, `2px` offset. Apply to all interactive
  elements on `:focus-visible`.

### Radii
| Name | px |
|------|-----|
| RADIUS_SM | 6 |
| RADIUS_MD | 8 |
| RADIUS_LG | 12 |
| RADIUS_PILL | 16 |

### Breakpoints
| Name | px |
|------|-----|
| SM | 640 (minimap hides) |
| MD | 768 (pages → drawer) |
| LG | 900 (toolbar collapses) |

### Overlays
- 150ms enter animation with `cubic-bezier(0.22, 1, 0.36, 1)` for fade + scale.

## Themes

Canvas-level theming (node colors, canvas bg, edges, text) is handled by
`src/app/lib/themes.ts` (`AppTheme`). Chrome-level theming (toolbars,
buttons, focus) should reference tokens from this file.

## Principles

1. **Tokens first** — never hardcode a new hex; add a token.
2. **TabIndex ≥ 0** — every interactive element is keyboard-reachable.
3. **aria-label** — every icon button announces its purpose.
4. **Esc closes overlays** — the topmost overlay is always dismissible.
5. **Mobile-first** — design for 375px, enhance upward.
