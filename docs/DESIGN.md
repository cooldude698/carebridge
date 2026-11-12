# CareBridge Design System (Minimal Clinical SaaS Edition)
*Engineered for Google BuilderCon | CareBridge Chronic Care Platform*

---

## 1. Visual Philosophy & Atmosphere
CareBridge adheres to a calm, crisp, high-trust **minimal clinical SaaS interface** (inspired by Linear, Stripe, Apple Health, and modern clinical EHR platforms):

- **Clean Medical Canvas**: Soft neutral slate/blue-gray background (`#F8FAFC`) with pure white card surfaces (`#FFFFFF`).
- **Hairline Precision**: 1px subtle borders (`#E2E8F0` / `#CBD5E1`) instead of heavy brutalist black outlines.
- **Restrained Elevation**: Soft, diffused shadows (`0 1px 2px rgba(15, 23, 42, 0.04)`) with gentle hover depth.
- **Focused Clinical Typography**: 
  - **Display (`Plus Jakarta Sans`)**: Modern, confident sans-serif for headings, metrics, and navigation.
  - **Body (`DM Sans`)**: Highly legible, approachable sans-serif for patient summaries, clinical instructions, and form fields.
  - **Data (`Sora` with `tabular-nums`)**: Fixed-width numeric alignment for heart rate, blood pressure, SpO2, steps, and timestamps.
- **Zero Cartoons, Zero Gimmicks**: No stickers, tilted polaroids, or doodle mascots. Clean geometric status pills and clinical icons only.

---

## 2. Color Palette & Tokens

### Canvas & Neutral Ink
| Token | Hex | Usage |
|---|---|---|
| `--canvas-paper` | `#F8FAFC` | Primary application canvas |
| `--surface-0` | `#FFFFFF` | Standard card and container surface |
| `--surface-50` | `#F1F5F9` | Secondary background, table headers |
| `--surface-100` | `#E2E8F0` | Subtle dividers and chip backgrounds |
| `--surface-teal` | `#F0FDFA` | Clinical highlight and active pill background |
| `--ink-900` | `#0F172A` | Primary typography and dark headers |
| `--ink-700` | `#334155` | Secondary body text |
| `--ink-500` | `#64748B` | Muted labels, timestamps, metadata |
| `--ink-300` | `#CBD5E1` | Hairline border |
| `--ink-200` | `#E2E8F0` | Card border & dividers |

### Clinical Brand Accents
| Token | Hex | Usage |
|---|---|---|
| `--brand-teal` | `#0D9488` | Core clinical action, active tabs, buttons |
| `--brand-teal-hover` | `#0F766E` | Hover state for primary buttons |
| `--brand-indigo` | `#4F46E5` | Secondary data tracks & telemetry line charts |

### Semantic Clinical Risk Badges (Strictly Clinical Status — Never Decoration)
| Band | Text | Background | Border |
|---|---|---|---|
| **High Risk (Red)** | `#DC2626` | `#FEF2F2` | `1px solid #FECACA` |
| **Moderate (Amber)** | `#D97706` | `#FFFBEB` | `1px solid #FDE68A` |
| **Low Risk (Green)** | `#15803D` | `#F0FDF4` | `1px solid #BBF7D0` |

---

## 3. Component Standards
- **Buttons**: Minimum touch target of 44px (`48px` for patient actions), subtle border, clear focus ring (`#0D9488`).
- **Cards**: `bg-white border border-[#E2E8F0] rounded-xl shadow-card`.
- **Telemetry Charts**: Clean Recharts graphs with `#E2E8F0` hairline grid, `#0D9488` and `#4F46E5` trendlines.
- **Senior Accessibility**: Patient mobile views enforce `>= 18px` body copy and high contrast ratios conforming to WCAG AA.
