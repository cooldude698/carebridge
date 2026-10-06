# CareBridge Frontend — Swapin
> You're covering all of: design system (yours), patient app (Vedesh's), doctor portal (Aman's), family feed.
> Folders you touch: `components/ui`, `design/`, `app/(patient)`, `app/(family)`, `app/(doctor)`, `app/(admin)`, `lib/voice`, `lib/i18n`.
> Aryan owns everything else — `app/api`, `lib/risk`, `lib/ai`, `lib/wearable`, `lib/escalation`, `supabase/`.

Read `docs/MEMORY.md`, `docs/RULES.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md` before starting.

---

## Phase 1 — WearablePanel Component (Design System)
*Unblocks: Phase 3 doctor page, Phase 4 patient page. Do this first.*

### Session starter prompt
```
You are working on CareBridge. Read docs/MEMORY.md, docs/DESIGN.md, docs/RULES.md.
Role: FRONTEND (covering Swapin + Aman + Vedesh). Touch: components/ui, design/, app/(patient), app/(family), app/(doctor), app/(admin), lib/voice, lib/i18n.

Phase 1: Build components/ui/WearablePanel.tsx

Props:
  interface WearablePanelProps {
    wearable: WearableContext | null   // from lib/types.ts — Aryan adds this type
    isLoading: boolean
  }

WearableContext shape (use this until Aryan ships lib/types.ts update):
  {
    heartRate: { mean: number; nocturnalMean: number; max: number }
    bloodPressure: { latestSystolic: number; latestDiastolic: number; avgSystolic7d: number; trend: 'rising'|'stable'|'falling' }
    steps: { dailyMean: number; baseline14d: number; pctChangeFromBaseline: number }
    glucose: { latestFasting: number | null; mean: number | null }
    anomalyFlags: { ruleId: string; severity: 'HIGH'|'MEDIUM'|'LOW'; title: string; detail: string; readingId: string }[]
    lastUpdated: string
  }

Render:

1. Stat row (3 cards, desktop side-by-side, mobile stacked):
   - Nocturnal HR: Sora number, --risk-red text + --risk-red-bg bg if > 100 bpm
   - Daily Steps: Sora number, --risk-amber-bg if pctChangeFromBaseline < -30
   - Mean Glucose: Sora number, --risk-red text if latestFasting >= 180
   Each card: white Card, --r-md, --shadow-card, DM Sans 13px label above, Sora large number

2. AnomalyBanner strip (one per anomalyFlag):
   - HIGH: --risk-red-bg bg, --risk-red text, lucide AlertCircle icon
   - MEDIUM: --risk-amber-bg bg, --risk-amber text, lucide AlertTriangle icon
   - LOW: --surface-100 bg, --ink-500 text, lucide Info icon
   Show flag.title bold + flag.detail in smaller text. Never use risk colors for decoration.

3. Three Recharts LineCharts (stacked):
   a. Heart Rate — teal stroke (var(--brand-teal)), dashed red ReferenceLine at y=100
   b. Blood Pressure — two lines: systolic (--ink-900), diastolic (--ink-500)
   c. Steps 14d — indigo stroke (#4B3FB8), amber dashed ReferenceLine at 60% of baseline14d
   Chart wrapper: Card, --r-lg. Axis labels: DM Sans 11px --ink-300. Tooltip: DM Sans 12px.
   Data: derive chart points from the summary values; real per-reading arrays come later from Aryan.
   For now, generate 14 synthetic trend points from the summary (e.g. linear interpolation to latestSystolic).

4. Loading: 3 Card skeleton divs, CSS pulse animation (opacity 0.5 → 1 → 0.5, 1.2s infinite)

5. Empty (wearable = null, isLoading = false):
   EmptyState component (build it too if not yet done): lucide Watch icon, "No wearable data yet" DM Sans 16px --ink-500

Font rules (hard):
  - Numbers everywhere: font-family: var(--font-data)   [Sora]
  - Labels, axis, body: font-family: var(--font-body)   [DM Sans]
  - NO monospace, NO Inter, NO Arial, NO JetBrains

Run npm run lint && npm run build. Fix all errors. Commit on swapin/ui branch.
Add one line to docs/MEMORY.md status log.
```

---

## Phase 2 — BriefPanel Upgrade (Streaming + Citations)
*Depends on: Aryan Phase 3 (SSE endpoint). Build the UI now; wire the real endpoint when Aryan ships.*

### Session starter prompt
```
You are working on CareBridge. Read docs/MEMORY.md, docs/DESIGN.md, docs/RULES.md.
Role: FRONTEND.

Phase 2: Upgrade components/ui/BriefPanel.tsx to support SSE streaming and citation chips.

New props:
  interface BriefPanelProps {
    patientId: string
    isOpen: boolean
    onClose: () => void
    streamText: string          // fed from useBriefStream hook (Phase 5)
    isStreaming: boolean
    citations: { readingId: string; value: string; at: string }[]
    source: 'llm' | 'fallback' | null
    error: string | null
  }

Render:

1. Drawer sliding in from right (framer-motion AnimatePresence):
   - 360px wide desktop, full-width mobile (< 768px)
   - Backdrop: --ink-900 at 40% opacity, closes panel on click
   - Close: lucide X button, 44px touch target, top-right

2. Header: "Pre-consult Brief" Montserrat 600 20px + lucide FileText icon
   Sub: "Dr. Rao · Decision support only" DM Sans 13px --ink-500

3. Source chip (top-right of content area):
   - 'llm': teal pill, lucide Sparkles icon, "AI Generated"
   - 'fallback': amber pill, lucide FileText icon, "Template"
   - null: nothing

4. Brief body:
   - Parse streamText for "Since last visit:" / "Concerns:" / "Suggested checks:" labels
   - Render each as: Montserrat 600 16px section label + DM Sans 15px body below
   - While isStreaming: blinking cursor after last char (CSS ::after { content:'|'; animation: blink 1s step-end infinite })
   - Smooth text appearance: no janky re-renders; append to existing text

5. Citations strip (show when citations.length > 0 and !isStreaming):
   Label "Based on:" DM Sans 12px --ink-500
   Each citation: pill chip, --surface-100 bg, --ink-700 text, Sora 11px, rounded-full
   Content: "#{ readingId.slice(0,6) } · { value } · { at formatted as 'Oct 3, 2am' }"
   Chips wrap to next line

6. Loading skeleton (isStreaming=true, streamText=''):
   3 grey skeleton lines pulsing

7. Error state: EmptyState variant with error message + "Try Again" ghost Button

8. Footer (always): "Decision support only. Doctor decides." DM Sans 12px --ink-500 centered
   "Simulated data" DM Sans 11px --ink-300 below

Motion: slide-in 200ms ease-out, backdrop fade 150ms. Respect prefers-reduced-motion.

Run npm run lint && npm run build. Fix all errors.
```

---

## Phase 3 — Doctor Detail Page (Wearable Tab + Brief Wire-up)
*Depends on: Phase 1 (WearablePanel), Phase 2 (BriefPanel).*

### Session starter prompt
```
You are working on CareBridge. Read docs/MEMORY.md, docs/ARCHITECTURE.md, docs/RULES.md, docs/DESIGN.md.
Role: FRONTEND.

Phase 3: Upgrade app/(doctor)/doctor/[id]/page.tsx

A. Add Wearable tab:
   Tabs: Overview | Wearable | Medicine Log | Alerts
   (Wearable is now the SECOND tab — it's our USP)
   - Tab label: "Wearable Data" desktop, "Wearable" mobile
   - If wearable.anomalyFlags has any HIGH item: show a 6px --risk-red dot top-right of the tab label
   - Render: <WearablePanel wearable={patient.wearable ?? null} isLoading={isLoading} />
   - patient.wearable comes from GET /api/patients/:id (Aryan adds this field)
   - Until Aryan ships: mock wearable as null

B. Brief streaming wire-up:
   Build a local hook stub in this file (until Vedesh's useBriefStream lands in lib/voice):
     const [streamText, setStreamText] = useState('')
     const [citations, setCitations] = useState([])
     const [isStreaming, setIsStreaming] = useState(false)
     const [briefSource, setBriefSource] = useState(null)
     const [briefError, setBriefError] = useState(null)
     
     const startBrief = async (patientId) => {
       setIsStreaming(true); setStreamText(''); setCitations([]); setBriefError(null)
       // Stub: call POST /api/patients/:id/brief (non-streaming) for now
       try {
         const res = await fetch(`/api/patients/${patientId}/brief`, { method:'POST' })
         const data = await res.json()
         setStreamText(data.text ?? '')
         setCitations(data.citations ?? [])
         setBriefSource(data.source ?? null)
       } catch(e) { setBriefError('Brief unavailable') }
       finally { setIsStreaming(false) }
       // When Aryan ships SSE endpoint: replace this with EventSource on /api/patients/:id/brief/stream
     }

   "Pre-consult Brief" button:
     - Default: secondary Button, lucide FileText, "Pre-consult Brief"
     - While isStreaming: disabled, lucide Loader2 spinning, "Generating..."
     - After done: ghost Button, lucide RefreshCw, "Regenerate"
     - Error: danger Button, lucide AlertCircle, "Try Again"
   
   On click: startBrief(id), setIsPanelOpen(true)
   
   <BriefPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)}
     streamText={streamText} isStreaming={isStreaming} citations={citations}
     source={briefSource} error={briefError} patientId={id} />

C. "Update Care Plan" action button:
   Add alongside Call/Message/Teleconsult in the action bar.
   Primary teal Button, lucide ClipboardEdit, "Update Care Plan"
   Opens a modal (build inline or as components/doctor/DoctorNoteModal.tsx):
   
   Modal content:
   - Header: "Update Care Plan for {patient.name}" Montserrat 700, lucide Stethoscope
   - Sub: "Type your note. Patient sees a friendly summary." DM Sans 14px --ink-500
   - Textarea: DM Sans 16px, 4 rows min, 500 char max, counter DM Sans 11px --ink-300 bottom-right
     Placeholder: "e.g. Increase morning walk to 20 min. Check BP every 3 days. Review in 2 weeks."
   - Send button: "Send to Patient" primary teal, disabled until >= 20 chars
   - On send: POST /api/patients/:id/doctor-note { noteText }
     Loading: spinner + "Sending...", textarea disabled
     Success: close modal, toast "Care plan updated. {patient.name} will see this shortly."
     Error: inline error below textarea, modal stays open
   - Footer: "Raw note is not shown to patient." DM Sans 12px --ink-300
   - Accessibility: trap focus, close on Escape, close on backdrop click

D. Top-bar notification:
   Show "N urgent" chip if any patient has risk band RED or has HIGH wearable anomaly flags.
   Reuse existing notification logic; add the anomaly check.

Run npm run lint && npm run build. Fix all errors. Add MEMORY.md status log line.
```

---

## Phase 4 — Patient Home (Wearable Section + Doctor Note Card)
*Depends on: Aryan Phase 1 (WearableContext), Aryan Phase 4 (doctor-note endpoint).*

### Session starter prompt
```
You are working on CareBridge. Read docs/MEMORY.md, docs/ARCHITECTURE.md, docs/RULES.md, docs/DESIGN.md.
Role: FRONTEND.

Phase 4: Upgrade app/(patient)/patient/page.tsx

A. Wearable insight section (below existing StatTiles):
   Fetch wearable from GET /api/patients/:id (field: patient.wearable — null if not yet from Aryan)
   
   If wearable is null: render nothing.
   If wearable exists:
   
   Section heading: i18n key 'wearable.section_title' — Montserrat H2 22px mobile
   
   For each anomalyFlag (HIGH only on patient screen — don't show LOW/MEDIUM to patient):
     Gentle card: white Card, --brand-teal left border 3px
     Icon: lucide Heart (HR), lucide Activity (steps), lucide Droplets (glucose) — all --brand-teal, never red
     Message: i18n string (see keys below) — DM Sans 20px (elderly sizing)
     CTA button: "Share with Doctor" secondary Button → POST /api/patients/:id/vitals { type:'flag_acknowledged', valueA: 1 }
     After POST: button becomes "Sent ✓" (lucide CheckCircle2 --risk-green, no emoji) + disabled
   
   If no HIGH flags: positive card, lucide CheckCircle2 --risk-green, i18n 'wearable.all_good', DM Sans 20px

B. Doctor Note card (below wearable section):
   Fetch from GET /api/patients/:id/goals (Aryan Phase 4 — mock as { goals:[], latestNote:null } until ready)
   
   If latestNote is null: render nothing.
   If latestNote exists: render DoctorNoteCard (build below):
   
   DoctorNoteCard (build in components/ui/DoctorNoteCard.tsx):
   Props: { noteDate:string; reminders:{medicine:string;time:string;instruction:string}[]; goals:{category:string;target:string;by:string;id:string}[]; followUpDate:string|null; isLoading:boolean }
   
   Render:
   - Card, white, --r-lg, --shadow-card, --brand-teal left border 3px
   - Header: lucide Stethoscope --brand-teal, i18n 'doctor_note.from_doctor' Montserrat 600 18px, noteDate DM Sans 13px --ink-500
   - Reminders (if any): "Updated Reminders" DM Sans 500 13px label, each reminder as a row: medicine name Sora 14px + time chip (Sora 11px --brand-teal bg) + instruction DM Sans 16px
   - Goals (if any): "Your Goals" label, each goal as GoalItem (build below)
   - Follow-up date (if not null): lucide CalendarCheck --brand-teal, i18n interpolated date string DM Sans 16px
   
   GoalItem (build in components/ui/GoalItem.tsx):
   Props: { category:string; target:string; by:string; id:string; isCompleted:boolean }
   - Row: category icon (lucide Heart=bp, lucide Activity=steps, lucide Pill=medicine) --brand-teal
   - Target: DM Sans 20px (18px min — elderly sizing)
   - By date: DM Sans 13px --ink-500
   - Tap whole row → POST /api/patients/:id/goals/:id/complete → optimistic tick (lucide CheckCircle2 --risk-green), revert on error + toast
   - Min touch target: 56px height (generous for elderly)

C. i18n keys to add in lib/i18n/en.ts, hi.ts, kn.ts:
   wearable.section_title: "Your Health Today" / "आपका आज का स्वास्थ्य" / "ನಿಮ್ಮ ಇಂದಿನ ಆರೋಗ್ಯ"
   wearable.hr_nocturnal_high: "Your heart rate was a bit high while you slept recently." / "हाल ही में सोते समय आपकी हृदय गति थोड़ी तेज़ थी।" / "ಇತ್ತೀಚೆಗೆ ನಿದ್ದೆಯಲ್ಲಿ ನಿಮ್ಮ ಹೃದಯ ಬಡಿತ ಸ್ವಲ್ಪ ಹೆಚ್ಚಾಗಿತ್ತು।"
   wearable.steps_decline: "You've been walking a bit less than usual lately." / "हाल ही में आप सामान्य से कम चल रहे हैं।" / "ಇತ್ತೀಚೆಗೆ ನೀವು ಸಾಮಾನ್ಯಕ್ಕಿಂತ ಕಡಿಮೆ ನಡೆಯುತ್ತಿದ್ದೀರಿ।"
   wearable.glucose_high: "Your blood sugar reading is on the higher side." / "आपका रक्त शर्करा स्तर थोड़ा अधिक है।" / "ನಿಮ್ಮ ರಕ್ತದ ಸಕ್ಕರೆ ಮಟ್ಟ ಸ್ವಲ್ಪ ಹೆಚ್ಚಾಗಿದೆ।"
   wearable.all_good: "Everything looks good today." / "आज सब ठीक है।" / "ಇಂದು ಎಲ್ಲವೂ ಚೆನ್ನಾಗಿದೆ।"
   wearable.tell_doctor: "Share with Doctor" / "डॉक्टर को बताएं" / "ವೈದ್ಯರಿಗೆ ತಿಳಿಸಿ"
   doctor_note.from_doctor: "From Dr. Rao" / "डॉक्टर राव से" / "ಡಾ. ರಾವ್ ಅವರಿಂದ"
   doctor_note.new_plan: "Your care plan was updated" / "आपकी देखभाल योजना अपडेट हुई" / "ನಿಮ್ಮ ಆರೈಕೆ ಯೋಜನೆ ನವೀಕರಿಸಲಾಗಿದೆ"
   doctor_note.goal_completed: "Done" / "पूरा हुआ" / "ಮುಗಿದಿದೆ"

Patient screen rules: body text min 18px (20px preferred), touch targets min 48px (56px for GoalItem).
Never show clinical terms to patient: no "systolic", "anomaly", "HbA1c", "threshold". Use i18n strings only.

Run npm run lint && npm run build. Fix all errors. Add MEMORY.md status log line.
```

---

## Phase 5 — SSE Hook + Family Feed Upgrade

### Session starter prompt
```
You are working on CareBridge. Read docs/MEMORY.md, docs/ARCHITECTURE.md, docs/RULES.md.
Role: FRONTEND.

Phase 5a: Build lib/voice/useBriefStream.ts (replaces the Phase 3 stub)

Export:
  useBriefStream(): {
    streamText: string
    citations: { readingId: string; value: string; at: string }[]
    isStreaming: boolean
    source: 'llm'|'fallback'|null
    error: string|null
    startStream: (patientId: string) => void
    reset: () => void
  }

Implementation:
- startStream opens EventSource to GET /api/patients/:id/brief/stream
- SSE message types:
    { type:'token', delta:string } → append delta to streamText
    { type:'done', citations:[], source:'llm'|'fallback' } → set citations, source, isStreaming=false, close EventSource
    { type:'error', message:string } → set error, isStreaming=false, close EventSource
- reset() clears all state and closes any open EventSource
- useEffect cleanup: close EventSource on unmount
- If EventSource unsupported: set error='Streaming not supported', isStreaming=false immediately

After Aryan ships /api/patients/:id/brief/stream, replace Phase 3's inline stub with:
  import { useBriefStream } from '@/lib/voice'
  const { streamText, citations, isStreaming, source, error, startStream, reset } = useBriefStream()
(Update app/(doctor)/doctor/[id]/page.tsx to use the real hook.)

Phase 5b: Upgrade family feed (app/(family)/family/page.tsx)

New alert types to handle (add to lib/types.ts AlertItem.level):
  'wearable_anomaly' | 'doctor_note'

New renders:
- wearable_anomaly: AlertItem, lucide Activity icon, --risk-amber-bg bg, --risk-amber icon
  i18n: family.wearable_anomaly_hr / family.wearable_anomaly_steps (see keys below)
- doctor_note: AlertItem, lucide Stethoscope, --surface-teal bg (#E6F9F7 — add to tokens.css as --surface-teal), --brand-teal icon
  i18n: family.doctor_note

Sort order (most urgent first): doctor > wearable_anomaly > family > reminder

"Last updated" footer: "Updated {time} ago" — simple relative formatter (no lib: if < 60s "Just now", < 3600s "X min ago", else "X hours ago"). DM Sans 12px --ink-300.

i18n keys (add to en/hi/kn):
  family.wearable_anomaly_hr: "Ramesh ji's heart rate was a bit high during sleep." / "रमेश जी की नींद के दौरान हृदय गति थोड़ी तेज़ थी।" / "ರಮೇಶ್ ಅವರ ನಿದ್ದೆಯಲ್ಲಿ ಹೃದಯ ಬಡಿತ ಸ್ವಲ್ಪ ಹೆಚ್ಚಾಗಿತ್ತು।"
  family.wearable_anomaly_steps: "Ramesh ji has been less active than usual." / "रमेश जी सामान्य से कम सक्रिय रहे हैं।" / "ರಮೇಶ್ ಅವರು ಸಾಮಾನ್ಯಕ್ಕಿಂತ ಕಡಿಮೆ ಸಕ್ರಿಯರಾಗಿದ್ದಾರೆ।"
  family.doctor_note: "Dr. Rao has updated the care plan." / "डॉक्टर राव ने देखभाल योजना अपडेट की है।" / "ಡಾ. ರಾವ್ ಆರೈಕೆ ಯೋಜನೆ ನವೀಕರಿಸಿದ್ದಾರೆ।"
  family.last_updated: "Updated {time} ago" / "{time} पहले अपडेट हुआ" / "{time} ಹಿಂದೆ ಅಪ್ಡೇಟ್ ಆಯಿತು"

Run npm run lint && npm run build. Fix all errors. Add MEMORY.md status log line.
```

---

## Phase 6 — Final QA + Motion + Screenshots

### Session starter prompt
```
You are working on CareBridge. Read docs/MEMORY.md, docs/DESIGN.md, docs/RULES.md.
Role: FRONTEND.

Phase 6: Visual QA, motion, and screenshots.

1. Font audit:
   grep -r "font-family\|fontFamily\|font-sans\|font-mono\|JetBrains\|Arial\|Inter\|Roboto\|Calibri" --include="*.tsx" --include="*.ts" --include="*.css" .
   Fix every hit. Only Montserrat (var(--font-display)), DM Sans (var(--font-body)), Sora (var(--font-data)) allowed.

2. Colour audit:
   grep -rP "#[0-9a-fA-F]{6}" --include="*.tsx" --include="*.ts" .
   Any hex not in design/tokens.css → replace with token. Note Recharts exceptions in MEMORY.md.

3. design/motion.ts — create if missing. Export framer-motion variants:
   riskBadgeSwap: { initial:{scale:0.9,opacity:0.7}, animate:{scale:1,opacity:1}, transition:{duration:0.18,ease:'easeOut'} }
   listSlide: use layoutId on PatientRow so doctor list re-sorts with FLIP, duration 0.22s ease-out
   micPulse: { animate:{scale:[1,1.08,1]}, transition:{repeat:Infinity,duration:0.9,ease:'easeInOut'} }
   All: check window.matchMedia('(prefers-reduced-motion: reduce)') → if true return { duration:0 }

4. Mobile pass at 390px viewport:
   Patient screens: body >= 18px, touch targets >= 48px, no horizontal scroll.
   Doctor screens: 768px min — ensure tabs don't overflow on tablet.

5. Screenshots at 2x, save to design/screenshots/:
   landing.png, patient-home.png, doctor-list-red.png, doctor-brief-open.png

6. Accessibility:
   All modals: trap focus, close on Escape
   All icon-only buttons: aria-label
   Risk badge: never color alone — always has text label

Run npm run lint && npm run build. Fix all errors. Add MEMORY.md status log line.
```

---

## Non-negotiables
- Numbers: Sora always. Labels/body: DM Sans. Headings: Montserrat. Zero exceptions.
- Risk colors (`--risk-red`, `--risk-amber`, `--risk-green`) only on actual risk/anomaly — never decoration.
- Patient messages: always i18n keys, never clinical terms in user-facing strings.
- Every component handles null/empty/loading state without crashing.
- No new npm packages without adding to MEMORY.md.
- After each phase: `npm run lint && npm run build` → fix errors → commit → MEMORY.md log line.
