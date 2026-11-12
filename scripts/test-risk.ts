// Quick test script for CareBridge Risk Engine
import assert from "node:assert/strict";
import { computeRisk } from "../lib/risk/compute";

console.log("=== CareBridge Risk Engine Unit Tests ===");

const now = new Date();
const dayMs = 24 * 60 * 60 * 1000;

// Test Case 1: Ramesh K. Baseline (Expect Yellow, ~50-60)
// Baseline has:
// - BP_TREND_UP: +20
// - RECENT_DISCHARGE: +10
// - STEPS_DROP: +10
// Total = 40 (Yellow band 40-69)
const rameshBaselineSnapshot = {
  patient: {
    id: "p1",
    name: "Ramesh K.",
    age: 62,
    language: "Hindi",
    conditions: ["Diabetes Type 2", "Hypertension"],
    doctor_id: "d1",
    family_id: "f1",
    discharged_at: new Date(now.getTime() - 10 * dayMs).toISOString(),
    created_at: new Date(now.getTime() - 30 * dayMs).toISOString(),
  },
  medLogs: [
    // 1 missed dose yesterday, but taken today morning -> streak is 0, adherence > 70%
    { id: "1", patient_id: "p1", medicine_id: "m1", scheduled_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), taken_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), status: "taken" as const },
    { id: "2", patient_id: "p1", medicine_id: "m1", scheduled_at: new Date(now.getTime() - 1 * dayMs).toISOString(), taken_at: null, status: "missed" as const },
    { id: "3", patient_id: "p1", medicine_id: "m1", scheduled_at: new Date(now.getTime() - 2 * dayMs).toISOString(), taken_at: new Date(now.getTime() - 2 * dayMs).toISOString(), status: "taken" as const },
    { id: "4", patient_id: "p1", medicine_id: "m1", scheduled_at: new Date(now.getTime() - 3 * dayMs).toISOString(), taken_at: new Date(now.getTime() - 3 * dayMs).toISOString(), status: "taken" as const },
    { id: "5", patient_id: "p1", medicine_id: "m1", scheduled_at: new Date(now.getTime() - 4 * dayMs).toISOString(), taken_at: new Date(now.getTime() - 4 * dayMs).toISOString(), status: "taken" as const },
    { id: "6", patient_id: "p1", medicine_id: "m1", scheduled_at: new Date(now.getTime() - 5 * dayMs).toISOString(), taken_at: new Date(now.getTime() - 5 * dayMs).toISOString(), status: "taken" as const },
  ],
  vitals: [
    { id: "v1", patient_id: "p1", type: "bp" as const, value_a: 142, value_b: 88, recorded_at: new Date(now.getTime() - 1 * dayMs).toISOString() },
    { id: "v2", patient_id: "p1", type: "bp" as const, value_a: 138, value_b: 86, recorded_at: new Date(now.getTime() - 2 * dayMs).toISOString() },
    { id: "v3", patient_id: "p1", type: "bp" as const, value_a: 126, value_b: 80, recorded_at: new Date(now.getTime() - 9 * dayMs).toISOString() },
    { id: "v4", patient_id: "p1", type: "steps" as const, value_a: 2800, value_b: null, recorded_at: new Date(now.getTime() - 1 * dayMs).toISOString() },
    { id: "v5", patient_id: "p1", type: "steps" as const, value_a: 5400, value_b: null, recorded_at: new Date(now.getTime() - 9 * dayMs).toISOString() },
  ],
};

const res1 = computeRisk(rameshBaselineSnapshot);
console.log(`Test 1 (Ramesh Baseline): Score = ${res1.score}, Band = ${res1.band}`);
assert.equal(res1.band, "yellow", `Expected yellow, got ${res1.band}`);
console.log("Reasons:", res1.reasons.map((r) => r.text));

// Test Case 2: Ramesh after Demo Spike (Missed streak + BP Spike >= 150) -> Flips to RED
const rameshSpikeSnapshot = {
  ...rameshBaselineSnapshot,
  medLogs: [
    { id: "0a", patient_id: "p1", medicine_id: "m1", scheduled_at: now.toISOString(), taken_at: null, status: "missed" as const },
    { id: "0b", patient_id: "p1", medicine_id: "m1", scheduled_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), taken_at: null, status: "missed" as const },
    ...rameshBaselineSnapshot.medLogs.slice(1),
  ],
  vitals: [
    { id: "v0", patient_id: "p1", type: "bp" as const, value_a: 154, value_b: 96, recorded_at: now.toISOString() },
    ...rameshBaselineSnapshot.vitals,
  ],
};

const res2 = computeRisk(rameshSpikeSnapshot);
console.log(`\nTest 2 (Ramesh after Spike): Score = ${res2.score}, Band = ${res2.band}`);
assert.equal(res2.band, "red", `Expected red, got ${res2.band}`);
console.log("Reasons:", res2.reasons.map((r) => r.text));

// Test Case 3: Suresh (Healthy, high adherence, normal BP) -> Green
const sureshSnapshot = {
  patient: {
    id: "p3",
    name: "Suresh P.",
    age: 48,
    language: "English",
    conditions: ["Diabetes Type 2"],
    doctor_id: "d1",
    family_id: "f3",
    created_at: new Date(now.getTime() - 30 * dayMs).toISOString(),
  },
  medLogs: [
    { id: "s1", patient_id: "p3", medicine_id: "m5", scheduled_at: new Date(now.getTime() - 1 * dayMs).toISOString(), taken_at: new Date(now.getTime() - 1 * dayMs).toISOString(), status: "taken" as const },
    { id: "s2", patient_id: "p3", medicine_id: "m5", scheduled_at: new Date(now.getTime() - 2 * dayMs).toISOString(), taken_at: new Date(now.getTime() - 2 * dayMs).toISOString(), status: "taken" as const },
  ],
  vitals: [
    { id: "sv1", patient_id: "p3", type: "bp" as const, value_a: 120, value_b: 78, recorded_at: new Date(now.getTime() - 1 * dayMs).toISOString() },
    { id: "sv2", patient_id: "p3", type: "steps" as const, value_a: 6800, value_b: null, recorded_at: new Date(now.getTime() - 1 * dayMs).toISOString() },
  ],
};

const res3 = computeRisk(sureshSnapshot);
console.log(`\nTest 3 (Suresh Healthy): Score = ${res3.score}, Band = ${res3.band}`);
assert.equal(res3.band, "green", `Expected green, got ${res3.band}`);

// Test Case 4: Anita (Consistent Yellow, BP elevated + low adherence)
const anitaSnapshot = {
  patient: {
    id: "p2",
    name: "Anita S.",
    age: 54,
    language: "Kannada",
    conditions: ["Hypertension"],
    doctor_id: "d1",
    family_id: "f2",
    created_at: new Date(now.getTime() - 30 * dayMs).toISOString(),
  },
  medLogs: [
    // 3 missed out of 4 -> low adherence (+25)
    { id: "a1", patient_id: "p2", medicine_id: "m3", scheduled_at: new Date(now.getTime() - 1 * dayMs).toISOString(), taken_at: new Date(now.getTime() - 1 * dayMs).toISOString(), status: "taken" as const },
    { id: "a2", patient_id: "p2", medicine_id: "m3", scheduled_at: new Date(now.getTime() - 2 * dayMs).toISOString(), taken_at: null, status: "missed" as const },
    { id: "a3", patient_id: "p2", medicine_id: "m3", scheduled_at: new Date(now.getTime() - 3 * dayMs).toISOString(), taken_at: null, status: "missed" as const },
    { id: "a4", patient_id: "p2", medicine_id: "m3", scheduled_at: new Date(now.getTime() - 4 * dayMs).toISOString(), taken_at: null, status: "missed" as const },
  ],
  vitals: [
    // BP trend up (+20) -> 25 + 20 = 45 (Yellow)
    { id: "av1", patient_id: "p2", type: "bp" as const, value_a: 142, value_b: 90, recorded_at: new Date(now.getTime() - 1 * dayMs).toISOString() },
    { id: "av2", patient_id: "p2", type: "bp" as const, value_a: 128, value_b: 82, recorded_at: new Date(now.getTime() - 9 * dayMs).toISOString() },
  ],
};
const res4 = computeRisk(anitaSnapshot);
console.log(`\nTest 4 (Anita Yellow): Score = ${res4.score}, Band = ${res4.band}`);
assert.equal(res4.band, "yellow", `Expected yellow, got ${res4.band}`);

// Test Case 5: 48h Telemetry Silence Rule
const silentSnapshot = {
  patient: {
    id: "p_silent",
    name: "Silent Patient",
    age: 70,
    language: "Hindi",
    conditions: [],
    doctor_id: "d1",
    family_id: "f1",
    created_at: new Date(now.getTime() - 10 * dayMs).toISOString(),
  },
  medLogs: [
    { id: "sl1", patient_id: "p_silent", medicine_id: "m1", scheduled_at: new Date(now.getTime() - 3 * dayMs).toISOString(), taken_at: new Date(now.getTime() - 3 * dayMs).toISOString(), status: "taken" as const },
  ],
  vitals: [
    { id: "slv1", patient_id: "p_silent", type: "bp" as const, value_a: 120, value_b: 80, recorded_at: new Date(now.getTime() - 3 * dayMs).toISOString() },
  ],
};
const res5 = computeRisk(silentSnapshot);
console.log(`\nTest 5 (Silence 48h): Score = ${res5.score}, Reasons = ${res5.reasons.map((r) => r.rule_id).join(", ")}`);
assert.ok(res5.reasons.some((r) => r.rule_id === "NO_DATA_48H"), "Expected NO_DATA_48H rule");

// Test Case 6: Critical SpO2 drop (<90%) + Nocturnal HR spike (>100 bpm) -> Flips to RED
const spo2HrSnapshot = {
  ...rameshBaselineSnapshot,
  vitals: [
    { id: "v-spo2-crit", patient_id: "p1", type: "spo2" as const, value_a: 88, value_b: null, recorded_at: now.toISOString() },
    { id: "v-hr-spike", patient_id: "p1", type: "hr" as const, value_a: 112, value_b: null, recorded_at: now.toISOString() },
    ...rameshBaselineSnapshot.vitals,
  ],
};
const res6 = computeRisk(spo2HrSnapshot);
console.log(`\nTest 6 (SpO2 88% + Nocturnal HR 112): Score = ${res6.score}, Band = ${res6.band}`);
assert.equal(res6.band, "red", `Expected red, got ${res6.band}`);
assert.ok(res6.reasons.some((r) => r.rule_id === "SPO2_CRITICAL"), "Expected SPO2_CRITICAL rule");
assert.ok(res6.reasons.some((r) => r.rule_id === "HR_NOCTURNAL_HIGH"), "Expected HR_NOCTURNAL_HIGH rule");

// Test Case 7: Empty vitals & medLogs arrays should not throw
const emptySnapshot = {
  patient: {
    id: "p_empty",
    name: "Empty Patient",
    age: 50,
    language: "English",
    conditions: [],
    doctor_id: "d1",
    family_id: "f1",
    created_at: now.toISOString(),
  },
  medLogs: [],
  vitals: [],
};
const res7 = computeRisk(emptySnapshot);
console.log(`\nTest 7 (Empty arrays): Score = ${res7.score}, Band = ${res7.band}`);
assert.ok(res7.band === "green" && res7.score === 0, `Expected green/0, got ${res7.band}/${res7.score}`);

console.log("\nAll 7 risk engine unit tests verified successfully!");
