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

/**
 * Maps CareBridge internal telemetry into a standard ABDM / HL7 FHIR R4 Bundle.
 */
export function generateFhirR4Bundle(
  detail: PatientDetail,
  prescriptions: Prescription[] = []
): FHIRBundle {
  const { profile, vitals } = detail;
  const entries: { fullUrl: string; resource: FHIRResource }[] = [];

  // 1. Patient Resource
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
    gender: (profile.gender || "male").toLowerCase(),
    telecom: [
      {
        system: "phone",
        value: profile.whatsapp_number || "+91-98765-43210",
      },
    ],
  };
  entries.push({ fullUrl: `urn:uuid:patient-${profile.id}`, resource: patientResource });

  // 2. Conditions (SNOMED CT)
  (profile.conditions || []).forEach((cond, idx) => {
    let snomedCode = "38341003"; // Hypertension
    if (cond.toLowerCase().includes("diab")) {
      snomedCode = "44054006"; // Type 2 Diabetes
    } else if (cond.toLowerCase().includes("heart") || cond.toLowerCase().includes("cardio")) {
      snomedCode = "53741008"; // Coronary arteriosclerosis
    }

    const condResource: FHIRResource = {
      resourceType: "Condition",
      id: `cond-${idx + 1}`,
      clinicalStatus: {
        coding: [
          { system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" },
        ],
      },
      code: {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: snomedCode,
            display: cond,
          },
        ],
      },
      subject: { reference: `Patient/${profile.id}` },
    };
    entries.push({ fullUrl: `urn:uuid:cond-${idx + 1}`, resource: condResource });
  });

  // 3. Observations (LOINC) for all 7 Vital Types
  vitals.forEach((v) => {
    const valA = v.value_a ?? (v as any).valueA ?? 0;
    const valB = v.value_b ?? (v as any).valueB ?? null;
    const effectiveTime = v.recorded_at || (v as any).recordedAt || new Date().toISOString();

    let code = "85354-9";
    let display = "Blood pressure panel with all children optional";
    let component: any = undefined;
    let valueQuantity: any = undefined;

    if (v.type === "bp") {
      code = "85354-9";
      display = "Blood pressure systolic & diastolic";
      component = [
        {
          code: {
            coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }],
          },
          valueQuantity: { value: valA, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" },
        },
        {
          code: {
            coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic blood pressure" }],
          },
          valueQuantity: { value: valB || 80, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" },
        },
      ];
    } else if (v.type === "hr") {
      code = "8867-4";
      display = "Heart rate";
      valueQuantity = { value: valA, unit: "/min", system: "http://unitsofmeasure.org", code: "/min" };
    } else if (v.type === "spo2") {
      code = "59408-5";
      display = "Oxygen saturation in Arterial blood by Pulse oximetry";
      valueQuantity = { value: valA, unit: "%", system: "http://unitsofmeasure.org", code: "%" };
    } else if (v.type === "glucose") {
      code = "1558-6";
      display = "Fasting glucose [Mass/volume] in Blood";
      valueQuantity = { value: valA, unit: "mg/dL", system: "http://unitsofmeasure.org", code: "mg/dL" };
    } else if (v.type === "steps") {
      code = "55423-8";
      display = "Number of steps in 24 hour Measured";
      valueQuantity = { value: valA, unit: "steps", system: "http://unitsofmeasure.org", code: "{steps}" };
    } else if (v.type === "calories") {
      code = "41981-2";
      display = "Calories burned";
      valueQuantity = { value: valA, unit: "kcal", system: "http://unitsofmeasure.org", code: "kcal" };
    } else if (v.type === "sleep") {
      code = "93832-4";
      display = "Sleep duration";
      valueQuantity = { value: valA, unit: "h", system: "http://unitsofmeasure.org", code: "h" };
    }

    const obsResource: FHIRResource = {
      resourceType: "Observation",
      id: v.id,
      status: "final",
      category: [
        {
          coding: [
            { system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" },
            { system: "https://carebridge.health/category", code: "wearable-sensor" },
          ],
        },
      ],
      code: {
        coding: [{ system: "http://loinc.org", code, display }],
      },
      subject: { reference: `Patient/${profile.id}` },
      effectiveDateTime: effectiveTime,
      component,
      valueQuantity,
    };
    entries.push({ fullUrl: `urn:uuid:obs-${v.id}`, resource: obsResource });
  });

  // 4. MedicationRequest (HL7 FHIR R4) for Active Prescriptions
  const allPrescriptions = prescriptions.length > 0 ? prescriptions : detail.prescriptions || [];
  for (const rx of allPrescriptions) {
    if (rx.status !== "active") continue;
    for (const med of rx.medicines || []) {
      const medRequest: FHIRResource = {
        resourceType: "MedicationRequest",
        id: med.id || `medreq-${Date.now()}`,
        status: "active",
        intent: "order",
        medicationCodeableConcept: {
          text: med.medicine_name,
        },
        subject: { reference: `Patient/${profile.id}` },
        authoredOn: rx.issued_at,
        requester: {
          display: rx.doctor_name || "Dr. Meera Rao",
        },
        dosageInstruction: [
          {
            text: `${med.dosage} ${med.frequency}${med.instructions ? ` - ${med.instructions}` : ""}`,
            timing: {
              repeat: {
                frequency: med.times?.length || 1,
                period: 1,
                periodUnit: "d",
                timeOfDay: med.times || ["08:00"],
              },
            },
            additionalInstruction: med.with_food ? [{ text: "Take with food" }] : [],
          },
        ],
      };
      entries.push({ fullUrl: `urn:uuid:medreq-${med.id}`, resource: medRequest });
    }
  }

  return {
    resourceType: "Bundle",
    id: `bundle-cb-${Date.now()}`,
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: entries,
  };
}
