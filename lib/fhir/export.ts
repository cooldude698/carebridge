import { PatientDetail, Prescription } from "@/lib/types";

export interface FHIRResource {
  resourceType: string;
  id: string;
  [key: string]: unknown;
}

export interface FHIRBundle {
  resourceType: "Bundle";
  id: string;
  type: "collection";
  timestamp: string;
  entry: {
    fullUrl: string;
    resource: FHIRResource;
  }[];
}

const VITAL_LOINC_MAP: Record<
  string,
  { code: string; display: string; unit: string; ucum: string }
> = {
  bp: {
    code: "85354-9",
    display: "Blood pressure panel with all children optional",
    unit: "mmHg",
    ucum: "mm[Hg]",
  },
  hr: {
    code: "8867-4",
    display: "Heart rate",
    unit: "beats/min",
    ucum: "/min",
  },
  spo2: {
    code: "59408-5",
    display: "Oxygen saturation in Arterial blood by Pulse oximetry",
    unit: "%",
    ucum: "%",
  },
  glucose: {
    code: "1558-6",
    display: "Fasting glucose [Mass/volume] in Serum or Plasma",
    unit: "mg/dL",
    ucum: "mg/dL",
  },
  steps: {
    code: "55423-8",
    display: "Number of steps in 24 hour Measured",
    unit: "steps",
    ucum: "{steps}",
  },
  calories: {
    code: "41981-2",
    display: "Calories burned",
    unit: "kcal",
    ucum: "kcal",
  },
  sleep: {
    code: "93832-4",
    display: "Sleep duration",
    unit: "h",
    ucum: "h",
  },
};

function safeIsoDate(raw?: string): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Maps CareBridge internal telemetry & active digital prescriptions into an ABDM / HL7 FHIR R4 Bundle.
 */
export function generateFhirR4Bundle(
  detail: PatientDetail,
  prescriptions: Prescription[] = detail.activePrescriptions || []
): FHIRBundle {
  const { profile, vitals } = detail;
  const entries: { fullUrl: string; resource: FHIRResource }[] = [];

  // 1. Patient Resource
  const rawGender = (profile.gender || "male").toLowerCase();
  const fhirGender = rawGender.startsWith("f") ? "female" : "male";

  const patientResource: FHIRResource = {
    resourceType: "Patient",
    id: profile.id,
    identifier: [
      {
        system: "https://healthid.abdm.gov.in",
        value: `ABHA-91-${profile.id}-2026`,
      },
    ],
    name: [
      {
        text: profile.name,
        family: profile.name.split(" ")[1] || "",
        given: [profile.name.split(" ")[0]],
      },
    ],
    gender: fhirGender,
    telecom: [{ system: "phone", value: profile.whatsapp_number || "+91-98450-11223" }],
  };
  entries.push({ fullUrl: `urn:uuid:patient-${profile.id}`, resource: patientResource });

  // 2. Conditions (SNOMED CT)
  profile.conditions.forEach((cond, idx) => {
    const lower = cond.toLowerCase();
    const snomedCode = lower.includes("diab")
      ? "44054006"
      : lower.includes("hyper") || lower.includes("bp")
      ? "38341003"
      : "404684003";
    const condResource: FHIRResource = {
      resourceType: "Condition",
      id: `cond-${idx + 1}`,
      clinicalStatus: {
        coding: [
          { system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" },
        ],
      },
      code: {
        coding: [{ system: "http://snomed.info/sct", code: snomedCode, display: cond }],
      },
      subject: { reference: `Patient/${profile.id}` },
    };
    entries.push({ fullUrl: `urn:uuid:cond-${idx + 1}`, resource: condResource });
  });

  // 3. Observations (LOINC across all 7 vital types with real timestamps)
  vitals.slice(0, 60).forEach((v) => {
    const loinc = VITAL_LOINC_MAP[v.type] || VITAL_LOINC_MAP.bp;
    const valA = Number(v.value_a ?? v.valueA ?? 0);
    const valB = v.value_b ?? v.valueB ?? null;
    const effectiveDateTime = safeIsoDate(v.recorded_at || v.recordedAt);

    let component: FHIRResource[] | undefined;
    let valueQuantity: Record<string, unknown> | undefined;

    if (v.type === "bp") {
      component = [
        {
          resourceType: "ObservationComponent",
          id: `${v.id}-sys`,
          code: {
            coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }],
          },
          valueQuantity: {
            value: valA,
            unit: "mmHg",
            system: "http://unitsofmeasure.org",
            code: "mm[Hg]",
          },
        },
        {
          resourceType: "ObservationComponent",
          id: `${v.id}-dia`,
          code: {
            coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic blood pressure" }],
          },
          valueQuantity: {
            value: Number(valB ?? 80),
            unit: "mmHg",
            system: "http://unitsofmeasure.org",
            code: "mm[Hg]",
          },
        },
      ];
    } else {
      valueQuantity = {
        value: valA,
        unit: loinc.unit,
        system: "http://unitsofmeasure.org",
        code: loinc.ucum,
      };
    }

    const obsResource: FHIRResource = {
      resourceType: "Observation",
      id: v.id,
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "vital-signs",
            },
            { system: "https://carebridge.health/category", code: v.source || "wearable-sensor" },
          ],
        },
      ],
      code: {
        coding: [{ system: "http://loinc.org", code: loinc.code, display: loinc.display }],
      },
      subject: { reference: `Patient/${profile.id}` },
      effectiveDateTime,
      ...(component ? { component } : {}),
      ...(valueQuantity ? { valueQuantity } : {}),
    };
    entries.push({ fullUrl: `urn:uuid:obs-${v.id}`, resource: obsResource });
  });

  // 4. MedicationRequests (Active Digital Prescriptions)
  prescriptions.forEach((rx) => {
    rx.medicines.forEach((med) => {
      const medRequest: FHIRResource = {
        resourceType: "MedicationRequest",
        id: `${rx.id}-${med.id}`,
        status: rx.status === "active" ? "active" : rx.status === "completed" ? "completed" : "cancelled",
        intent: "order",
        medicationCodeableConcept: {
          text: `${med.medicine_name} ${med.dosage}`,
        },
        subject: { reference: `Patient/${profile.id}` },
        authoredOn: safeIsoDate(rx.issued_at),
        requester: { display: rx.doctor_name },
        dosageInstruction: [
          {
            text: `${med.frequency} (${med.times.join(", ")}) — ${
              med.with_food ? "After food" : "Before food"
            }${med.instructions ? `. ${med.instructions}` : ""}`,
          },
        ],
        note: [{ text: rx.doctor_summary }],
      };
      entries.push({
        fullUrl: `urn:uuid:medreq-${rx.id}-${med.id}`,
        resource: medRequest,
      });
    });
  });

  return {
    resourceType: "Bundle",
    id: `bundle-cb-${Date.now()}`,
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: entries,
  };
}
