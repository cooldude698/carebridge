/**
 * CareBridge — Daisy × Claud Neo-Editorial Landing Page
 * ─────────────────────────────────────────────────────────────
 * Meticulously crafted to embody the artistic high-craft of "Daisy"
 * and the whimsical tactile brutalism of "Claud":
 *  - Warm ivory graph paper grid canvas
 *  - High-impact fluorescent pink highlighter strokes
 *  - Overlapping tilted scrapbook polaroids & rotated sticky note tags
 *  - 2px carbon ink borders and crisp drop shadows
 *  - Interactive feature pills with surrealist medical art collage
 *  - Real-time interactive clinical triage sandbox
 *  - Claud-style #1-#4 pastel portal showcase cards
 */

"use client";

import * as React from "react";
import Link from "next/link";
import {
  Stethoscope,
  Smartphone,
  Users,
  BarChart3,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Mic,
  Activity,
  Heart,
  Pill,
  Clock,
  Send,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RiskBadge, type RiskBand } from "@/components/ui/RiskBadge";
import { CareBridgeLogo } from "@/components/ui/CareBridgeLogo";
import {
  DoodleDaisy,
  DoodleClaudCloud,
  DoodleHandPress,
  DoodleSparkle,
  DoodleStar,
  DoodleUnderline,
  DoodleHeart,
  DaisyMonaLisaCollage,
} from "@/components/ui/Doodles";

export default function LandingPage() {
  // Feature Tab selection for Section 2 (Daisy "Transform chaos into creativity" clone)
  const [activeFeature, setActiveFeature] = React.useState<number>(0);
  const [selectedRuleCategory, setSelectedRuleCategory] = React.useState<string>("all");

  // Live Sandbox Simulation state for Section 3 (Daisy "Turn midnight musings..." clone)
  const [simRiskBand, setSimRiskBand] = React.useState<RiskBand>("amber");
  const [simScore, setSimScore] = React.useState<number>(54);
  const [simPatientName, setSimPatientName] = React.useState<string>("Ramesh Sharma (68y)");
  const [simReasons, setSimReasons] = React.useState<string[]>([
    "Missed 2 evening doses of Metformin 500mg in 72 hours (Adherence: 71%)",
    "Systolic BP trending upward (+9% vs 14-day baseline)",
  ]);
  const [simAlertMsg, setSimAlertMsg] = React.useState<string>(
    "Moderate Risk — Automated WhatsApp reminder scheduled for family at 8:00 PM."
  );
  const [simActionFired, setSimActionFired] = React.useState<string | null>(null);

  const handleSimSpike = () => {
    setSimRiskBand("red");
    setSimScore(86);
    setSimReasons([
      "Critical Systolic BP spike: 155/95 mmHg (Threshold: >140 mmHg)",
      "Missed 3 consecutive doses of Metformin 500mg in 48h",
      "Daily steps dropped -48% vs 14-day rolling average (frailty marker)",
    ]);
    setSimAlertMsg("URGENT ESCALATION: Patient flipped to HIGH RISK. Doctor outreach triggered.");
    setSimActionFired("Stage 2 Family WhatsApp + Doctor SMS Dispatched!");
    setTimeout(() => setSimActionFired(null), 4000);
  };

  const handleSimRecover = () => {
    setSimRiskBand("green");
    setSimScore(18);
    setSimReasons([
      "All vitals within healthy baseline (BP 118/78 mmHg, Glucose 104 mg/dL)",
      "100% medication adherence recorded over last 7 days",
      "Daily physical activity normal (4,210 steps)",
    ]);
    setSimAlertMsg("STABLE: Patient returned to LOW RISK. Daily logs verified.");
    setSimActionFired("Dose confirmed via Hindi Voice: 'Maine dawai le li'");
    setTimeout(() => setSimActionFired(null), 4000);
  };

  const handleSimWearableDrop = () => {
    setSimRiskBand("amber");
    setSimScore(62);
    setSimReasons([
      "Wearable mobility drop: 1,840 steps (down 52% from patient 14-day baseline)",
      "Resting heart rate elevated: 88 bpm (+12 bpm above baseline)",
    ]);
    setSimAlertMsg("ALERT: Frailty or fatigue pattern detected. Nurse callback queued.");
    setSimActionFired("Passive wearable anomaly logged.");
    setTimeout(() => setSimActionFired(null), 4000);
  };

  const features = [
    {
      title: "Turn scattered home logs into a 15-second pre-consult brief",
      desc: "Doctors don't have 10 minutes to scroll raw vitals. Our engine synthesizes 14 days of glucose, BP, and missed doses into an actionable longitudinal clinical brief.",
      tag: "DOCTOR COCKPIT",
      stat: "15 SEC",
      statLabel: "Average doctor review time",
      color: "bg-[#D4F77C]",
    },
    {
      title: "Score clinical risk deterministically (0–100) with 8 explainable rules",
      desc: "No black-box hallucinating AI. Every risk score is calculated via 8 hard deterministic clinical rules (BP delta, medication adherence gap, glucose variability, wearable mobility drop).",
      tag: "EXPLAINABLE TRIAGE",
      stat: "8 RULES",
      statLabel: "Deterministic clinical heuristics",
      color: "bg-[#EDE9FE]",
    },
    {
      title: "Log medications by voice in Hindi, Kannada, or English without typing",
      desc: "Elderly patients struggle with small touch targets and complex drop-downs. With one tap on the microphone, seniors speak in their mother tongue and intent is extracted in 1 second.",
      tag: "VOICE LOGGING",
      stat: "1 TAP",
      statLabel: "Hindi / Kannada / English",
      color: "bg-[#FEE159]",
    },
    {
      title: "Prevent hospital readmissions with multi-tier WhatsApp family escalations",
      desc: "A continuous 3-stage escalation ladder: Patient voice reminder → Family WhatsApp nudge → Doctor clinical alert. Catch decompensation before an emergency room visit.",
      tag: "CARE CIRCLE",
      stat: "14",
      statLabel: "Readmissions averted this month",
      color: "bg-[#BAE6FD]",
    },
  ];

  return (
    <div className="min-h-screen bg-grid-paper text-ink-900 flex flex-col selection:bg-[#FEE159] selection:text-ink-900 overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. DAISY-INSPIRED TACTILE HEADER
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#FBF9F4]/90 backdrop-blur-md border-b-2 border-ink-900 px-6 sm:px-12 py-4">
        <div className="max-w-[1240px] mx-auto flex items-center justify-between">
          {/* Left: Daisy Logo & Brand */}
          <CareBridgeLogo size="md" showBadge={true} href="/" />

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 font-mono text-xs font-bold text-ink-700">
            <a
              href="#problem"
              className="hover:text-ink-900 hover:underline underline-offset-4 decoration-2"
            >
              How It Works
            </a>
            <a
              href="#triage-engine"
              className="hover:text-ink-900 hover:underline underline-offset-4 decoration-2"
            >
              8-Rule Engine
            </a>
            <a
              href="#sandbox"
              className="hover:text-ink-900 hover:underline underline-offset-4 decoration-2"
            >
              Live Sandbox
            </a>
            <a
              href="#portals"
              className="hover:text-ink-900 hover:underline underline-offset-4 decoration-2"
            >
              4 Portals
            </a>
          </nav>

          {/* Right Action: Daisy-style Pistachio Green Button */}
          <div className="flex items-center gap-3">
            <Link
              href="/sim"
              className="hidden lg:inline-flex items-center font-mono text-xs font-bold text-ink-700 hover:text-ink-900 px-3 py-1.5 rounded-full border-2 border-transparent hover:border-ink-900 transition-all"
            >
              <Sliders className="w-3.5 h-3.5 mr-1.5" />
              Event Sim
            </Link>
            <Link href="/doctor">
              <button className="bg-[#D4F77C] text-ink-900 font-mono text-xs font-bold px-4 sm:px-5 py-2 rounded-full border-2 border-ink-900 shadow-[2px_2px_0px_#121214] hover:shadow-[3px_3px_0px_#121214] hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0px_#121214] transition-all flex items-center gap-1.5">
                <span>Doctor Cockpit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION: DAISY SCREENSHOT 4 ADAPTED FOR CAREBRIDGE
      ───────────────────────────────────────────────────────────── */}
      <section className="relative max-w-[1240px] mx-auto w-full px-6 sm:px-12 pt-12 pb-16 lg:pt-20 lg:pb-24 flex flex-col items-center text-center">
        {/* Top Tag Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border-2 border-ink-900 bg-white shadow-[2px_2px_0px_#121214] mb-6">
          <DoodleDaisy size={14} color="#121214" />
          <span className="font-mono text-xs font-bold text-ink-900 tracking-wide uppercase">
            Continuous Explainable Chronic Care Loop
          </span>
        </div>

        {/* Big High-Impact Serif Headline with Fluorescent Pink Marker Highlight */}
        <h1 className="font-serif font-black text-ink-900 tracking-tight leading-[1.08] max-w-4xl mb-6 text-4xl sm:text-6xl lg:text-7xl">
          Give chronic care a glow up. Meet your new{" "}
          <span className="highlight-pink relative inline-block text-ink-900">
            clinical copilot.
          </span>
        </h1>

        {/* Monospace Typewriter Subheading */}
        <p className="font-mono text-sm sm:text-base text-ink-700 max-w-2xl mx-auto mb-10 leading-relaxed">
          Capture, triage, and elevate home health data across patients, family caregivers, and physicians across India.
        </p>

        {/* Quick CTA Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16 z-10">
          <Link href="/doctor">
            <button className="bg-[#D4F77C] text-ink-900 font-mono text-sm font-bold px-7 py-3 rounded-full border-2 border-ink-900 shadow-[3px_3px_0px_#121214] hover:shadow-[4px_4px_0px_#121214] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#121214] transition-all flex items-center gap-2">
              <Stethoscope className="w-4 h-4 stroke-[2.5]" />
              <span>EXPLORE DOCTOR COCKPIT</span>
            </button>
          </Link>
          <Link href="/patient">
            <button className="bg-white text-ink-900 font-mono text-sm font-bold px-6 py-3 rounded-full border-2 border-ink-900 shadow-[3px_3px_0px_#121214] hover:bg-[#FBF9F4] hover:shadow-[4px_4px_0px_#121214] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#121214] transition-all flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#FF5C98] stroke-[2.5]" />
              <span>Try Patient Voice App (Hindi/Kannada)</span>
            </button>
          </Link>
        </div>

        {/* ─── THE AUTHENTIC FAN DECK / SCRAPBOOK CAROUSEL (DAISY HERO CLONE) ─── */}
        <div className="relative w-full max-w-[1140px] mx-auto pt-6 pb-12 select-none">
          {/* Floating Rotated Sticky Notes */}
          <div className="absolute -top-4 left-2 sm:left-10 z-40 transform -rotate-6">
            <div className="sticky-tag bg-[#FEE159] text-ink-900 text-xs shadow-[3px_3px_0px_#121214] border-2 border-ink-900 px-3 py-1.5 rounded-xl">
              <span>📌 &quot;Help me log my morning diabetes dose&quot;</span>
            </div>
          </div>

          <div className="absolute -bottom-2 right-2 sm:right-12 z-40 transform rotate-4">
            <div className="sticky-tag bg-[#FF5C98] text-ink-900 text-xs shadow-[3px_3px_0px_#121214] border-2 border-ink-900 px-3 py-1.5 rounded-xl font-bold">
              <span>⚡ &quot;Help me analyze Ramesh&apos;s BP spike&quot;</span>
            </div>
          </div>

          {/* Overlapping Fan of 5 Tilted Polaroid Cards with -space-x */}
          <div className="flex flex-row items-center justify-center -space-x-6 sm:-space-x-12 px-4 py-6 overflow-visible">
            {/* Card 1: Senior Voice Log Polaroid (Tilted Left -6deg) */}
            <div className="w-52 sm:w-60 shrink-0 transform -rotate-8 translate-y-3 z-10 transition-all duration-300 hover:rotate-0 hover:z-50 hover:scale-105">
              <div className="bg-white border-2 border-ink-900 rounded-2xl p-3.5 pb-5 shadow-[4px_4px_0px_#121214] text-left">
                <div className="w-full h-40 rounded-xl bg-[#FEE159]/25 border-2 border-ink-900 flex flex-col items-center justify-center p-3 text-center mb-3 relative overflow-hidden">
                  <span className="font-mono text-[9px] font-bold text-ink-600 uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-ink-900 mb-1">
                    RAMESH K. (68y)
                  </span>
                  <div className="w-12 h-12 rounded-full border-2 border-ink-900 bg-white flex items-center justify-center my-1 shadow-[2px_2px_0px_#121214]">
                    <Mic className="w-6 h-6 text-[#FF5C98]" />
                  </div>
                  <p className="font-serif italic text-xs text-ink-900 font-bold">
                    &quot;Maine subah ki dawai le li&quot;
                  </p>
                </div>
                {/* Tilted Sticky Note on Card */}
                <div className="transform rotate-3 -mt-6 mb-2 mx-1">
                  <div className="bg-[#D4F77C] border border-ink-900 px-2 py-1 rounded text-[10px] font-mono font-bold shadow-[2px_2px_0px_#121214]">
                    Hindi Voice: Metformin 500mg ✓
                  </div>
                </div>
                <div className="space-y-0.5 text-left pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                    <span>Adherence Streak</span>
                    <span className="text-emerald-700">14 Days</span>
                  </div>
                  <p className="text-[10px] font-sans text-ink-500">
                    Intent confirmed in 0.8s
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Book of Clinical Rules (Tilted Left -3deg) */}
            <div className="w-52 sm:w-60 shrink-0 transform -rotate-3 -translate-y-2 z-20 transition-all duration-300 hover:rotate-0 hover:z-50 hover:scale-105">
              <div className="bg-ink-900 text-white border-2 border-ink-900 rounded-2xl p-3.5 pb-5 shadow-[4px_4px_0px_#121214] text-left">
                <div className="w-full h-40 rounded-xl bg-ink-800 border border-white/30 flex flex-col items-center justify-center p-3 mb-3 relative">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#D4F77C] font-bold">
                    CLINICAL HEURISTICS
                  </span>
                  <h3 className="font-serif font-black text-2xl text-white tracking-tight my-1 text-center">
                    Book of Rules
                  </h3>
                  <div className="my-1 text-2xl text-[#FEE159]">⚕</div>
                  <span className="font-mono text-[10px] text-ink-300">
                    8 Deterministic Rules
                  </span>
                </div>
                <div className="space-y-0.5 text-xs">
                  <p className="font-mono font-bold text-[#D4F77C] text-[11px]">
                    ● Rule #1: BP Delta (&gt;15%)
                  </p>
                  <p className="font-mono text-[10px] text-ink-300">
                    ● Rule #4: Adherence Gap
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: "Let It Flow" Daisy Floral Poster (Center Straight, Elevated) */}
            <div className="w-56 sm:w-64 shrink-0 transform scale-105 -translate-y-5 z-30 transition-all duration-300 hover:scale-110 hover:z-50">
              <div className="bg-[#FAF8F5] border-2 border-ink-900 rounded-2xl p-4 pb-6 shadow-[6px_6px_0px_#121214] text-left">
                <div className="w-full h-44 rounded-xl bg-[#EDE9FE] border-2 border-ink-900 flex flex-col items-center justify-center p-3 text-center mb-3 relative overflow-hidden">
                  <span className="font-serif italic font-bold text-xl text-ink-900">
                    Let it Flow
                  </span>
                  {/* Daisy Flower Doodle */}
                  <div className="my-2 animate-pulse" style={{ animationDuration: "4s" }}>
                    <DoodleDaisy size={46} color="#121214" centerColor="#FEE159" />
                  </div>
                  <span className="font-mono text-[10px] font-bold uppercase text-ink-800 bg-white px-2.5 py-0.5 rounded-full border border-ink-900">
                    Continuous Care Loop
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between font-mono text-xs font-bold">
                    <span>Baseline BP</span>
                    <span className="text-emerald-700">120/80 mmHg</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-xs font-bold">
                    <span>Fasting Glucose</span>
                    <span className="text-ink-900">108 mg/dL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Doctor AI Pre-Consult Brief (Tilted Right +3deg) */}
            <div className="w-52 sm:w-60 shrink-0 transform rotate-3 -translate-y-2 z-20 transition-all duration-300 hover:rotate-0 hover:z-50 hover:scale-105">
              <div className="bg-white border-2 border-ink-900 rounded-2xl p-3.5 pb-5 shadow-[4px_4px_0px_#121214] text-left">
                <div className="w-full h-40 rounded-xl bg-[#D4F77C]/25 border-2 border-ink-900 flex flex-col justify-between p-3 mb-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-wider font-bold text-ink-700 bg-white px-2 py-0.5 rounded border border-ink-900">
                      AI BRIEF
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-serif font-black text-sm text-ink-900 leading-tight">
                      15s Pre-Consult Synthesis
                    </h4>
                    <p className="font-sans text-[10px] text-ink-700 mt-1">
                      14-day history summarized before consult.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[9px] font-bold text-ink-800">
                    <Sparkles className="w-3 h-3 text-[#FF5C98]" />
                    <span>Doctor Cockpit</span>
                  </div>
                </div>
                <div className="space-y-0.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-ink-600">Review time:</span>
                    <span className="font-bold text-ink-900">&lt; 15 sec</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-600">FHIR R4:</span>
                    <span className="font-bold text-emerald-700">Compliant</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Family WhatsApp Escalation & Hospital ROI (Tilted Right +7deg) */}
            <div className="w-52 sm:w-60 shrink-0 transform rotate-8 translate-y-3 z-10 transition-all duration-300 hover:rotate-0 hover:z-50 hover:scale-105">
              <div className="bg-white border-2 border-ink-900 rounded-2xl p-3.5 pb-5 shadow-[4px_4px_0px_#121214] text-left">
                <div className="w-full h-40 rounded-xl bg-[#FF5C98]/20 border-2 border-ink-900 flex flex-col justify-between p-3 mb-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] font-bold uppercase text-ink-700 bg-white px-1.5 py-0.5 rounded border border-ink-900">
                      FAMILY CIRCLE
                    </span>
                    <span className="text-[10px]">💬</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-ink-900 text-[10px] font-mono leading-tight shadow-sm">
                    <span className="font-bold text-emerald-800">WhatsApp Alert:</span>
                    <p className="text-ink-700 mt-0.5">&quot;Uncle skipped dose. Nudge sent.&quot;</p>
                  </div>
                  <div className="font-mono text-[9px] text-ink-600 flex items-center justify-between">
                    <span>3-Stage Ladder</span>
                    <span className="font-bold text-emerald-700">Protected</span>
                  </div>
                </div>
                <div className="space-y-0.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-ink-600">Readmissions:</span>
                    <span className="font-bold text-emerald-700">-34% Averted</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-600">Response:</span>
                    <span className="font-bold text-ink-900">&lt; 8 mins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Sticky Note Pill */}
          <div className="mt-8 flex justify-center">
            <div className="sticky-tag bg-[#D4F77C] text-ink-900 text-xs shadow-[3px_3px_0px_#121214] border-2 border-ink-900 px-4 py-1.5 rounded-full transform -rotate-1">
              <span>★ 1,240 Monitored Patients Across Bangalore & Mumbai • CRCE Hackathon 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. SECTION 2: "TRANSFORM CHAOS INTO CREATIVITY / CLINICAL CLARITY"
             (DAISY SCREENSHOT 4 EXACT MATCH: MONA LISA WITH EXPOSED BRAIN COLLAGE)
      ───────────────────────────────────────────────────────────── */}
      <section id="problem" className="max-w-[1240px] mx-auto w-full px-6 sm:px-12 py-16">
        <div className="bg-white border-2 border-ink-900 rounded-3xl p-8 sm:p-14 shadow-[6px_6px_0px_#121214] relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Heading and 4 Monospace Interactive Feature Pills */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <h2 className="font-serif font-black text-3xl sm:text-5xl text-ink-900 tracking-tight leading-tight">
                  Transform chaos into clinical clarity
                </h2>
                <p className="font-mono text-xs sm:text-sm text-ink-600 mt-2">
                  Click through the capabilities below to explore how the loop operates.
                </p>
              </div>

              {/* 4 Interactive Feature Pills */}
              <div className="space-y-3 pt-2">
                {features.map((feat, idx) => {
                  const isActive = activeFeature === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveFeature(idx)}
                      className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 border-ink-900 transition-all font-mono text-xs sm:text-sm leading-relaxed flex items-start gap-3.5 cursor-pointer ${
                        isActive
                          ? `${feat.color} shadow-[4px_4px_0px_#121214] -translate-y-0.5`
                          : "bg-white hover:bg-[#FAF8F5] shadow-[2px_2px_0px_#121214]"
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full border-2 border-ink-900 bg-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <span className="font-bold text-ink-900 block">{feat.title}</span>
                        {isActive && (
                          <p className="font-sans text-xs text-ink-700 mt-2 leading-normal">
                            {feat.desc}
                          </p>
                        )}
                      </div>
                      {isActive && (
                        <span className="font-mono text-[10px] uppercase font-bold bg-white px-2 py-0.5 rounded border border-ink-900 shrink-0">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Exact Mona Lisa Surrealist Art Collage from Daisy Screenshot 4 */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
              <div className="w-full max-w-[460px] mx-auto relative">
                {/* The Masterpiece Mona Lisa Exposed Brain Collage */}
                <DaisyMonaLisaCollage className="w-full h-auto" />

                {/* Floating Telemetry Feedback Card Below Collage */}
                <div className="mt-4 bg-[#FBF9F4] border-2 border-ink-900 rounded-2xl p-4 text-left shadow-[3px_3px_0px_#121214]">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-ink-900 mb-2">
                    <div className="flex items-center gap-2">
                      <DoodleDaisy size={16} />
                      <span className="font-mono text-xs font-bold text-ink-900">
                        {features[activeFeature].tag} • Telemetry
                      </span>
                    </div>
                    <span className="font-serif font-black text-sm text-ink-900">
                      {features[activeFeature].stat}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-ink-700 leading-relaxed">
                    {activeFeature === 0 &&
                      "Synthesis: 'Ramesh K., 68. 2 missed Metformin doses in 72h + 14% systolic BP surge. Recommended check: antihypertensive compliance.'"}
                    {activeFeature === 1 &&
                      "Heuristic Fire: [RULE_BP_ELEVATION] triggered (+18 mmHg). Weight: 35 pts. Combined Score: 84 / 100 (RED). Zero AI Hallucination."}
                    {activeFeature === 2 &&
                      "Audio Transcript (Hindi): 'Maine subah ki dawai le li' -> Recognized: { medicine: 'Metformin 500mg', status: 'TAKEN' } in 0.8s."}
                    {activeFeature === 3 &&
                      "Escalation Dispatch: Stage 1 (Voice alert) -> Stage 2 (WhatsApp template sent to daughter Priya Sharma). Readmission prevented."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2.5 SECTION 2.5: "8-RULE ENGINE" (#triage-engine)
          Deterministic Explainable Clinical Triage Matrix
      ───────────────────────────────────────────────────────────── */}
      <section id="triage-engine" className="max-w-[1240px] mx-auto w-full px-6 sm:px-12 py-16 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EDE9FE] border-2 border-ink-900 font-mono text-[11px] font-bold uppercase text-ink-900 shadow-[2px_2px_0px_#121214] mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
            <span>8-Rule Deterministic Engine • Zero Hallucination</span>
          </div>
          <h2 className="font-serif font-black text-3xl sm:text-5xl text-ink-900 tracking-tight leading-tight">
            Transparent Clinical Triage Rules
          </h2>
          <p className="font-mono text-xs sm:text-sm text-ink-600 mt-2">
            No black-box hallucinating AI. Every risk score (0–100) is deterministically summed from 8 weighted clinical heuristics with explicit mathematical formulas.
          </p>
        </div>

        {/* Filter Tabs by Category */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 font-mono text-xs font-bold">
          {[
            { id: "all", label: "All 8 Rules (130 pts total cap)" },
            { id: "medicines", label: "Medication Adherence (40 pts)" },
            { id: "vitals", label: "Cardiovascular & Glycemic (55 pts)" },
            { id: "lifestyle", label: "Wearable Mobility (10 pts)" },
            { id: "history", label: "Discharge & Dropout (25 pts)" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedRuleCategory(cat.id)}
              className={`px-4 py-2 rounded-full border-2 border-ink-900 transition-all cursor-pointer ${
                selectedRuleCategory === cat.id
                  ? "bg-[#D4F77C] text-ink-900 shadow-[3px_3px_0px_#121214] -translate-y-0.5"
                  : "bg-white text-ink-700 hover:bg-[#FAF8F5] shadow-[1px_1px_0px_#121214]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 8 Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              id: "MED_ADHERENCE_LOW",
              num: "#1",
              category: "medicines",
              label: "Low Medication Adherence",
              weight: 25,
              threshold: "< 70% taken doses over 7 days",
              clinicalRationale: "Missed antihypertensive or oral hypoglycemic doses directly cause rebound hypertension and glycemic volatility within 48–72 hours.",
              action: "Triggers Stage 1 Senior Voice Reminder & Stage 2 Family Nudge.",
            },
            {
              id: "MED_MISSED_STREAK",
              num: "#2",
              category: "medicines",
              label: "Consecutive Missed Doses",
              weight: 15,
              threshold: ">= 2 consecutive doses missed",
              clinicalRationale: "A streak of missed doses suggests deliberate medication discontinuation, severe side effects, or confusion with pill organizer.",
              action: "Escalates directly to Family Caregiver WhatsApp circle.",
            },
            {
              id: "BP_TREND_UP",
              num: "#3",
              category: "vitals",
              label: "Elevated BP 7-Day Trend",
              weight: 20,
              threshold: "7-day average systolic up > 8% vs prior 7d",
              clinicalRationale: "Subacute upward BP drift signals fluid overload, sodium indiscretion, or loss of medical control before acute hypertensive crisis.",
              action: "Flags patient into Doctor Cockpit Amber Triage Queue.",
            },
            {
              id: "BP_STAGE2_SPIKE",
              num: "#4",
              category: "vitals",
              label: "Critical Blood Pressure Spike",
              weight: 20,
              threshold: "Systolic >= 150 mmHg or Diastolic >= 95 mmHg",
              clinicalRationale: "Stage 2 hypertensive readings require urgent physician evaluation to prevent stroke, myocardial infarction, or acute renal insult.",
              action: "Urgent Red Triage flag + Physician SMS callback queue.",
            },
            {
              id: "STEPS_DROP",
              num: "#5",
              category: "lifestyle",
              label: "Wearable Mobility Decline",
              weight: 10,
              threshold: "Daily steps down > 40% vs 14d baseline",
              clinicalRationale: "Rapid physical deceleration is a validated early biomarker of acute illness, occult infection, or progressive heart failure.",
              action: "Included in pre-consult AI brief under Concerns.",
            },
            {
              id: "GLUCOSE_HIGH",
              num: "#6",
              category: "vitals",
              label: "Fasting Hyperglycemia",
              weight: 15,
              threshold: "Fasting blood glucose >= 180 mg/dL",
              clinicalRationale: "Persistent fasting hyperglycemia causes osmotic diuresis, electrolyte imbalance, and accelerated microvascular damage.",
              action: "Prompts doctor to verify compliance and titrate Metformin/Insulin.",
            },
            {
              id: "RECENT_DISCHARGE",
              num: "#7",
              category: "history",
              label: "Post-Discharge 14-Day Window",
              weight: 10,
              threshold: "Discharged from inpatient care <= 14 days ago",
              clinicalRationale: "The first two weeks post-discharge represent the highest vulnerability window for preventable 30-day hospital readmissions.",
              action: "Automatically adds baseline +10 pts buffer to keep close watch.",
            },
            {
              id: "NO_DATA_48H",
              num: "#8",
              category: "history",
              label: "Telemetry Dropout / Data Silence",
              weight: 15,
              threshold: "No vitals or meds logged in > 48 hours",
              clinicalRationale: "Elderly patients living alone who stop logging suddenly may have suffered a fall, loss of consciousness, or phone battery failure.",
              action: "Dispatches family wellness check via WhatsApp nudge.",
            },
          ]
            .filter((r) => selectedRuleCategory === "all" || r.category === selectedRuleCategory)
            .map((rule) => (
              <div
                key={rule.id}
                className="bg-white border-2 border-ink-900 rounded-3xl p-5 shadow-[4px_4px_0px_#121214] flex flex-col justify-between hover:shadow-[6px_6px_0px_#121214] hover:-translate-y-1 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-8 h-8 rounded-full bg-ink-900 text-white font-mono font-black text-xs flex items-center justify-center border border-white">
                      {rule.num}
                    </span>
                    <span className="font-mono text-xs font-black bg-[#D4F77C] px-2.5 py-0.5 rounded-full border border-ink-900 text-ink-900 shadow-[1px_1px_0px_#121214]">
                      +{rule.weight} pts
                    </span>
                  </div>

                  <h3 className="font-serif font-black text-lg text-ink-900 mb-1 leading-snug">
                    {rule.label}
                  </h3>
                  <span className="font-mono text-[10px] text-ink-500 block mb-3">
                    ID: {rule.id}
                  </span>

                  <div className="bg-[#FAF8F5] border border-ink-900/20 rounded-xl p-2.5 mb-3">
                    <span className="font-mono text-[10px] uppercase font-bold text-ink-500 block">
                      Trigger Threshold:
                    </span>
                    <p className="font-mono text-xs font-bold text-ink-900 mt-0.5">
                      {rule.threshold}
                    </p>
                  </div>

                  <p className="font-sans text-xs text-ink-700 leading-relaxed mb-3">
                    {rule.clinicalRationale}
                  </p>
                </div>

                <div className="pt-3 border-t-2 border-ink-900/20">
                  <span className="font-mono text-[10px] uppercase font-bold text-ink-500 block">
                    Escalation Response:
                  </span>
                  <p className="font-mono text-[11px] font-bold text-indigo-900 mt-0.5">
                    {rule.action}
                  </p>
                </div>
              </div>
            ))}
        </div>

        {/* Triage Bands Summary Bar */}
        <div className="mt-8 bg-[#FBF9F4] border-2 border-ink-900 rounded-3xl p-5 shadow-[4px_4px_0px_#121214] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold uppercase text-ink-700">
              Deterministic Triage Bands:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs font-bold">
            <span className="px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-800 text-emerald-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              GREEN (0–39): Stable Outpatient Care
            </span>
            <span className="px-3 py-1.5 rounded-full bg-amber-100 border border-amber-800 text-amber-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              AMBER (40–69): Family Caregiver Alert
            </span>
            <span className="px-3 py-1.5 rounded-full bg-rose-100 border border-rose-800 text-rose-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              RED (70–100): Urgent Physician Triage
            </span>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. SECTION 3: "TURN MIDNIGHT ALERTS INTO MORNING ACTION PLANS"
             (DAISY'S 3RD SECTION + FULL INTERACTIVE LIVE SANDBOX WIDGET)
      ───────────────────────────────────────────────────────────── */}
      <section id="sandbox" className="max-w-[1240px] mx-auto w-full px-6 sm:px-12 py-16 text-center">
        {/* Section Heading */}
        <h2 className="font-serif font-black text-3xl sm:text-5xl text-ink-900 tracking-tight mb-3">
          Turn midnight musings into morning action plans
        </h2>
        <p className="font-mono text-xs sm:text-sm text-ink-600 max-w-xl mx-auto mb-10">
          Try the real-time simulation below. Tap an event trigger to watch the deterministic triage engine re-score risk and update clinical action pathways.
        </p>

        {/* Big Rounded Mockup Frame with Pistachio Lime Header (Daisy SS 4 clone) */}
        <div className="bg-white border-2 border-ink-900 rounded-3xl overflow-hidden shadow-[6px_6px_0px_#121214] text-left">
          {/* Top Pistachio Lime Banner: "Wide Open Spaces / Clinical Cockpit" */}
          <div className="bg-[#D4F77C] border-b-2 border-ink-900 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-serif font-bold text-lg text-ink-900">
                Wide open spaces
              </span>
              <span className="hidden sm:inline-block font-mono text-[10px] bg-white border border-ink-900 px-2 py-0.5 rounded-full font-bold uppercase">
                Interactive Triage Sandbox
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-ink-900">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
              <span className="font-bold">LIVE TELEMETRY SANDBOX</span>
            </div>
          </div>

          {/* Sandbox Body: Interactive Cockpit Controls & Real-Time Patient Card */}
          <div className="p-6 sm:p-10 bg-[#FAF8F5]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Interactive Scenario Trigger Buttons */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-ink-700" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-700">
                    Step 1 • Inject a Simulated Event
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Trigger 1: Red Spike */}
                  <button
                    onClick={handleSimSpike}
                    className="w-full text-left p-4 rounded-xl border-2 border-ink-900 bg-[#FEE2E2] hover:bg-[#FECACA] shadow-[3px_3px_0px_#121214] hover:shadow-[4px_4px_0px_#121214] active:translate-y-0.5 transition-all font-mono cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-red-900 mb-1">
                      <span>⚡ TRIGGER BP SPIKE (155/95)</span>
                      <span className="bg-red-700 text-white px-2 py-0.5 rounded text-[10px]">
                        FLIP TO RED
                      </span>
                    </div>
                    <p className="text-[11px] text-red-800 font-sans leading-normal">
                      Simulates acute hypertensive episode + 2 missed doses. Triggers doctor notification.
                    </p>
                  </button>

                  {/* Trigger 2: Green Stabilize */}
                  <button
                    onClick={handleSimRecover}
                    className="w-full text-left p-4 rounded-xl border-2 border-ink-900 bg-[#DCFCE7] hover:bg-[#BBF7D0] shadow-[3px_3px_0px_#121214] hover:shadow-[4px_4px_0px_#121214] active:translate-y-0.5 transition-all font-mono cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-emerald-900 mb-1">
                      <span>✓ LOG MEDS & STABILIZE</span>
                      <span className="bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px]">
                        FLIP TO GREEN
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 font-sans leading-normal">
                      Simulates patient speaking in Hindi to confirm Metformin dose. BP returns to 118/78.
                    </p>
                  </button>

                  {/* Trigger 3: Amber Mobility Drop */}
                  <button
                    onClick={handleSimWearableDrop}
                    className="w-full text-left p-4 rounded-xl border-2 border-ink-900 bg-[#FEF3C7] hover:bg-[#FDE68A] shadow-[3px_3px_0px_#121214] hover:shadow-[4px_4px_0px_#121214] active:translate-y-0.5 transition-all font-mono cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-amber-900 mb-1">
                      <span>🚶 WEARABLE MOBILITY DROP (-48%)</span>
                      <span className="bg-amber-700 text-white px-2 py-0.5 rounded text-[10px]">
                        SET TO AMBER
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 font-sans leading-normal">
                      Steps drop from 4,000 to 1,840. Flags early weakness / lethargy.
                    </p>
                  </button>
                </div>

                <div className="pt-2">
                  <Link
                    href="/sim"
                    className="font-mono text-xs font-bold text-ink-700 hover:text-ink-900 inline-flex items-center gap-1.5 underline underline-offset-4 decoration-2"
                  >
                    <span>Launch Full Judge Control Simulator Panel</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Right Column: Live Doctor Triage Widget Preview */}
              <div className="lg:col-span-7">
                <div className="bg-white border-2 border-ink-900 rounded-2xl p-6 sm:p-7 shadow-[4px_4px_0px_#121214]">
                  {/* Action Fired Toast Banner */}
                  {simActionFired && (
                    <div className="mb-4 p-3 rounded-xl border-2 border-ink-900 bg-[#D4F77C] font-mono text-xs font-bold flex items-center justify-between animate-fade-in shadow-[2px_2px_0px_#121214]">
                      <span>{simActionFired}</span>
                      <span className="text-[10px] uppercase bg-white px-2 py-0.5 rounded border border-ink-900">
                        Just Now
                      </span>
                    </div>
                  )}

                  {/* Patient Header & Risk Score */}
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b-2 border-ink-900">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full border-2 border-ink-900 bg-[#FEE159] flex items-center justify-center font-serif font-black text-lg shadow-[2px_2px_0px_#121214]">
                        RS
                      </div>
                      <div>
                        <h3 className="font-serif font-black text-xl text-ink-900">
                          {simPatientName}
                        </h3>
                        <p className="font-mono text-xs text-ink-500">
                          Type-2 Diabetes & Hypertension • Dr. Meera Rao
                        </p>
                      </div>
                    </div>

                    <RiskBadge band={simRiskBand} score={simScore} size="lg" />
                  </div>

                  {/* System Status Message */}
                  <div
                    className={`my-4 p-3.5 rounded-xl border-2 border-ink-900 font-mono text-xs font-bold flex items-center gap-2.5 ${
                      simRiskBand === "red"
                        ? "bg-[#FEE2E2] text-red-900"
                        : simRiskBand === "green"
                        ? "bg-[#DCFCE7] text-emerald-900"
                        : "bg-[#FEF3C7] text-amber-900"
                    }`}
                  >
                    {simRiskBand === "red" ? (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-700" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                    )}
                    <span>{simAlertMsg}</span>
                  </div>

                  {/* Active Clinical Reasons */}
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-600">
                        Active Deterministic Heuristics
                      </span>
                      <span className="font-mono text-[10px] text-ink-500 font-bold">
                        Calculated in real-time
                      </span>
                    </div>

                    {simReasons.map((reason, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#FAF8F5] border-2 border-ink-900 flex items-start gap-2.5 font-mono text-xs text-ink-900 shadow-[2px_2px_0px_#121214]"
                      >
                        <span className="font-bold text-[#FF5C98]">●</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Shortcuts */}
                  <div className="pt-4 border-t-2 border-ink-900 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span className="text-ink-600">FHIR R4 Observation Ready</span>
                    </div>
                    <Link
                      href="/doctor/p1"
                      className="bg-ink-900 text-white font-bold px-4 py-2 rounded-full border-2 border-ink-900 shadow-[2px_2px_0px_#121214] hover:bg-ink-800 transition-all flex items-center gap-1.5"
                    >
                      <span>Open Full Patient Chart</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. SECTION 4: THE 4 PORTALS (CLAUD-INSPIRED PASTEL CARDS)
      ───────────────────────────────────────────────────────────── */}
      <section id="portals" className="max-w-[1240px] mx-auto w-full px-6 sm:px-12 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-500 bg-[#FEE159] px-3 py-1 rounded-full border-2 border-ink-900 shadow-[2px_2px_0px_#121214]">
            Comprehensive Ecosystem
          </span>
          <h2 className="font-serif font-black text-3xl sm:text-5xl text-ink-900 tracking-tight mt-3">
            Designed for every member of the care circle
          </h2>
          <p className="font-mono text-xs sm:text-sm text-ink-600 mt-2">
            One shared chronic care loop with dedicated interfaces tailored to each stakeholder.
          </p>
        </div>

        {/* 4 Claud-Inspired Cards with #1-#4 Badges and Pastel Backgrounds */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Patient Voice App (#1) */}
          <Link
            href="/patient"
            className="group bg-[#FEE159] border-2 border-ink-900 rounded-3xl p-6 shadow-[5px_5px_0px_#121214] hover:shadow-[7px_7px_0px_#121214] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-full bg-ink-900 text-white font-mono font-black text-xs flex items-center justify-center border border-white">
                  #1
                </span>
                <span className="font-mono text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-ink-900 text-ink-900">
                  Mobile First
                </span>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-white border-2 border-ink-900 flex items-center justify-center mb-4 shadow-[2px_2px_0px_#121214]">
                <Smartphone className="w-6 h-6 text-ink-900 stroke-[2.2]" />
              </div>

              <h3 className="font-serif font-black text-2xl text-ink-900 mb-2 leading-tight">
                Senior Voice App
              </h3>
              <p className="font-sans text-xs text-ink-800 leading-relaxed mb-6">
                One-tap voice logging in Hindi, Kannada, and English. No typing, big tactile buttons, and adherence streaks.
              </p>
            </div>

            <div className="pt-4 border-t-2 border-ink-900 flex items-center justify-between font-mono text-xs font-bold text-ink-900">
              <span>Launch Patient App</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Doctor Clinical Cockpit (#2) */}
          <Link
            href="/doctor"
            className="group bg-[#EDE9FE] border-2 border-ink-900 rounded-3xl p-6 shadow-[5px_5px_0px_#121214] hover:shadow-[7px_7px_0px_#121214] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-full bg-ink-900 text-white font-mono font-black text-xs flex items-center justify-center border border-white">
                  #2
                </span>
                <span className="font-mono text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-ink-900 text-ink-900">
                  Desktop Web
                </span>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-white border-2 border-ink-900 flex items-center justify-center mb-4 shadow-[2px_2px_0px_#121214]">
                <Stethoscope className="w-6 h-6 text-indigo-700 stroke-[2.2]" />
              </div>

              <h3 className="font-serif font-black text-2xl text-ink-900 mb-2 leading-tight">
                Doctor Cockpit
              </h3>
              <p className="font-sans text-xs text-ink-800 leading-relaxed mb-6">
                15-second pre-consult brief, 8-rule explainable triage list, interactive what-if simulator, and FHIR export.
              </p>
            </div>

            <div className="pt-4 border-t-2 border-ink-900 flex items-center justify-between font-mono text-xs font-bold text-ink-900">
              <span>Explore Cockpit</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Family Escalation Circle (#3) */}
          <Link
            href="/family"
            className="group bg-[#BAE6FD] border-2 border-ink-900 rounded-3xl p-6 shadow-[5px_5px_0px_#121214] hover:shadow-[7px_7px_0px_#121214] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-full bg-ink-900 text-white font-mono font-black text-xs flex items-center justify-center border border-white">
                  #3
                </span>
                <span className="font-mono text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-ink-900 text-ink-900">
                  WhatsApp Loop
                </span>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-white border-2 border-ink-900 flex items-center justify-center mb-4 shadow-[2px_2px_0px_#121214]">
                <Users className="w-6 h-6 text-sky-800 stroke-[2.2]" />
              </div>

              <h3 className="font-serif font-black text-2xl text-ink-900 mb-2 leading-tight">
                Family Feed
              </h3>
              <p className="font-sans text-xs text-ink-800 leading-relaxed mb-6">
                Multi-tier escalation ladder: keeps adult children reassured, alerts them when doses are missed, prevents emergencies.
              </p>
            </div>

            <div className="pt-4 border-t-2 border-ink-900 flex items-center justify-between font-mono text-xs font-bold text-ink-900">
              <span>View Family Feed</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Hospital Admin ROI (#4) */}
          <Link
            href="/admin"
            className="group bg-[#D4F77C] border-2 border-ink-900 rounded-3xl p-6 shadow-[5px_5px_0px_#121214] hover:shadow-[7px_7px_0px_#121214] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-full bg-ink-900 text-white font-mono font-black text-xs flex items-center justify-center border border-white">
                  #4
                </span>
                <span className="font-mono text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-ink-900 text-ink-900">
                  Leadership
                </span>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-white border-2 border-ink-900 flex items-center justify-center mb-4 shadow-[2px_2px_0px_#121214]">
                <BarChart3 className="w-6 h-6 text-emerald-900 stroke-[2.2]" />
              </div>

              <h3 className="font-serif font-black text-2xl text-ink-900 mb-2 leading-tight">
                Hospital ROI
              </h3>
              <p className="font-sans text-xs text-ink-800 leading-relaxed mb-6">
                Quantified metrics: 14 readmissions prevented, 87% alert response velocity, ₹4.2L clinical savings.
              </p>
            </div>

            <div className="pt-4 border-t-2 border-ink-900 flex items-center justify-between font-mono text-xs font-bold text-ink-900">
              <span>View Admin ROI</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. SECTION 5: CLAUD CHALLENGE CALLOUT (FAST TAPS, LIVE WINS)
      ───────────────────────────────────────────────────────────── */}
      <section className="max-w-[1240px] mx-auto w-full px-6 sm:px-12 py-12">
        <div className="bg-[#FAF8F5] border-2 border-ink-900 rounded-3xl p-8 sm:p-12 shadow-[6px_6px_0px_#121214] flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="hidden sm:block shrink-0">
              <DoodleHandPress width={72} height={72} />
            </div>
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-500 bg-[#FEE159] px-2.5 py-0.5 rounded border border-ink-900">
                CRCE Hackathon Judge Mode
              </span>
              <h3 className="font-serif font-black text-2xl sm:text-4xl text-ink-900 tracking-tight mt-1.5">
                Fast Taps, Real Telemetry: Test the Simulator
              </h3>
              <p className="font-mono text-xs sm:text-sm text-ink-600 mt-1 max-w-xl">
                Inject custom BP spikes, missed medication logs, and wearable step drops to watch the entire continuous care loop respond in real time.
              </p>
            </div>
          </div>

          <Link href="/sim" className="shrink-0">
            <button className="bg-[#FEE159] text-ink-900 font-mono text-sm font-bold px-7 py-3.5 rounded-full border-2 border-ink-900 shadow-[3px_3px_0px_#121214] hover:shadow-[4px_4px_0px_#121214] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#121214] transition-all flex items-center gap-2">
              <Sliders className="w-4 h-4 stroke-[2.5]" />
              <span>LAUNCH SIMULATOR PANEL →</span>
            </button>
          </Link>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. MINIMALIST EDITORIAL FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t-2 border-ink-900 py-12 px-6 sm:px-12 mt-auto">
        <div className="max-w-[1240px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <CareBridgeLogo size="sm" href="/" />
            <span className="text-ink-400 font-mono text-xs hidden sm:inline">•</span>
            <p className="font-mono text-[11px] text-ink-500">
              Vedesh • Aman • Swapnil • Aryan • CRCE Hackathon
            </p>
          </div>

          <div className="text-center sm:text-right">
            <p className="font-mono text-xs font-bold text-ink-800">
              Clinical decision support only. Doctor always decides.
            </p>
            <p className="font-mono text-[10px] text-ink-500 mt-0.5">
              Simulated telemetry demonstrating deterministic clinical triage.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
